require('dotenv').config();
const { query } = require('../lib/simple-db');

async function migrateCategoriesImages() {
    console.log('--- Migrating Categories & Sub-Categories Images to JSONB ---');

    const migrateTable = async (table) => {
        try {
            console.log(`Processing table: ${table}`);

            // 1. Check current type
            const typeRes = await query(`
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = $1 AND column_name = 'image_url'
            `, [table]);

            if (typeRes.rows.length === 0) {
                console.log(`Column image_url does not exist in ${table}. Skipping.`);
                return;
            }

            const currentType = typeRes.rows[0].data_type;
            console.log(`Current type of ${table}.image_url: ${currentType}`);

            if (currentType === 'jsonb') {
                console.log(`Column is already JSONB. Skipping conversion.`);
            } else {
                // 2. Convert to JSONB using temporary column
                console.log(`Converting ${table}.image_url to JSONB...`);

                await query('BEGIN');

                // Rename old
                await query(`ALTER TABLE ${table} RENAME COLUMN image_url TO image_url_old`);

                // Add new
                await query(`ALTER TABLE ${table} ADD COLUMN image_url JSONB`);

                // Migrate data
                const rows = await query(`SELECT id, image_url_old FROM ${table} WHERE image_url_old IS NOT NULL AND image_url_old != ''`);

                for (const row of rows.rows) {
                    const oldUrl = row.image_url_old;
                    // Create new object structure
                    const newImage = {
                        url: oldUrl,
                        alt: '',
                        id: null
                    };

                    await query(`UPDATE ${table} SET image_url = $1 WHERE id = $2`, [JSON.stringify(newImage), row.id]);
                }

                // Drop old
                await query(`ALTER TABLE ${table} DROP COLUMN image_url_old`);

                await query('COMMIT');
                console.log(`Migration for ${table} complete.`);
            }

        } catch (err) {
            await query('ROLLBACK');
            console.error(`Error migrating ${table}:`, err);
        }
    };

    await migrateTable('categories');
    await migrateTable('sub_categories');

    console.log('--- Migration Completed ---');
}

migrateCategoriesImages();
