require('dotenv').config();
const { Pool } = require('pg');

const fs = require('fs');

async function checkColumns() {
    const config = {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    };
    const pool = new Pool(config);
    try {
        const resP = await pool.query("SELECT (column_name || ' (' || data_type || ')') as col FROM information_schema.columns WHERE table_name = 'products' ORDER BY column_name");
        const resV = await pool.query("SELECT (column_name || ' (' || data_type || ')') as col FROM information_schema.columns WHERE table_name = 'product_variants' ORDER BY column_name");

        const report = {
            products: resP.rows.map(r => r.col),
            variants: resV.rows.map(r => r.col)
        };

        fs.writeFileSync('schema_report.json', JSON.stringify(report, null, 2));
        console.log('Schema report written to schema_report.json');
    } finally {
        await pool.end();
    }
}

checkColumns();
