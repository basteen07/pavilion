const { Pool } = require('pg');
const connectionString = 'postgresql://root:BmZnYu6nbQWm1vNniHReXpBKZwpVQG5A@dpg-d5mv1nre5dus73epm57g-a.oregon-postgres.render.com/pavilion_t41u?sslmode=require';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function inspectLogs() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'activity_logs'
      ORDER BY ordinal_position
    `);
        console.log('Columns in activity_logs table:');
        res.rows.forEach(col => console.log(`- ${col.column_name}: ${col.data_type}`));

        const recent = await pool.query('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 5');
        console.log('Recent Logs:', JSON.stringify(recent.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspectLogs();
