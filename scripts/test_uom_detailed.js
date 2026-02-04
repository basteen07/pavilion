const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Use strict SSL in production
});

async function runTest() {
    console.log('--- Verifying Detailed View & UoM Implementation ---');
    const client = await pool.connect();
    let quoteId = null;

    try {
        // 1. Get Prerequisites
        const custRes = await client.query('SELECT id FROM customers LIMIT 1');
        const prodRes = await client.query('SELECT id, name FROM products LIMIT 1');

        if (!custRes.rows.length || !prodRes.rows.length) {
            console.log('Skipping test: No customers or products found.');
            return;
        }

        const customerId = custRes.rows[0].id;
        const productId = prodRes.rows[0].id;
        const productName = prodRes.rows[0].name;

        // 2. Insert Quotation directly (simulating API logic)
        console.log('1. Creating Quotation with UoM="Pair" and is_detailed=true');
        const qRes = await client.query(`
            INSERT INTO quotations (customer_id, status, total_amount, reference_number, quotation_number)
            VALUES ($1, 'Draft', 100, 'TEST-UOM-1', 'TEST-UOM-1') RETURNING id
        `, [customerId]);
        quoteId = qRes.rows[0].id;

        await client.query(`
            INSERT INTO quotation_items 
            (quotation_id, product_id, product_name, quantity, unit_price, total_price, line_total, uom, is_detailed)
            VALUES ($1, $2, $3, 1, 100, 100, 100, 'Pair', true)
        `, [quoteId, productId, productName]);

        // 3. Select and Verify
        const verify1 = await client.query(`SELECT uom, is_detailed FROM quotation_items WHERE quotation_id = $1`, [quoteId]);
        const item1 = verify1.rows[0];
        console.log('   Result:', item1);

        if (item1.uom !== 'Pair') console.error('   FAIL: UoM mismatch');
        else console.log('   PASS: UoM saved');

        if (item1.is_detailed !== true) console.error('   FAIL: is_detailed mismatch');
        else console.log('   PASS: is_detailed saved');

        // 4. Update (Simulate Update: Delete & Re-insert)
        console.log('2. Updating Quotation: UoM="Set", is_detailed=false');
        await client.query(`DELETE FROM quotation_items WHERE quotation_id = $1`, [quoteId]);
        await client.query(`
            INSERT INTO quotation_items 
            (quotation_id, product_id, product_name, quantity, unit_price, total_price, line_total, uom, is_detailed)
            VALUES ($1, $2, $3, 1, 100, 100, 100, 'Set', false)
        `, [quoteId, productId, productName]);

        // 5. Select and Verify Update
        const verify2 = await client.query(`SELECT uom, is_detailed FROM quotation_items WHERE quotation_id = $1`, [quoteId]);
        const item2 = verify2.rows[0];
        console.log('   Result:', item2);

        if (item2.uom !== 'Set') console.error('   FAIL: UoM update mismatch');
        else console.log('   PASS: UoM updated');

        if (item2.is_detailed !== false) console.error('   FAIL: is_detailed update mismatch');
        else console.log('   PASS: is_detailed updated');

    } catch (e) {
        console.error('Test Failed:', e);
    } finally {
        if (quoteId) {
            await client.query('DELETE FROM quotations WHERE id = $1', [quoteId]);
            console.log('Cleanup: Deleted test quotation');
        }
        client.release();
        process.exit(0);
    }
}

runTest();
