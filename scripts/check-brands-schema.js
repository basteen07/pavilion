require('dotenv').config();
const { query } = require('../lib/simple-db');

async function checkSchema() {
    try {
        const result = await query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'brands'
            ORDER BY ordinal_position;
        `);
        console.log('--- brands table schema ---');
        result.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type} (${row.is_nullable})`);
        });

        const constraints = await query(`
            SELECT conname, pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE n.nspname = 'public' AND contypid = 'brands'::regtype;
        `);
        // Wait, contypid is not the right way to find table constraints.
        // Let's use a better query for constraints.
        const betterConstraints = await query(`
            SELECT
                tc.constraint_name, 
                tc.table_name, 
                kcu.column_name, 
                tc.constraint_type
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
            WHERE tc.table_name = 'brands';
        `);
        console.log('\n--- Constraints ---');
        betterConstraints.rows.forEach(row => {
            console.log(`${row.constraint_name} (${row.constraint_type}): ${row.column_name}`);
        });

    } catch (err) {
        console.error('Failed to check schema:', err);
    }
}

checkSchema();
