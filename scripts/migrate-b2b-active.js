require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log('Adding is_active column to b2b_customers table...');
        await pool.query(`
            ALTER TABLE b2b_customers 
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
        `);
        console.log('Success: is_active column added to b2b_customers.');

        // Update existing approved customers to be active
        await pool.query(`
            UPDATE b2b_customers SET is_active = true WHERE status = 'approved';
        `);
        console.log('Updated existing approved customers to be active.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

migrate();
