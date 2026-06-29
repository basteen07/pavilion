const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    // Check products brand_id
    const productsRes = await client.query("SELECT p.id, p.name, p.brand_id, b.name as brand_name FROM products p LEFT JOIN brands b ON p.brand_id = b.id LIMIT 10");
    console.log('Sample products and their brand mapping:');
    console.log(productsRes.rows);

    // Count products with invalid/null brand references (where brand_id is NOT NULL but does not exist in brands table)
    const invalidProductsRes = await client.query("SELECT COUNT(*) FROM products WHERE brand_id IS NOT NULL AND brand_id NOT IN (SELECT id FROM brands)");
    console.log('Products with invalid brand IDs:', invalidProductsRes.rows[0].count);

    await client.end();
}

run().catch(console.error);
