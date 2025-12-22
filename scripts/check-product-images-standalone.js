const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkImages() {
    try {
        const countRes = await pool.query('SELECT COUNT(*) as total FROM products');
        console.log(`Total Products: ${countRes.rows[0].total}`);

        const featuredCountRes = await pool.query('SELECT COUNT(*) as featured FROM products WHERE is_featured = true');
        console.log(`Featured Products: ${featuredCountRes.rows[0].featured}`);

        if (parseInt(featuredCountRes.rows[0].featured) === 0) {
            console.log("No featured products found! Listing 3 non-featured products to check their images:");
            const res = await pool.query('SELECT id, name, images, is_featured FROM products LIMIT 3');
            res.rows.forEach(p => {
                console.log(`\nID: ${p.id}`);
                console.log(`Name: ${p.name}`);
                console.log(`Is Featured: ${p.is_featured}`);
                console.log(`Images Raw Type: ${typeof p.images}`);
                console.log(`Images Value:`, p.images);
            });
        } else {
            const res = await pool.query('SELECT id, name, images, is_featured FROM products WHERE is_featured = true LIMIT 5');
            console.log('Featured Products Image Check:');
            res.rows.forEach(p => {
                console.log(`\nID: ${p.id}`);
                console.log(`Name: ${p.name}`);
                console.log(`Images Raw Type: ${typeof p.images}`);
                console.log(`Images Value:`, p.images);
            });
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkImages();
