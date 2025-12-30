
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    try {
        const counts = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM customers) as customers_count,
                (SELECT COUNT(*) FROM b2b_customers) as b2b_count,
                (SELECT COUNT(*) FROM orders) as orders_count
        `);
        console.log(counts.rows[0]);
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}

run();
