const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    
    let log = '';
    const logLine = (msg, obj) => {
        log += msg + '\n';
        if (obj) {
            log += JSON.stringify(obj, null, 2) + '\n';
        }
        log += '\n';
    };

    logLine('Connected to database.');

    // 1. Find the Category "Cricket"
    const catRes = await client.query("SELECT id, name FROM categories WHERE name = 'Cricket'");
    logLine('Categories:', catRes.rows);
    const cricketId = catRes.rows[0]?.id;

    // 2. Find the Sub-Category "Bats" under Cricket
    const subRes = await client.query("SELECT id, name, category_id FROM sub_categories WHERE name = 'Bats'");
    logLine('Sub-Categories:', subRes.rows);
    const batsId = subRes.rows[0]?.id;

    // 3. Find the Tag "English Willow Cricket Bats"
    const tagRes = await client.query("SELECT id, name, category_id, sub_category_id, brand_ids FROM product_tags WHERE name = 'English Willow Cricket Bats'");
    logLine('Tag:', tagRes.rows[0]);
    const tag = tagRes.rows[0];

    if (tag && tag.brand_ids) {
        logLine('Tag brand_ids array:', tag.brand_ids);
        
        // Let's query these brand IDs in the brands table
        const brandIds = Array.isArray(tag.brand_ids) ? tag.brand_ids : JSON.parse(tag.brand_ids);
        if (brandIds.length > 0) {
            // Find brands details
            const brandsRes = await client.query("SELECT id, name, category_id, sub_category_id, is_active FROM brands WHERE id = ANY($1::uuid[])", [brandIds]);
            logLine('Brands referenced by tag:', brandsRes.rows);
        }
    }

    // 4. Find all brands in the DB
    const allBrandsRes = await client.query("SELECT id, name, category_id, sub_category_id, is_active FROM brands ORDER BY name LIMIT 10");
    logLine('First 10 brands in brands table:', allBrandsRes.rows);

    // 5. Query brands filtered by category_id and sub_category_id (simulate the API logic)
    const apiSimRes = await client.query(
        "SELECT id, name, category_id, sub_category_id FROM brands WHERE is_active = true AND (sub_category_id = $1 OR sub_category_id IS NULL) ORDER BY name",
        [batsId]
    );
    logLine(`Brands matching sub_category_id = ${batsId} or NULL:`, apiSimRes.rows);

    // 6. Let's see what the API response /brands?category_id=...&sub_category_id=... actually returns
    // The front-end fetches: `/brands?category_id=${cricketId}&sub_category_id=${batsId}`
    // Let's look at fetchBrands in lib/api/brands.js:
    // If categoryId AND subCategoryId are passed:
    // Since subCategoryId is present, it does:
    // queryStr += ` AND (b.sub_category_id = $1 OR b.sub_category_id IS NULL)`
    // And categoryId is NOT appended to queryStr because of the if-else:
    // `} else if (categoryId || subCategoryId) {
    //      if (subCategoryId) { ... } else if (categoryId) { ... }
    //  }`
    // Let's test that exact query!
    
    fs.writeFileSync('scratch/check-brands-issue-output-utf8.txt', log, 'utf8');
    await client.end();
}

run().catch(console.error);
