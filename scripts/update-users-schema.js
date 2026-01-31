
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function updateSchema() {
    const client = await pool.connect();
    try {
        console.log('Starting schema update for password reset...');

        // Check if columns exist
        const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('reset_token', 'reset_token_expiry');
    `;
        const checkRes = await client.query(checkQuery);
        const existingColumns = checkRes.rows.map(row => row.column_name);

        // Add reset_token if not exists
        if (!existingColumns.includes('reset_token')) {
            await client.query(`ALTER TABLE users ADD COLUMN reset_token VARCHAR(255)`);
            console.log('Added reset_token column.');
        } else {
            console.log('reset_token column already exists.');
        }

        // Add reset_token_expiry if not exists
        if (!existingColumns.includes('reset_token_expiry')) {
            await client.query(`ALTER TABLE users ADD COLUMN reset_token_expiry TIMESTAMP`);
            console.log('Added reset_token_expiry column.');
        } else {
            console.log('reset_token_expiry column already exists.');
        }

        console.log('Schema update completed successfully.');
    } catch (error) {
        console.error('Error updating schema:', error);
    } finally {
        client.release();
        pool.end();
    }
}

updateSchema();
