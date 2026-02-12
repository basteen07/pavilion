const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('--- TABLES ---');
        console.log(res.rows.map(r => r.table_name).join(', '));

        for (const table of ['brands', 'categories', 'sub_categories', 'products']) {
            const schema = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`, [table]);
            console.log(`\n--- SCHEMA: ${table} ---`);
            console.log(JSON.stringify(schema.rows, null, 2));
        }
    } catch (err) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}

run();
