const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Creating brand_associations table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS brand_associations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
        category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
        sub_category_id INTEGER REFERENCES sub_categories(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(brand_id, category_id, sub_category_id)
      )
    `);

        console.log('Adding tags column to brands table...');
        // Check if column exists first
        const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'brands' AND column_name = 'tags'
    `);

        if (checkColumn.rows.length === 0) {
            await client.query('ALTER TABLE brands ADD COLUMN tags JSONB DEFAULT \'[]\'::jsonb');
        }

        // Migrate existing associations to the new table
        console.log('Migrating existing associations...');
        await client.query(`
      INSERT INTO brand_associations (brand_id, category_id, sub_category_id)
      SELECT id, category_id, sub_category_id 
      FROM brands 
      WHERE category_id IS NOT NULL OR sub_category_id IS NOT NULL
      ON CONFLICT DO NOTHING
    `);

        await client.query('COMMIT');
        console.log('Migration completed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
