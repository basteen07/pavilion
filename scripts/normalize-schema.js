const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function normalizeSchema() {
    const tables = [
        'products',
        'orders',
        'customers',
        'quotations',
        'brands',
        'categories',
        'testimonials'
    ];

    try {
        console.log('Starting schema normalization...');

        // 1. Create trigger function if it doesn't exist
        await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
        console.log('Trigger function created/updated.');

        for (const table of tables) {
            console.log(`Checking table: ${table}`);

            // Check if updated_at exists
            const checkCol = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'updated_at'
      `, [table]);

            if (checkCol.rows.length === 0) {
                console.log(`Adding updated_at to ${table}...`);
                await pool.query(`ALTER TABLE ${table} ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
            } else {
                console.log(`updated_at already exists in ${table}.`);
            }

            // Drop existing trigger if exists and recreate
            await pool.query(`DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table}`);
            await pool.query(`
        CREATE TRIGGER update_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `);
            console.log(`Trigger applied to ${table}.`);
        }

        console.log('Schema normalization completed successfully.');
    } catch (err) {
        console.error('Error during schema normalization:', err);
    } finally {
        await pool.end();
    }
}

normalizeSchema();
