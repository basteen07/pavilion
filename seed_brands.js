const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const categoriesBrands = {
    'Cricket': ['SG', 'SS', 'Ton', 'MRF', 'Kookaburra', 'Gray-Nicolls', 'Gunn & Moore', 'New Balance', 'DSC', 'CA', 'Puma', 'Adidas', 'Nike', 'Spartan', 'Shrey'],
    'Football': ['Adidas', 'Nike', 'Puma', 'Nivia', 'Cosco', 'Kipsta', 'Umbro', 'Nivia'],
    'Badminton': ['Yonex', 'Li-Ning', 'Victor', 'Ashaway', 'Carlton', 'Apacs'],
    'Tennis': ['Wilson', 'Babolat', 'Head', 'Yonex', 'Prince', 'Tecnifibre'],
    'Squash': ['Wilson', 'Head', 'Dunlop', 'Technifibre', 'Prince'],
    'Table Tennis': ['Butterfly', 'GKI', 'Stag', 'Donic', 'Joola', 'Tibhar'],
    'Basketball': ['Spalding', 'Molten', 'Wilson', 'Nike', 'Jordan'],
    'Fitness Equipment': ['Rogue', 'Technogym', 'Matrix', 'Precor', 'Cosco', 'Decathlon', 'Viva Fitness'],
    'Training Equipment': ['Decathlon', 'Puma', 'Nike', 'Adidas'],
    'Shoes': ['Nike', 'Adidas', 'Puma', 'Asics', 'Sketchers', 'New Balance', 'Reebok', 'Nivia'],
    'Clothing': ['Nike', 'Adidas', 'Puma', 'Under Armour', 'New Balance', 'ASICS'],
    'Water Sports': ['Speedo', 'Arena', 'Tyr', 'Nabaiji'],
    'Indoor Games': ['Precise', 'Siscaa', 'Synco', 'DGT', 'Staunton'],
    'Outdoor Games': ['Mikasa', 'Spartan', 'Nivia', 'Cosco', 'Riedell', 'Oxelo', 'Rollerblade'],
    'Volleyball': ['Mikasa', 'Spartan', 'Nivia', 'Cosco'],
    'Handball': ['Select', 'Hummel', 'Molten', 'Adidas'],
    'Rugby': ['Gilbert', 'Canterbury', 'Adidas'],
    'Racket Game': ['Selkirk', 'Joola', 'Franklin', 'Head', 'Wilson']
};

const subCatKeywords = {
    'Bat': ['SG', 'SS', 'Ton', 'MRF', 'Kookaburra', 'Gray-Nicolls', 'Gunn & Moore', 'DSC', 'CA', 'New Balance'],
    'Racket': ['Yonex', 'Li-Ning', 'Victor', 'Head', 'Wilson', 'Babolat'],
    'Shuttlecock': ['Yonex', 'Li-Ning', 'Victor'],
    'Ball': ['Wilson', 'Head', 'Spalding', 'Mikasa', 'Nivia', 'Cosco', 'Molten', 'Adidas', 'Nike'],
    'Shoes': ['Nike', 'Adidas', 'Puma', 'Asics', 'New Balance', 'Reebok', 'Yonex'],
    'Cloth': ['Nike', 'Adidas', 'Puma', 'Under Armour'],
    'Swim': ['Speedo', 'Arena', 'Tyr', 'Nabaiji'],
    'Gym': ['Technogym', 'Matrix', 'Precor'],
    'Yoga': ['Decathlon', 'Reebok', 'Nike'],
    'Carrom': ['Precise', 'Siscaa', 'Synco'],
    'Chess': ['DGT', 'Staunton'],
    'Skates': ['Oxelo', 'Rollerblade'],
    'Boxing': ['Everlast', 'Venum', 'Title', 'Adidas']
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
        console.log('Truncating brands table again to be sure...');
        await client.query('TRUNCATE TABLE brands CASCADE');

        for (const sub of sub_categories) {
            const cat = categories.find(c => c.id === sub.category_id);
            if (!cat) continue;

            let targetBrands = [];

            // 1. Check Sub-category Keywords
            for (const [key, brands] of Object.entries(subCatKeywords)) {
                if (sub.name.toLowerCase().includes(key.toLowerCase())) {
                    targetBrands = [...new Set([...targetBrands, ...brands])];
                }
            }

            // 2. If no specific sub-cat brands, check Category Brands
            if (targetBrands.length === 0) {
                for (const [key, brands] of Object.entries(categoriesBrands)) {
                    if (cat.name.toLowerCase().includes(key.toLowerCase())) {
                        targetBrands = [...new Set([...targetBrands, ...brands])];
                    }
                }
            }

            // 3. Insert Brands
            for (const brandName of targetBrands) {
                const slug = generateSlug(brandName, cat.id, sub.id);
                await client.query(
                    'INSERT INTO brands (name, slug, category_id, sub_category_id, is_active) VALUES ($1, $2, $3, $4, true) ON CONFLICT DO NOTHING',
                    [brandName, slug, cat.id, sub.id]
                );
            }
        }

        await client.query('COMMIT');
        console.log('Seeding completed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Seeding failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
