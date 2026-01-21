const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    const client = await pool.connect();
    try {
        console.log('--- Verification Results ---');

        // 1. Total Count
        const countRes = await client.query('SELECT COUNT(*) FROM products');
        console.log(`Total Products: ${countRes.rows[0].count}`);

        // 2. Pricing Logic Check
        // Expect 0 failures for dealer < mrp
        const dealerCheck = await client.query('SELECT COUNT(*) FROM products WHERE dealer_price >= mrp_price');
        console.log(`Products with Dealer >= MRP (Should be 0): ${dealerCheck.rows[0].count}`);

        // Expect most to have recommended between dealer and mrp
        // Note: use <= / >= to handle edge cases where they might be equal due to rounding
        const recCheck = await client.query(`
            SELECT COUNT(*) FROM products 
            WHERE recommended_price < dealer_price OR recommended_price > mrp_price
        `);
        console.log(`Products with Recommended out of range (Should be low/0): ${recCheck.rows[0].count}`);

        // 3. Category Distribution
        const catDist = await client.query(`
            SELECT c.name, COUNT(p.id) 
            FROM products p 
            JOIN categories c ON p.category_id = c.id 
            GROUP BY c.name 
            ORDER BY count DESC 
            LIMIT 5
        `);
        console.log('Top 5 Categories by Product Count:');
        catDist.rows.forEach(r => console.log(`- ${r.name}: ${r.count}`));

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}

verify();
