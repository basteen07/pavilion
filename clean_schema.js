const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const tables = ['brands', 'categories', 'sub_categories', 'products', 'product_tags'];
        for (const table of tables) {
            const res = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = $1 
            ORDER BY ordinal_position`, [table]);
            console.log(`\n=== ${table.toUpperCase()} ===`);
            res.rows.forEach(col => {
                console.log(`${col.column_name.padEnd(20)} | ${col.data_type.padEnd(25)} | Null: ${col.is_nullable}`);
            });
        }
    } catch (err) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}

run();
