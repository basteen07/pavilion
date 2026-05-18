require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const pRes = await pool.query(
      `SELECT id, name, sku, size, color, 
              option1_name, option1_value, 
              option2_name, option2_value, 
              option3_name, option3_value, 
              option4_name, option4_value 
       FROM products 
       ORDER BY created_at DESC 
       LIMIT 1`
    );
    console.log('PRODUCTS COLUMN VALUES:');
    console.log(pRes.rows[0]);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main();
