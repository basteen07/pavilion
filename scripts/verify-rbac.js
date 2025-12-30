require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    try {
        const res = await pool.query('SELECT count(*) FROM permissions');
        console.log(`Permissions count: ${res.rows[0].count}`);

        const res2 = await pool.query('SELECT count(*) FROM role_permissions');
        console.log(`Role Perms count: ${res2.rows[0].count}`);

        process.exit(0);
    } catch (e) {
        console.error('Verification failed:', e);
        process.exit(1);
    }
}

verify();
