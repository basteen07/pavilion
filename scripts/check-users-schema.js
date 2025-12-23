const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://root:gdF4CHLIrUX0JMFop11SW8tr9Y6Tk67d@dpg-d534alggjchc73eu0eeg-a.virginia-postgres.render.com/pavilion_npg7',
    ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
    try {
        const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);

        // Output as JSON for clear reading
        console.log(JSON.stringify(result.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkSchema();
