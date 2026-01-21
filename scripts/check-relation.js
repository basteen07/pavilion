const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkRelation() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT c.relname, c.relkind 
            FROM pg_class c 
            JOIN pg_namespace n ON n.oid = c.relnamespace 
            WHERE c.relname = 'product_tags' AND n.nspname = 'public';
        `);

        if (res.rows.length === 0) {
            console.log('product_tags not found in public schema.');
        } else {
            const kind = res.rows[0].relkind;
            const map = { 'r': 'table', 'v': 'view', 'm': 'materialized view', 'i': 'index', 'S': 'sequence' };
            console.log(`product_tags is a: ${map[kind] || kind}`);
        }

        // Also check product_tags_v2
        const res2 = await client.query(`
            SELECT c.relname, c.relkind 
            FROM pg_class c 
            WHERE c.relname = 'product_tags_v2';
        `);
        if (res2.rows.length > 0) {
            const kind = res2.rows[0].relkind;
            const map = { 'r': 'table', 'v': 'view', 'm': 'materialized view' };
            console.log(`product_tags_v2 is a: ${map[kind] || kind}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}

checkRelation();
