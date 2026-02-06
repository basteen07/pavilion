import { query } from '@/lib/simple-db';
import { NextResponse } from 'next/server';

const sendResponse = (data, status = 200) => {
    return NextResponse.json(data, { status });
};

/**
 * Get all variants for a product
 */
export async function getVariantsByProductId(productId) {
    try {
        const result = await query(
            `SELECT * FROM product_variants 
             WHERE product_id = $1 AND is_active = true
             ORDER BY is_default DESC, created_at ASC`,
            [productId]
        );
        return sendResponse(result.rows);
    } catch (error) {
        console.error('Error fetching variants:', error);
        return sendResponse({ error: 'Failed to fetch variants' }, 500);
    }
}

/**
 * Get a single variant by SKU
 */
export async function getVariantBySku(sku) {
    try {
        const result = await query(
            `SELECT pv.*, p.name as product_name, p.handle, p.images, p.brand_id, p.category_id
             FROM product_variants pv
             JOIN products p ON pv.product_id = p.id
             WHERE pv.sku = $1`,
            [sku]
        );

        if (result.rows.length === 0) {
            return sendResponse({ error: 'Variant not found' }, 404);
        }

        return sendResponse(result.rows[0]);
    } catch (error) {
        console.error('Error fetching variant:', error);
        return sendResponse({ error: 'Failed to fetch variant' }, 500);
    }
}

/**
 * Create a new variant
 */
export async function createVariant(data) {
    try {
        const {
            product_id, sku, size, color,
            option1_name, option1_value, option2_name, option2_value, option3_name, option3_value,
            mrp_price, dealer_price, counter_price, recommended_price, shop_price,
            inventory, is_default
        } = data;

        if (!product_id || !sku || !mrp_price) {
            return sendResponse({ error: 'product_id, sku, and mrp_price are required' }, 400);
        }

        // Check SKU uniqueness
        const existing = await query('SELECT id FROM product_variants WHERE sku = $1', [sku]);
        if (existing.rows.length > 0) {
            return sendResponse({ error: 'SKU already exists' }, 400);
        }

        // If this is marked as default, unset other defaults for this product
        if (is_default) {
            await query(
                'UPDATE product_variants SET is_default = false WHERE product_id = $1',
                [product_id]
            );
        }

        const result = await query(
            `INSERT INTO product_variants (
                product_id, sku, size, color,
                option1_name, option1_value, option2_name, option2_value, option3_name, option3_value,
                mrp_price, dealer_price, counter_price, recommended_price, shop_price,
                inventory, is_default
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *`,
            [
                product_id, sku, size || null, color || null,
                option1_name || null, option1_value || null,
                option2_name || null, option2_value || null,
                option3_name || null, option3_value || null,
                mrp_price, dealer_price || 0, counter_price || 0,
                recommended_price || 0, shop_price || 0,
                inventory || 0, is_default || false
            ]
        );

        return sendResponse(result.rows[0], 201);
    } catch (error) {
        console.error('Error creating variant:', error);
        return sendResponse({ error: error.message || 'Failed to create variant' }, 500);
    }
}

/**
 * Update a variant by SKU (upsert logic)
 */
export async function updateVariantBySku(sku, data) {
    try {
        const {
            size, color,
            option1_name, option1_value, option2_name, option2_value, option3_name, option3_value,
            mrp_price, dealer_price, counter_price, recommended_price, shop_price,
            inventory, is_default, is_active
        } = data;

        const result = await query(
            `UPDATE product_variants SET
                size = COALESCE($2, size),
                color = COALESCE($3, color),
                option1_name = COALESCE($4, option1_name),
                option1_value = COALESCE($5, option1_value),
                option2_name = COALESCE($6, option2_name),
                option2_value = COALESCE($7, option2_value),
                option3_name = COALESCE($8, option3_name),
                option3_value = COALESCE($9, option3_value),
                mrp_price = COALESCE($10, mrp_price),
                dealer_price = COALESCE($11, dealer_price),
                counter_price = COALESCE($12, counter_price),
                recommended_price = COALESCE($13, recommended_price),
                shop_price = COALESCE($14, shop_price),
                inventory = COALESCE($15, inventory),
                is_default = COALESCE($16, is_default),
                is_active = COALESCE($17, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE sku = $1
            RETURNING *`,
            [
                sku, size, color,
                option1_name, option1_value, option2_name, option2_value, option3_name, option3_value,
                mrp_price, dealer_price, counter_price, recommended_price, shop_price,
                inventory, is_default, is_active
            ]
        );

        if (result.rows.length === 0) {
            return sendResponse({ error: 'Variant not found' }, 404);
        }

        return sendResponse(result.rows[0]);
    } catch (error) {
        console.error('Error updating variant:', error);
        return sendResponse({ error: 'Failed to update variant' }, 500);
    }
}

/**
 * Delete a variant
 */
export async function deleteVariant(id) {
    try {
        const result = await query(
            'DELETE FROM product_variants WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return sendResponse({ error: 'Variant not found' }, 404);
        }

        return sendResponse({ success: true, message: 'Variant deleted' });
    } catch (error) {
        console.error('Error deleting variant:', error);
        return sendResponse({ error: 'Failed to delete variant' }, 500);
    }
}

/**
 * Bulk upsert variants - optimized for large imports
 * This is the core logic for Excel/CSV imports
 */
