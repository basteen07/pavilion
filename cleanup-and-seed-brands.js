const { Client } = require('pg');
require('dotenv').config();

const brands = [
    "Triumph", "Vector X", "MK", "Tynor", "Gray Nicolls", "Fox 40", "Legend", "Yonex",
    "Li-Ning", "Nawab", "Generic", "Head", "Dunlop", "Stiga", "Butterfly", "Yasaka",
    "Stag", "Kay Kay", "Shrey", "SS", "Tyka", "Everlast", "DSC", "Domestic",
    "Unicorn", "Yonker", "Skechers", "Asics", "Airavat", "Cosco", "Apex", "SG",
    "Kookaburra", "MRF", "RNS", "Moonwalkr", "Aero", "The Pavilion"
];

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        // Phase 1: Cleanup incorrect tags
        console.log('Phase 1: cleaning up brands from product_tags table...');
        const deleteTagsRes = await client.query(
            'DELETE FROM product_tags WHERE name = ANY($1)',
            [brands]
        );
        console.log(`  Removed ${deleteTagsRes.rowCount} incorrect tags.`);

        // Phase 2: Seed brands for all subcategories
        console.log('Phase 2: Seeding brands to brands table for all subcategories...');
        const subCatsRes = await client.query('SELECT id, category_id, name FROM sub_categories');
        const subCategories = subCatsRes.rows;

        console.log(`  Found ${subCategories.length} sub-categories.`);

        let brandsAddedCount = 0;
        let brandsExistingCount = 0;

        for (const subCat of subCategories) {
            for (const brandName of brands) {
                const slug = slugify(brandName);

                // Check if this brand exists for this sub_category
                const checkRes = await client.query(
                    'SELECT id FROM brands WHERE name = $1 AND sub_category_id = $2',
                    [brandName, subCat.id]
                );

                if (checkRes.rows.length === 0) {
                    await client.query(
                        'INSERT INTO brands (name, slug, category_id, sub_category_id, is_active) VALUES ($1, $2, $3, $4, true)',
                        [brandName, slug, subCat.category_id, subCat.id]
                    );
                    brandsAddedCount++;
                } else {
                    brandsExistingCount++;
                }
            }
        }

        console.log(`\nFinished!`);
        console.log(`- Brands added to brands table: ${brandsAddedCount}`);
        console.log(`- Brands already existed: ${brandsExistingCount}`);

    } catch (err) {
        console.error('Operation failed:', err);
    } finally {
        await client.end();
    }
}

run();
