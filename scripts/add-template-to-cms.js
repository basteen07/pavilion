const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://root:gdF4CHLIrUX0JMFop11SW8tr9Y6Tk67d@dpg-d534alggjchc73eu0eeg-a.virginia-postgres.render.com/pavilion_npg7',
    ssl: { rejectUnauthorized: false }
});

async function addTemplateColumn() {
    try {
        console.log('Adding template column to cms_pages...');

        await pool.query(`
      ALTER TABLE cms_pages 
      ADD COLUMN IF NOT EXISTS template VARCHAR(100) DEFAULT 'default'
    `);

        console.log('Column added successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        pool.end();
    }
}

addTemplateColumn();
