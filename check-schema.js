const { query } = require('./lib/simple-db');

async function checkSchema() {
    try {
        console.log('--- Quotations Schema ---');
        const qRes = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'quotations';
        `);
        qRes.rows.forEach(row => console.log(`${row.column_name}: ${row.data_type}`));

        console.log('\n--- Quotation Items Schema ---');
        const qiRes = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'quotation_items';
        `);
        qiRes.rows.forEach(row => console.log(`${row.column_name}: ${row.data_type}`));

        process.exit(0);
    } catch (error) {
        console.error('Error checking schema:', error);
        process.exit(1);
    }
}

checkSchema();
