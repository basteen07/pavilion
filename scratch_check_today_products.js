require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const res = await pool.query(
      "SELECT id, name, sku, created_at FROM products WHERE created_at >= CURRENT_DATE ORDER BY created_at DESC"
    );
    console.log(`FOUND ${res.rows.length} PRODUCTS CREATED TODAY:`);
    console.log(res.rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main();
