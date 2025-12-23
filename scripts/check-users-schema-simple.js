const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://root:gdF4CHLIrUX0JMFop11SW8tr9Y6Tk67d@dpg-d534alggjchc73eu0eeg-a.virginia-postgres.render.com/pavilion_npg7',
    ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
    try {
        const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);

        const roleCol = result.rows.find(r => r.column_name === 'role');
        const roleIdCol = result.rows.find(r => r.column_name === 'role_id');

        console.log('HAS_ROLE_STRING:', !!roleCol);
        console.log('HAS_ROLE_ID_UUID:', !!roleIdCol);

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkSchema();
