const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' }); // Try .env.local first
require('dotenv').config(); // Fallback to .env

const runMigration = async () => {
    if (!process.env.DATABASE_URL) {
        console.error('❌ Error: DATABASE_URL not found in environment variables.');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Connecting to database...');
        const client = await pool.connect();
        console.log('✅ Connected.');

        // 1. Products: Add price_updated_at
        try {
            console.log('👉 Migrating products table (adding price_updated_at)...');
            await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMP`);
            console.log('   ✅ products table updated.');
        } catch (e) {
            console.error('   ❌ Failed to update products:', e.message);
        }

        // 2. B2B Customers: Add approved_by
        try {
            console.log('👉 Migrating b2b_customers table (adding approved_by)...');
            await client.query(`ALTER TABLE b2b_customers ADD COLUMN IF NOT EXISTS approved_by TEXT`);
            console.log('   ✅ b2b_customers table updated.');
        } catch (e) {
            console.error('   ❌ Failed to update b2b_customers:', e.message);
        }

        // 3. Orders: Add edited_by
        try {
            console.log('👉 Migrating orders table (adding edited_by)...');
            await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS edited_by TEXT`);
            console.log('   ✅ orders table updated.');
        } catch (e) {
            console.error('   ❌ Failed to update orders:', e.message);
        }

        client.release();
        await pool.end();
        console.log('🎉 Migration completed.');
    } catch (err) {
        console.error('❌ Critical Error:', err);
        process.exit(1);
    }
};

runMigration();
