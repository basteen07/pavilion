const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
    const client = await pool.connect();
    try {
        console.log('Checking quotation_items schema...');
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'quotation_items'
        `);
        console.log('Columns:', res.rows.map(r => `${r.column_name} (${r.data_type})`));

        console.log('\nChecking data sample (is_detailed)...');
        const data = await client.query(`SELECT id, is_detailed FROM quotation_items LIMIT 5`);
        console.log('Sample Data:', data.rows);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.release();
        process.exit(0);
    }
}

checkSchema();
