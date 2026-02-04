const { Client } = require('pg');

const connectionString = 'postgresql://root:BmZnYu6nbQWm1vNniHReXpBKZwpVQG5A@dpg-d5mv1nre5dus73epm57g-a.oregon-postgres.render.com/pavilion_t41u?sslmode=require';
const client = new Client({ connectionString });

async function testPersistence() {
    try {
        await client.connect();
        console.log('Connected to DB.');

        // 1. Get a valid customer ID
        const custRes = await client.query('SELECT id FROM customers LIMIT 1');
        if (custRes.rows.length === 0) throw new Error('No customers found');
        const customerId = custRes.rows[0].id;

        const uniqueNum = `TEST-${Date.now()}`;

        // 2. Create a dummy quotation
        const quoteRes = await client.query(`
      INSERT INTO quotations (customer_id, status, quotation_number, total_amount)
      VALUES ($1, 'Draft', $2, 100)
      RETURNING id
    `, [customerId, uniqueNum]);
        const quoteId = quoteRes.rows[0].id;
        console.log(`Created Test Quote ID: ${quoteId}`);

        // 3. Insert item with is_detailed = TRUE
        console.log('Inserting item with is_detailed = true...');
        await client.query(`
      INSERT INTO quotation_items 
      (quotation_id, product_name, quantity, unit_price, total_price, line_total, is_detailed)
      VALUES ($1, 'Test Product True', 1, 100, 100, 100, true)
    `, [quoteId]);

        // 4. Read it back
        const readRes = await client.query(`
      SELECT is_detailed FROM quotation_items WHERE quotation_id = $1 AND product_name = 'Test Product True'
    `, [quoteId]);

        const val = readRes.rows[0].is_detailed;
        console.log(`Read back is_detailed: ${val} (Type: ${typeof val})`);

        // 5. Cleanup
        await client.query('DELETE FROM quotation_items WHERE quotation_id = $1', [quoteId]);
        await client.query('DELETE FROM quotations WHERE id = $1', [quoteId]);
        console.log('Cleanup done.');

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        await client.end();
    }
}

testPersistence();
