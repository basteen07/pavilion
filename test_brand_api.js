const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function test(subCatId) {
    try {
        const res = await pool.query('SELECT * FROM brands WHERE sub_category_id = $1 AND is_active = true', [subCatId]);
        console.log(`Brands for SubCategory ${subCatId}:`, res.rows.length);
        res.rows.forEach(r => console.log(` - ${r.name} (ID: ${r.id})`));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

// Testing with a common sub-category ID if known, or just a sample one
test(process.argv[2] || 4); // 4 is 'Bats' for Cricket (guessed from standard Pavlovian sports DB)
