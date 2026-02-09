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

async function seed() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        // Phase 1: Seed Brands
        console.log('Seeding Brands...');
        for (const brandName of brands) {
            const slug = slugify(brandName);
            const res = await client.query('SELECT id FROM brands WHERE name = $1', [brandName]);

            if (res.rows.length === 0) {
                await client.query(
                    'INSERT INTO brands (name, slug, is_active) VALUES ($1, $2, true)',
                    [brandName, slug]
                );
                console.log(`  Added Brand: ${brandName}`);
            } else {
                console.log(`  Brand already exists: ${brandName}`);
            }
        }

        // Phase 2: Seed Tags for each Sub-Category
        console.log('Seeding Tags for each Sub-Category...');
        const subCatsRes = await client.query('SELECT id, category_id, name FROM sub_categories');
        const subCategories = subCatsRes.rows;

        for (const subCat of subCategories) {
            console.log(`  Processing tags for Sub-Category: ${subCat.name} (ID: ${subCat.id})`);
            for (const brandName of brands) {
                // Ensure Tag exists for this sub_category
                const tagRes = await client.query(
                    'SELECT id FROM product_tags WHERE name = $1 AND sub_category_id = $2',
                    [brandName, subCat.id]
                );

                if (tagRes.rows.length === 0) {
                    await client.query(
                        'INSERT INTO product_tags (name, category_id, sub_category_id, is_active) VALUES ($1, $2, $3, true)',
                        [brandName, subCat.category_id, subCat.id]
                    );
                    // No logging per tag to avoid noise, summary at end
                }
            }
        }

        console.log('Seeding completed successfully!');

    } catch (err) {
        console.error('Seeding failed:', err);
    } finally {
        await client.end();
    }
}

seed();
