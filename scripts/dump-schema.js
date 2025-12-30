const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function dumpSchema() {
    try {
        const result = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position;
    `);

        const schema = {};
        result.rows.forEach(row => {
            if (!schema[row.table_name]) {
                schema[row.table_name] = [];
            }
            schema[row.table_name].push(`${row.column_name} (${row.data_type})`);
        });

        let output = '';
        for (const [table, columns] of Object.entries(schema)) {
            output += `Table: ${table}\n`;
            columns.forEach(col => {
                output += `  - ${col}\n`;
            });
            output += '\n';
        }

        fs.writeFileSync(path.join(__dirname, '../full_schema.txt'), output);
        console.log('Schema dumped to full_schema.txt');
    } catch (err) {
        console.error('Error dumping schema:', err);
    } finally {
        await pool.end();
    }
}

dumpSchema();
