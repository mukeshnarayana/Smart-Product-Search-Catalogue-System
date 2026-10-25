const { sequelize } = require('../src/models');

async function migrate(targetSequelize = sequelize) {
  console.log('[MIGRATE] Starting database migration...');

  try {
    // 1. Enable pg_trgm extension for fast trigram fuzzy matching
    console.log('[MIGRATE] Ensuring pg_trgm extension exists...');
    await targetSequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

    // 2. Synchronize model schema with database
    console.log('[MIGRATE] Syncing Product model...');
    await targetSequelize.sync();

    // 3. Add explicit CHECK constraints if not already present
    console.log('[MIGRATE] Checking database constraints...');
    const constraintQueries = [
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_price_positive') THEN
          ALTER TABLE products ADD CONSTRAINT check_price_positive CHECK (price >= 0);
        END IF;
      END $$;`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_rating_range') THEN
          ALTER TABLE products ADD CONSTRAINT check_rating_range CHECK (rating >= 0 AND rating <= 5);
        END IF;
      END $$;`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_stock_non_negative') THEN
          ALTER TABLE products ADD CONSTRAINT check_stock_non_negative CHECK (stock_quantity >= 0);
        END IF;
      END $$;`
    ];

    for (const q of constraintQueries) {
      await targetSequelize.query(q);
    }

    // 4. Create GIN Trigram indexes on searchable text fields
    console.log('[MIGRATE] Creating GIN trigram indexes...');
    const ginIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);',
      'CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON products USING gin (description gin_trgm_ops);',
      'CREATE INDEX IF NOT EXISTS idx_products_brand_trgm ON products USING gin (brand gin_trgm_ops);',
      'CREATE INDEX IF NOT EXISTS idx_products_category_trgm ON products USING gin (category gin_trgm_ops);',
      'CREATE INDEX IF NOT EXISTS idx_products_sku_trgm ON products USING gin (sku gin_trgm_ops);'
    ];

    for (const indexSql of ginIndexes) {
      await targetSequelize.query(indexSql);
    }

    // 5. Create B-Tree indexes on filter and sort fields
    console.log('[MIGRATE] Creating B-tree indexes...');
    const btreeIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);',
      'CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand);',
      'CREATE INDEX IF NOT EXISTS idx_products_price ON products (price);',
      'CREATE INDEX IF NOT EXISTS idx_products_rating ON products (rating);',
      'CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at);',
      'CREATE INDEX IF NOT EXISTS idx_products_in_stock ON products (in_stock);',
      'CREATE INDEX IF NOT EXISTS idx_products_category_price ON products (category, price);'
    ];

    for (const indexSql of btreeIndexes) {
      await targetSequelize.query(indexSql);
    }

    console.log('[MIGRATE] Migration completed successfully.');
  } catch (error) {
    console.error('[MIGRATE] Migration error:', error);
    throw error;
  }
}

if (require.main === module) {
  migrate()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = migrate;
