const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function rollback() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Dropping brand_associations table...');
        await client.query('DROP TABLE IF EXISTS brand_associations');

        console.log('Removing tags column from brands...');
        await client.query('ALTER TABLE brands DROP COLUMN IF EXISTS tags');

        await client.query('COMMIT');
        console.log('Rollback completed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Rollback failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

rollback();
