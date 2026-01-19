const { Client } = require('pg');
require('dotenv').config();

async function checkSchema() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    try {
        await client.connect();
        const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'customers'");
        const columns = res.rows;

        const typesTableRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'customer_types'");
        const tableExists = typesTableRes.rows.length > 0;

        let types = [];
        if (tableExists) {
            const typesRes = await client.query("SELECT * FROM customer_types");
            types = typesRes.rows;
        }

        console.log(JSON.stringify({
            columns: columns,
            customer_types_table_exists: tableExists,
            customer_types: types
        }, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkSchema();
