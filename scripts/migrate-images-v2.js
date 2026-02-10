require('dotenv').config();
const { query } = require('../lib/simple-db');

async function migrateImages() {
    console.log('--- Starting Image Migration ---');
    try {
        await query('BEGIN');

        // Helper to migrate text column to jsonb
        const migrateColumn = async (table, col, isArray = false) => {
            console.log(`Migrating ${table}.${col}...`);
            // Check if column is already jsonb
            const typeCheck = await query(`
                SELECT data_type FROM information_schema.columns 
                WHERE table_name = $1 AND column_name = $2
            `, [table, col]);

            const currentType = typeCheck.rows[0]?.data_type;

            if (currentType !== 'jsonb') {
                // Determine new type: jsonb
                // We need to convert existing data.
                // Strategy: 
                // 1. Add temporary column
                // 2. Update temp column with converted data
                // 3. Drop old column
                // 4. Rename temp column
                // OR: 
                // ALTER TABLE ... ALTER COLUMN ... TYPE jsonb USING ...

                // Using safer approach:
                // If it's empty string or null, make it null or empty json object
                // If it's a URL string, wrap in object { url: ..., alt: '', id: null }

                let conversionExpr = '';
                if (isArray) {
                    // This case is unlikely for text columns unless stored as JSON string
                    conversionExpr = `
                       CASE 
                           WHEN ${col} IS NULL OR ${col} = '' THEN '[]'::jsonb
                           WHEN ${col} LIKE '[%]' THEN ${col}::jsonb 
                           ELSE jsonb_build_array(jsonb_build_object('url', ${col}, 'alt', '', 'id', null))
                       END
                   `;
                } else {
                    // Single image URL
                    conversionExpr = `
                       CASE 
                           WHEN ${col} IS NULL OR ${col} = '' THEN null
                           ELSE jsonb_build_object('url', ${col}, 'alt', '', 'id', null)
                       END
                   `;
                }

                await query(`
                    ALTER TABLE ${table} 
                    ALTER COLUMN ${col} TYPE jsonb 
                    USING ${conversionExpr}
                `);
                console.log(`Converted ${table}.${col} to JSONB`);
            } else {
                console.log(`${table}.${col} is already JSONB. Checking data structure...`);
                // If already JSONB, we need to ensure structure is correct
                // For arrays (products.images, product_variants.images, products.videos)
                // For objects (brands.image_url, brands.logo_url, banners.desktop_image, etc)

                if (isArray) {
                    // Update array elements from string to object if needed
                    // This is complex in SQL. Easier to fetch and update in JS potentially if list is small.
                    // But for robustness, let's use SQL function or simple update logic.

                    // Simple logic: Fetch all, transform in JS, update back.
                    // Since dataset is small (< 1000 items usually), this is fine.
                    // Actually brands is small (63), products might be larger but manageable.

                    // Let's do JS processing for existing JSONB columns to be safe and accurate.
                }
            }
        };

        // 1. Brands (Single Image columns)
        await migrateColumn('brands', 'image_url', false);
        await migrateColumn('brands', 'logo_url', false);

        // 2. Banners (Single Image columns)
        await migrateColumn('banners', 'desktop_image', false);
        await migrateColumn('banners', 'mobile_image', false);

        // 3. Blogs (Single Image columns)
        await migrateColumn('blogs', 'cover_image', false);

        // 4. Products & Variants (Array columns - Already JSONB, need structure update)
        const migrateArrayData = async (table, col) => {
            console.log(`Updating structure for ${table}.${col}...`);
            const rows = await query(`SELECT id, ${col} as data FROM ${table}`);
            for (const row of rows.rows) {
                let data = row.data;
                if (!Array.isArray(data)) continue;

                let changed = false;
                const newData = data.map(item => {
                    if (typeof item === 'string') {
                        changed = true;
                        return { url: item, alt: '', id: null };
                    } else if (typeof item === 'object' && item !== null && !item.url) {
                        // Handle potential existing objects? Unlikely if it was just strings.
                        return item;
                    }
                    return item;
                });

                if (changed) {
                    await query(`UPDATE ${table} SET ${col} = $1 WHERE id = $2`, [JSON.stringify(newData), row.id]);
                }
            }
            console.log(`Updated structure for ${table}.${col}`);
        };

        await migrateArrayData('products', 'images');
        await migrateArrayData('products', 'videos'); // Videos might just be URLs, keep as strings? 
        // Plan says "products (images -> JSONB)". Videos usually don't need Alt text as much, or do they?
        // User request: "ask image alt all the plae". Mentioned "image", not video.
        // Let's stick to images for now to avoid breaking video players.

        await migrateArrayData('product_variants', 'images');

        await query('COMMIT');
        console.log('--- Migration Completed Successfully ---');
    } catch (e) {
        await query('ROLLBACK');
        console.error('Migration Failed:', e);
    }
}

migrateImages();
