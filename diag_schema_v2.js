const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function diag() {
    try {
        const tableRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

        const tables = tableRes.rows.map(r => r.table_name);
        console.log('Available tables:', tables);

        for (const tableName of ['products', 'categories', 'brands', 'sub_categories']) {
            if (tables.includes(tableName)) {
                const res = await pool.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns
          WHERE table_name = '${tableName}'
          ORDER BY ordinal_position
        `);
                console.log(`\nColumns for ${tableName}:`);
                res.rows.forEach(row => {
                    console.log(`  - ${row.column_name} (${row.data_type})`);
                });
            } else {
                console.log(`\nTable ${tableName} does NOT exist.`);
            }
        }

    } catch (err) {
        console.error('Error during diagnosis:', err);
    } finally {
        await pool.end();
    }
}

diag();
