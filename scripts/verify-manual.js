const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verifyManual() {
    const client = await pool.connect();
    try {
        const countRes = await client.query('SELECT count(*) FROM products');
        console.log(`Total Products: ${countRes.rows[0].count}`);

        const ssRes = await client.query(`
            SELECT count(*) FROM products p 
            JOIN brands b ON p.brand_id = b.id 
            JOIN categories c ON p.category_id = c.id 
            WHERE b.name = 'SS' AND c.name = 'Cricket'
        `);
        console.log(`SS in Cricket: ${ssRes.rows[0].count}`);

        const yonexRes = await client.query(`
            SELECT count(*) FROM products p 
            JOIN brands b ON p.brand_id = b.id 
            JOIN categories c ON p.category_id = c.id 
            WHERE b.name = 'Yonex' AND c.name = 'Badminton'
        `);
        console.log(`Yonex in Badminton: ${yonexRes.rows[0].count}`);

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}

verifyManual();
