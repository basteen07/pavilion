require('dotenv').config();
const { query } = require('../lib/simple-db');

async function migrateRemainingImages() {
    console.log('--- Migrating Remaining Image Columns to JSONB ---');

    const config = [
        { table: 'parent_collections', columns: ['image_desktop', 'image_mobile'] },
        { table: 'gallery_albums', columns: ['cover_image'] },
        { table: 'gallery_items', columns: ['url', 'thumbnail_url'] }
    ];

    for (const item of config) {
        const { table, columns } = item;
        console.log(`\nTable: ${table}`);

        for (const col of columns) {
            try {
                console.log(`  Processing column: ${col}`);

                const typeRes = await query(`
                    SELECT data_type 
                    FROM information_schema.columns 
                    WHERE table_name = $1 AND column_name = $2
                `, [table, col]);

                if (typeRes.rows.length === 0) {
                    console.log(`    Column ${col} does not exist in ${table}. Skipping.`);
                    continue;
                }

                const currentType = typeRes.rows[0].data_type;
                console.log(`    Current type: ${currentType}`);

                if (currentType === 'jsonb') {
                    console.log(`    Column is already JSONB. Skipping.`);
                    continue;
                }

                await query('BEGIN');

                // Rename old
                await query(`ALTER TABLE ${table} RENAME COLUMN ${col} TO ${col}_old`);

                // Add new
                await query(`ALTER TABLE ${table} ADD COLUMN ${col} JSONB`);

                // Migrate data
                const rows = await query(`SELECT id, ${col}_old FROM ${table} WHERE ${col}_old IS NOT NULL AND ${col}_old != ''`);

                for (const row of rows.rows) {
                    const oldVal = row[`${col}_old`];
                    let newVal = null;

                    try {
                        // Attempt to parse as JSON in case it's already a JSON string (unlikely but safe)
                        newVal = JSON.parse(oldVal);
                        if (typeof newVal !== 'object') throw new Error('Not object');
                    } catch (e) {
                        // Create new object structure
                        newVal = {
                            url: oldVal,
                            alt: '',
                            id: null
                        };
                    }

                    await query(`UPDATE ${table} SET ${col} = $1 WHERE id = $2`, [JSON.stringify(newVal), row.id]);
                }

                // Drop old
                await query(`ALTER TABLE ${table} DROP COLUMN ${col}_old`);

                await query('COMMIT');
                console.log(`    Migration for ${table}.${col} complete.`);

            } catch (err) {
                await query('ROLLBACK');
                console.error(`    Error migrating ${table}.${col}:`, err);
            }
        }
    }

    console.log('\n--- All Migrations Completed ---');
}

migrateRemainingImages();
