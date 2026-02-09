const { Client } = require('pg');
const fs = require('fs');
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

async function seed() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        // Load sub-category distribution
        const subCats = JSON.parse(fs.readFileSync('sub_cats_tags.json', 'utf8'));

        console.log(`Processing ${subCats.length} sub-categories...`);

        let brandTableCount = 0;
        let tagTableCount = 0;

        for (const subCat of subCats) {
            const hasTags = parseInt(subCat.tag_count) > 0;
            const subCatId = subCat.id;
            const catId = subCat.category_id;

            if (!hasTags) {
                // Seed directly into 'brands' table for this sub-category
                for (const brandName of brands) {
                    const slug = slugify(brandName);
                    const checkRes = await client.query(
                        'SELECT id FROM brands WHERE name = $1 AND sub_category_id = $2',
                        [brandName, subCatId]
                    );

                    if (checkRes.rows.length === 0) {
                        await client.query(
                            'INSERT INTO brands (name, slug, category_id, sub_category_id, is_active) VALUES ($1, $2, $3, $4, true)',
                            [brandName, slug, catId, subCatId]
                        );
                        brandTableCount++;
                    }
                }
            } else {
                // Seed into 'product_tags' table for this sub-category
                for (const brandName of brands) {
                    const checkRes = await client.query(
                        'SELECT id FROM product_tags WHERE name = $1 AND sub_category_id = $2',
                        [brandName, subCatId]
                    );

                    if (checkRes.rows.length === 0) {
                        await client.query(
                            'INSERT INTO product_tags (name, category_id, sub_category_id, is_active) VALUES ($1, $2, $3, true)',
                            [brandName, catId, subCatId]
                        );
                        tagTableCount++;
                    }
                }
            }
        }

        console.log(`Finished seeding!`);
        console.log(`- Brands added to 'brands' table: ${brandTableCount}`);
        console.log(`- Brands added to 'product_tags' table: ${tagTableCount}`);

    } catch (err) {
        console.error('Seeding failed:', err);
    } finally {
        await client.end();
    }
}

seed();
