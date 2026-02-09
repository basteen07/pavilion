require('dotenv').config();
const { Pool } = require('pg');

async function checkProductStructure() {
    const config = {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    };
    const pool = new Pool(config);
    try {
        console.log('--- Checking products with variants ---');
        const res = await pool.query(`
            SELECT p.id, p.name, p.sku as product_sku, 
                   (SELECT count(*) FROM product_variants WHERE product_id = p.id) as variant_count
            FROM products p
            WHERE (SELECT count(*) FROM product_variants WHERE product_id = p.id) > 0
            LIMIT 1
        `);

        if (res.rows.length === 0) {
            console.log('No products with variants found.');
            return;
        }

        const p = res.rows[0];
        console.log(`Product: ${p.name} (ID: ${p.id}, Base SKU: ${p.product_sku})`);

        const variants = await pool.query(`
            SELECT sku, size, color, is_default 
            FROM product_variants 
            WHERE product_id = $1
        `, [p.id]);

        console.log('Variants:');
        variants.rows.forEach(v => {
            console.log(`  - SKU: ${v.sku}, Size: ${v.size}, Color: ${v.color}, Default: ${v.is_default}`);
        });
    } finally {
        await pool.end();
    }
}

checkProductStructure();
