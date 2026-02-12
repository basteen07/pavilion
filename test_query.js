const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const subId = '4'; // Simulation of query param
    const res = await pool.query('SELECT * FROM brands WHERE sub_category_id = $1', [subId]);
    console.log(`Results for string ID '${subId}':`, res.rows.length);

    const res2 = await pool.query('SELECT * FROM brands WHERE sub_category_id = $1', [parseInt(subId)]);
    console.log(`Results for int ID ${parseInt(subId)}:`, res2.rows.length);

    const all = await pool.query('SELECT id, name, sub_category_id FROM brands');
    console.log('Total brands in DB:', all.rows.length);
    // Log sub_category_ids present
    const ids = [...new Set(all.rows.map(r => r.sub_category_id))].sort();
    console.log('SubCategory IDs in brands table:', ids);

    pool.end();
}
run();
