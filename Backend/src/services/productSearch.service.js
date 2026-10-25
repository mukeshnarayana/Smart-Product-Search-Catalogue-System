const { Op, Sequelize } = require('sequelize');
const { Product, sequelize } = require('../models');

// Columns selected for list view (omits heavy description for high performance)
const LIST_ATTRIBUTES = [
  'id',
  'sku',
  'name',
  'brand',
  'category',
  'price',
  'rating',
  'in_stock',
  'stock_quantity',
  'image_url',
  'created_at'
];

/**
 * Escapes LIKE/ILIKE wildcards (%, _, \) so user input is treated literally.
 */
function escapeLikeWildcards(str) {
  return str.replace(/[\\%_]/g, '\\$&');
}

// In-memory cache for filter options (5 minutes TTL)
let filterCache = {
  data: null,
  expiresAt: 0
};

const FILTER_CACHE_TTL_MS = 5 * 60 * 1000;

class ProductSearchService {
  /**
   * Escape like wildcards helper (exposed for testing)
   */
  static escapeLike(str) {
    return escapeLikeWildcards(str);
  }

  /**
   * Clear in-memory filter cache (useful during test teardown or re-seeding)
   */
  static clearFilterCache() {
    filterCache = { data: null, expiresAt: 0 };
  }

  /**
   * Builds the Sequelize where conditions based on query params.
   */
  static buildWhereClause(params) {
    const andConditions = [];
    const { q, category, brand, minPrice, maxPrice, minRating, inStock } = params;

    // 1. Keyword search across tokens
    if (q && typeof q === 'string' && q.trim().length > 0) {
      const tokens = q.trim().split(/\s+/).filter(Boolean);
      for (const token of tokens) {
        const escaped = escapeLikeWildcards(token);
        const pattern = `%${escaped}%`;

        andConditions.push({
          [Op.or]: [
            { name: { [Op.iLike]: pattern } },
            { description: { [Op.iLike]: pattern } },
            { brand: { [Op.iLike]: pattern } },
            { category: { [Op.iLike]: pattern } },
            { sku: { [Op.iLike]: pattern } }
          ]
        });
      }
    }

    // 2. Category filter (Op.in)
    if (category && Array.isArray(category) && category.length > 0) {
      andConditions.push({
        category: {
          [Op.in]: category
        }
      });
    }

    // 3. Brand filter (Op.in)
    if (brand && Array.isArray(brand) && brand.length > 0) {
      andConditions.push({
        brand: {
          [Op.in]: brand
        }
      });
    }

    // 4. Price range filters
    if (minPrice !== undefined && minPrice !== null) {
      andConditions.push({
        price: {
          [Op.gte]: minPrice
        }
      });
    }

    if (maxPrice !== undefined && maxPrice !== null) {
      andConditions.push({
        price: {
          [Op.lte]: maxPrice
        }
      });
    }

    // 5. Rating filter
    if (minRating !== undefined && minRating !== null) {
      andConditions.push({
        rating: {
          [Op.gte]: minRating
        }
      });
    }

    // 6. In-stock filter
    if (inStock !== undefined && inStock !== null) {
      andConditions.push({
        in_stock: inStock
      });
    }

    return andConditions.length > 0 ? { [Op.and]: andConditions } : {};
  }

  /**
   * Builds the deterministic sort order with guaranteed tiebreaker.
   */
  static buildSortOrder(sort, q, hasExplicitSort) {
    let order;
    let replacements = {};

    if (hasExplicitSort) {
      switch (sort) {
        case 'price_asc':
          order = [
            ['price', 'ASC'],
            ['id', 'ASC']
          ];
          break;
        case 'price_desc':
          order = [
            ['price', 'DESC'],
            ['id', 'ASC']
          ];
          break;
        case 'rating_desc':
          order = [
            ['rating', 'DESC'],
            ['id', 'ASC']
          ];
          break;
        case 'name_asc':
          order = [
            [Sequelize.fn('lower', Sequelize.col('name')), 'ASC'],
            ['id', 'ASC']
          ];
          break;
        case 'newest':
        default:
          order = [
            ['created_at', 'DESC'],
            ['id', 'ASC']
          ];
          break;
      }
    } else if (q && typeof q === 'string' && q.trim().length > 0) {
      // Relevance ranking: exact SKU match > name starts-with > name contains > others
      const rawQ = q.trim();
      const escaped = escapeLikeWildcards(rawQ);
      const startsWith = `${escaped}%`;
      const contains = `%${escaped}%`;

      const rankingCase = sequelize.literal(`CASE
        WHEN UPPER("Product"."sku") = UPPER(:exactQ) THEN 1
        WHEN "Product"."name" ILIKE :startsWithQ THEN 2
        WHEN "Product"."name" ILIKE :containsQ THEN 3
        ELSE 4
      END`);

      order = [
        [rankingCase, 'ASC'],
        ['created_at', 'DESC'],
        ['id', 'ASC']
      ];

      replacements = {
        exactQ: rawQ,
        startsWithQ: startsWith,
        containsQ: contains
      };
    } else {
      // Default sort is newest with deterministic tiebreaker
      order = [
        ['created_at', 'DESC'],
        ['id', 'ASC']
      ];
    }

    return { order, replacements };
  }

