process.env.NODE_ENV = 'test';

const { sequelize, Product } = require('../src/models');
const migrate = require('../scripts/migrate');
const { seed } = require('../scripts/seed');
const ProductSearchService = require('../src/services/productSearch.service');

beforeAll(async () => {
  // Ensure tables, extensions, and indexes are up to date
  await migrate();

  // If table has fewer than 600 products, run deterministic seed
  const count = await Product.count();
  if (count < 600) {
    await seed({ reset: true });
  }

  // Ensure special backslash test item exists for test coverage
  const backslashSku = 'TEST-BS-0001';
  const existingBs = await Product.findOne({ where: { sku: backslashSku } });
  if (!existingBs) {
    await Product.create({
      sku: backslashSku,
      name: 'Special \\ Backslash Gadget',
      description: 'Gadget with a literal \\ backslash character in the title and description.',
      brand: 'Anker',
      category: 'Accessories',
      price: 29.99,
      rating: 4.5,
      in_stock: true,
      stock_quantity: 40,
      image_url: `https://picsum.photos/seed/${backslashSku}/400/400`,
      created_at: new Date('2024-05-10T10:00:00.000Z'),
      updated_at: new Date('2024-05-10T10:00:00.000Z')
    });
  }

  ProductSearchService.clearFilterCache();
}, 60000);

afterAll(async () => {
  try {
    await sequelize.close();
  } catch (err) {
    // Ignore close errors during exit
  }
});
