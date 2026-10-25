import { http, HttpResponse, delay } from 'msw';

export const mockProducts = [
  {
    id: 'prod-1',
    sku: 'TEST-0001',
    name: 'Wireless Mouse Pro',
    brand: 'Logitech',
    category: 'Accessories',
    price: 49.99,
    rating: 4.8,
    in_stock: true,
    stock_quantity: 75,
    image_url: 'https://picsum.photos/seed/TEST-0001/400/400',
    created_at: '2024-01-10T10:00:00.000Z',
  },
  {
    id: 'prod-2',
    sku: 'TEST-0002',
    name: 'Mechanical Gaming Keyboard',
    brand: 'Corsair',
    category: 'Gaming',
    price: 119.99,
    rating: 4.7,
    in_stock: true,
    stock_quantity: 50,
    image_url: 'https://picsum.photos/seed/TEST-0002/400/400',
    created_at: '2024-02-15T14:30:00.000Z',
  },
  {
    id: 'prod-3',
    sku: 'TEST-0003',
    name: 'Noise Cancelling Headphones',
    brand: 'Sony',
    category: 'Audio',
    price: 299.99,
    rating: 4.9,
    in_stock: false,
    stock_quantity: 0,
    image_url: 'https://picsum.photos/seed/TEST-0003/400/400',
    created_at: '2024-03-01T09:15:00.000Z',
  },
];

export const mockFilterData = {
  categories: ['Accessories', 'Audio', 'Gaming', 'Computers'],
  brands: ['Corsair', 'Logitech', 'Sony', 'Apple'],
  priceRange: { min: 15, max: 999 },
};

export const handlers = [
  // GET /api/products/filters
  http.get('/api/products/filters', () => {
    return HttpResponse.json({
      data: mockFilterData,
    });
  }),

  // GET /api/products
  http.get('/api/products', ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q');
    const category = url.searchParams.get('category');
    const brand = url.searchParams.get('brand');
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');
    const minRating = url.searchParams.get('minRating');
    const inStock = url.searchParams.get('inStock');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const requestId = url.searchParams.get('requestId');

    let filtered = [...mockProducts];

    if (q) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.brand.toLowerCase().includes(q.toLowerCase()) ||
        p.sku.toLowerCase().includes(q.toLowerCase())
      );
    }

    if (category) {
      const cats = category.split(',');
      filtered = filtered.filter((p) => cats.includes(p.category));
    }

    if (brand) {
      const brands = brand.split(',');
      filtered = filtered.filter((p) => brands.includes(p.brand));
    }

    if (minPrice) {
      filtered = filtered.filter((p) => p.price >= parseFloat(minPrice));
    }

    if (maxPrice) {
      filtered = filtered.filter((p) => p.price <= parseFloat(maxPrice));
    }

    if (minRating) {
      filtered = filtered.filter((p) => p.rating >= parseFloat(minRating));
    }

    if (inStock === 'true') {
      filtered = filtered.filter((p) => p.in_stock === true);
    } else if (inStock === 'false') {
      filtered = filtered.filter((p) => p.in_stock === false);
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 0;
    const offset = (page - 1) * limit;
    const paged = filtered.slice(offset, offset + limit);

    return HttpResponse.json({
      data: paged,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      appliedFilters: {
        q: q || null,
        category: category ? category.split(',') : null,
        brand: brand ? brand.split(',') : null,
        minPrice: minPrice ? parseFloat(minPrice) : null,
        maxPrice: maxPrice ? parseFloat(maxPrice) : null,
        minRating: minRating ? parseFloat(minRating) : null,
        inStock: inStock === 'true' ? true : inStock === 'false' ? false : null,
      },
      meta: {
        requestId: requestId || null,
        timestamp: new Date().toISOString(),
      },
    });
  }),
];
