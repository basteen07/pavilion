const { Client } = require('pg');
require('dotenv').config();

async function verify() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        // Check Brands
        const brandCountRes = await client.query('SELECT COUNT(*) FROM brands');
        console.log(`Total Brands: ${brandCountRes.rows[0].count}`);

        const sampleBrands = ['Triumph', 'Vector X', 'The Pavilion'];
        for (const brand of sampleBrands) {
            const res = await client.query('SELECT id FROM brands WHERE name = $1', [brand]);
            console.log(`  Brand '${brand}' exists: ${res.rows.length > 0}`);
        }

        // Check Tags (Should be 0 or unchanged if we assume clean state)
        // Since we reverted, we expect tags related to these brands to be 0
        const tagCountRes = await client.query('SELECT COUNT(*) FROM product_tags WHERE name = ANY($1)', [sampleBrands]);
        console.log(`Tags matching sample brands (Expected 0): ${tagCountRes.rows[0].count}`);

    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        await client.end();
    }
}

verify();
