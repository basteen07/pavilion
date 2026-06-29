const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    // Find all products with the tag "English Willow Cricket Bats"
    const res = await client.query(`
        SELECT p.name as product_name, b.name as brand_name, b.id as brand_id
        FROM products p
        JOIN brands b ON p.brand_id = b.id
        WHERE p.tag_id = '83a98539-5337-41cd-bad3-ff3a0bbf029f'
    `);

    console.log('Products under English Willow Cricket Bats and their brands:');
    console.log(res.rows);

    // Let's count unique brands in products under this tag
    const uniqueBrands = [...new Set(res.rows.map(r => r.brand_name))];
    console.log('Unique brands in products under this tag:', uniqueBrands);

    await client.end();
}

run().catch(console.error);
