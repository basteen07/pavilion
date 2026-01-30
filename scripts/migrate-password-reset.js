const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migratePasswordReset() {
    try {
        console.log('Adding password reset columns to users table...');

        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
            ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP
        `);

        console.log('✓ Password reset columns added successfully');

        // Also ensure activity_logs event_type can handle new types
        console.log('Checking activity_logs table...');
        const logsCheck = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'activity_logs' AND column_name = 'event_type'
        `);

        if (logsCheck.rows.length > 0) {
            console.log('✓ activity_logs table exists with event_type column');
        }

        console.log('\nMigration complete!');
    } catch (error) {
        console.error('Migration error:', error.message);
    } finally {
        await pool.end();
    }
}

migratePasswordReset();
