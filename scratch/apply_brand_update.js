const { Client } = require('pg');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config();

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        // Phase 1: Truncate products, product_variants, quotations, and quotation_items
        console.log('Phase 1: Truncating products, product_variants, quotations, and quotation_items...');
        await client.query('TRUNCATE TABLE quotation_items, quotations, product_variants, products CASCADE');
        console.log('  Successfully truncated products and quotations tables.');

        // Phase 2: Truncate brands
        console.log('Phase 2: Truncating brands table...');
        await client.query('TRUNCATE TABLE brands CASCADE');
        console.log('  Successfully truncated brands table.');

        // Phase 3: Parse new brands from Brand Names.xlsx
        console.log('Phase 3: Parsing brands from Brand Names.xlsx...');
        const workbook = XLSX.readFile(path.join(__dirname, '..', 'Brand Names.xlsx'));
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        const brandsSet = new Set();
        data.forEach(row => {
            for (const key in row) {
                if (key.startsWith('Brand Name')) {
                    const val = row[key];
                    if (val && typeof val === 'string') {
                        const cleaned = val.trim();
                        if (cleaned) {
                            brandsSet.add(cleaned);
                        }
                    }
                }
            }
        });

        const sortedBrands = Array.from(brandsSet).sort();
        console.log(`  Found ${sortedBrands.length} unique brands to insert.`);

        // Phase 4: Insert new global brands (with category_id and sub_category_id as NULL)
        console.log('Phase 4: Inserting new brands globally...');
        let insertedCount = 0;
        for (const brandName of sortedBrands) {
            const slug = slugify(brandName);
            await client.query(
                'INSERT INTO brands (name, slug, category_id, sub_category_id, is_active) VALUES ($1, $2, NULL, NULL, true)',
                [brandName, slug]
            );
            insertedCount++;
        }

        console.log(`\nMigration completed successfully!`);
        console.log(`- Quotations and products tables truncated.`);
        console.log(`- Brands table truncated and populated with ${insertedCount} global brands.`);

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

run();
