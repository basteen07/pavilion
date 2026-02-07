const { query } = require('../lib/simple-db');
require('dotenv').config();

async function runMigration() {
    console.log('Running pricing timestamp migration...');
    try {
        await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMPTZ;`);
        console.log('Added price_updated_at to products table');

        await query(`ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMPTZ;`);
        console.log('Added price_updated_at to product_variants table');

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
