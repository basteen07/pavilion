const { query } = require('../lib/simple-db');

async function checkImages() {
    try {
        const res = await query('SELECT id, name, images, is_featured FROM products WHERE is_featured = true LIMIT 5');
        console.log('Featured Products Image Check:');
        res.rows.forEach(p => {
            console.log(`\nID: ${p.id}`);
            console.log(`Name: ${p.name}`);
            console.log(`Images Raw Type: ${typeof p.images}`);
            console.log(`Images Value:`, p.images);
        });
    } catch (err) {
        console.error('Error:', err);
    }
}

checkImages();
