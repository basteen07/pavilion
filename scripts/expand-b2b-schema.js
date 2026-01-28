require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log('Adding new fields to b2b_customers table...');
        await pool.query(`
            ALTER TABLE b2b_customers 
            ADD COLUMN IF NOT EXISTS first_name TEXT,
            ADD COLUMN IF NOT EXISTS last_name TEXT,
            ADD COLUMN IF NOT EXISTS pan_number TEXT,
            ADD COLUMN IF NOT EXISTS address_line2 TEXT;
        `);
        console.log('Successfully updated b2b_customers table.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await pool.end();
    }
}

migrate();
