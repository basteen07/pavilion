const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log('Ensuring is_detailed column in quotation_items...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if column exists
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'quotation_items' AND column_name = 'is_detailed'
        `);

        if (res.rows.length === 0) {
            console.log('Adding is_detailed column...');
            await client.query(`ALTER TABLE quotation_items ADD COLUMN is_detailed BOOLEAN DEFAULT false`);
        } else {
            console.log('is_detailed column already exists.');
        }

        // Also ensure short_description and image_url exist as they are related to Detailed View
        await client.query(`ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS short_description TEXT`);
        await client.query(`ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS image_url TEXT`);

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
