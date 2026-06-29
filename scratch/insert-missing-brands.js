const { Client } = require('pg');
require('dotenv').config();

const missingBrands = [
  'Generic',
  'Apacs',
  'Carlton',
  'Cornilleau',
  'DGT',
  'Dita',
  'Grays',
  'Kipsta',
  'Malik',
  'Staunton',
  'Victor',
  'Wegiel'
];

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    console.log('Connected to database.');

    await client.query('BEGIN');

    for (const name of missingBrands) {
        const slug = slugify(name);
        // Check if exists
        const checkRes = await client.query("SELECT id FROM brands WHERE LOWER(name) = LOWER($1)", [name]);
        if (checkRes.rows.length === 0) {
            const insertRes = await client.query(
                "INSERT INTO brands (name, slug, is_active) VALUES ($1, $2, true) RETURNING id",
                [name, slug]
            );
            console.log(`Inserted brand "${name}" with ID "${insertRes.rows[0].id}"`);
        } else {
            console.log(`Brand "${name}" already exists with ID "${checkRes.rows[0].id}"`);
        }
    }

    await client.query('COMMIT');
    console.log('Completed inserting missing brands.');

    await client.end();
}

run().catch(console.error);
