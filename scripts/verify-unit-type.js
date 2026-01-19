const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    console.log('Verifying column existence...');
    try {
        const result = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'products' AND column_name = 'unit_type';
        `);
        console.log('Verification result:', result.rows);
        if (result.rows.length > 0) {
            console.log('SUCCESS: unit_type column exists.');
        } else {
            console.error('FAILURE: unit_type column NOT found.');
            process.exit(1);
        }
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

verify();
