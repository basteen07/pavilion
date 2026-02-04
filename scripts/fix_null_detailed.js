const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixNulls() {
    console.log('Fixing NULL is_detailed values...');
    const client = await pool.connect();
    try {
        const res = await client.query(`UPDATE quotation_items SET is_detailed = false WHERE is_detailed IS NULL`);
        console.log(`Updated ${res.rowCount} rows.`);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.release();
        process.exit(0);
    }
}

fixNulls();
