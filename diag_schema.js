const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function diag() {
    try {
        console.log('--- Database Connection Check ---');
        const dbCheck = await pool.query('SELECT current_database(), current_user');
        console.log('Connected to:', dbCheck.rows[0]);

        console.log('\n--- Checking Tables ---');
        const tableRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        console.log('Tables:', tableRes.rows.map(r => r.table_name));

        const checkTable = async (tableName) => {
            console.log(`\n--- Schema for "${tableName}" ---`);
            const res = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = '${tableName}'
        ORDER BY ordinal_position
      `);
            console.table(res.rows);
        };

        const tables = tableRes.rows.map(r => r.table_name);
        if (tables.includes('products')) await checkTable('products');
        if (tables.includes('categories')) await checkTable('categories');
        if (tables.includes('brands')) await checkTable('brands');
        if (tables.includes('sub_categories')) await checkTable('sub_categories');

    } catch (err) {
        console.error('Error during diagnosis:', err);
    } finally {
        await pool.end();
    }
}

diag();
