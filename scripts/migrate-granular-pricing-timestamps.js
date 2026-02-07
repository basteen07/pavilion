const { query } = require('../lib/simple-db');
require('dotenv').config();

async function runMigration() {
    console.log('Running granular pricing timestamp migration...');
    const columns = [
        'mrp_updated_at',
        'dealer_price_updated_at',
        'counter_price_updated_at',
        'recommended_price_updated_at',
        'shop_price_updated_at'
    ];

    try {
        for (const col of columns) {
            await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS ${col} TIMESTAMPTZ;`);
            console.log(`Added ${col} to products table`);

            await query(`ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS ${col} TIMESTAMPTZ;`);
            console.log(`Added ${col} to product_variants table`);
        }

        console.log('Granular migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
