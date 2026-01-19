const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function verify() {
    try {
        await client.connect();
        console.log('Connected to database');

        console.log('\n--- Customer Types Table ---');
        const types = await client.query('SELECT * FROM customer_types');
        console.table(types.rows);

        console.log('\n--- Customers Table New Columns ---');
        const columns = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name IN ('customer_type_id', 'contacts')
        `);
        console.table(columns.rows);

        console.log('\n--- Sample Customer Data Migration ---');
        const sample = await client.query(`
            SELECT c.name, c.company_name, ct.name as type_name, c.contacts
            FROM customers c
            LEFT JOIN customer_types ct ON c.customer_type_id = ct.id
            LIMIT 5
        `);
        console.table(sample.rows);

    } catch (err) {
        console.error('Error during verification:', err);
    } finally {
        await client.end();
    }
}

verify();
