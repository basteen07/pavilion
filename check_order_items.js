const { query } = require('./lib/simple-db');

async function checkSchema() {
    try {
        const result = await query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'order_items'
            ORDER BY ordinal_position;
        `);
        console.log(JSON.stringify(result.rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkSchema();
