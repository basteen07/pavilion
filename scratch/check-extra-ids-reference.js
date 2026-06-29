const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    const extraIds = [
      '1eec376c-4bb9-4492-ae13-79457addac82',
      'b5aacfb4-123a-4c87-9eca-9ee66c9d44ff',
      '70286c06-4728-4c06-892d-287b6679a769',
      '6a8ba48c-167f-4a26-b8a1-9ed9c404255a',
      '7a429bd7-bbec-4cf9-b6de-0cd1d98c1382',
      'bc4fc984-99b9-4fdd-990e-1cd7bdaf3017'
    ];

    const prodRes = await client.query("SELECT id, name, brand_id FROM products WHERE brand_id = ANY($1::uuid[])", [extraIds]);
    console.log('Products referencing extra IDs:', prodRes.rows);

    await client.end();
}

run().catch(console.error);