  /**
   * Search products with filtering, ranking, deterministic tie-breaking,
   * parallel count+query, and clamped pagination.
   */
  static async searchProducts(params, hasExplicitSort = false) {
    const {
      q,
      category,
      brand,
      minPrice,
      maxPrice,
      minRating,
      inStock,
      sort = 'newest',
      page = 1,
      limit = 20,
      requestId
    } = params;

    const where = this.buildWhereClause(params);
    const { order, replacements } = this.buildSortOrder(sort, q, hasExplicitSort);

    const offset = (page - 1) * limit;

    // Run count and data query in parallel for maximum performance
    const [count, rows] = await Promise.all([
      Product.count({ where }),
      Product.findAll({
        where,
        attributes: LIST_ATTRIBUTES,
        order,
        replacements,
        limit,
        offset
      })
    ]);

    const total = count;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    // Clamp: if page is beyond totalPages, return empty data array
    const data = (page > totalPages && totalPages > 0) || total === 0 ? [] : rows;
    const hasNext = page < totalPages;
    const hasPrev = page > 1 && totalPages > 0 && page <= totalPages + 1;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev
      },
      appliedFilters: {
        q: q || null,
        category: category || null,
        brand: brand || null,
        minPrice: minPrice !== undefined ? minPrice : null,
        maxPrice: maxPrice !== undefined ? maxPrice : null,
        minRating: minRating !== undefined ? minRating : null,
        inStock: inStock !== undefined ? inStock : null,
        sort
      },
      meta: {
        requestId: requestId || null,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Fetch distinct categories, brands, and price range (cached in-memory for 5 minutes)
   */
  static async getFilterAggregations() {
    const now = Date.now();
    if (filterCache.data && filterCache.expiresAt > now) {
      return filterCache.data;
    }

    const [categoryRows, brandRows, priceAgg] = await Promise.all([
      Product.findAll({
        attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('category')), 'category']],
        where: { category: { [Op.ne]: null } },
        order: [[Sequelize.col('category'), 'ASC']],
        raw: true
      }),
      Product.findAll({
        attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('brand')), 'brand']],
        where: { brand: { [Op.ne]: null } },
        order: [[Sequelize.col('brand'), 'ASC']],
        raw: true
      }),
      Product.findAll({
        attributes: [
          [Sequelize.fn('MIN', Sequelize.col('price')), 'minPrice'],
          [Sequelize.fn('MAX', Sequelize.col('price')), 'maxPrice']
        ],
        raw: true
      })
    ]);

    const categories = categoryRows.map((r) => r.category).filter(Boolean);
    const brands = brandRows.map((r) => r.brand).filter(Boolean);
    const minPriceRaw = priceAgg[0]?.minPrice;
    const maxPriceRaw = priceAgg[0]?.maxPrice;

    const data = {
      categories,
      brands,
      priceRange: {
        min: minPriceRaw !== null && minPriceRaw !== undefined ? parseFloat(minPriceRaw) : 0,
        max: maxPriceRaw !== null && maxPriceRaw !== undefined ? parseFloat(maxPriceRaw) : 0
      }
    };

    filterCache = {
      data,
      expiresAt: now + FILTER_CACHE_TTL_MS
    };

    return data;
  }

  /**
   * Fetch a single product by ID
   */
  static async getProductById(id) {
    return Product.findByPk(id);
  }
}

module.exports = ProductSearchService;
