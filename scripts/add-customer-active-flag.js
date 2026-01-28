require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log('Adding is_active column to customers table...');
        await pool.query(`
            ALTER TABLE customers 
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
        `);
        console.log('Success: is_active column added to customers.');

        await pool.query(`
            UPDATE customers SET is_active = true WHERE is_active IS NULL;
        `);
        console.log('Updated existing customers to be active.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

migrate();
