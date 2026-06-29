const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

function normalize(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    // 1. Load old brands from metadata_clean.json
    const metadata = JSON.parse(fs.readFileSync('metadata_clean.json', 'utf8'));
    const oldBrands = metadata.brands; // array of { id, name }
    console.log(`Loaded ${oldBrands.length} old brands from metadata_clean.json.`);

    // 2. Fetch all brands from database
    const dbBrandsRes = await client.query("SELECT id, name FROM brands");
    const dbBrands = dbBrandsRes.rows;
    console.log(`Fetched ${dbBrands.length} brands from DB.`);

    // 3. Map db brands by normalized name
    const dbMap = {};
    for (const b of dbBrands) {
        const norm = normalize(b.name);
        dbMap[norm] = b.id;
    }

    // 4. Map old brand IDs to new brand IDs
    const oldToNewMap = {};
    let matchedCount = 0;
    let unmatched = [];

    for (const ob of oldBrands) {
        const norm = normalize(ob.name);
        // Special case overrides if needed:
        let mappedId = dbMap[norm];
        
        // Let's do a few variations if not found
        if (!mappedId) {
            // check if there's a brand in DB that contains the normalized name or vice-versa
            const matchedKey = Object.keys(dbMap).find(k => k.includes(norm) || norm.includes(k));
            if (matchedKey) {
                mappedId = dbMap[matchedKey];
            }
        }

        if (mappedId) {
            oldToNewMap[ob.id] = mappedId;
            matchedCount++;
        } else {
            unmatched.push(ob);
        }
    }

    console.log(`Matched: ${matchedCount} / ${oldBrands.length}`);
    console.log('Unmatched brands:', unmatched);

    // Let's check how many tags are affected
    const tagsRes = await client.query("SELECT id, name, brand_ids FROM product_tags");
    let affectedTagsCount = 0;
    let emptyTagsCount = 0;

    for (const tag of tagsRes.rows) {
        if (!tag.brand_ids || tag.brand_ids.length === 0) {
            emptyTagsCount++;
            continue;
        }

        let hasOldIds = false;
        for (const bid of tag.brand_ids) {
            if (oldToNewMap[bid]) {
                hasOldIds = true;
            }
        }
        if (hasOldIds) {
            affectedTagsCount++;
        }
    }

    console.log(`Total tags in database: ${tagsRes.rows.length}`);
    console.log(`Tags with empty brand_ids: ${emptyTagsCount}`);
    console.log(`Tags with old brand IDs that can be mapped: ${affectedTagsCount}`);

    await client.end();
}

run().catch(console.error);
