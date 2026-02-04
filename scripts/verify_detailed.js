const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://root:BmZnYu6nbQWm1vNniHReXpBKZwpVQG5A@dpg-d5mv1nre5dus73epm57g-a.oregon-postgres.render.com/pavilion_t41u?sslmode=require'
});

async function verifyDetailedView() {
    try {
        await client.connect();

        const res = await client.query(`
      SELECT id, product_name, is_detailed 
      FROM quotation_items 
      ORDER BY id DESC 
      LIMIT 10
    `);

        console.log('--- Latest 10 Quotation Items ---');
        res.rows.forEach(row => {
            console.log(`ID: ${row.id} | Product: ${row.product_name} | is_detailed: ${row.is_detailed} (Type: ${typeof row.is_detailed})`);
        });

    } catch (err) {
        console.error('Error executing query', err);
    } finally {
        await client.end();
    }
}

verifyDetailedView();
