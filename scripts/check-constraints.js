
const fs = require('fs');
const path = require('path');

// Try loading env vars
try {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
} catch (e) {
    console.log('Error loading .env, trying default location');
    require('dotenv').config();
}

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    console.log('DB URL starts with:', (process.env.DATABASE_URL || '').substring(0, 20));
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT conname, pg_get_constraintdef(c.oid) as def
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE conrelid = 'orders'::regclass
        `);

        let output = 'Orders Constraints:\n';
        res.rows.forEach(r => {
            output += `${r.conname}: ${r.def}\n`;
        });

        // Also check if 'customers' and 'b2b_customers' exist
        const tables = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('customers', 'b2b_customers')
        `);
        output += '\nTables Found:\n' + tables.rows.map(r => r.table_name).join('\n');

        fs.writeFileSync('schema_constraints.txt', output);
        console.log('Done writing schema_constraints.txt');
    } catch (e) {
        console.error(e);
        fs.writeFileSync('schema_constraints.txt', 'Error: ' + e.message);
    } finally {
        client.release();
        pool.end();
    }
}

run();
