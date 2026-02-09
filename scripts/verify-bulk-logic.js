require('dotenv').config();
const { Pool } = require('pg');

async function verifyBulkUpload() {
    const config = {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    };
    const pool = new Pool(config);
    try {
        console.log('--- Verifying Bulk Upload Storage Patterns ---');

        // Check products
        const products = await pool.query('SELECT name, handle, sku, size, color FROM products ORDER BY name');
        console.log(`\nProducts in DB (${products.rows.length}):`);
        products.rows.forEach(p => {
            console.log(`  - ${p.name} (Handle: ${p.handle}, SKU: ${p.sku}, Size: ${p.size}, Color: ${p.color})`);
        });

        // Check variants
        const variants = await pool.query('SELECT p.name as p_name, pv.sku, pv.size, pv.color FROM product_variants pv JOIN products p ON pv.product_id = p.id ORDER BY p.name');
        console.log(`\nVariants in DB (${variants.rows.length}):`);
        variants.rows.forEach(v => {
            console.log(`  - For ${v.p_name}: SKU: ${v.sku}, Size: ${v.size}, Color: ${v.color}`);
        });

    } finally {
        await pool.end();
    }
}

verifyBulkUpload();
