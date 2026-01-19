const { Client } = require('pg');
require('dotenv').config();

async function checkColumns() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products';
    `);
        console.log('Columns in products table:', res.rows.map(r => r.column_name).join(', '));
    } catch (err) {
        console.error('Error checking columns:', err);
    } finally {
        await client.end();
    }
}

checkColumns();
