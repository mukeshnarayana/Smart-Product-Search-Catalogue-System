const request = require('supertest');
const app = require('../src/app');
const { Product } = require('../src/models');

describe('Security & SQL Injection Prevention Suite', () => {
  let initialProductCount = 0;

  beforeAll(async () => {
    initialProductCount = await Product.count();
  });

  const injectionPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE products;--",
    '" OR 1=1 --',
    '1; SELECT pg_sleep(5)'
  ];

  describe('SQL Injection Payloads in Query Parameters', () => {
    for (const payload of injectionPayloads) {
      it(`should safely handle SQL injection payload in q: "${payload}"`, async () => {
        const start = Date.now();
        const res = await request(app).get(`/api/products?q=${encodeURIComponent(payload)}`);
        const duration = Date.now() - start;

        // Must not cause a server crash or 500
        expect(res.status).not.toBe(500);
        expect([200, 400]).toContain(res.status);

        // If 200, results are treated literally (likely empty or only exact matches)
        if (res.status === 200) {
          expect(Array.isArray(res.body.data)).toBe(true);
        }

        // Must not execute pg_sleep (duration should be much lower than 5000ms)
        expect(duration).toBeLessThan(4000);

        // Verify products table was not dropped or corrupted
        const count = await Product.count();
        expect(count).toBe(initialProductCount);
      });

      it(`should safely handle SQL injection payload in category: "${payload}"`, async () => {
        const res = await request(app).get(`/api/products?category=${encodeURIComponent(payload)}`);
        expect(res.status).not.toBe(500);
        expect([200, 400]).toContain(res.status);

        if (res.status === 200) {
          expect(res.body.data).toEqual([]);
        }

        const count = await Product.count();
        expect(count).toBe(initialProductCount);
      });

      it(`should safely handle SQL injection payload in brand: "${payload}"`, async () => {
        const res = await request(app).get(`/api/products?brand=${encodeURIComponent(payload)}`);
        expect(res.status).not.toBe(500);
        expect([200, 400]).toContain(res.status);

        if (res.status === 200) {
          expect(res.body.data).toEqual([]);
        }

        const count = await Product.count();
        expect(count).toBe(initialProductCount);
      });

      it(`should reject or sanitize SQL injection payload in sort: "${payload}"`, async () => {
        const res = await request(app).get(`/api/products?sort=${encodeURIComponent(payload)}`);
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');

        const count = await Product.count();
        expect(count).toBe(initialProductCount);
      });

      it(`should reject SQL injection payload in numeric parameter minPrice: "${payload}"`, async () => {
        const res = await request(app).get(`/api/products?minPrice=${encodeURIComponent(payload)}`);
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');

        const count = await Product.count();
        expect(count).toBe(initialProductCount);
      });
    }
  });

  describe('Special Characters Escaping in q ("%", "_", "\\")', () => {
    it('should treat "%" literally without acting as a wildcard matching all rows', async () => {
      // Searching "100%" should only match products with literal "100%"
      const res = await request(app).get('/api/products?q=100%25');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.length).toBeLessThan(initialProductCount); // Must not return all products

      const match = res.body.data.find((p) => p.sku === 'TEST-0003');
      expect(match).toBeDefined();
      expect(match.name).toContain('100%');
    });

    it('should treat "_" literally without acting as a single-character wildcard matching everything', async () => {
      // Searching "_" should only match products with literal "_" (e.g. "Ultra_Speed USB-C Hub")
      const res = await request(app).get('/api/products?q=_');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.length).toBeLessThan(initialProductCount); // Must not match every product!

      const match = res.body.data.find((p) => p.sku === 'TEST-0004');
      expect(match).toBeDefined();
      expect(match.name).toContain('Ultra_Speed');
    });

    it('should treat "\\" backslash literally without throwing SQL syntax errors', async () => {
      const res = await request(app).get('/api/products?q=%5C');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.some((p) => p.name.includes('\\'));
      expect(found).toBe(true);
    });
  });
});
