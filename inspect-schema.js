const { Pool } = require('pg');
const connectionString = 'postgresql://root:BmZnYu6nbQWm1vNniHReXpBKZwpVQG5A@dpg-d5mv1nre5dus73epm57g-a.oregon-postgres.render.com/pavilion_t41u?sslmode=require';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function inspectTable() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
        console.log('Columns in users table:');
        res.rows.forEach(col => console.log(`- ${col.column_name}: ${col.data_type}`));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspectTable();
