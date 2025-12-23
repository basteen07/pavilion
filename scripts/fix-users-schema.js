const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://root:gdF4CHLIrUX0JMFop11SW8tr9Y6Tk67d@dpg-d534alggjchc73eu0eeg-a.virginia-postgres.render.com/pavilion_npg7',
    ssl: { rejectUnauthorized: false }
});

async function fixUsersSchema() {
    try {
        console.log('Fixing users table schema (role column)...');

        // Make role column nullable
        await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role') THEN
          ALTER TABLE users ALTER COLUMN role DROP NOT NULL;
          RAISE NOTICE 'Altered role column to be nullable';
        END IF;
      END $$;
    `);

        console.log('Users schema fixed successfully.');
    } catch (e) {
        console.error('Fix failed:', e);
    } finally {
        pool.end();
    }
}

fixUsersSchema();
