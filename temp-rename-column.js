const { Client } = require('pg');
require('dotenv').config();

async function renameColumn() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database');
        await client.query('ALTER TABLE products RENAME COLUMN selling_price TO shop_price;');
        console.log('Successfully renamed column selling_price to shop_price');
    } catch (err) {
        console.error('Error renaming column:', err);
    } finally {
        await client.end();
    }
}

renameColumn();
