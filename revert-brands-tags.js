const { Client } = require('pg');
require('dotenv').config();

const brands = [
    "Triumph", "Vector X", "MK", "Tynor", "Gray Nicolls", "Fox 40", "Legend", "Yonex",
    "Li-Ning", "Nawab", "Generic", "Head", "Dunlop", "Stiga", "Butterfly", "Yasaka",
    "Stag", "Kay Kay", "Shrey", "SS", "Tyka", "Everlast", "DSC", "Domestic",
    "Unicorn", "Yonker", "Skechers", "Asics", "Airavat", "Cosco", "Apex", "SG",
    "Kookaburra", "MRF", "RNS", "Moonwalkr", "Aero", "The Pavilion"
];

async function revert() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        // Phase 1: Remove Tags
        console.log('Removing Tags...');
        for (const brandName of brands) {
            const res = await client.query('DELETE FROM product_tags WHERE name = $1', [brandName]);
            console.log(`  Removed Tags for: ${brandName} (Count: ${res.rowCount})`);
        }

        // Phase 2: Remove Brands
        console.log('Removing Brands...');
        for (const brandName of brands) {
            const res = await client.query('DELETE FROM brands WHERE name = $1', [brandName]);
            console.log(`  Removed Brand: ${brandName} (Count: ${res.rowCount})`);
        }

        console.log('Revert completed successfully!');

    } catch (err) {
        console.error('Revert failed:', err);
    } finally {
        await client.end();
    }
}

revert();
