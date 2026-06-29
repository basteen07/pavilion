const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    const unmatchedNames = ['Apacs', 'Carlton', 'Cornilleau', 'DGT', 'Dita', 'Grays', 'Kipsta', 'Malik', 'Staunton', 'Victor', 'Wegiel'];
    
    for (const name of unmatchedNames) {
        const res = await client.query("SELECT id, name FROM brands WHERE name ILIKE $1", [`%${name}%`]);
        console.log(`Unmatched name "${name}" search results:`, res.rows);
    }

    // Also let's print the 4 tags with non-empty brand_ids
    const tagsRes = await client.query("SELECT id, name, brand_ids FROM product_tags WHERE brand_ids IS NOT NULL AND jsonb_array_length(brand_ids) > 0");
    console.log('\nTags with brand_ids in DB:');
    tagsRes.rows.forEach(t => {
        console.log(`- ${t.name} (id: ${t.id}, brand_ids length: ${t.brand_ids.length})`);
        console.log(`  brand_ids:`, t.brand_ids);
    });

    await client.end();
}

run().catch(console.error);
