require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const pRes = await pool.query('SELECT id, name, sku, created_at FROM products ORDER BY created_at DESC LIMIT 5');
    if (pRes.rows.length === 0) {
      console.log('No products found.');
      return;
    }
    
    for (const product of pRes.rows) {
      console.log('----------------------------------------------------');
      console.log('PRODUCT:', product.name, 'SKU:', product.sku, 'CREATED AT:', product.created_at);
      const vRes = await pool.query('SELECT id, sku, size, color, mrp_price, dealer_price FROM product_variants WHERE product_id = $1', [product.id]);
      console.log(`FOUND ${vRes.rows.length} VARIANTS:`);
      console.log(vRes.rows);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main();
