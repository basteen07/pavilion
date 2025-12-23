const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://root:gdF4CHLIrUX0JMFop11SW8tr9Y6Tk67d@dpg-d534alggjchc73eu0eeg-a.virginia-postgres.render.com/pavilion_npg7',
    ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'orders'
    `);
        fs.writeFileSync('ORDERS_SCHEMA.json', JSON.stringify(res.rows, null, 2));
        console.log('Schema written to ORDERS_SCHEMA.json');
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

checkSchema();
