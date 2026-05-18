const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'brands' AND column_name = 'id'
        `);
        console.log('BRANDS.ID TYPE:', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
