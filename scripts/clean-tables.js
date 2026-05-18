require('dotenv').config();
const { Pool } = require('pg');

async function cleanTables() {
    console.log('--- Cleaning Quotations, Products and Variants Tables ---');
    const config = {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    };
    const pool = new Pool(config);
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            console.log('Truncating quotations...');
            await client.query('TRUNCATE TABLE quotations RESTART IDENTITY CASCADE');

            console.log('Truncating product_variants...');
            await client.query('TRUNCATE TABLE product_variants RESTART IDENTITY CASCADE');

            console.log('Truncating products...');
            await client.query('TRUNCATE TABLE products RESTART IDENTITY CASCADE');

            await client.query('COMMIT');
            console.log('Tables cleaned successfully.');
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Cleanup failed:', err.message);
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Connection failed:', err.message);
    } finally {
        await pool.end();
    }
}

cleanTables();
