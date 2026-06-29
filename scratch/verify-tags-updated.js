const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    console.log('Querying updated tags in product_tags...');
    
    const tagsRes = await client.query(`
        SELECT t.id, t.name, t.brand_ids,
               (SELECT json_agg(b.name) 
                FROM brands b 
                WHERE b.id::text = ANY(
                    SELECT jsonb_array_elements_text(COALESCE(t.brand_ids, '[]'::jsonb))
                )
               ) as brand_names
        FROM product_tags t
        WHERE t.brand_ids IS NOT NULL AND jsonb_array_length(brand_ids) > 0
    `);

    tagsRes.rows.forEach(t => {
        console.log(`- Tag: "${t.name}" (id: ${t.id})`);
        console.log(`  Brand Names:`, t.brand_names);
        console.log(`  Brand IDs:`, t.brand_ids);
        console.log();
    });

    await client.end();
}

run().catch(console.error);
