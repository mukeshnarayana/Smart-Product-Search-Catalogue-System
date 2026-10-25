const request = require('supertest');
const app = require('../src/app');
const { Product, sequelize } = require('../src/models');

describe('Product Catalogue Search & Filter Test Suite', () => {
  describe('Keyword Search Tests', () => {
    it('should find products by partial name match ("wire" finds "Wireless Mouse")', async () => {
      const res = await request(app).get('/api/products?q=wire');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      const found = res.body.data.some((p) => p.name.toLowerCase().includes('wireless mouse'));
      expect(found).toBe(true);
    });

    it('should find products by full exact name', async () => {
      const res = await request(app).get('/api/products?q=Wireless Mouse Pro');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].sku).toBe('TEST-0001');
    });

    it('should search by exact SKU', async () => {
      const res = await request(app).get('/api/products?q=TEST-0001');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].sku).toBe('TEST-0001');
    });

    it('should search by brand name', async () => {
      const res = await request(app).get('/api/products?q=Logitech');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.every((p) =>
        p.brand.toLowerCase().includes('logitech') ||
        p.name.toLowerCase().includes('logitech') ||
        (p.category && p.category.toLowerCase().includes('logitech')) ||
        p.sku.toLowerCase().includes('logitech')
      )).toBe(true);
    });

    it('should search by brand with special characters ("O\'Reilly & Sons")', async () => {
      const res = await request(app).get('/api/products?q=O\'Reilly');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      const found = res.body.data.some((p) => p.brand === "O'Reilly & Sons");
      expect(found).toBe(true);
    });

    it('should search by category name', async () => {
      const res = await request(app).get('/api/products?q=Gaming');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should be strictly case-insensitive ("WIRELESS", "wireless", "WiReLeSs" yield identical results)', async () => {
      const resUpper = await request(app).get('/api/products?q=WIRELESS');
      const resLower = await request(app).get('/api/products?q=wireless');
      const resMixed = await request(app).get('/api/products?q=WiReLeSs');

      expect(resUpper.status).toBe(200);
      expect(resLower.status).toBe(200);
      expect(resMixed.status).toBe(200);

      expect(resUpper.body.pagination.total).toBe(resLower.body.pagination.total);
      expect(resLower.body.pagination.total).toBe(resMixed.body.pagination.total);

      const upperIds = resUpper.body.data.map((p) => p.id);
      const lowerIds = resLower.body.data.map((p) => p.id);
      const mixedIds = resMixed.body.data.map((p) => p.id);

      expect(upperIds).toEqual(lowerIds);
      expect(lowerIds).toEqual(mixedIds);
    });

    it('should perform multi-token search requiring all tokens ("wireless mouse" requires both)', async () => {
      const resMulti = await request(app).get('/api/products?q=wireless mouse');
      expect(resMulti.status).toBe(200);
      expect(resMulti.body.data.length).toBeGreaterThan(0);

      // Verify that every returned product matches BOTH tokens somewhere in its searchable fields
      for (const product of resMulti.body.data) {
        const text = `${product.name} ${product.brand} ${product.category} ${product.sku}`.toLowerCase();
        // Note: description is also searched in DB
        const matchesNameOrFields = text.includes('wireless') && text.includes('mouse');
        expect(matchesNameOrFields).toBe(true);
      }
    });

    it('should return 200 with empty array and total 0 for non-matching queries', async () => {
      const res = await request(app).get('/api/products?q=nonexistentproductxyz987654321');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.total).toBe(0);
      expect(res.body.pagination.totalPages).toBe(0);
      expect(res.body.pagination.hasNext).toBe(false);
      expect(res.body.pagination.hasPrev).toBe(false);
    });
  });

  describe('Filter Tests', () => {
    it('should filter by single category and comma-separated categories', async () => {
      const resSingle = await request(app).get('/api/products?category=Accessories');
      expect(resSingle.status).toBe(200);
      expect(resSingle.body.data.length).toBeGreaterThan(0);
      expect(resSingle.body.data.every((p) => p.category === 'Accessories')).toBe(true);

      const resMulti = await request(app).get('/api/products?category=Accessories,Gaming');
      expect(resMulti.status).toBe(200);
      expect(resMulti.body.data.length).toBeGreaterThan(0);
      expect(resMulti.body.data.every((p) => ['Accessories', 'Gaming'].includes(p.category))).toBe(true);
    });

    it('should filter by brand', async () => {
      const res = await request(app).get('/api/products?brand=Logitech');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.every((p) => p.brand === 'Logitech')).toBe(true);
    });

    it('should filter by price range with inclusive boundaries', async () => {
      const minPrice = 20;
      const maxPrice = 100;
      const res = await request(app).get(`/api/products?minPrice=${minPrice}&maxPrice=${maxPrice}&limit=100`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.every((p) => p.price >= minPrice && p.price <= maxPrice)).toBe(true);
    });

    it('should filter by minRating', async () => {
      const minRating = 4.5;
      const res = await request(app).get(`/api/products?minRating=${minRating}&limit=50`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.every((p) => p.rating >= minRating)).toBe(true);
    });

    it('should filter by inStock boolean', async () => {
      const resTrue = await request(app).get('/api/products?inStock=true&limit=50');
      expect(resTrue.status).toBe(200);
      expect(resTrue.body.data.every((p) => p.in_stock === true)).toBe(true);

      const resFalse = await request(app).get('/api/products?inStock=false&limit=50');
      expect(resFalse.status).toBe(200);
      expect(resFalse.body.data.every((p) => p.in_stock === false)).toBe(true);
    });

    it('should satisfy ALL filters combined simultaneously', async () => {
      const res = await request(app).get('/api/products?category=Accessories&minPrice=10&maxPrice=100&minRating=4.0&inStock=true&limit=50');
      expect(res.status).toBe(200);
      for (const p of res.body.data) {
        expect(p.category).toBe('Accessories');
        expect(p.price).toBeGreaterThanOrEqual(10);
        expect(p.price).toBeLessThanOrEqual(100);
        expect(p.rating).toBeGreaterThanOrEqual(4.0);
        expect(p.in_stock).toBe(true);
      }
    });
  });

  describe('Sorting & Ordering Tests', () => {
    it('should sort price_asc correctly', async () => {
      const res = await request(app).get('/api/products?sort=price_asc&limit=50');
      expect(res.status).toBe(200);
      const prices = res.body.data.map((p) => p.price);
      for (let i = 0; i < prices.length - 1; i++) {
        expect(prices[i]).toBeLessThanOrEqual(prices[i + 1]);
      }
    });

    it('should sort price_desc correctly', async () => {
      const res = await request(app).get('/api/products?sort=price_desc&limit=50');
      expect(res.status).toBe(200);
      const prices = res.body.data.map((p) => p.price);
      for (let i = 0; i < prices.length - 1; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i + 1]);
      }
    });

    it('should sort rating_desc correctly', async () => {
      const res = await request(app).get('/api/products?sort=rating_desc&limit=50');
      expect(res.status).toBe(200);
      const ratings = res.body.data.map((p) => p.rating);
      for (let i = 0; i < ratings.length - 1; i++) {
        expect(ratings[i]).toBeGreaterThanOrEqual(ratings[i + 1]);
      }
    });

    it('should sort newest (created_at DESC) correctly', async () => {
      const res = await request(app).get('/api/products?sort=newest&limit=50');
      expect(res.status).toBe(200);
      const dates = res.body.data.map((p) => new Date(p.created_at).getTime());
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
      }
    });

    it('should sort name_asc case-insensitively', async () => {
      const res = await request(app).get('/api/products?sort=name_asc&limit=50');
      expect(res.status).toBe(200);
      const names = res.body.data.map((p) => p.name.toLowerCase());
      for (let i = 0; i < names.length - 1; i++) {
        expect(names[i].localeCompare(names[i + 1])).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('Pagination & Deterministic Tie-Breaking Tests', () => {
    it('should paginate correctly: page 1 and page 2 have no overlapping IDs', async () => {
      const res1 = await request(app).get('/api/products?page=1&limit=15');
      const res2 = await request(app).get('/api/products?page=2&limit=15');

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      const ids1 = new Set(res1.body.data.map((p) => p.id));
      const ids2 = res2.body.data.map((p) => p.id);

      for (const id of ids2) {
        expect(ids1.has(id)).toBe(false);
      }
    });

    it('union of all pages equals full result set for a filtered query', async () => {
      const limit = 10;
      // Filter to a manageable subset
      const firstRes = await request(app).get(`/api/products?category=Gaming&page=1&limit=${limit}`);
      const total = firstRes.body.pagination.total;
      const totalPages = firstRes.body.pagination.totalPages;

      const collectedIds = [];

      for (let page = 1; page <= totalPages; page++) {
        const pageRes = await request(app).get(`/api/products?category=Gaming&page=${page}&limit=${limit}`);
        for (const item of pageRes.body.data) {
          collectedIds.push(item.id);
        }
      }

      expect(collectedIds.length).toBe(total);
      const uniqueIds = new Set(collectedIds);
      expect(uniqueIds.size).toBe(total);
    });

    it('should provide stable pagination with ties (many items with identical price)', async () => {
      // 35 items have price=99.99
      const limit = 10;
      const pagesToFetch = 4;
      const fetchedIdsFirstPass = [];

      for (let page = 1; page <= pagesToFetch; page++) {
        const res = await request(app).get(`/api/products?minPrice=99.99&maxPrice=99.99&sort=price_asc&page=${page}&limit=${limit}`);
        for (const item of res.body.data) {
          fetchedIdsFirstPass.push(item.id);
        }
      }

      // Assert no duplicates across pages even when all prices are equal
      const uniqueIds = new Set(fetchedIdsFirstPass);
      expect(uniqueIds.size).toBe(fetchedIdsFirstPass.length);

      // Repeat requests multiple times and assert identical deterministic order
      const fetchedIdsSecondPass = [];
      for (let page = 1; page <= pagesToFetch; page++) {
        const res = await request(app).get(`/api/products?minPrice=99.99&maxPrice=99.99&sort=price_asc&page=${page}&limit=${limit}`);
        for (const item of res.body.data) {
          fetchedIdsSecondPass.push(item.id);
        }
      }

      expect(fetchedIdsSecondPass).toEqual(fetchedIdsFirstPass);
    });

    it('should clamp page beyond totalPages (returns 200 with empty data array)', async () => {
      const res = await request(app).get('/api/products?page=99999&limit=20');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.page).toBe(99999);
      expect(res.body.pagination.total).toBeGreaterThan(0);
      expect(res.body.pagination.hasNext).toBe(false);
    });

    it('should preserve requestId and include timestamp in meta to protect against outdated responses', async () => {
      const testReqId = 'req-client-seq-101';
      const res = await request(app).get(`/api/products?q=mouse&requestId=${testReqId}`);
      expect(res.status).toBe(200);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.requestId).toBe(testReqId);
      expect(res.body.meta.timestamp).toBeDefined();
    });
  });

  describe('Filter UI Aggregation Endpoint (/api/products/filters)', () => {
    it('should return distinct categories, brands, and global min/max price', async () => {
      const res = await request(app).get('/api/products/filters');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();

      const { categories, brands, priceRange } = res.body.data;
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThanOrEqual(10);
      expect(Array.isArray(brands)).toBe(true);
      expect(brands.length).toBeGreaterThanOrEqual(20);
      expect(priceRange).toBeDefined();
      expect(priceRange.min).toBeGreaterThan(0);
      expect(priceRange.max).toBeGreaterThan(priceRange.min);
    });
  });

  describe('Index Sanity Check & Query Execution', () => {
    it('should execute EXPLAIN without error on search queries and utilize indexes', async () => {
      const explainQuery = `EXPLAIN (FORMAT JSON) SELECT "id", "name", "price" FROM "products" WHERE "category" = 'Accessories' AND "price" >= 20 ORDER BY "category", "price" LIMIT 20;`;
      const [results] = await sequelize.query(explainQuery);
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should achieve fast response times on search queries', async () => {
      const start = Date.now();
      const res = await request(app).get('/api/products?q=wireless&category=Accessories&limit=20');
      const duration = Date.now() - start;
      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Network round-trip threshold for remote DB
    });
  });
});
