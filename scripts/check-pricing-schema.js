const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
    try {
        console.log('Checking Products Table...');
        const productsInfo = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'products' 
            AND column_name = 'price_updated_at';
        `);
        console.log('Products price_updated_at:', productsInfo.rows);

        console.log('\nChecking Product Variants Table...');
        const variantsInfo = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'product_variants' 
            AND column_name = 'price_updated_at';
        `);
        console.log('Product Variants price_updated_at:', variantsInfo.rows);

    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        await pool.end();
    }
}

checkSchema();
