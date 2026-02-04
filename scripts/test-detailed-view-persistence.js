const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runTest() {
    console.log('Testing Detailed View Persistence...');
    const client = await pool.connect();
    let setupDone = false;
    let customerId = null;
    let productId = null;

    try {
        // 1. Get a customer and a product
        const customerRes = await client.query('SELECT id FROM customers LIMIT 1');
        const productRes = await client.query('SELECT id, name, mrp_price FROM products LIMIT 1');

        if (customerRes.rows.length === 0 || productRes.rows.length === 0) {
            console.error('Need at least 1 customer and 1 product to test');
            return;
        }

        customerId = customerRes.rows[0].id;
        const product = productRes.rows[0];
        productId = product.id;

        console.log(`Using Customer: ${customerId}, Product: ${product.name} (${productId})`);

        // 2. Create Quotation with is_detailed = true
        console.log('\n--- Test 1: Create with is_detailed = true ---');

        const createRes = await client.query(
            `INSERT INTO quotations(
                customer_id, status, total_amount, reference_number, quotation_number, valid_until,
                 show_total, discount_type, discount_value, tax_rate, shipping_cost, notes, terms_conditions
            ) VALUES($1, 'Draft', 100, 'TEST-DET-1', 'TEST-DET-1', NOW(), true, 'percentage', 0, 18, 0, '', '') RETURNING id`,
            [customerId]
        );
        const quoteId = createRes.rows[0].id;

        await client.query(
            `INSERT INTO quotation_items (
                quotation_id, product_id, product_name, quantity, unit_price, 
                total_price, line_total, mrp, dealer_price, discount, 
                is_detailed, short_description
            ) VALUES ($1, $2, $3, 1, 100, 100, 100, 100, 80, 0, $4, 'Test Desc')`,
            [quoteId, productId, product.name, true]
        );

        // Verify
        const verify1 = await client.query(`SELECT is_detailed, short_description FROM quotation_items WHERE quotation_id = $1`, [quoteId]);
        console.log('Result 1 (Expected true):', verify1.rows[0]);
        if (verify1.rows[0].is_detailed === true) console.log('PASS'); else console.log('FAIL');

        // 3. Update Quotation via API Logic (Simulated)
        // We will mimic the UPDATE logic used in lib/api/quotations.js (DELETE then INSERT)
        console.log('\n--- Test 2: Update to is_detailed = false ---');

        await client.query('BEGIN');
        await client.query('DELETE FROM quotation_items WHERE quotation_id = $1', [quoteId]);
        await client.query(
            `INSERT INTO quotation_items (
                quotation_id, product_id, product_name, quantity, unit_price, 
                total_price, line_total, mrp, dealer_price, discount, 
                is_detailed, short_description
            ) VALUES ($1, $2, $3, 1, 100, 100, 100, 100, 80, 0, $4, 'Test Desc')`,
            [quoteId, productId, product.name, false]
        );
        await client.query('COMMIT');

        const verify2 = await client.query(`SELECT is_detailed FROM quotation_items WHERE quotation_id = $1`, [quoteId]);
        console.log('Result 2 (Expected false):', verify2.rows[0]);
        if (verify2.rows[0].is_detailed === false) console.log('PASS'); else console.log('FAIL');

        // 4. Update Quotation to is_detailed = true again
        console.log('\n--- Test 3: Update to is_detailed = true ---');

        await client.query('BEGIN');
        await client.query('DELETE FROM quotation_items WHERE quotation_id = $1', [quoteId]);
        // Simulate what the API does: passing explicit boolean
        const isDetailedInput = true;

        await client.query(
            `INSERT INTO quotation_items (
                quotation_id, product_id, product_name, quantity, unit_price, 
                total_price, line_total, mrp, dealer_price, discount, 
                is_detailed, short_description
            ) VALUES ($1, $2, $3, 1, 100, 100, 100, 100, 80, 0, $4, 'Test Desc')`,
            [quoteId, productId, product.name, isDetailedInput]
        );
        await client.query('COMMIT');

        const verify3 = await client.query(`SELECT is_detailed FROM quotation_items WHERE quotation_id = $1`, [quoteId]);
        console.log('Result 3 (Expected true):', verify3.rows[0]);
        if (verify3.rows[0].is_detailed === true) console.log('PASS'); else console.log('FAIL');

        // Clean up
        await client.query('DELETE FROM quotations WHERE id = $1', [quoteId]);
        console.log('\nUsage: Cleaned up test quotation.');

    } catch (e) {
        if (setupDone) await client.query('ROLLBACK');
        console.error('Error:', e);
    } finally {
        client.release();
        process.exit(0);
    }
}

runTest();
