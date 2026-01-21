const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function dump() {
    const client = await pool.connect();
    try {
        const cats = await client.query('SELECT id, name FROM categories ORDER BY name');
        const subs = await client.query(`
            SELECT sc.id, sc.name, c.name as category_name, sc.category_id 
            FROM sub_categories sc 
            JOIN categories c ON sc.category_id = c.id 
            ORDER BY c.name, sc.name
        `);
        const brands = await client.query('SELECT id, name FROM brands ORDER BY name');

        // Try to get tags with context
        let tags;
        try {
            tags = await client.query(`
                SELECT t.id, t.name, sc.name as sub_category_name 
                FROM product_tags t 
                LEFT JOIN sub_categories sc ON t.sub_category_id = sc.id
                ORDER BY sc.name, t.name
            `);
        } catch (e) {
            // Fallback for different table name or schema
            tags = await client.query('SELECT id, name FROM product_tags_v2');
        }

        const data = {
            categories: cats.rows,
            subCategories: subs.rows,
            brands: brands.rows,
            tags: tags.rows
        };

        const fs = require('fs');
        fs.writeFileSync('metadata_clean.json', JSON.stringify(data, null, 2), 'utf8');
        console.log('Dumped to metadata_clean.json');

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}

dump();
