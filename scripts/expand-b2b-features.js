require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log('Expanding b2b_customers table...');
        await pool.query(`
            ALTER TABLE b2b_customers 
            ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT,
            ADD COLUMN IF NOT EXISTS admin_comments TEXT;
        `);

        console.log('Creating b2b_customer_events table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS b2b_customer_events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                customer_id UUID NOT NULL REFERENCES b2b_customers(id) ON DELETE CASCADE,
                admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
                event_type TEXT NOT NULL,
                description TEXT,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Successfully completed database migrations.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await pool.end();
    }
}

migrate();
