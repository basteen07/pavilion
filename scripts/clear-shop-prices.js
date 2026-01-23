const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function clearShopPrices() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const result = await client.query('UPDATE products SET shop_price = 0');
        console.log(`Successfully reset shop_price for ${result.rowCount} products.`);

    } catch (err) {
        console.error('Error executing query:', err);
    } finally {
        await client.end();
        console.log('Database connection closed.');
    }
}

clearShopPrices();
