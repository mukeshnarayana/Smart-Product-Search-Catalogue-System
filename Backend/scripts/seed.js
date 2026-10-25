const { faker } = require('@faker-js/faker');
const { Product, sequelize } = require('../src/models');

const CATEGORIES = [
  'Electronics',
  'Audio',
  'Computers',
  'Smartphones',
  'Wearables',
  'Gaming',
  'Cameras',
  'Accessories',
  'Home Appliances',
  'Office Electronics',
  'Networking',
  'Smart Home'
];

const BRANDS = [
  'Sony',
  'Apple',
  'Samsung',
  'Bose',
  'Logitech',
  'Dell',
  'HP',
  'Lenovo',
  'Asus',
  'Microsoft',
  'Canon',
  'Nikon',
  'Anker',
  'Sennheiser',
  'JBL',
  'Razer',
  'Corsair',
  'LG',
  'Philips',
  'Garmin',
  'Fitbit',
  'SteelSeries',
  'Google',
  'OnePlus',
  "O'Reilly & Sons"
];

function generateProducts(count = 650) {
  // Use fixed seed for reproducibility
  faker.seed(123456);

  const products = [];

  // 1. Mandatory test fixtures
  const fixtures = [
    {
      sku: 'TEST-0001',
      name: 'Wireless Mouse Pro',
      description: 'Ergonomic wireless optical mouse with ultra precision sensor and rechargeable battery.',
      brand: 'Logitech',
      category: 'Accessories',
      price: 49.99,
      rating: 4.8,
      in_stock: true,
      stock_quantity: 75,
      image_url: 'https://picsum.photos/seed/TEST-0001/400/400',
      created_at: new Date('2024-01-10T10:00:00.000Z'),
      updated_at: new Date('2024-01-10T10:00:00.000Z')
    },
    {
      sku: 'TEST-0002',
      name: 'Smart Hub 2000',
      description: "Centralized automation controller by O'Reilly & Sons with Zigbee and Matter support.",
      brand: "O'Reilly & Sons",
      category: 'Smart Home',
      price: 129.99,
      rating: 4.5,
      in_stock: true,
      stock_quantity: 30,
      image_url: 'https://picsum.photos/seed/TEST-0002/400/400',
      created_at: new Date('2024-02-15T14:30:00.000Z'),
      updated_at: new Date('2024-02-15T14:30:00.000Z')
    },
    {
      sku: 'TEST-0003',
      name: '100% Mechanical Gaming Keyboard',
      description: 'Full sized 100% layout mechanical gaming keyboard with hot-swappable switches and RGB.',
      brand: 'Corsair',
      category: 'Gaming',
      price: 119.99,
      rating: 4.7,
      in_stock: true,
      stock_quantity: 50,
      image_url: 'https://picsum.photos/seed/TEST-0003/400/400',
      created_at: new Date('2024-03-01T09:15:00.000Z'),
      updated_at: new Date('2024-03-01T09:15:00.000Z')
    },
    {
      sku: 'TEST-0004',
      name: 'Ultra_Speed USB-C Hub',
      description: 'Multi-port USB-C adapter hub with 10Gbps data transfer, 4K HDMI, and 100W PD pass-through.',
      brand: 'Anker',
      category: 'Accessories',
      price: 39.99,
      rating: 4.6,
      in_stock: true,
      stock_quantity: 120,
      image_url: 'https://picsum.photos/seed/TEST-0004/400/400',
      created_at: new Date('2024-04-12T11:00:00.000Z'),
      updated_at: new Date('2024-04-12T11:00:00.000Z')
    }
  ];

  products.push(...fixtures);

  // 2. Tie-breaking test clusters (identical price, rating, and created_at to stress tiebreaker ordering)
  const tiePriceA = 99.99;
  const tieRatingA = 4.2;
  const tieDateA = new Date('2024-05-01T12:00:00.000Z');

  for (let i = 1; i <= 35; i++) {
    const sku = `TIE-A-${String(i).padStart(4, '0')}`;
    products.push({
      sku,
      name: `Standard Tie Product A ${i}`,
      description: `Tie-breaker sample product A ${i} with identical price, rating, and creation date.`,
      brand: BRANDS[i % BRANDS.length],
      category: CATEGORIES[i % CATEGORIES.length],
      price: tiePriceA,
      rating: tieRatingA,
      in_stock: true,
      stock_quantity: 25,
      image_url: `https://picsum.photos/seed/${sku}/400/400`,
      created_at: tieDateA,
      updated_at: tieDateA
    });
  }

  const tiePriceB = 24.99;
  const tieRatingB = 4.5;
  const tieDateB = new Date('2024-06-15T12:00:00.000Z');

  for (let i = 1; i <= 35; i++) {
    const sku = `TIE-B-${String(i).padStart(4, '0')}`;
    products.push({
      sku,
      name: `Budget Tie Product B ${i}`,
      description: `Tie-breaker sample product B ${i} with identical pricing and ratings.`,
      brand: BRANDS[i % BRANDS.length],
      category: CATEGORIES[i % CATEGORIES.length],
      price: tiePriceB,
      rating: tieRatingB,
      in_stock: true,
      stock_quantity: 60,
      image_url: `https://picsum.photos/seed/${sku}/400/400`,
      created_at: tieDateB,
      updated_at: tieDateB
    });
  }

  // 3. Generate remaining products to reach target count (650+)
  const now = Date.now();
  const twoYearsAgo = now - 2 * 365 * 24 * 60 * 60 * 1000;

  const remaining = count - products.length;
  for (let i = 1; i <= remaining; i++) {
    const sku = `PROD-${String(i).padStart(5, '0')}`;
    const brand = faker.helpers.arrayElement(BRANDS);
    const category = faker.helpers.arrayElement(CATEGORIES);
    const noun = faker.commerce.product();
    const adjective = faker.commerce.productAdjective();
    const material = faker.commerce.productMaterial();
    const name = `${brand} ${adjective} ${material} ${noun}`;

    // ~20% out of stock
    const inStock = faker.number.int({ min: 1, max: 100 }) > 20;
    const stockQuantity = inStock ? faker.number.int({ min: 1, max: 250 }) : 0;

    // Price between 5 and 5000
    const rawPrice = faker.number.float({ min: 5, max: 5000, fractionDigits: 2 });
    const price = Math.round(rawPrice * 100) / 100;

    // Rating between 1.0 and 5.0
    const rawRating = faker.number.float({ min: 1.0, max: 5.0, fractionDigits: 1 });
    const rating = Math.round(rawRating * 10) / 10;

    // Created at spread over last 2 years
    const timestamp = faker.number.int({ min: twoYearsAgo, max: now });
    const createdAt = new Date(timestamp);

    products.push({
      sku,
      name,
      description: faker.commerce.productDescription(),
      brand,
      category,
      price,
      rating,
      in_stock: inStock,
      stock_quantity: stockQuantity,
      image_url: `https://picsum.photos/seed/${sku}/400/400`,
      created_at: createdAt,
      updated_at: createdAt
    });
  }

  return products;
}

async function seed(options = {}) {
  const isReset = options.reset || process.argv.includes('--reset');

  console.log(`[SEED] Starting database seeding (reset=${isReset})...`);

  try {
    const existingCount = await Product.count();
    if (existingCount > 0 && !isReset) {
      console.log(`[SEED] Products table already contains ${existingCount} items. Use --reset to re-seed.`);
      return;
    }

    if (isReset) {
      console.log('[SEED] Truncating products table...');
      await sequelize.query('TRUNCATE TABLE products RESTART IDENTITY CASCADE;');
    }

    const products = generateProducts(660);
    console.log(`[SEED] Generated ${products.length} deterministic products. Inserting in batches of 100...`);

    const batchSize = 100;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      await Product.bulkCreate(batch, { validate: true });
      console.log(`[SEED] Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} items)...`);
    }

    const finalCount = await Product.count();
    console.log(`[SEED] Seeding completed successfully! Total products in database: ${finalCount}`);
  } catch (error) {
    console.error('[SEED] Seeding error:', error);
    throw error;
  }
}

if (require.main === module) {
  seed()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = {
  seed,
  generateProducts,
  CATEGORIES,
  BRANDS
};
