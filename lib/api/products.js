import { query } from '@/lib/simple-db';
import { NextResponse } from 'next/server';

const sendResponse = (data, status = 200) => {
    return NextResponse.json(data, { status });
};

// GET /api/products — OPTIMIZED for speed
export async function getProducts(searchParams) {
    try {
        const category = searchParams.get('category');
        const sub_category = searchParams.get('sub_category');
        const brand = searchParams.get('brand');
        const collection_id = searchParams.get('collection_id');
        const price_min = searchParams.get('price_min') || searchParams.get('min_price');
        const price_max = searchParams.get('price_max') || searchParams.get('max_price');
        const is_featured = searchParams.get('is_featured');
        const search = searchParams.get('search');
        const sort = searchParams.get('sort');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500); // Default 50, cap at 500
        const offset = (page - 1) * limit;
        const showHiddenQuotes = searchParams.get('showHiddenQuotes') === 'true';
        const skipVariants = searchParams.get('skipVariants') === 'true';

        let whereClause = 'WHERE p.is_active = true';
        if (!showHiddenQuotes) {
            whereClause += ' AND (p.is_quote_hidden IS NULL OR p.is_quote_hidden = false)';
        }
        const queryParams = [];
        let paramCount = 1;

        // Category filter — inline slug resolution (no separate query)
        if (category) {
            const categories = category.split(',').filter(Boolean);
            if (categories.length > 0) {
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categories[0]);
                if (isUUID) {
                    whereClause += ` AND p.category_id = ANY($${paramCount++}::uuid[])`;
                    queryParams.push(categories);
                } else {
                    // Inline: resolve slugs to IDs inside the WHERE clause
                    whereClause += ` AND p.category_id IN (SELECT id FROM categories WHERE slug = ANY($${paramCount++}::text[]))`;
                    queryParams.push(categories);
                }
            }
        }

        // Sub-category filter
        if (sub_category) {
            // Accept both UUID and integer IDs
            const subCategories = sub_category.split(',').filter(Boolean);
            if (subCategories.length > 0) {
                const isUUID = /^[0-9a-f]{8}-/i.test(subCategories[0]);
                if (isUUID) {
                    whereClause += ` AND p.sub_category_id = ANY($${paramCount++}::uuid[])`;
                    queryParams.push(subCategories);
                } else {
                    const intIds = subCategories.map(id => parseInt(id)).filter(id => !isNaN(id));
                    if (intIds.length > 0) {
                        whereClause += ` AND p.sub_category_id = ANY($${paramCount++}::int[])`;
                        queryParams.push(intIds);
                    }
                }
            }
        }

        // Brand filter — inline slug resolution
        if (brand) {
            const brands = brand.split(',').filter(Boolean);
            if (brands.length > 0) {
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(brands[0]);
                if (isUUID) {
                    whereClause += ` AND p.brand_id = ANY($${paramCount++}::uuid[])`;
                    queryParams.push(brands);
                } else {
                    whereClause += ` AND p.brand_id IN (SELECT id FROM brands WHERE slug = ANY($${paramCount++}::text[]))`;
                    queryParams.push(brands);
                }
            }
        }

        if (collection_id) {
            whereClause += ` AND c.parent_collection_id = $${paramCount++}`;
            queryParams.push(collection_id);
        }

        // Price filtering — use NULLIF for safer casting
        if (price_min) {
            whereClause += ` AND COALESCE(NULLIF(REPLACE(p.mrp_price::text, ',', ''), '')::numeric, 0) >= $${paramCount++}`;
            queryParams.push(price_min);
        }
        if (price_max) {
            whereClause += ` AND COALESCE(NULLIF(REPLACE(p.mrp_price::text, ',', ''), '')::numeric, 0) <= $${paramCount++}`;
            queryParams.push(price_max);
        }

        if (is_featured) {
            whereClause += ` AND p.is_featured = $${paramCount++}`;
            queryParams.push(is_featured === 'true');
        }
        if (search) {
            whereClause += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount} OR p.sku ILIKE $${paramCount})`;
            queryParams.push(`%${search}%`);
            paramCount++;
        }

        // Tag filter (UUID only)
        const tag = searchParams.get('tag');
        if (tag && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tag)) {
            whereClause += ` AND p.tag_id = $${paramCount++}`;
            queryParams.push(tag);
        }

        // Tag priority sorting
        const prioritize_tag = searchParams.get('prioritize_tag');

        const baseJoin = `
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
            LEFT JOIN product_tags pt ON p.tag_id = pt.id
        `;

        let orderBy = 'p.is_featured DESC, p.created_at DESC';
        if (prioritize_tag) {
            orderBy = `(CASE WHEN p.tag_id = $${paramCount++} THEN 0 ELSE 1 END) ASC, ${orderBy}`;
            queryParams.push(prioritize_tag);
        }

        if (sort === 'price_asc') orderBy = "COALESCE(NULLIF(REPLACE(p.mrp_price::text, ',', ''), '')::numeric, 0) ASC";
        if (sort === 'price_desc') orderBy = "COALESCE(NULLIF(REPLACE(p.mrp_price::text, ',', ''), '')::numeric, 0) DESC";
        if (sort === 'newest') orderBy = 'p.created_at DESC';
        if (sort === 'name_asc') orderBy = 'p.name ASC';

        // Build variant selection — skip if not needed (table view optimization)
        const variantSelect = skipVariants ? "'[]'::json as product_variants" : `
            COALESCE(
                (SELECT json_agg(
                    json_build_object(
                        'id', pv.id,
                        'sku', pv.sku,
                        'size', pv.size,
                        'color', pv.color,
                        'option1_name', pv.option1_name,
                        'option1_value', pv.option1_value,
                        'option2_name', pv.option2_name,
                        'option2_value', pv.option2_value,
                        'option3_name', pv.option3_name,
                        'option3_value', pv.option3_value,
                        'option4_name', pv.option4_name,
                        'option4_value', pv.option4_value,
                        'mrp_price', pv.mrp_price,
                        'dealer_price', pv.dealer_price,
                        'counter_price', pv.counter_price,
                        'recommended_price', pv.recommended_price,
                        'shop_price', pv.shop_price,
                        'inventory', pv.inventory,
                        'is_default', pv.is_default,
                        'images', pv.images,
                        'created_at', pv.created_at,
                        'mrp_updated_at', pv.mrp_updated_at,
                        'dealer_price_updated_at', pv.dealer_price_updated_at,
                        'counter_price_updated_at', pv.counter_price_updated_at,
                        'recommended_price_updated_at', pv.recommended_price_updated_at,
                        'shop_price_updated_at', pv.shop_price_updated_at
                    ) ORDER BY pv.is_default DESC, pv.sku
                ) FROM product_variants pv
                WHERE pv.product_id = p.id AND pv.is_active = true),
                '[]'::json
            ) as product_variants`;

        // Single query with COUNT(*) OVER() — eliminates separate count query
        const dataQuery = `
            SELECT p.*, b.name as brand_name, c.name as category_name, sc.name as sub_category_name, pt.name as tag_name,
            COUNT(*) OVER() as _total_count,
            ${variantSelect}
            ${baseJoin}
            ${whereClause}
            ORDER BY ${orderBy}
            LIMIT $${paramCount++} OFFSET $${paramCount}
        `;

        const pagingParams = [...queryParams, limit, offset];
        const productsResult = await query(dataQuery, pagingParams);

        const total = productsResult.rows.length > 0 ? parseInt(productsResult.rows[0]._total_count) : 0;

        // Strip the _total_count from each row
        const products = productsResult.rows.map(({ _total_count, ...rest }) => rest);

        return sendResponse({
            products,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        return sendResponse({ error: 'Failed to fetch products' }, 500);
    }
}

// GET /api/products/[slug] - Optimized with variant JOIN
export async function getProductBySlug(slug) {
    try {
        // Single optimized query with variants aggregated
        const result = await query(
            `SELECT 
                p.*, 
                b.name as brand_name, 
                c.name as category_name, 
                sc.name as sub_category_name,
                COALESCE(
                    (SELECT json_agg(
                        json_build_object(
                            'id', pv.id,
                            'sku', pv.sku,
                            'size', pv.size,
                            'color', pv.color,
                            'option1_name', pv.option1_name,
                            'option1_value', pv.option1_value,
                            'option2_name', pv.option2_name,
                            'option2_value', pv.option2_value,
                            'option3_name', pv.option3_name,
                            'option3_value', pv.option3_value,
                            'option4_name', pv.option4_name,
                            'option4_value', pv.option4_value,
                            'mrp_price', pv.mrp_price,
                            'dealer_price', pv.dealer_price,
                            'counter_price', pv.counter_price,
                            'recommended_price', pv.recommended_price,
                            'shop_price', pv.shop_price,
                            'inventory', pv.inventory,
                            'is_default', pv.is_default,
                            'images', pv.images,
                            'created_at', pv.created_at,
                            'mrp_updated_at', pv.mrp_updated_at,
                            'dealer_price_updated_at', pv.dealer_price_updated_at,
                            'counter_price_updated_at', pv.counter_price_updated_at,
                            'recommended_price_updated_at', pv.recommended_price_updated_at,
                            'shop_price_updated_at', pv.shop_price_updated_at
                        ) ORDER BY pv.is_default DESC, pv.sku
                    ) FROM product_variants pv 
                    WHERE pv.product_id = p.id AND pv.is_active = true),
                    '[]'::json
                ) as product_variants
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
            WHERE p.slug = $1 AND p.is_active = true`,
            [slug]
        );

        if (result.rows.length === 0) {
            return sendResponse({ error: 'Product not found' }, 404);
        }

        return sendResponse(result.rows[0]);
    } catch (error) {
        console.error('Error fetching product:', error);
        return sendResponse({ error: 'Failed to fetch product' }, 500);
    }
}

// POST /api/products
export async function createProduct(data) {
    try {
        const {
            name, slug, description, short_description, sku, mrp_price, dealer_price, counter_price, recommended_price, shop_price,
            category_id, sub_category_id, brand_id, tag_id, images, videos, variants, is_featured,
            a_plus_content, is_discontinued, is_quote_hidden, buy_url, gst_percentage, hsn_code, unit,
            size, color, option1_name, option1_value, option2_name, option2_value,
            option3_name, option3_value, option4_name, option4_value
        } = data;

        if (!name || !sku || !mrp_price || !dealer_price) {
            return sendResponse({ error: 'Name, SKU, MRP, and Dealer Price are required' }, 400);
        }

        // Check SKU uniqueness
        const existing = await query('SELECT id FROM products WHERE sku = $1', [sku]);
        if (existing.rows.length > 0) {
            return sendResponse({ error: 'SKU already exists' }, 400);
        }

        // Generate handle from slug or name
        const productSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const handle = productSlug;

        const result = await query(
            `INSERT INTO products (
        name, slug, handle, description, short_description, sku, mrp_price, dealer_price, counter_price, recommended_price, shop_price,
        category_id, sub_category_id, brand_id, tag_id, images, videos, variants, is_featured, is_active,
        a_plus_content, is_discontinued, is_quote_hidden, buy_url, gst_percentage, hsn_code, unit,
        size, color, option1_name, option1_value, option2_name, option2_value,
        option3_name, option3_value, option4_name, option4_value,
        mrp_updated_at, dealer_price_updated_at, counter_price_updated_at, recommended_price_updated_at, shop_price_updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $25, $15, $16, $17, $18, true, $19, $20, $21, $22, $23, $24, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
            [
                name,
                productSlug,
                handle,
                description,
                short_description,
                sku,
                mrp_price,
                dealer_price,
                counter_price || 0,
                recommended_price || 0,
                shop_price || 0,
                category_id,
                sub_category_id,
                brand_id,
                JSON.stringify(images || []),
                JSON.stringify(videos || []),
                JSON.stringify([]), // Keep empty - variants go to product_variants table
                is_featured || false,
                a_plus_content || '',
                is_discontinued || false,
                is_quote_hidden || false,
                buy_url || '',
                gst_percentage || 18,
                hsn_code || '',
                tag_id || null,
                unit || '1',
                data.size || null,
                data.color || null,
                data.option1_name || null,
                data.option1_value || null,
                data.option2_name || null,
                data.option2_value || null,
                data.option3_name || null,
                data.option3_value || null,
                data.option4_name || null,
                data.option4_value || null
            ]
        );

        const product_id = result.rows[0].id;

        // Sync variants to product_variants table
        if (variants && variants.length > 0) {
            for (const [index, variant] of variants.entries()) {
                const variantSku = variant.sku || `${sku}-${index + 1}`;
                const isDefault = variant.is_default || index === 0;

                await query(
                    `INSERT INTO product_variants (
                        product_id, sku, size, color,
                        option1_name, option1_value, option2_name, option2_value,
                        option3_name, option3_value, option4_name, option4_value,
                        mrp_price, dealer_price, counter_price, recommended_price, shop_price,
                        inventory, is_default, is_active, images,
                        mrp_updated_at, dealer_price_updated_at, counter_price_updated_at, recommended_price_updated_at, shop_price_updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, true, $18,
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [
                        product_id,
                        variantSku,
                        variant.size || variant.option1_value || '',
                        variant.color || variant.option2_value || '',
                        variant.option1_name || '',
                        variant.option1_value || '',
                        variant.option2_name || '',
                        variant.option2_value || '',
                        variant.option3_name || '',
                        variant.option3_value || '',
                        variant.option4_name || '',
                        variant.option4_value || '',
                        variant.mrp_price || mrp_price,
                        variant.dealer_price || dealer_price,
                        variant.counter_price || counter_price || 0,
                        variant.recommended_price || recommended_price || 0,
                        variant.shop_price || shop_price || 0,
                        variant.inventory || 0,
                        isDefault,
                        variant.images ? JSON.stringify(variant.images) : '[]'
                    ]
                );
            }
        }

        return sendResponse(result.rows[0], 201);
    } catch (error) {
        console.error('Error creating product:', error);
        return sendResponse({ error: error.message || 'Failed to create product' }, 500);
    }
}

// PUT /api/products/[id]
export async function updateProduct(id, data) {
    try {
        const {
            name, slug, description, short_description, sku, mrp_price, dealer_price, counter_price, recommended_price, shop_price,
            category_id, sub_category_id, brand_id, tag_id, images, videos, variants, is_featured, is_active,
            a_plus_content, is_discontinued, is_quote_hidden, buy_url, gst_percentage, hsn_code, unit,
            size, color, option1_name, option1_value, option2_name, option2_value,
            option3_name, option3_value, option4_name, option4_value
        } = data;

        // Detect updates for each price field independently
        const mrpUpdated = data.mrp_price !== undefined;
        const dealerUpdated = data.dealer_price !== undefined;
        const counterUpdated = data.counter_price !== undefined;
        const recommendedUpdated = data.recommended_price !== undefined;
        const shopUpdated = data.shop_price !== undefined;

        const result = await query(
            `UPDATE products SET
        name = COALESCE($1, name),
        slug = COALESCE($2, slug),
        description = COALESCE($3, description),
        short_description = COALESCE($4, short_description),
        sku = COALESCE($5, sku),
        mrp_price = COALESCE($6, mrp_price),
        dealer_price = COALESCE($7, dealer_price),
        counter_price = COALESCE($8, counter_price),
        recommended_price = COALESCE($9, recommended_price),
        shop_price = COALESCE($10, shop_price),
        category_id = COALESCE($11, category_id),
        sub_category_id = COALESCE($12, sub_category_id),
        brand_id = COALESCE($13, brand_id),
        images = COALESCE($14, images),
        videos = COALESCE($15, videos),
        is_featured = COALESCE($16, is_featured),
        is_active = COALESCE($17, is_active),
        a_plus_content = COALESCE($18, a_plus_content),
        is_discontinued = COALESCE($19, is_discontinued),
        is_quote_hidden = COALESCE($20, is_quote_hidden),
        buy_url = COALESCE($21, buy_url),
        gst_percentage = COALESCE($22, gst_percentage),
        tag_id = COALESCE($23, tag_id),
        hsn_code = COALESCE($24, hsn_code),
        unit = COALESCE($25, unit),
        mrp_updated_at = CASE WHEN $27::boolean THEN CURRENT_TIMESTAMP ELSE mrp_updated_at END,
        dealer_price_updated_at = CASE WHEN $34::boolean THEN CURRENT_TIMESTAMP ELSE dealer_price_updated_at END,
        counter_price_updated_at = CASE WHEN $35::boolean THEN CURRENT_TIMESTAMP ELSE counter_price_updated_at END,
        recommended_price_updated_at = CASE WHEN $36::boolean THEN CURRENT_TIMESTAMP ELSE recommended_price_updated_at END,
        shop_price_updated_at = CASE WHEN $37::boolean THEN CURRENT_TIMESTAMP ELSE shop_price_updated_at END,
        updated_at = CURRENT_TIMESTAMP,
        size = COALESCE($28, size),
        color = COALESCE($29, color),
        option1_name = COALESCE($30, option1_name),
        option1_value = COALESCE($31, option1_value),
        option2_name = COALESCE($32, option2_name),
        option2_value = COALESCE($33, option2_value),
        option3_name = COALESCE($38, option3_name),
        option3_value = COALESCE($39, option3_value),
        option4_name = COALESCE($40, option4_name),
        option4_value = COALESCE($41, option4_value)
      WHERE id = $26
      RETURNING *`,
            [
                name, slug, description, short_description, sku,
                mrp_price, dealer_price, counter_price, recommended_price, shop_price,
                category_id, sub_category_id, brand_id,
                images ? JSON.stringify(images) : null,
                videos ? JSON.stringify(videos) : null,
                is_featured, is_active,
                a_plus_content, is_discontinued, is_quote_hidden, buy_url, gst_percentage,
                tag_id,
                hsn_code,
                unit,
                id,
                mrpUpdated,
                size, color, option1_name, option1_value, option2_name, option2_value,
                dealerUpdated, counterUpdated, recommendedUpdated, shopUpdated,
                option3_name, option3_value, option4_name, option4_value
            ]
        );

        if (result.rows.length === 0) {
            return sendResponse({ error: 'Product not found' }, 404);
        }

        // Sync variants to product_variants table
        if (variants !== undefined) {
            // Get existing variant SKUs for this product
            const existingVariants = await query(
                'SELECT id, sku FROM product_variants WHERE product_id = $1',
                [id]
            );
            const existingSkuMap = Object.fromEntries(
                existingVariants.rows.map(v => [v.sku, v.id])
            );

            const newSkus = new Set();

            if (variants && variants.length > 0) {
                for (const [index, variant] of variants.entries()) {
                    const variantSku = variant.sku || `${sku || result.rows[0].sku}-${index + 1}`;
                    newSkus.add(variantSku);

                    const existingId = variant.id || existingSkuMap[variantSku];

                    if (existingId) {
                        // Update existing variant
                        await query(
                            `UPDATE product_variants SET
                                sku = $2,
                                size = COALESCE($3, size),
                                color = COALESCE($4, color),
                                option1_name = COALESCE($5, option1_name),
                                option1_value = COALESCE($6, option1_value),
                                option2_name = COALESCE($7, option2_name),
                                option2_value = COALESCE($8, option2_value),
                                option3_name = COALESCE($17, option3_name),
                                option3_value = COALESCE($18, option3_value),
                                option4_name = COALESCE($19, option4_name),
                                option4_value = COALESCE($20, option4_value),
                                mrp_price = COALESCE($9, mrp_price),
                                dealer_price = COALESCE($10, dealer_price),
                                counter_price = COALESCE($11, counter_price),
                                recommended_price = COALESCE($12, recommended_price),
                                shop_price = COALESCE($13, shop_price),
                                inventory = COALESCE($14, inventory),
                                is_default = $15,
                                images = COALESCE($16, images),
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = $1`,
                            [
                                existingId,
                                variantSku,
                                variant.size || '',
                                variant.color || '',
                                variant.option1_name || '',
                                variant.option1_value || '',
                                variant.option2_name || '',
                                variant.option2_value || '',
                                variant.mrp_price,
                                variant.dealer_price,
                                variant.counter_price,
                                variant.recommended_price,
                                variant.shop_price,
                                variant.inventory,
                                variant.is_default || index === 0,
                                variant.images ? JSON.stringify(variant.images) : '[]',
                                variant.option3_name || '',
                                variant.option3_value || '',
                                variant.option4_name || '',
                                variant.option4_value || ''
                            ]
                        );
                    } else {
                        // Create new variant
                        await query(
                            `INSERT INTO product_variants (
                                product_id, sku, size, color,
                                option1_name, option1_value, option2_name, option2_value,
                                mrp_price, dealer_price, counter_price, recommended_price, shop_price,
                                inventory, is_default, is_active, images,
                                option3_name, option3_value, option4_name, option4_value
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, $16, $17, $18, $19, $20)`,
                            [
                                id,
                                variantSku,
                                variant.size || '',
                                variant.color || '',
                                variant.option1_name || '',
                                variant.option1_value || '',
                                variant.option2_name || '',
                                variant.option2_value || '',
                                variant.mrp_price || mrp_price || result.rows[0].mrp_price,
                                variant.dealer_price || dealer_price || result.rows[0].dealer_price,
                                variant.counter_price || counter_price || 0,
                                variant.recommended_price || recommended_price || 0,
                                variant.shop_price || shop_price || 0,
                                variant.inventory || 0,
                                variant.is_default || index === 0,
                                variant.images ? JSON.stringify(variant.images) : '[]',
                                variant.option3_name || '',
                                variant.option3_value || '',
                                variant.option4_name || '',
                                variant.option4_value || ''
                            ]
                        );
                    }
                }
            }

            // Delete variants that were removed
            for (const existingSku of Object.keys(existingSkuMap)) {
                if (!newSkus.has(existingSku)) {
                    await query(
                        'DELETE FROM product_variants WHERE id = $1',
                        [existingSkuMap[existingSku]]
                    );
                }
            }
        }

        return sendResponse(result.rows[0]);
    } catch (error) {
        console.error('Error updating product:', error);
        return sendResponse({ error: 'Failed to update product' }, 500);
    }
}

// DELETE /api/products/[id]
export async function deleteProduct(id) {
    try {
        const result = await query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) return sendResponse({ error: 'Product not found' }, 404);
        return sendResponse({ success: true, message: 'Product deleted' });
    } catch (error) {
        console.error('Error deleting product:', error);
        return sendResponse({ error: 'Failed to delete product' }, 500);
    }
}

// DELETE /api/products/delete-all
export async function deleteAllProducts() {
    try {
        await query('BEGIN');
        await query('TRUNCATE products, product_variants CASCADE');
        await query('COMMIT');
        return sendResponse({ success: true, message: 'All products and variants deleted successfully' });
    } catch (error) {
        await query('ROLLBACK');
        console.error('Error deleting all products:', error);
        return sendResponse({ error: 'Failed to delete all products' }, 500);
    }
}

// POST /api/products/bulk - HIGH PERFORMANCE version with batch transactions
export async function bulkUploadProducts(dataArray) {
    const startTime = Date.now();

    try {
        if (!Array.isArray(dataArray)) {
            return sendResponse({ error: 'Data must be an array' }, 400);
        }

        // Parallel fetch all mapping data in single queries
        const [collections, categories, subCategories, brands, tags, existingProducts, existingVariants] = await Promise.all([
            query('SELECT id, name FROM parent_collections WHERE is_active = true'),
            query('SELECT id, name, parent_collection_id FROM categories'),
            query('SELECT id, name, category_id FROM sub_categories'),
            query('SELECT id, name FROM brands'),
            query('SELECT id, name, sub_category_id FROM product_tags'),
            query('SELECT id, sku, handle FROM products'),
            query('SELECT id, sku, product_id FROM product_variants')
        ]);

        // Build lookup maps for O(1) access
        const collectionMap = Object.fromEntries(collections.rows.map(c => [c.name.toLowerCase().trim(), c.id]));
        const categoryMap = Object.fromEntries(categories.rows.map(c => [c.name.toLowerCase().trim(), c.id]));
        const brandMap = Object.fromEntries(brands.rows.map(b => [b.name.toLowerCase().trim(), b.id]));
        const tagMap = Object.fromEntries(tags.rows.map(t => [t.name.toLowerCase().trim(), t.id]));
        const productByHandle = Object.fromEntries(existingProducts.rows.map(p => [p.handle, p.id]));
        const productBySku = Object.fromEntries(existingProducts.rows.map(p => [p.sku, p.id]));
        const variantBySku = Object.fromEntries(existingVariants.rows.map(v => [v.sku, { id: v.id, product_id: v.product_id }]));

        const subCategoryMap = {};
        subCategories.rows.forEach(sc => {
            const key = `${sc.category_id}_${sc.name.toLowerCase().trim()}`;
            subCategoryMap[key] = sc.id;
        });

        // Tag refinement Map (scoped by sub-category if needed)
        const tagSubCategoryMap = {};
        tags.rows.forEach(t => {
            const key = `${t.sub_category_id}_${t.name.toLowerCase().trim()}`;
            tagSubCategoryMap[key] = t.id;
        });

        // Clean tables before upload as requested
        console.log('--- Cleaning products and variants tables for bulk upload ---');
        await query('TRUNCATE products, product_variants CASCADE');

        const results = {
            created: 0,
            updated: 0,
            variants_created: 0,
            variants_updated: 0,
            skipped: 0,
            errors: [],
            processing_time_ms: 0
        };

        // Helper to parse comma-separated images
        const parseImages = (imgStr) => {
            if (!imgStr) return '[]';
            if (Array.isArray(imgStr)) return JSON.stringify(imgStr);
            const urls = imgStr.split(',').map(u => u.trim()).filter(Boolean);
            return JSON.stringify(urls);
        };

        // Group rows by product_handle or product_name
        const productGroups = {};
        const nameToGroupKey = {};

        for (const [index, item] of dataArray.entries()) {
            const rowIdx = index + 1;
            const name = (item.product_name || item.name || '').trim();
            const sku = (item.sku || '').trim();
            const handle = (item.product_handle || '').trim();

            if (!name || !sku) {
                results.errors.push(`Row ${rowIdx}: Name and SKU are required`);
                continue;
            }

            // SKU Skip Check (Highly Scalable)
            if (variantBySku[sku] || productBySku[sku]) {
                results.skipped++;
                continue;
            }

            // Grouping Logic:
            // 1. If handle is present, use it as unique group key.
            // 2. If handle is missing, and name matches a previous group name, group as variant.
            // 3. Otherwise start a new group.
            let groupKey = handle;
            if (!groupKey) {
                const nameKey = name.toLowerCase().trim();
                if (nameToGroupKey[nameKey]) {
                    groupKey = nameToGroupKey[nameKey];
                } else {
                    groupKey = `group_${rowIdx}_${nameKey.replace(/[^a-z0-9]+/g, '_')}`;
                    nameToGroupKey[nameKey] = groupKey;
                }
            }

            if (!productGroups[groupKey]) {
                productGroups[groupKey] = [];
            }
            productGroups[groupKey].push({ ...item, _rowIndex: rowIdx });
        }

        // Process in larger batches for performance
        const DB_BATCH_SIZE = 500;
        const handles = Object.keys(productGroups);

        for (let i = 0; i < handles.length; i += DB_BATCH_SIZE) {
            const batchHandles = handles.slice(i, i + DB_BATCH_SIZE);
            const productsMap = new Map();
            const variantsMap = new Map();

            for (const handle of batchHandles) {
                const rows = productGroups[handle];
                const firstRow = rows[0];

                try {
                    const productName = firstRow.product_name || firstRow.name;
                    const { sku, mrp_price, dealer_price, counter_price, recommended_price, shop_price,
                        collection, category, sub_category, tag, brand, description, short_description,
                        hsn_code, tax_class, buy_url, is_featured, is_active, unit } = firstRow;

                    if (!productName || !sku || !mrp_price) {
                        results.errors.push(`Row ${firstRow._rowIndex}: Name, SKU, MRP required`);
                        continue;
                    }

                    const collection_id = collection ? collectionMap[collection.toLowerCase().trim()] : null;
                    const category_id = category ? categoryMap[category.toLowerCase().trim()] : null;
                    const brand_id = brand ? brandMap[brand.toLowerCase().trim()] : null;

                    let sub_category_id = null;
                    if (sub_category && category_id) {
                        sub_category_id = subCategoryMap[`${category_id}_${sub_category.toLowerCase().trim()}`];
                    }

                    const tag_id = (sub_category_id && tag)
                        ? tagSubCategoryMap[`${sub_category_id}_${tag.toLowerCase().trim()}`]
                        : tag ? tagMap[tag.toLowerCase().trim()] : null;

                    const originalHandle = (firstRow.product_handle || '').trim();
                    const finalHandle = originalHandle || productName.toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-+|-+$/g, '');


                    // Store Row 1 in Product Table (including variant details if clean storage is desired)
                    productsMap.set(finalHandle, {
                        name: productName,
                        handle: finalHandle,
                        sku: sku,
                        description: firstRow.description || '',
                        short_description: firstRow.short_description || '',
                        mrp_price: parseFloat(firstRow.mrp_price) || 0,
                        dealer_price: parseFloat(firstRow.dealer_price) || 0,
                        counter_price: parseFloat(firstRow.counter_price) || 0,
                        recommended_price: parseFloat(firstRow.recommended_price) || 0,
                        shop_price: parseFloat(firstRow.shop_price) || 0,
                        category_id,
                        sub_category_id,
                        brand_id,
                        tag_id,
                        is_featured: firstRow.is_featured === 'TRUE' || firstRow.is_featured === true,
                        is_active: firstRow.is_active !== 'FALSE' && firstRow.is_active !== false,
                        hsn_code: firstRow.hsn_code || '',
                        tax_class: firstRow.tax_class || '',
                        buy_url: firstRow.buy_url || '',
                        unit: firstRow.unit || '1',
                        images: parseImages(firstRow.images),
                        size: firstRow.size || firstRow.option1_value || '',
                        color: firstRow.color || firstRow.option2_value || '',
                        option1_name: firstRow.option1_name || 'Size',
                        option1_value: firstRow.option1_value || firstRow.size || '',
                        option2_name: firstRow.option2_name || 'Color',
                        option2_value: firstRow.option2_value || firstRow.color || '',
                        option3_name: firstRow.option3_name || '',
                        option3_value: firstRow.option3_value || '',
                        option4_name: firstRow.option4_name || '',
                        option4_value: firstRow.option4_value || ''
                    });

                    // Store Subsequent Rows (2 onwards) in Variants Table
                    if (rows.length > 1) {
                        for (let j = 1; j < rows.length; j++) {
                            const row = rows[j];
                            const variantSku = (row.sku || '').trim();
                            if (!variantSku) continue;

                            variantsMap.set(variantSku, {
                                product_handle: finalHandle,
                                sku: variantSku,
                                size: row.size || row.option1_value || '',
                                color: row.color || row.option2_value || '',
                                option1_name: row.option1_name || 'Size',
                                option1_value: row.option1_value || row.size || '',
                                option2_name: row.option2_name || 'Color',
                                option2_value: row.option2_value || row.color || '',
                                option3_name: row.option3_name || '',
                                option3_value: row.option3_value || '',
                                option4_name: row.option4_name || '',
                                option4_value: row.option4_value || '',
                                mrp_price: parseFloat(row.mrp_price) || 0,
                                dealer_price: parseFloat(row.dealer_price) || 0,
                                counter_price: parseFloat(row.counter_price) || 0,
                                recommended_price: parseFloat(row.recommended_price) || 0,
                                shop_price: parseFloat(row.shop_price) || 0,
                                is_default: false,
                                images: parseImages(row.images)
                            });
                        }
                    }
                } catch (err) {
                    results.errors.push(`Handle ${handle}: ${err.message}`);
                }
            }

            const productsBatch = Array.from(productsMap.values());
            const variantsBatch = Array.from(variantsMap.values());

            if (productsBatch.length === 0) continue;

            // Execute Bulk SQL for this batch
            await query('BEGIN');
            try {
                // Bulk Insert Products
                const productUpsertResult = await query(`
                    WITH input_rows AS (
                        SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(
                            name text, handle text, sku text, description text, short_description text,
                            mrp_price numeric, dealer_price numeric, counter_price numeric, 
                            recommended_price numeric, shop_price numeric, category_id uuid, 
                            sub_category_id integer, brand_id uuid, tag_id uuid, is_featured boolean, 
                            is_active boolean, hsn_code text, tax_class text, buy_url text, 
                            unit text, images jsonb, size text, color text,
                            option1_name text, option1_value text, option2_name text, option2_value text,
                            option3_name text, option3_value text, option4_name text, option4_value text
                        )
                    )
                    INSERT INTO products (
                        name, handle, sku, slug, description, short_description, 
                        mrp_price, dealer_price, counter_price, recommended_price, shop_price,
                        category_id, sub_category_id, brand_id, tag_id, is_featured, is_active,
                        tax_class, buy_url, unit, images, size, color,
                        option1_name, option1_value, option2_name, option2_value,
                        option3_name, option3_value, option4_name, option4_value,
                        variants, videos, mrp_updated_at, dealer_price_updated_at, updated_at
                    )
                    SELECT 
                        i.name, i.handle, i.sku, LOWER(REGEXP_REPLACE(i.name, '[^a-zA-Z0-9]+', '-', 'g')), 
                        i.description, i.short_description, i.mrp_price, i.dealer_price, 
                        i.counter_price, i.recommended_price, i.shop_price, i.category_id, 
                        i.sub_category_id, i.brand_id, i.tag_id, i.is_featured, i.is_active,
                        i.tax_class, i.buy_url, i.unit, i.images, i.size, i.color,
                        i.option1_name, i.option1_value, i.option2_name, i.option2_value,
                        i.option3_name, i.option3_value, i.option4_name, i.option4_value,
                        '[]'::jsonb, '[]'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    FROM input_rows i
                    ON CONFLICT (handle) DO UPDATE SET
                        sku = EXCLUDED.sku,
                        description = EXCLUDED.description,
                        short_description = EXCLUDED.short_description,
                        mrp_price = EXCLUDED.mrp_price,
                        dealer_price = EXCLUDED.dealer_price,
                        size = EXCLUDED.size,
                        color = EXCLUDED.color,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING id
                `, [JSON.stringify(productsBatch)]);

                results.created += parseInt(productUpsertResult.rows[0].count);

                // Bulk Insert Variants
                if (variantsBatch.length > 0) {
                    const variantUpsertResult = await query(`
                        WITH input_rows AS (
                            SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(
                                product_handle text, sku text, size text, color text,
                                option1_name text, option1_value text, option2_name text, option2_value text,
                                mrp_price numeric, dealer_price numeric, counter_price numeric, 
                                recommended_price numeric, shop_price numeric, is_default boolean, images jsonb,
                                option3_name text, option3_value text, option4_name text, option4_value text
                            )
                        )
                        INSERT INTO product_variants (
                            product_id, sku, size, color, option1_name, option1_value, 
                            option2_name, option2_value, mrp_price, dealer_price, 
                            counter_price, recommended_price, shop_price, 
                            is_default, images, updated_at,
                            option3_name, option3_value, option4_name, option4_value
                        )
                        SELECT 
                            p.id, i.sku, i.size, i.color, i.option1_name, i.option1_value, 
                            i.option2_name, i.option2_value, i.mrp_price, i.dealer_price, 
                            i.counter_price, i.recommended_price, i.shop_price, 
                            i.is_default, i.images, CURRENT_TIMESTAMP,
                            i.option3_name, i.option3_value, i.option4_name, i.option4_value
                        FROM input_rows i
                        JOIN products p ON p.handle = i.product_handle
                        ON CONFLICT (sku) DO UPDATE SET
                            mrp_price = EXCLUDED.mrp_price,
                            dealer_price = EXCLUDED.dealer_price,
                            updated_at = CURRENT_TIMESTAMP
                        RETURNING id
                    `, [JSON.stringify(variantsBatch)]);

                    results.variants_created += variantUpsertResult.rows.length;
                }

                results.variants_created += variantsBatch.length;

                await query('COMMIT');
            } catch (dbErr) {
                await query('ROLLBACK');
                results.errors.push(`DB Bulk Error: ${dbErr.message}`);
            }
        }


        results.processing_time_ms = Date.now() - startTime;
        return sendResponse(results);
    } catch (error) {
        console.error('Error in bulk upload:', error);
        return sendResponse({ error: 'Failed to process bulk upload' }, 500);
    }
}
