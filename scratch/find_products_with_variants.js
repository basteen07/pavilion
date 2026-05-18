require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const res = await pool.query(
      `SELECT p.id, p.name, p.slug, COUNT(v.id) as variant_count 
       FROM products p 
       JOIN product_variants v ON p.id = v.product_id 
       GROUP BY p.id, p.name, p.slug 
       ORDER BY variant_count DESC 
       LIMIT 5`
    );
    console.log('PRODUCTS WITH VARIANTS:');
    console.log(res.rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main();
