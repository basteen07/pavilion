const { Pool } = require('pg');
// Faker removed
// Since I cannot ensure faker is installed, I'll use native random generation.

require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const ADJECTIVES = ['Premium', 'Deluxe', 'Standard', 'Pro', 'Elite', 'Basic', 'Advanced', 'Ultra', 'Super', 'Hyper'];
const NOUNS = ['Gear', 'Equipment', 'Kit', 'Set', 'Pack', 'Collection', 'Series', 'Edition', 'Bundle', 'Unit'];

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function seedProducts() {
    const client = await pool.connect();
    try {
        console.log('Starting product seeding (Optimized)...');

        // 1. Fetch Metadata
        console.log('Fetching metadata...');
        const [catsRes, subCatsRes, brandsRes, tagsRes] = await Promise.all([
            client.query('SELECT id, name FROM categories'),
            client.query('SELECT id, name, category_id FROM sub_categories'),
            client.query('SELECT id, name FROM brands'),
            client.query('SELECT id, name FROM product_tags_v2')
                .catch(() => client.query('SELECT id, name FROM product_tags'))
                .catch(() => ({ rows: [] }))
        ]);

        const categories = catsRes.rows;
        const subCategories = subCatsRes.rows;
        const brands = brandsRes.rows;
        const tags = tagsRes.rows;

        // Ensure we really have metadata
        if (categories.length === 0) throw new Error('No categories found.');
        if (brands.length === 0) throw new Error('No brands found.');

        // 2. Prepare Batch
        // We need 1000 TOTAL. We already have 500 from previous run if we didn't wipe, 
        // but let's assume we want to reach 1000 total or add 1000.
        // The user request said "total need to insert total ~1000 products".
        // I'll check count first.
        const countRes = await client.query('SELECT count(*) FROM products');
        const currentCount = parseInt(countRes.rows[0].count);
        console.log(`Current Count: ${currentCount}`);

        let target = 1000 - currentCount;
        if (target <= 0) {
            console.log('Already have 1000+ products. Adding 100 more just in case.');
            target = 100;
        }

        console.log(`Aiming to insert ${target} new products.`);

        const BATCH_SIZE = 50;

        for (let i = 0; i < target; i += BATCH_SIZE) {
            const batchSize = Math.min(BATCH_SIZE, target - i);
            const batchRows = [];

            for (let j = 0; j < batchSize; j++) {
                const category = getRandomElement(categories);
                const relevantSubCats = subCategories.filter(sc => sc.category_id === category.id);
                const subCategory = relevantSubCats.length > 0 ? getRandomElement(relevantSubCats) : null;
                const brand = getRandomElement(brands);
                const tag = tags.length > 0 ? getRandomElement(tags) : null;

                // Price Logic
                const mrp = getRandomInt(500, 50000);
                const dealerPrice = Math.floor(mrp * (getRandomInt(50, 75) / 100));
                const gap = mrp - dealerPrice;
                const recommendedPrice = Math.floor(dealerPrice + (gap * (getRandomInt(30, 80) / 100)));
                const counterPrice = Math.floor(recommendedPrice * (getRandomInt(95, 105) / 100));
                const shopPrice = recommendedPrice;

                const pNum = currentCount + i + j + 1; // Correct index offset
                const uniqueStr = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
                const name = `${getRandomElement(ADJECTIVES)} ${brand.name} ${category.name} ${getRandomElement(NOUNS)} ${pNum}`;
                const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${uniqueStr}`;
                const sku = `SKU-${uniqueStr}-${pNum}`;

                const images = JSON.stringify([
                    `https://placehold.co/600x400?text=${encodeURIComponent(name)}`,
                    `https://placehold.co/600x400/000000/FFF?text=${encodeURIComponent(brand.name)}`
                ]);
                const description = `Optimized seed product. ${name} from ${brand.name}. MRP: ${mrp}`;

                batchRows.push([
                    sku, name, slug,
                    brand.id, category.id, subCategory ? subCategory.id : null, tag ? tag.id : null,
                    description, description,
                    mrp, dealerPrice, shopPrice, recommendedPrice, counterPrice,
                    images, true, false,
                    Math.floor(Math.random() * 100), true
                ]);
            }

            // Construct Multi-Row Insert
            // Columns: 19
            const valueStrings = [];
            const flatValues = [];
            let paramIdx = 1;

            for (const row of batchRows) {
                const placeholders = [];
                for (let k = 0; k < row.length; k++) {
                    placeholders.push(`$${paramIdx++}`);
                    flatValues.push(row[k]);
                }
                valueStrings.push(`(${placeholders.join(', ')})`);
            }

            const queryText = `
                INSERT INTO products (
                    sku, name, slug, 
                    brand_id, category_id, sub_category_id, tag_id,
                    short_description, description,
                    mrp_price, dealer_price, shop_price, recommended_price, counter_price,
                    images, is_featured, is_quote_hidden, stock_quantity, is_active
                ) VALUES ${valueStrings.join(', ')}
                ON CONFLICT (sku) DO NOTHING
            `;

            await client.query(queryText, flatValues);
            console.log(`Seeded batch ${i / BATCH_SIZE + 1} (${batchRows.length} items)`);
        }

        console.log('Seeding Complete!');

    } catch (e) {
        console.error('Seeding Failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

seedProducts();
