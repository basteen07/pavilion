const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        const brandsRes = await client.query('SELECT COUNT(*) as count FROM brands');
        const productsRes = await client.query('SELECT COUNT(*) as count FROM products');
        const variantsRes = await client.query('SELECT COUNT(*) as count FROM product_variants');
        const quotationsRes = await client.query('SELECT COUNT(*) as count FROM quotations');
        const itemsRes = await client.query('SELECT COUNT(*) as count FROM quotation_items');

        console.log('DATABASE STATUS AFTER MIGRATION:');
        console.log(`- Brands Count: ${brandsRes.rows[0].count} (Should be 169)`);
        console.log(`- Products Count: ${productsRes.rows[0].count} (Should be 0)`);
        console.log(`- Product Variants Count: ${variantsRes.rows[0].count} (Should be 0)`);
        console.log(`- Quotations Count: ${quotationsRes.rows[0].count} (Should be 0)`);
        console.log(`- Quotation Items Count: ${itemsRes.rows[0].count} (Should be 0)`);

        const sampleBrands = await client.query('SELECT name, slug, category_id, sub_category_id FROM brands LIMIT 5');
        console.log('\nSAMPLE BRANDS FROM DATABASE:');
        console.log(sampleBrands.rows);

    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        await client.end();
    }
}

run();
