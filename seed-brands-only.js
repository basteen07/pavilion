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

        console.log('Seeding Brands...');
        let addedCount = 0;
        let existingCount = 0;

        for (const brandName of brands) {
            const slug = slugify(brandName);
            const res = await client.query('SELECT id FROM brands WHERE name = $1', [brandName]);

            if (res.rows.length === 0) {
                await client.query(
                    'INSERT INTO brands (name, slug, is_active) VALUES ($1, $2, true)',
                    [brandName, slug]
                );
                console.log(`  Added Brand: ${brandName}`);
                addedCount++;
            } else {
                console.log(`  Brand already exists: ${brandName}`);
                existingCount++;
            }
        }

        console.log(`\nSeeding completed! Added: ${addedCount}, Existing: ${existingCount}`);

    } catch (err) {
        console.error('Seeding failed:', err);
    } finally {
        await client.end();
    }
}

seed();
