const { Pool } = require('pg');
const connectionString = 'postgresql://root:BmZnYu6nbQWm1vNniHReXpBKZwpVQG5A@dpg-d5mv1nre5dus73epm57g-a.oregon-postgres.render.com/pavilion_t41u?sslmode=require';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function manualUpdate() {
    try {
        const res = await pool.query(`
      UPDATE users 
      SET last_active_at = CURRENT_TIMESTAMP 
      WHERE email = 'staff@pavilion.com'
      RETURNING id, email, last_active_at
    `);
        console.log('Update result:', JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

manualUpdate();
