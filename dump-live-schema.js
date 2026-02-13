require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function dumpSchema() {
    const lines = [];
    const log = (msg) => { lines.push(msg); };

    try {
        // 1. Get all tables
        const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

        const tables = tablesRes.rows.map(r => r.table_name);
        log(`TOTAL TABLES: ${tables.length}`);
        log('');
        tables.forEach((t, i) => log(`${i + 1}. ${t}`));
        log('');
        log('--- DETAILED SCHEMA ---');
        log('');

        // 2. Get columns for each table
        for (const table of tables) {
            const colsRes = await pool.query(`
        SELECT 
          c.column_name, 
          c.data_type, 
          c.character_maximum_length,
          c.numeric_precision,
          c.numeric_scale,
          c.column_default, 
          c.is_nullable,
          c.udt_name
        FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.table_name = $1
        ORDER BY c.ordinal_position
      `, [table]);

            log(`Table: ${table}`);
            for (const col of colsRes.rows) {
                let type = col.udt_name;
                if (col.character_maximum_length) type += `(${col.character_maximum_length})`;
                if (col.data_type === 'numeric' && col.numeric_precision) type += `(${col.numeric_precision},${col.numeric_scale})`;
                const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
                log(`  - ${col.column_name} ${type} ${nullable}${def}`);
            }
            log('');
        }

        // 3. Get foreign keys
        log('--- FOREIGN KEYS ---');
        log('');
        const fkRes = await pool.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `);
        for (const fk of fkRes.rows) {
            log(`  ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name} (ON DELETE ${fk.delete_rule})`);
        }

        // Write to file
        const output = lines.join('\n');
        fs.writeFileSync('live-schema-output.txt', output, 'utf8');
        console.log(`Schema dump written to live-schema-output.txt (${tables.length} tables)`);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

dumpSchema();
