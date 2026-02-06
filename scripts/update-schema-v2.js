const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load env vars manually
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value && !process.env[key]) {
            process.env[key.trim()] = value.trim();
        }
    });
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log('Connected to database...');

        // 1. Add images column to product_variants
        console.log('Adding images column to product_variants...');
        await pool.query(`
            ALTER TABLE product_variants 
            ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';
        `);

        // 2. Add base attributes to products table
        console.log('Adding base attributes to products table...');
        await pool.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS size TEXT,
            ADD COLUMN IF NOT EXISTS color TEXT,
            ADD COLUMN IF NOT EXISTS option1_name TEXT,
            ADD COLUMN IF NOT EXISTS option1_value TEXT,
            ADD COLUMN IF NOT EXISTS option2_name TEXT,
            ADD COLUMN IF NOT EXISTS option2_value TEXT;
        `);

        // 3. Cleanup redundant "base variants"
        // Remove variants that have the same SKU as the product and no unique attributes
        console.log('Cleaning up redundant base variants...');
        const cleanupResult = await pool.query(`
            DELETE FROM product_variants pv
            USING products p
            WHERE pv.product_id = p.id
            AND pv.sku = p.sku
            AND (pv.size IS NULL OR pv.size = '')
            AND (pv.color IS NULL OR pv.color = '')
            AND (pv.option1_name IS NULL OR pv.option1_name = '')
            AND (pv.option2_name IS NULL OR pv.option2_name = '')
            RETURNING pv.id;
        `);
        console.log(`Cleaned up ${cleanupResult.rowCount} redundant variants.`);

        console.log('Schema update complete!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
