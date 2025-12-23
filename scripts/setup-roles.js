const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://root:gdF4CHLIrUX0JMFop11SW8tr9Y6Tk67d@dpg-d534alggjchc73eu0eeg-a.virginia-postgres.render.com/pavilion_npg7',
    ssl: { rejectUnauthorized: false }
});

async function setupRoles() {
    try {
        console.log('Checking roles...');

        const rolesNeeded = ['admin', 'b2b_user', 'normal_user'];

        for (const roleName of rolesNeeded) {
            // Check if role exists
            const res = await pool.query('SELECT id FROM roles WHERE name = $1', [roleName]);

            if (res.rows.length === 0) {
                console.log(`Creating role: ${roleName}`);
                await pool.query('INSERT INTO roles (name, permissions) VALUES ($1, $2)', [roleName, '{}']);
            } else {
                console.log(`Role exists: ${roleName} (ID: ${res.rows[0].id})`);
            }
        }

        console.log('Roles setup complete.');

        // Check b2b_customers table constraints/columns if needed
        // The previous analysis showed it exists, but let's confirm 'status' field default behavior
        const b2bTable = await pool.query("SELECT column_name, column_default FROM information_schema.columns WHERE table_name = 'b2b_customers' AND column_name = 'status'");
        if (b2bTable.rows.length > 0) {
            console.log(`b2b_customers.status default: ${b2bTable.rows[0].column_default}`);
        } else {
            console.log('WARNING: b2b_customers table or status column not found!');
        }

    } catch (error) {
        console.error('Error setting up roles:', error);
    } finally {
        await pool.end();
    }
}

setupRoles();
