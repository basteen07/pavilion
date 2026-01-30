const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://root:gdF4CHLIrUX0JMFop11SW8tr9Y6Tk67d@dpg-d534alggjchc73eu0eeg-a.virginia-postgres.render.com/pavilion_npg7',
    ssl: { rejectUnauthorized: false }
});

async function checkData() {
    try {
        const roles = await pool.query('SELECT * FROM roles');
        console.log('Roles:', JSON.stringify(roles.rows, null, 2));

        const users = await pool.query(`
      SELECT u.id, u.email, u.role_id, r.name as role_name, u.last_active_at, u.is_active 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = 'staff@pavilion.com'
    `);
        console.log('User Data:', JSON.stringify(users.rows, null, 2));

        // Also check if there's any other subadmin role
        const subAdmins = await pool.query(`
      SELECT u.email, r.name as role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE r.name ILIKE '%admin%'
    `);
        console.log('All Admins:', JSON.stringify(subAdmins.rows, null, 2));

    } catch (err) {
        console.error('Diagnostic error:', err);
    } finally {
        await pool.end();
    }
}

checkData();
