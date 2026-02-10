require('dotenv').config();
const { query } = require('../lib/simple-db');

async function analyzeBrands() {
    try {
        console.log('--- Brand Analysis Report ---');
        const totalBrands = await query('SELECT COUNT(*) FROM brands');
        console.log(`Total Brands: ${totalBrands.rows[0].count}`);


        const duplicates = await query(`
            SELECT name, COUNT(*) as count 
            FROM brands 
            GROUP BY name 
            HAVING COUNT(*) > 1 
            ORDER BY count DESC
        `);
        console.log(`\nDuplicate Brand Names Found: ${duplicates.rows.length}`);
        if (duplicates.rows.length > 0) {
            console.log('Top 10 Duplicates:');
            duplicates.rows.slice(0, 10).forEach(d => console.log(`- ${d.name}: ${d.count} entries`));
        }

        const unusedBrands = await query(`
            SELECT COUNT(*) 
            FROM brands b
            LEFT JOIN products p ON b.id = p.brand_id
            WHERE p.id IS NULL
        `);
        console.log(`\nBrands with no products: ${unusedBrands.rows[0].count}`);
        const productBrands = await query(`
            SELECT b.name, COUNT(p.id) as product_count
            FROM brands b
            JOIN products p ON b.id = p.brand_id
            GROUP BY b.name
            ORDER BY product_count DESC
            LIMIT 10
        `);
        console.log('\nTop 10 Brands by Product Count:');
        productBrands.rows.forEach(pb => console.log(`- ${pb.name}: ${pb.product_count} products`));

        // 5. Check mapping consistency (Cricket vs Aero)
        console.log('\n--- Specific Case: Cricket category & Aero brand ---');
        const cricketAero = await query(`
            SELECT b.id, b.name as brand_name, c.name as category_name, b.category_id, b.sub_category_id
            FROM brands b
            LEFT JOIN categories c ON b.category_id = c.id
            WHERE b.name ILIKE '%Aero%'
        `);
        cricketAero.rows.forEach(row => {
            console.log(`Brand: ${row.brand_name} (ID: ${row.id}), Category: ${row.category_name} (ID: ${row.category_id})`);
        });

    } catch (err) {
        console.error('Analysis failed:', err);
    }
}

analyzeBrands();
