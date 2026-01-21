const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// --- REALISTIC MAPPINGS ---
const BRAND_CATEGORY_MAP = {
    'SS': ['Cricket'],
    'SG': ['Cricket'],
    'MRF': ['Cricket'],
    'GM': ['Cricket'],
    'Gray-Nicolls': ['Cricket'],
    'Kookaburra': ['Cricket'],
    'Yonex': ['Badminton', 'Tennis'],
    'Li-Ning': ['Badminton'],
    'Victor': ['Badminton'],
    'Apacs': ['Badminton'],
    'Wilson': ['Tennis', 'Squash', 'Basketball'],
    'Head': ['Tennis', 'Squash'],
    'Babolat': ['Tennis'],
    'Nivia': ['Football', 'Volleyball', 'Basketball', 'Shoes', 'Training Equipment'],
    'Cosco': ['Football', 'Volleyball', 'Basketball', 'Tennis'],
    'Kipsta': ['Football', 'Team Sports'],
    'Spalding': ['Basketball'],
    'Stiga': ['Table Tennis'],
    'Donic': ['Table Tennis'],
    'Butterfly': ['Table Tennis'],
    'Joola': ['Table Tennis'],
    'Adidas': ['Shoes', 'Coming Soon', 'Football', 'Cricket'],
    'Puma': ['Shoes', 'Cricket', 'Football'],
    'Nike': ['Shoes', 'Football']
};

const ADJECTIVES = ['Pro', 'Elite', 'Select', 'Prime', 'Master', 'Super', 'Hyper', 'Ultra', 'Limited', 'Classic'];
const EDITIONS = ['Edition', 'Series', 'X', 'V2', 'Pro Model', 'Signature'];

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

async function seedEnhanced() {
    const client = await pool.connect();
    try {
        console.log('Starting ENHANCED product seeding...');

        // 1. Fetch ALL Metadata
        console.log('Fetching metadata...');
        const [catsRes, subCatsRes, brandsRes, tagsRes] = await Promise.all([
            client.query('SELECT id, name FROM categories'),
            client.query('SELECT id, name, category_id FROM sub_categories'),
            client.query('SELECT id, name FROM brands'),
            client.query('SELECT id, name, sub_category_id FROM product_tags_v2')
                .catch(() => client.query('SELECT id, name, sub_category_id FROM product_tags'))
                .catch(() => ({ rows: [] }))
        ]);

        const categories = catsRes.rows;
        const subCategories = subCatsRes.rows;
        const brands = brandsRes.rows;
        const tags = tagsRes.rows;

        // Map Helper: Category Name -> ID
        const catMap = {};
        categories.forEach(c => catMap[c.name] = c.id);

        console.log(`Loaded: ${categories.length} Cats, ${subCategories.length} Subs, ${brands.length} Brands, ${tags.length} Tags`);

        // 2. Clear previous seed data
        // User requested a full proper insert, so we wipe existing data to ensure purity.
        console.log('Truncating products table to ensure clean state...');
        await client.query('TRUNCATE TABLE products CASCADE');
        console.log('Products table truncated.');

        const TOTAL_TARGET = 1000;
        const BATCH_SIZE = 50;

        let needed = TOTAL_TARGET;
        let currentTotal = 0;

        console.log(`Generating ${needed} fresh realistic products...`);

        for (let i = 0; i < needed; i += BATCH_SIZE) {
            const batchRows = [];
            const batchSize = Math.min(BATCH_SIZE, needed - i);

            for (let j = 0; j < batchSize; j++) {
                // A. Pick a Strategy
                // Only pick brands that map to valid categories
                const validBrands = brands.filter(b => BRAND_CATEGORY_MAP[b.name]);
                const selectedBrand = validBrands.length > 0 && Math.random() > 0.1
                    ? getRandomElement(validBrands)
                    : getRandomElement(brands);

                // Determine allowed categories for this brand
                const allowedCatNames = BRAND_CATEGORY_MAP[selectedBrand.name];

                let targetCategory = null;
                if (allowedCatNames) {
                    const potentialCats = categories.filter(c => allowedCatNames.includes(c.name));
                    if (potentialCats.length > 0) targetCategory = getRandomElement(potentialCats);
                }

                if (!targetCategory) {
                    targetCategory = getRandomElement(categories);
                }

                // B. Pick Sub-Category
                const validSubs = subCategories.filter(s => s.category_id === targetCategory.id);
                const targetSub = getRandomElement(validSubs);

                // C. Pick Tag
                let targetTag = null;
                if (targetSub) {
                    const validTags = tags.filter(t => t.sub_category_id === targetSub.id);
                    if (validTags.length > 0) targetTag = getRandomElement(validTags);
                }

                // D. Generate Content
                const featureName = targetTag ? targetTag.name : (targetSub ? targetSub.name : targetCategory.name);
                let cleanFeature = featureName;

                const pNum = currentTotal + i + j + 1;
                const uniqueStr = Math.random().toString(36).substring(7);
                const sku = `${selectedBrand.name.substring(0, 3).toUpperCase()}-${targetCategory.name.substring(0, 3).toUpperCase()}-${pNum}-${uniqueStr}`;

                const name = `${selectedBrand.name} ${cleanFeature} ${getRandomElement(ADJECTIVES)} ${getRandomElement(EDITIONS)}`;
                const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${uniqueStr}`;

                // E. Pricing
                const mrp = getRandomInt(1000, 25000);
                const dealerPrice = Math.floor(mrp * (getRandomInt(50, 65) / 100)); // 50-65% of MRP
                const gap = mrp - dealerPrice;
                const recommendedPrice = Math.floor(dealerPrice + (gap * (getRandomInt(40, 70) / 100))); // Sweet spot
                const counterPrice = Math.floor(recommendedPrice * (getRandomInt(98, 102) / 100)); // +/- 2%
                const shopPrice = recommendedPrice;

                // F. Description
                const desc = `Experience professional quality with the ${name}. Manufactured by ${selectedBrand.name}, this item is part of our ${targetCategory.name} collection. Ideal for both training and matches.`;

                // G. Images
                const imgs = JSON.stringify([
                    `https://placehold.co/600x600?text=${encodeURIComponent(name)}`,
                    `https://placehold.co/600x600/333/FFF?text=${encodeURIComponent(selectedBrand.name)}`
                ]);

                batchRows.push([
                    sku, name, slug,
                    selectedBrand.id, targetCategory.id, targetSub ? targetSub.id : null, targetTag ? targetTag.id : null,
                    desc, desc,
                    mrp, dealerPrice, shopPrice, recommendedPrice, counterPrice,
                    imgs, Math.random() > 0.8, false,
                    getRandomInt(10, 200), true
                ]);
            }

            // Execute Batch
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
            console.log(`Seeded batch ${i / BATCH_SIZE + 1}`);
        }

        console.log('Enhanced seeding success!');

    } catch (e) {
        console.error('Seeding Error:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

seedEnhanced();
