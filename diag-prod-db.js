const { Pool } = require('pg');

// Exact DATABASE_URL from .env line 6
const connectionString = 'postgresql://root:BmZnYu6nbQWm1vNniHReXpBKZwpVQG5A@dpg-d5mv1nre5dus73epm57g-a.oregon-postgres.render.com/pavilion_t41u?sslmode=require';

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function checkData() {
    try {
        console.log('Checking roles...');
        const roles = await pool.query('SELECT * FROM roles');
        console.log('Roles:', JSON.stringify(roles.rows, null, 2));

        console.log('Checking user staff@pavilion.com...');
        const users = await pool.query(`
      SELECT u.id, u.email, u.role_id, r.name as role_name, u.last_active_at, u.is_active 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = 'staff@pavilion.com'
    `);
        console.log('User Data:', JSON.stringify(users.rows, null, 2));

    } catch (err) {
        console.error('Diagnostic error:', err);
    } finally {
        await pool.end();
    }
}

checkData();
