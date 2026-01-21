const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    const client = await pool.connect();
    try {
        console.log('--- Verification: Brand-Category Mappings ---');

        // Check for specific known combinations
        const checks = [
            { brand: 'SS', category: 'Cricket' },
            { brand: 'Yonex', category: 'Badminton' },
            { brand: 'Yonex', category: 'Tennis' },
            { brand: 'Stiga', category: 'Table Tennis' }
        ];

        for (const check of checks) {
            const res = await client.query(`
                SELECT count(p.id) 
                FROM products p
                JOIN brands b ON p.brand_id = b.id
                JOIN categories c ON p.category_id = c.id
                WHERE b.name = $1 AND c.name = $2
            `, [check.brand, check.category]);
            console.log(`${check.brand} in ${check.category}: ${res.rows[0].count} products`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}

verify();
