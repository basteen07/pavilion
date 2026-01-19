const { Client } = require('pg');
require('dotenv').config();

async function fixCustomerTypes() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        console.log('Connected to database');

        // 1. Add missing columns
        console.log('Adding columns base_price_type and percentage...');
        await client.query(`
            ALTER TABLE customer_types 
            ADD COLUMN IF NOT EXISTS base_price_type TEXT DEFAULT 'mrp',
            ADD COLUMN IF NOT EXISTS percentage NUMERIC DEFAULT 0
        `);

        // 2. Migrate data from discount_percentage if it exists
        console.log('Migrating discount_percentage to percentage...');
        const colsRes = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'customer_types' AND column_name = 'discount_percentage'");
        if (colsRes.rows.length > 0) {
            await client.query("UPDATE customer_types SET percentage = discount_percentage WHERE percentage = 0");
        }

        console.log('Finalizing schema...');
        // Optional: drop discount_percentage if you want to be clean, but keeping it for safety

        console.log('Customer types schema fix completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

fixCustomerTypes();
