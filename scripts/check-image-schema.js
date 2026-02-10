require('dotenv').config();
const { query } = require('../lib/simple-db');

async function checkSchema() {
    const tables = ['products', 'product_variants', 'brands', 'banners', 'blogs'];
    for (const table of tables) {
        console.log(`--- ${table} ---`);
        try {
            const res = await query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1 
                AND (column_name LIKE '%image%' OR column_name LIKE '%url%' OR column_name = 'logo_url')
            `, [table]);
            console.log(res.rows);
        } catch (e) {
            console.log(`Error checking ${table}:`, e.message);
        }
    }
}

checkSchema();
