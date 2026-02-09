require('dotenv').config();
const { Pool } = require('pg');

async function truncateTables() {
    const config = {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    };
    const pool = new Pool(config);
    try {
        console.log('--- Truncating products and product_variants tables ---');
        await pool.query('TRUNCATE products, product_variants CASCADE');
        console.log('Tables truncated successfully.');
    } catch (err) {
        console.error('Error truncating tables:', err);
    } finally {
        await pool.end();
    }
}

truncateTables();
