require('dotenv').config();
const { query } = require('../lib/simple-db');

async function deduplicateBrands() {
    try {
        console.log('--- Brand Deduplication Process Started ---');

        // 1. Get total count before
        const totalBefore = await query('SELECT COUNT(*) FROM brands');
        console.log(`Brands before: ${totalBefore.rows[0].count}`);

        // 2. Identify unique brand names and their master IDs
        // We pick the ID that is most used by products, or just the first one.
        const mastersCountResult = await query(`
            WITH BrandUsage AS (
                SELECT b.id, b.name, COUNT(p.id) as use_count
                FROM brands b
                LEFT JOIN products p ON b.id = p.brand_id
                GROUP BY b.id, b.name
            ),
            MasterBrands AS (
                SELECT DISTINCT ON (name) id, name, use_count
                FROM BrandUsage
                ORDER BY name, use_count DESC, id
            )
            SELECT * FROM MasterBrands
        `);

        const masterBrands = mastersCountResult.rows;
        console.log(`Unique brands identified: ${masterBrands.length}`);

        await query('BEGIN');

        for (const master of masterBrands) {
            const { id: masterId, name } = master;

            // Find all other IDs for this brand name
            const duplicates = await query(
                'SELECT id FROM brands WHERE name = $1 AND id != $2',
                [name, masterId]
            );

            if (duplicates.rows.length > 0) {
                const duplicateIds = duplicates.rows.map(r => r.id);

                // Update products to point to master
                const updateRes = await query(
                    'UPDATE products SET brand_id = $1 WHERE brand_id = ANY($2)',
                    [masterId, duplicateIds]
                );

                // Update variants if brand_id is there (Wait, does product_variants have brand_id? Check schema)
                // Assuming only products table has brand_id based on previous analysis.

                // Delete duplicates
                const deleteRes = await query(
                    'DELETE FROM brands WHERE id = ANY($1)',
                    [duplicateIds]
                );

                console.log(`- Brand "${name}": Merged ${duplicateIds.length} duplicates. Updated ${updateRes.rowCount} products.`);
            }
        }

        // 3. Optional: Clean up Category/SubCategory columns as they are the source of confusion
        // The user says brands are unnecessarily added for categories.
        // We will nullify them to emphasize that brands are global.
        console.log('\nNullifying category/sub-category columns in brands table to prevent future confusion...');
        await query('UPDATE brands SET category_id = NULL, sub_category_id = NULL');

        // 4. Unique Constraint
        console.log('Adding unique constraint on brand names...');
        // First delete any truly orphan records that might have empty names (if any)
        await query('DELETE FROM brands WHERE name IS NULL OR TRIM(name) = \'\'');

        // Remove existing unique index on slug if it exists to replace with a better one,
        // or just add one for name.
        await query('DROP INDEX IF EXISTS idx_brands_name_unique');
        await query('CREATE UNIQUE INDEX idx_brands_name_unique ON brands (LOWER(TRIM(name)))');

        const totalAfter = await query('SELECT COUNT(*) FROM brands');
        console.log(`\nBrands after: ${totalAfter.rows[0].count}`);

        await query('COMMIT');
        console.log('--- Brand Deduplication Process Completed Successfully ---');

    } catch (err) {
        await query('ROLLBACK');
        console.error('Deduplication failed:', err);
    }
}

deduplicateBrands();
