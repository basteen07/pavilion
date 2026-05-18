require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const res = await pool.query('SELECT id, name, email, role_id, mfa_enabled, is_active FROM users');
    console.log('--- ALL USERS IN SYSTEM ---');
    console.log(res.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    await pool.end();
  }
}

main();
