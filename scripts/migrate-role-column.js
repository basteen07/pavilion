const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://root:gdF4CHLIrUX0JMFop11SW8tr9Y6Tk67d@dpg-d534alggjchc73eu0eeg-a.virginia-postgres.render.com/pavilion_npg7',
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log('Starting Migration: Adding role_id to users...');

        // 1. Add Column
        await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id);
    `);
        console.log('Column role_id added.');

        // 2. Backfill Data
        // Map 'customer' (legacy) -> 'normal_user' (new role)
        const normalRoleRes = await pool.query("SELECT id FROM roles WHERE name = 'normal_user'");
        const adminRoleRes = await pool.query("SELECT id FROM roles WHERE name = 'admin'");

        if (normalRoleRes.rows.length > 0) {
            const id = normalRoleRes.rows[0].id;
            await pool.query(`UPDATE users SET role_id = $1 WHERE role = 'customer' OR role = 'normal_user'`, [id]);
            console.log(`Updated 'customer'/'normal_user' users to role_id: ${id}`);
        }

        if (adminRoleRes.rows.length > 0) {
            const id = adminRoleRes.rows[0].id;
            await pool.query(`UPDATE users SET role_id = $1 WHERE role = 'admin'`, [id]);
            console.log(`Updated 'admin' users to role_id: ${id}`);
        }

        // 3. Fallback for others (B2B?)
        const b2bRoleRes = await pool.query("SELECT id FROM roles WHERE name = 'b2b_user'");
        if (b2bRoleRes.rows.length > 0) {
            const id = b2bRoleRes.rows[0].id;
            // Maybe some users are already marked as b2b in string? Unlikely if new feature.
            // But let's check.
            await pool.query(`UPDATE users SET role_id = $1 WHERE role = 'b2b_user'`, [id]);
        }

        console.log('Migration Complete.');

    } catch (error) {
        console.error('Migration Error:', error);
    } finally {
        pool.end();
    }
}

migrate();
