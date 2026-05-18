require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const pRes = await pool.query('SELECT * FROM products ORDER BY created_at DESC LIMIT 1');
    const product = pRes.rows[0];
    console.log('PRODUCT FULL ROW:');
    console.log(JSON.stringify(product, null, 2));

    const vRes = await pool.query('SELECT * FROM product_variants WHERE product_id = $1', [product.id]);
    console.log('VARIANTS FULL ROWS:');
    console.log(JSON.stringify(vRes.rows, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main();
