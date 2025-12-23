const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://root:gdF4CHLIrUX0JMFop11SW8tr9Y6Tk67d@dpg-d534alggjchc73eu0eeg-a.virginia-postgres.render.com/pavilion_npg7',
    ssl: { rejectUnauthorized: false }
});

async function fixSchema() {
    try {
        console.log('Migrating orders table schema...');

        // 1. Rename total_amount to total if it exists
        await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='total_amount') THEN
          ALTER TABLE orders RENAME COLUMN total_amount TO total;
        END IF;
      END $$;
    `);

        // 2. Add subtotal
        await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0`);

        // 3. Add discount
        await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0`);

        // 4. Add tax
        await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax DECIMAL(10,2) DEFAULT 0`);

        // 5. Add products (JSONB)
        await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS products JSONB DEFAULT '[]'`);

        // 6. Add fulfillment
        await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment JSONB DEFAULT '[]'`);

        console.log('Migration completed successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        pool.end();
    }
}

fixSchema();
