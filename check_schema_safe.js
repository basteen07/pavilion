const { Pool } = require('pg');

async function checkSchema() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false // Explicitly disable SSL for this check
    });

    try {
        const result = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'order_items'
            ORDER BY ordinal_position;
        `);
        console.log('COLUMNS:');
        result.rows.forEach(row => console.log(`- ${row.column_name} (${row.data_type})`));
        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

checkSchema();
