const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkProductSchema() {
    const client = await pool.connect();
    try {
        console.log('Checking products table columns...');
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'products'
        `);
        console.log('Product Columns:', res.rows.map(r => r.column_name));

        // Also check one product to see value
        const data = await client.query('SELECT * FROM products LIMIT 1');
        console.log('Sample Product:', data.rows[0]);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.release();
        process.exit(0);
    }
}

checkProductSchema();
