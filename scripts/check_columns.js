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

async function check() {
    try {
        await client.connect();
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'customers'
        `);
        console.log('Columns in customers table:');
        console.log(res.rows.map(r => r.column_name).join(', '));

        const typesRes = await client.query('SELECT name FROM customer_types');
        console.log('\nFound customer types:');
        console.log(typesRes.rows.map(r => r.name).join(', '));

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

check();
