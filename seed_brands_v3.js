const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const categoriesBrands = {
    'Cricket': ['SG', 'SS', 'Ton', 'MRF', 'Kookaburra', 'Gray-Nicolls', 'Gunn & Moore', 'New Balance', 'DSC', 'CA', 'Puma', 'Adidas', 'Nike', 'Spartan', 'Shrey']
};

const subCatKeywords = {
    'Bat': ['SG', 'SS', 'Ton', 'MRF', 'Kookaburra', 'Gray-Nicolls', 'Gunn & Moore', 'DSC', 'CA', 'New Balance']
};

const generateSlug = (name, catId, subId) => {
    return (name + '-' + (catId.substring(0, 4)) + '-' + subId)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

async function seed() {
    const client = await pool.connect();
    try {
        const categoriesData = JSON.parse(require('fs').readFileSync('cats_data.json', 'utf8'));
        const { categories, sub_categories } = categoriesData;

        await client.query('BEGIN');
        console.log('Truncating brands table...');
        await client.query('TRUNCATE TABLE brands CASCADE');

        for (const sub of sub_categories) {
            if (sub.id != 4 && sub.id != 5) continue; // FOCUS ON 4 and 5

            const cat = categories.find(c => c.id === sub.category_id);
            if (!cat) continue;

            let targetBrands = ['SG', 'SS', 'MRF'];

            console.log(`Targeting SubID ${sub.id} (${sub.name}) with brands:`, targetBrands);

            for (const brandName of targetBrands) {
                const slug = generateSlug(brandName, cat.id, sub.id);
                console.log(`Executing INSERT for ${brandName}, SubID: ${sub.id}, Slug: ${slug}`);
                const res = await client.query(
                    'INSERT INTO brands (name, slug, category_id, sub_category_id, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id',
                    [brandName, slug, cat.id, sub.id]
                );
                console.log(`Inserted ID: ${res.rows[0].id}`);
            }
        }

        await client.query('COMMIT');
        console.log('Seeding of 4 and 5 completed!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Seeding failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
