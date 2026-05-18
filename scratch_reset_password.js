require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const newPassword = 'admin123';
    const hash = await bcrypt.hash(newPassword, 10);
    
    // Reset password for pavilion@sports.com and ensure MFA is disabled
    const res = await pool.query(
      'UPDATE users SET password_hash = $1, mfa_enabled = false WHERE email = $2 RETURNING email, mfa_enabled',
      [hash, 'pavilion@sports.com']
    );
    
    console.log('Password reset successfully for:', res.rows[0]);
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await pool.end();
  }
}

main();
