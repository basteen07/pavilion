const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function seed() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const mapping = JSON.parse(fs.readFileSync('clean-hierarchy.json', 'utf8'));

        // Fetch collections
        const colRes = await client.query('SELECT id, name FROM parent_collections');
        const collections = {};
        colRes.rows.forEach(r => {
            collections[r.name.toUpperCase()] = r.id;
        });

        // Add specific handling for collection name variations
        collections["FITNESS/TRAINING "] = collections["FITNESS & TRAINING"];
        collections["FITNESS & TRAINING"] = collections["FITNESS & TRAINING"];

        function slugify(text) {
            return text.toString().toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w\-]+/g, '')
                .replace(/\-\-+/g, '-')
                .replace(/^-+/, '')
                .replace(/-+$/, '');
        }

        for (const [colName, cats] of Object.entries(mapping)) {
            let colId = collections[colName.toUpperCase()];

            if (!colId) {
                console.log(`Collection not found: ${colName}. Creating it...`);
                const slug = slugify(colName);
                const insertCol = await client.query(
                    'INSERT INTO parent_collections (name, slug, is_active) VALUES ($1, $2, true) RETURNING id',
                    [colName, slug]
                );
                colId = insertCol.rows[0].id;
                collections[colName.toUpperCase()] = colId;
                console.log(`  Added Collection: ${colName}`);
            }

            for (const [catName, subCats] of Object.entries(cats)) {
                console.log(`Processing Category: ${catName} in ${colName}`);

                // Ensure Category exists
                let catRes = await client.query('SELECT id FROM categories WHERE name = $1', [catName]);
                let catId;
                if (catRes.rows.length === 0) {
                    const slug = slugify(catName);
                    const insertCat = await client.query(
                        'INSERT INTO categories (name, slug, parent_collection_id, is_active) VALUES ($1, $2, $3, true) RETURNING id',
                        [catName, slug, colId]
                    );
                    catId = insertCat.rows[0].id;
                    console.log(`  Added Category: ${catName}`);
                } else {
                    catId = catRes.rows[0].id;
                    // Update collection and slug if needed
                    await client.query('UPDATE categories SET parent_collection_id = $1 WHERE id = $2', [colId, catId]);
                }

                for (const [subCatName, tags] of Object.entries(subCats)) {
                    // Ensure Sub-Category exists
                    let subCatRes = await client.query('SELECT id FROM sub_categories WHERE name = $1 AND category_id = $2', [subCatName, catId]);
                    let subCatId;
                    if (subCatRes.rows.length === 0) {
                        const insertSub = await client.query(
                            'INSERT INTO sub_categories (name, category_id, is_active) VALUES ($1, $2, true) RETURNING id',
                            [subCatName, catId]
                        );
                        subCatId = insertSub.rows[0].id;
                        console.log(`    Added Sub-Category: ${subCatName}`);
                    } else {
                        subCatId = subCatRes.rows[0].id;
                    }

                    for (const tagName of tags) {
                        // Ensure Tag exists
                        let tagRes = await client.query('SELECT id FROM product_tags WHERE name = $1 AND sub_category_id = $2', [tagName, subCatId]);
                        if (tagRes.rows.length === 0) {
                            await client.query(
                                'INSERT INTO product_tags (name, category_id, sub_category_id, is_active) VALUES ($1, $2, $3, true)',
                                [tagName, catId, subCatId]
                            );
                            console.log(`      Added Tag: ${tagName}`);
                        }
                    }
                }
            }
        }

        console.log('Final seeding completed successfully!');
    } catch (err) {
        console.error('Seeding failed:', err);
    } finally {
        await client.end();
    }
}

seed();
