
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
        console.log('Dropping old constraint...');
        await client.query('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey');

        console.log('Adding new constraint pointing to b2b_customers...');
        await client.query('ALTER TABLE orders ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES b2b_customers(id)');

        console.log('Success: Orders FK updated to reference b2b_customers.');
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        client.release();
        pool.end();
    }
}

run();