export async function bulkUpsertVariants(dataArray, categoryMap, brandMap, subCategoryMap) {
    const results = {
        products_created: 0,
        products_updated: 0,
        variants_created: 0,
        variants_updated: 0,
        errors: []
    };

    // Group rows by product_handle
    const productGroups = {};
    for (const [index, row] of dataArray.entries()) {
        const handle = row.product_handle || row.sku; // Use SKU as handle for single products
        if (!productGroups[handle]) {
            productGroups[handle] = [];
        }
        productGroups[handle].push({ ...row, rowIndex: index + 1 });
    }

    // Process each product group
    for (const [handle, variants] of Object.entries(productGroups)) {
        try {
            const firstRow = variants[0];

            // Validate required fields
            if (!firstRow.sku || !firstRow.mrp_price) {
                results.errors.push(`Handle "${handle}": SKU and MRP Price are required`);
                continue;
            }

            // Resolve category/brand IDs
            let category_id = null;
            if (firstRow.category && categoryMap) {
                category_id = categoryMap[firstRow.category.toLowerCase().trim()];
                if (!category_id) {
                    results.errors.push(`Handle "${handle}": Category "${firstRow.category}" not found`);
                    continue;
                }
            }

            let brand_id = null;
            if (firstRow.brand && brandMap) {
                brand_id = brandMap[firstRow.brand.toLowerCase().trim()];
                if (!brand_id) {
                    results.errors.push(`Handle "${handle}": Brand "${firstRow.brand}" not found`);
                    continue;
                }
            }

            let sub_category_id = null;
            if (firstRow.sub_category && category_id && subCategoryMap) {
                const key = `${category_id}_${firstRow.sub_category.toLowerCase().trim()}`;
                sub_category_id = subCategoryMap[key];
            }

            // Check if product exists by handle
            let product = await query(
                'SELECT id FROM products WHERE handle = $1',
                [handle]
            );

            let product_id;

            if (product.rows.length > 0) {
                // Update product
                product_id = product.rows[0].id;
                await query(
                    `UPDATE products SET
                        name = COALESCE($2, name),
                        description = COALESCE($3, description),
                        short_description = COALESCE($4, short_description),
                        category_id = COALESCE($5, category_id),
                        sub_category_id = COALESCE($6, sub_category_id),
                        brand_id = COALESCE($7, brand_id),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1`,
                    [
                        product_id,
                        firstRow.product_name || firstRow.name,
                        firstRow.description,
                        firstRow.short_description,
                        category_id,
                        sub_category_id,
                        brand_id
                    ]
                );
                results.products_updated++;
            } else {
                // Create product
                const productName = firstRow.product_name || firstRow.name || handle;
                const slug = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

                const insertResult = await query(
                    `INSERT INTO products (
                        handle, name, slug, description, short_description,
                        sku, mrp_price, dealer_price, shop_price,
                        category_id, sub_category_id, brand_id, is_active
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
                    RETURNING id`,
                    [
                        handle, productName, slug,
                        firstRow.description || '', firstRow.short_description || '',
                        firstRow.sku, firstRow.mrp_price,
                        firstRow.dealer_price || 0, firstRow.shop_price || 0,
                        category_id, sub_category_id, brand_id
                    ]
                );
                product_id = insertResult.rows[0].id;
                results.products_created++;
            }

            // Process each variant in the group
            const isOnlyVariant = variants.length === 1;

            for (const [variantIndex, variantRow] of variants.entries()) {
                try {
                    const isDefault = isOnlyVariant || variantIndex === 0;

                    // Check if variant exists by SKU
                    const existingVariant = await query(
                        'SELECT id FROM product_variants WHERE sku = $1',
                        [variantRow.sku]
                    );

                    if (existingVariant.rows.length > 0) {
                        // Update variant
                        await query(
                            `UPDATE product_variants SET
                                product_id = $1,
                                size = COALESCE($3, size),
                                color = COALESCE($4, color),
                                option1_name = COALESCE($5, option1_name),
                                option1_value = COALESCE($6, option1_value),
                                option2_name = COALESCE($7, option2_name),
                                option2_value = COALESCE($8, option2_value),
                                mrp_price = COALESCE($9, mrp_price),
                                dealer_price = COALESCE($10, dealer_price),
                                counter_price = COALESCE($11, counter_price),
                                recommended_price = COALESCE($12, recommended_price),
                                shop_price = COALESCE($13, shop_price),
                                inventory = COALESCE($14, inventory),
                                is_default = $15,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE sku = $2`,
                            [
                                product_id, variantRow.sku,
                                variantRow.size || variantRow.option1_value,
                                variantRow.color || variantRow.option2_value,
                                variantRow.option1_name, variantRow.option1_value,
                                variantRow.option2_name, variantRow.option2_value,
                                variantRow.mrp_price, variantRow.dealer_price || 0,
                                variantRow.counter_price || 0, variantRow.recommended_price || 0,
                                variantRow.shop_price || 0, variantRow.inventory || 0,
                                isDefault
                            ]
                        );
                        results.variants_updated++;
                    } else {
                        // Create variant
                        await query(
                            `INSERT INTO product_variants (
                                product_id, sku, size, color,
                                option1_name, option1_value, option2_name, option2_value,
                                mrp_price, dealer_price, counter_price, recommended_price, shop_price,
                                inventory, is_default
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
                            [
                                product_id, variantRow.sku,
                                variantRow.size || variantRow.option1_value,
                                variantRow.color || variantRow.option2_value,
                                variantRow.option1_name, variantRow.option1_value,
                                variantRow.option2_name, variantRow.option2_value,
                                variantRow.mrp_price, variantRow.dealer_price || 0,
                                variantRow.counter_price || 0, variantRow.recommended_price || 0,
                                variantRow.shop_price || 0, variantRow.inventory || 0,
                                isDefault
                            ]
                        );
                        results.variants_created++;
                    }
                } catch (variantErr) {
                    results.errors.push(`Row ${variantRow.rowIndex}: ${variantErr.message}`);
                }
            }

        } catch (err) {
            results.errors.push(`Handle "${handle}": ${err.message}`);
        }
    }

    return results;
}
