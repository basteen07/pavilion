const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    
    // Find IDs of well-known cricket brands
    const names = ['SS', 'SG', 'KOOKABURRA', 'MRF', 'DSC', 'GRAY NICOLLS', 'SHREY', 'TYKA'];
    const res = await client.query("SELECT id, name FROM brands WHERE UPPER(name) = ANY($1)", [names]);
    console.log('Brands in DB matching names:', res.rows);

    // Let's see what is inside product_tags table for tag 'English Willow Cricket Bats'
    const tagRes = await client.query("SELECT id, name, brand_ids FROM product_tags WHERE name = 'English Willow Cricket Bats'");
    console.log('Tag English Willow Cricket Bats:', tagRes.rows[0]);

    await client.end();
}

run().catch(console.error);
