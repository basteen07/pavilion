const { Client } = require('pg');
require('dotenv').config();

const oldIdToName = {
  '7baa3bd3-7ff2-4dcc-96d9-1b4e3e1ff517': 'Adidas',
  '0b60d25c-3ffe-4bf6-b72d-323877093ba9': 'Gray Nicolls',
  '8e28254d-ca38-4c73-afa2-93eb3dcbcfa4': 'Kookaburra',
  '94d2c90e-0962-4bb1-bbed-b5cc95a06e7f': 'MRF',
  '138fc576-3558-4644-939b-cd81619d3b3c': 'Nike',
  '83a2bd95-f354-45b2-b679-27c1ec3f870e': 'SG',
  'e67f0c7f-8729-4c28-8859-266bb351dbfc': 'SS',
  '46973de4-137e-4959-8519-edad917f8da3': 'DSC',
  '1eec376c-4bb9-4492-ae13-79457addac82': 'RNS',
  'b5aacfb4-123a-4c87-9eca-9ee66c9d44ff': 'Moonwalkr',
  '70286c06-4728-4c06-892d-287b6679a769': 'Aero',
  '6a8ba48c-167f-4a26-b8a1-9ed9c404255a': 'Nawab',
  '7a429bd7-bbec-4cf9-b6de-0cd1d98c1382': 'Generic',
  'bc4fc984-99b9-4fdd-990e-1cd7bdaf3017': 'Domestic'
};

function normalize(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    console.log('Connected to database.');

    // 1. Fetch active brands from database
    const dbBrandsRes = await client.query("SELECT id, name FROM brands");
    const dbBrands = dbBrandsRes.rows;
    console.log(`Fetched ${dbBrands.length} brands from DB.`);

    // 2. Map normalized brand name to DB ID
    const dbMap = {};
    for (const b of dbBrands) {
        const norm = normalize(b.name);
        dbMap[norm] = b.id;
    }

    // 3. Map old ID to DB ID
    const oldToNewMap = {};
    for (const [oldId, name] of Object.entries(oldIdToName)) {
        const norm = normalize(name);
        const newId = dbMap[norm];
        if (newId) {
            oldToNewMap[oldId] = newId;
            console.log(`Mapped old ID "${oldId}" (${name}) -> new DB ID "${newId}"`);
        } else {
            console.error(`ERROR: Could not find brand "${name}" (normalized: "${norm}") in brands table!`);
        }
    }

    // 4. Update product_tags table
    const tagsRes = await client.query("SELECT id, name, brand_ids FROM product_tags WHERE brand_ids IS NOT NULL AND jsonb_array_length(brand_ids) > 0");
    console.log(`Found ${tagsRes.rows.length} tags to update.`);

    await client.query('BEGIN');

    for (const tag of tagsRes.rows) {
        const newBrandIds = [];
        for (const oldId of tag.brand_ids) {
            const newId = oldToNewMap[oldId];
            if (newId) {
                newBrandIds.push(newId);
            } else {
                console.warn(`Warning: No mapping found for old brand ID "${oldId}" in tag "${tag.name}"`);
            }
        }

        console.log(`Updating tag "${tag.name}": mapped ${tag.brand_ids.length} brand IDs to ${newBrandIds.length} active brand IDs.`);
        
        await client.query(
            "UPDATE product_tags SET brand_ids = $1::jsonb WHERE id = $2",
            [JSON.stringify(newBrandIds), tag.id]
        );
    }

    await client.query('COMMIT');
    console.log('Successfully updated product_tags table.');

    await client.end();
}

run().catch(console.error);
