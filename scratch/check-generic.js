const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    const res = await client.query("SELECT id, name FROM brands WHERE name ILIKE '%generic%'");
    console.log('Generic search results:', res.rows);

    await client.end();
}

run().catch(console.error);
