const request = require('supertest');
const app = require('../src/app');

describe('Validation and Error Handling Tests', () => {
  describe('GET /api/products query validation', () => {
    it('should reject negative minPrice with 400 VALIDATION_ERROR', async () => {
      const res = await request(app).get('/api/products?minPrice=-10');
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.error.details)).toBe(true);
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'minPrice',
            message: expect.stringMatching(/greater than or equal to 0/i)
          })
        ])
      );
    });

    it('should reject minPrice > maxPrice with 400 VALIDATION_ERROR', async () => {
      const res = await request(app).get('/api/products?minPrice=100&maxPrice=50');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      const details = res.body.error.details;
      expect(details.some(d => d.field.includes('Price') && /greater than/i.test(d.message))).toBe(true);
    });

    it('should reject non-numeric minPrice or maxPrice with 400', async () => {
      const res = await request(app).get('/api/products?minPrice=abc&maxPrice=xyz');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some(d => d.field === 'minPrice')).toBe(true);
      expect(res.body.error.details.some(d => d.field === 'maxPrice')).toBe(true);
    });

    it('should reject rating outside 0-5 with 400', async () => {
      const resHigh = await request(app).get('/api/products?minRating=6');
      expect(resHigh.status).toBe(400);
      expect(resHigh.body.error.code).toBe('VALIDATION_ERROR');
      expect(resHigh.body.error.details.some(d => d.field === 'minRating')).toBe(true);

      const resNeg = await request(app).get('/api/products?minRating=-1');
      expect(resNeg.status).toBe(400);
      expect(resNeg.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject unknown sort value with 400', async () => {
      const res = await request(app).get('/api/products?sort=invalid_sort_key');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some(d => d.field === 'sort')).toBe(true);
    });

    it('should reject page < 1 with 400', async () => {
      const resZero = await request(app).get('/api/products?page=0');
      expect(resZero.status).toBe(400);
      expect(resZero.body.error.code).toBe('VALIDATION_ERROR');
      expect(resZero.body.error.details.some(d => d.field === 'page')).toBe(true);

      const resNeg = await request(app).get('/api/products?page=-2');
      expect(resNeg.status).toBe(400);
    });

    it('should reject limit > 100 or limit < 1 with 400', async () => {
      const res1000 = await request(app).get('/api/products?limit=1000');
      expect(res1000.status).toBe(400);
      expect(res1000.body.error.code).toBe('VALIDATION_ERROR');
      expect(res1000.body.error.details.some(d => d.field === 'limit')).toBe(true);

      const resZero = await request(app).get('/api/products?limit=0');
      expect(resZero.status).toBe(400);
      expect(resZero.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject q longer than 100 characters with 400', async () => {
      const longQuery = 'a'.repeat(101);
      const res = await request(app).get(`/api/products?q=${longQuery}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some(d => d.field === 'q')).toBe(true);
    });

    it('should ignore unknown query parameters gracefully and return 200', async () => {
      const res = await request(app).get('/api/products?unknown_param=xyz&another_random=123');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('Route and Resource 404 tests', () => {
    it('should return 404 with structured error for non-existent route', async () => {
      const res = await request(app).get('/api/non-existent-endpoint');
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 for non-existent product ID', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app).get(`/api/products/${fakeUuid}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
  });
});
