require('dotenv').config();
const { Pool } = require('pg');

async function checkProductStructure() {
    const config = {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    };
    const pool = new Pool(config);
    try {
        const res = await pool.query("SELECT id, name, sku FROM products WHERE (SELECT count(*) FROM product_variants WHERE product_id = products.id) > 0 LIMIT 1");
        if (res.rows.length === 0) {
            console.log('NO_VARIANT_PRODUCTS_FOUND');
            return;
        }
        const p = res.rows[0];
        console.log('PRODUCT_NAME: ' + p.name);
        console.log('PRODUCT_SKU: ' + p.sku);

        const variants = await pool.query("SELECT sku, is_default FROM product_variants WHERE product_id = $1", [p.id]);
        variants.rows.forEach(v => {
            console.log('VARIANT_SKU: ' + v.sku + ' IS_DEFAULT: ' + v.is_default);
        });
    } finally {
        await pool.end();
    }
}

checkProductStructure();
