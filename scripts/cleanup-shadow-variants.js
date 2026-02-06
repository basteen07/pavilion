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

async function runCleanup() {
    try {
        console.log('Connecting to database...');

        // Find variants that are effectively "shadows" of the main product
        // 1. Same SKU as the product
        // 2. No unique attributes (size, color, etc are empty)
        console.log('Identifying redundant base variants...');

        const result = await pool.query(`
            DELETE FROM product_variants pv
            USING products p
            WHERE pv.product_id = p.id
            AND pv.sku = p.sku
            AND (pv.size IS NULL OR pv.size = '')
            AND (pv.color IS NULL OR pv.color = '')
            AND (pv.option1_name IS NULL OR pv.option1_name = '')
            AND (pv.option1_value IS NULL OR pv.option1_value = '')
            AND (pv.option2_name IS NULL OR pv.option2_name = '')
            AND (pv.option2_value IS NULL OR pv.option2_value = '')
            RETURNING pv.id, p.sku, p.name;
        `);

        if (result.rowCount > 0) {
            console.log(`Successfully removed ${result.rowCount} redundant variants:`);
            result.rows.forEach(row => {
                console.log(` - Removed shadow variant for product: ${row.name} (${row.sku})`);
            });
        } else {
            console.log('No redundant base variants found. Database is already clean.');
        }

        console.log('\nMigration Cleanup Complete!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

runCleanup();
