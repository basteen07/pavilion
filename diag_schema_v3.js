const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function diag() {
    let output = '';
    const log = (msg) => {
        console.log(msg);
        output += msg + '\n';
    };

    try {
        const tableRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

        const tables = tableRes.rows.map(r => r.table_name);
        log('Available tables: ' + JSON.stringify(tables));

        for (const tableName of ['products', 'categories', 'brands', 'sub_categories']) {
            if (tables.includes(tableName)) {
                const res = await pool.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns
          WHERE table_name = '${tableName}'
          ORDER BY ordinal_position
        `);
                log(`\nColumns for ${tableName}:`);
                res.rows.forEach(row => {
                    log(`  - ${row.column_name} (${row.data_type})`);
                });
            } else {
                log(`\nTable ${tableName} does NOT exist.`);
            }
        }

        fs.writeFileSync('diag_output.txt', output);
        console.log('\nDiagnostic log written to diag_output.txt');

    } catch (err) {
        console.error('Error during diagnosis:', err);
    } finally {
        await pool.end();
    }
}

diag();
