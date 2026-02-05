const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function diag() {
    try {
        const results = {};

        const productsSchema = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'products' AND column_name = 'recommended_price';
        `);
        results.products_recommended_price = productsSchema.rows;

        const quoteItemsSchema = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'quotation_items' AND column_name = 'recommended_price';
        `);
        results.quotation_items_recommended_price = quoteItemsSchema.rows;

        const sampleProducts = await pool.query(`
            SELECT name, sku, mrp_price, dealer_price, recommended_price 
            FROM products 
            WHERE recommended_price > 0 
            LIMIT 5;
        `);
        results.sample_products = sampleProducts.rows;

        const countProducts = await pool.query(`
            SELECT COUNT(*) FROM products WHERE recommended_price > 0;
        `);
        results.count_products_with_rec = countProducts.rows[0].count;

        fs.writeFileSync('diag_output.json', JSON.stringify(results, null, 2));
        console.log('Results written to diag_output.json');

    } catch (err) {
        console.error('Error during diagnostic:', err);
    } finally {
        await pool.end();
    }
}

diag();
