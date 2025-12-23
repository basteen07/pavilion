const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://root:gdF4CHLIrUX0JMFop11SW8tr9Y6Tk67d@dpg-d534alggjchc73eu0eeg-a.virginia-postgres.render.com/pavilion_npg7',
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    try {
        console.log('Verifying Roles and Users...');

        // 1. Check Roles
        const roles = await pool.query('SELECT * FROM roles');
        console.log('Roles:', roles.rows.map(r => r.name).join(', '));
        const normalRole = roles.rows.find(r => r.name === 'normal_user');
        const b2bRole = roles.rows.find(r => r.name === 'b2b_user');

        if (!normalRole || !b2bRole) {
            console.error('FAILED: Missing roles');
            return;
        }

        // 2. Check Users (Recent)
        const users = await pool.query('SELECT u.email, u.role_id, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id ORDER BY u.created_at DESC LIMIT 5');
        console.log('Recent Users:');
        users.rows.forEach(u => {
            console.log(`- ${u.email}: ${u.role_name || 'NULL'} (ID: ${u.role_id})`);
        });

        // 3. Simulate Logic Check (Mocking what route.js does)
        console.log('\nSimulating Role Lookup Logic...');
        const roleRes = await pool.query("SELECT id FROM roles WHERE name = 'normal_user'");
        console.log(`Lookup 'normal_user' ID: ${roleRes.rows[0]?.id}`);

        if (roleRes.rows[0]?.id === normalRole.id) {
            console.log('SUCCESS: Logic matches DB');
        } else {
            console.log('FAILURE: Logic mismatch');
        }

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

verify();
