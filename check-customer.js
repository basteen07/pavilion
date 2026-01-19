const { Client } = require('pg');
require('dotenv').config();

async function check() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        const id = 'fce30c59-6bd0-4377-a6f3-7fd694dda4de';
        const res = await client.query(`
            SELECT c.*, ct.name as customer_type_name, ct.percentage, ct.base_price_type
            FROM customers c
            LEFT JOIN customer_types ct ON c.customer_type_id = ct.id
            WHERE c.id = $1
        `, [id]);

        if (res.rows.length === 0) {
            console.log('Customer not found');
        } else {
            console.log('Customer Row:', JSON.stringify(res.rows[0], null, 2));
        }

        const types = await client.query('SELECT * FROM customer_types');
        console.log('All Customer Types:', JSON.stringify(types.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

check();
