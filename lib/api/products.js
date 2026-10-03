import { query, withTransaction } from '@/lib/simple-db';
import { ensureProductSlugColumns, newProductSlug, pickUniqueSlug, productSlugFromName, syncProductSlug } from '@/lib/product-slug';
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
                    const intIds = categories.map(id => parseInt(id)).filter(id => !isNaN(id));
                    if (intIds.length > 0 && intIds.length === categories.length && intIds.every(id => id > 0)) {
                        whereClause += ` AND p.category_id = ANY($${paramCount++}::int[])`;
                        queryParams.push(intIds);
                    } else {
                        // Inline: resolve slugs to IDs inside the WHERE clause
                        whereClause += ` AND p.category_id IN (SELECT id FROM categories WHERE slug = ANY($${paramCount++}::text[]))`;
                        queryParams.push(categories);
                    }
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
                    const intIds = brands.map(id => parseInt(id)).filter(id => !isNaN(id));
                    if (intIds.length > 0 && intIds.length === brands.length && intIds.every(id => id > 0)) {
                        whereClause += ` AND p.brand_id = ANY($${paramCount++}::int[])`;
                        queryParams.push(intIds);
                    } else {
                        whereClause += ` AND p.brand_id IN (SELECT id FROM brands WHERE slug = ANY($${paramCount++}::text[]))`;
                        queryParams.push(brands);
                    }
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
// Matches the current slug (exact, then ignoring case) or a previous slug, so old links keep working.
export async function getProductBySlug(slug) {
    try {
        await ensureProductSlugColumns();
        let decoded = slug;
        try { decoded = decodeURIComponent(slug); } catch { /* keep raw */ }
        const candidates = Array.from(new Set([decoded, String(slug)]));

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
            WHERE p.is_active = true
              AND (p.slug = ANY($1::text[]) OR lower(p.slug) = ANY($2::text[]) OR p.old_slugs && $1::text[])
            ORDER BY (p.slug = ANY($1::text[])) DESC, (lower(p.slug) = ANY($2::text[])) DESC
            LIMIT 1`,
            [candidates, candidates.map(c => c.toLowerCase())]
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

        console.log('[DEBUG Backend] createProduct - name:', name, 'sku:', sku);
        console.log('[DEBUG Backend] createProduct - received variants:', variants);

        // Check SKU uniqueness
        const existing = await query('SELECT id FROM products WHERE sku = $1', [sku]);
        if (existing.rows.length > 0) {
            return sendResponse({ error: 'SKU already exists' }, 400);
        }

        // URL slug comes from the product name; handle (variant grouping key) stays lowercase
        await ensureProductSlugColumns();
        const productSlug = await newProductSlug(name);
        const handleBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'product';
        const takenHandles = await query(`SELECT handle FROM products WHERE handle = $1 OR handle LIKE $1 || '-%'`, [handleBase]);
        const handle = pickUniqueSlug(handleBase, new Set(takenHandles.rows.map(r => r.handle.toLowerCase())));

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
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, true, $20,
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [
                        product_id,
                        variantSku,
                        variant.size || size || variant.option1_value || '',
                        variant.color || color || variant.option2_value || '',
                        variant.option1_name || option1_name || '',
                        variant.option1_value || '',
                        variant.option2_name || option2_name || '',
                        variant.option2_value || '',
                        variant.option3_name || option3_name || '',
                        variant.option3_value || '',
                        variant.option4_name || option4_name || '',
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

        // A renamed product gets a new URL slug from its name (the old one keeps working)
        if (name) {
            await ensureProductSlugColumns();
            result.rows[0].slug = await syncProductSlug(id, name);
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
                                variant.size || size || '',
                                variant.color || color || '',
                                variant.option1_name || option1_name || '',
                                variant.option1_value || '',
                                variant.option2_name || option2_name || '',
                                variant.option2_value || '',
                                variant.mrp_price,
                                variant.dealer_price,
                                variant.counter_price,
                                variant.recommended_price,
                                variant.shop_price,
                                variant.inventory,
                                variant.is_default || index === 0,
                                variant.images ? JSON.stringify(variant.images) : '[]',
                                variant.option3_name || option3_name || '',
                                variant.option3_value || '',
                                variant.option4_name || option4_name || '',
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
                                variant.size || size || '',
                                variant.color || color || '',
                                variant.option1_name || option1_name || '',
                                variant.option1_value || '',
                                variant.option2_name || option2_name || '',
                                variant.option2_value || '',
                                variant.mrp_price || mrp_price || result.rows[0].mrp_price,
                                variant.dealer_price || dealer_price || result.rows[0].dealer_price,
                                variant.counter_price || counter_price || 0,
                                variant.recommended_price || recommended_price || 0,
                                variant.shop_price || shop_price || 0,
                                variant.inventory || 0,
                                variant.is_default || index === 0,
                                variant.images ? JSON.stringify(variant.images) : '[]',
                                variant.option3_name || option3_name || '',
                                variant.option3_value || '',
                                variant.option4_name || option4_name || '',
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

// ============ BULK UPLOAD / EXPORT ============
// Rules:
// - Bulk upload NEVER deletes products or variants.
// - SKU is the unique key (across products and product_variants).
// - Blank cells mean "not provided": they never overwrite existing values.

const cellText = (v) => {
    if (v === undefined || v === null) return undefined;
    const s = String(v).trim();
    return s === '' ? undefined : s;
};

// undefined = blank, NaN = not a number
const cellNumber = (v) => {
    const s = cellText(v);
    if (s === undefined) return undefined;
    const n = Number(s.replace(/[,₹\s]/g, ''));
    return Number.isFinite(n) ? n : NaN;
};

const cellBool = (v) => {
    if (typeof v === 'boolean') return v;
    const s = cellText(v)?.toLowerCase();
    if (['true', 'yes', 'y', '1', 'active'].includes(s)) return true;
    if (['false', 'no', 'n', '0', 'inactive'].includes(s)) return false;
    return undefined;
};

const cellImages = (v) => {
    const urls = Array.isArray(v) ? v : (cellText(v) || '').split(',');
    const clean = urls.map(u => String(u).trim()).filter(Boolean);
    return clean.length ? clean : undefined;
};

const imageUrls = (images) => (Array.isArray(images) ? images : [])
    .map(img => (typeof img === 'string' ? img : img?.url || img?.src))
    .filter(Boolean);

// Placeholder entries of the template's dropdowns (shown when a list is empty) mean 'blank'
const DROPDOWN_PLACEHOLDERS = new Set(['no collections', 'no categories', 'no sub-categories', 'no tags', '- no matches -']);
const masterCell = (v) => {
    const s = cellText(v);
    return s !== undefined && DROPDOWN_PLACEHOLDERS.has(s.toLowerCase()) ? undefined : s;
};

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'product';

const DEFAULT_OPTION_NAMES = ['Size', 'Color', 'Option 3', 'Option 4'];
const PRICE_FIELDS = ['mrp_price', 'dealer_price', 'counter_price', 'recommended_price', 'shop_price'];
const PRICE_TIMESTAMPS = {
    mrp_price: 'mrp_updated_at',
    dealer_price: 'dealer_price_updated_at',
    counter_price: 'counter_price_updated_at',
    recommended_price: 'recommended_price_updated_at',
    shop_price: 'shop_price_updated_at'
};

// Per-SKU columns (exist on both products and product_variants)
const VARIANT_FIELDS = [
    ['size', 'text'], ['color', 'text'],
    ['option1_name', 'text'], ['option1_value', 'text'],
    ['option2_name', 'text'], ['option2_value', 'text'],
    ['option3_name', 'text'], ['option3_value', 'text'],
    ['option4_name', 'text'], ['option4_value', 'text'],
    ...PRICE_FIELDS.map(f => [f, 'numeric']),
    ['images', 'jsonb']
];

// Columns shared by all variants of a product (products table only)
const PRODUCT_FIELDS = [
    ['name', 'text'], ['description', 'text'], ['short_description', 'text'],
    ['category_id', 'uuid'], ['sub_category_id', 'integer'], ['tag_id', 'uuid'], ['brand_id', 'uuid'],
    ['hsn_code', 'text'], ['tax_class', 'text'], ['gst_percentage', 'numeric'],
    ['buy_url', 'text'], ['unit', 'text'], ['is_featured', 'boolean'], ['is_active', 'boolean']
];

const recordDef = (fields) => fields.map(([c, t]) => `${c} ${t}`).join(', ');

// Image URL list of an existing jsonb images value (entries may be strings or {url}/{src} objects)
const IMAGE_URLS_SQL = `COALESCE((SELECT jsonb_agg(CASE WHEN jsonb_typeof(e) = 'string' THEN e ELSE COALESCE(e->'url', e->'src', e) END)
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(t.images) = 'array' THEN t.images ELSE '[]'::jsonb END) e), '[]'::jsonb)`;

// Option N name/value pairs. size/color come from the Size/Color columns; the value of an option
// actually named Size/Color is returned separately as size_from_option/color_from_option.
// (Previously option1 was always copied into size and option2 into color, which mixed values
// whenever a product's options were in a different order.)
// New rows get a default option name when a value has no name; updates keep the existing name.
function readOptions(row, fallbackNames, isNew) {
    const out = {};
    for (let i = 1; i <= 4; i++) {
        const value = cellText(row[`option${i}_value`]);
        const name = cellText(row[`option${i}_name`]);
        out[`option${i}_value`] = value;
        out[`option${i}_name`] = value === undefined ? undefined
            : name || (isNew ? fallbackNames[i - 1] || DEFAULT_OPTION_NAMES[i - 1] : undefined);
    }
    out.size = cellText(row.size);
    out.color = cellText(row.color);
    for (let i = 1; i <= 4; i++) {
        const name = (out[`option${i}_name`] || '').toLowerCase();
        const value = out[`option${i}_value`];
        if (value === undefined) continue;
        if (out.size_from_option === undefined && name.includes('size')) out.size_from_option = value;
        if (out.color_from_option === undefined && /colou?r/.test(name)) out.color_from_option = value;
    }
    if (isNew) {
        out.size = out.size ?? out.size_from_option;
        out.color = out.color ?? out.color_from_option;
    }
    return out;
}

// Applies only the non-null fields of each patch. Returns ids of rows where a value actually changed.
async function applyPatches(client, table, fields, patches) {
    if (patches.length === 0) return new Set();
    // Legacy size/color follow the Size/Color option only when they already hold a value
    const incoming = (c) => (c === 'size' || c === 'color'
        ? `COALESCE(i.${c}, CASE WHEN COALESCE(t.${c}, '') <> '' THEN i.${c}_from_option END)`
        : `i.${c}`);
    const current = (c) => (c === 'images' ? IMAGE_URLS_SQL : `t.${c}`);
    const changed = (c) => `(${incoming(c)} IS NOT NULL AND ${incoming(c)} IS DISTINCT FROM ${current(c)})`;
    const sets = fields.map(([c]) => (c === 'images'
        ? `images = CASE WHEN ${changed(c)} THEN i.images ELSE t.images END`
        : `${c} = COALESCE(${incoming(c)}, t.${c})`));
    for (const [price, ts] of Object.entries(PRICE_TIMESTAMPS)) {
        sets.push(`${ts} = CASE WHEN ${changed(price)} THEN CURRENT_TIMESTAMP ELSE t.${ts} END`);
    }
    const result = await client.query(`
        UPDATE ${table} t SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
        FROM jsonb_to_recordset($1::jsonb) AS i(id uuid, ${recordDef(fields)}, size_from_option text, color_from_option text)
        WHERE t.id = i.id AND (${fields.map(([c]) => changed(c)).join(' OR ')})
        RETURNING t.id
    `, [JSON.stringify(patches)]);
    return new Set(result.rows.map(r => r.id));
}

// POST /api/products/bulk
// Body: { rows: [...], mode: 'create_only' | 'upsert' } (a bare array is treated as create_only)
//   create_only - new SKUs are created, existing SKUs are skipped
//   upsert      - new SKUs are created, existing SKUs get the non-blank values of their row
export async function bulkUploadProducts(payload) {
    const startTime = Date.now();
    const rows = Array.isArray(payload) ? payload : payload?.rows;
    const mode = payload?.mode === 'upsert' ? 'upsert' : 'create_only';
    if (!Array.isArray(rows)) {
        return sendResponse({ error: 'Data must be an array' }, 400);
    }

    const results = {
        mode,
        created: 0,
        updated: 0,
        variants_created: 0,
        variants_updated: 0,
        unchanged: 0,
        skipped: 0,
        errors: [],
        warnings: [],
        processing_time_ms: 0
    };

    try {
        await ensureProductSlugColumns();
        const [collections, categories, subCategories, brands, tags, existingProducts, existingVariants] = await Promise.all([
            query('SELECT id, name FROM parent_collections'),
            query('SELECT id, name, parent_collection_id FROM categories'),
            query('SELECT id, name, category_id FROM sub_categories'),
            query('SELECT id, name FROM brands'),
            query('SELECT id, name, sub_category_id FROM product_tags'),
            query('SELECT id, sku, handle, slug, category_id, sub_category_id FROM products'),
            query('SELECT id, sku, product_id FROM product_variants')
        ]);

        const key = (s) => String(s).toLowerCase().trim();
        const byName = (list) => {
            const map = new Map();
            for (const item of list) {
                const k = key(item.name || '');
                if (!map.has(k)) map.set(k, []);
                map.get(k).push(item);
            }
            return map;
        };
        const collectionsByName = byName(collections.rows);
        const categoriesByName = byName(categories.rows);
        const subCategoriesByName = byName(subCategories.rows);
        const brandsByName = byName(brands.rows);
        const tagsByName = byName(tags.rows);

        const productBySku = new Map(existingProducts.rows.map(p => [p.sku, p]));
        const productById = new Map(existingProducts.rows.map(p => [p.id, p]));
        const productByHandle = new Map(existingProducts.rows.filter(p => p.handle).map(p => [p.handle, p]));
        const variantBySku = new Map(existingVariants.rows.map(v => [v.sku, v]));
        const usedHandles = new Set(existingProducts.rows.map(p => p.handle).filter(Boolean));
        const usedSlugs = new Set(existingProducts.rows.map(p => p.slug?.toLowerCase()).filter(Boolean)); // lowercase
        const uniqueValue = (base, used) => {
            let value = base;
            for (let n = 2; used.has(value); n++) value = `${base}-${n}`;
            used.add(value);
            return value;
        };

        // Names -> ids. Unknown names are reported and the field is left unchanged (never cleared).
        const resolveMasters = (row, rowNo, current = {}) => {
            const out = {};
            const notFound = (label, name) => results.warnings.push(`Row ${rowNo}: ${label} "${name}" not found - left unchanged`);

            const collectionName = masterCell(row.collection);
            const collectionId = collectionName ? collectionsByName.get(key(collectionName))?.[0]?.id : undefined;

            const categoryName = masterCell(row.category);
            if (categoryName) {
                const matches = categoriesByName.get(key(categoryName)) || [];
                const match = matches.find(c => collectionId && c.parent_collection_id === collectionId) || matches[0];
                if (match) out.category_id = match.id;
                else notFound('Category', categoryName);
            }
            const categoryId = out.category_id ?? current.category_id;

            const subName = masterCell(row.sub_category);
            if (subName) {
                const match = (subCategoriesByName.get(key(subName)) || []).find(s => !categoryId || s.category_id === categoryId);
                if (match) out.sub_category_id = match.id;
                else notFound('Sub-Category', subName);
            }
            const subCategoryId = out.sub_category_id ?? current.sub_category_id;

            const tagName = masterCell(row.tag);
            if (tagName) {
                const matches = tagsByName.get(key(tagName)) || [];
                const match = subCategoryId ? matches.find(t => t.sub_category_id === subCategoryId) : matches[0];
                if (match) out.tag_id = match.id;
                else notFound('Tag', tagName);
            }

            const brandName = cellText(row.brand);
            if (brandName) {
                const match = brandsByName.get(key(brandName))?.[0];
                if (match) out.brand_id = match.id;
                else notFound('Brand', brandName);
            }
            return out;
        };

        const readProductFields = (row, rowNo, current) => {
            const taxClass = cellText(row.tax_class);
            const gst = taxClass !== undefined ? Number(taxClass.replace('%', '')) : NaN;
            return {
                name: cellText(row.product_name) ?? cellText(row.name),
                description: cellText(row.description),
                short_description: cellText(row.short_description),
                hsn_code: cellText(row.hsn_code),
                tax_class: taxClass,
                gst_percentage: Number.isFinite(gst) ? gst : undefined,
                buy_url: cellText(row.buy_url),
                unit: cellText(row.unit),
                is_featured: cellBool(row.is_featured),
                is_active: cellBool(row.is_active),
                ...resolveMasters(row, rowNo, current)
            };
        };

        const readVariantFields = (row, rowNo, fallbackNames, isNew) => {
            const out = { ...readOptions(row, fallbackNames, isNew), images: cellImages(row.images) };
            for (const field of PRICE_FIELDS) {
                const n = cellNumber(row[field]);
                if (Number.isNaN(n)) results.warnings.push(`Row ${rowNo}: invalid ${field.replace(/_/g, ' ')} "${row[field]}" - ignored`);
                else out[field] = n;
            }
            return out;
        };

        // 1. Validate SKUs and group rows into products (by handle, else by product name)
        const seenSkus = new Set();
        const groups = new Map();
        rows.forEach((raw, index) => {
            const rowNo = raw?._row || index + 1;
            const sku = cellText(raw?.sku);
            if (!sku) {
                results.errors.push(`Row ${rowNo}: SKU is required`);
                return;
            }
            if (seenSkus.has(sku)) {
                results.skipped++;
                results.warnings.push(`Row ${rowNo}: duplicate SKU "${sku}" in file - skipped`);
                return;
            }
            seenSkus.add(sku);

            const existingProduct = productBySku.get(sku);
            const existingVariant = variantBySku.get(sku);
            const handle = cellText(raw.product_handle);
            const name = cellText(raw.product_name) ?? cellText(raw.name);
            if (!existingProduct && !existingVariant) {
                if (sku.length > 100) {
                    results.errors.push(`Row ${rowNo}: SKU "${sku}" is longer than 100 characters`);
                    return;
                }
                if (name && name.length > 255) {
                    results.errors.push(`Row ${rowNo}: Product Name is longer than 255 characters`);
                    return;
                }
            }

            const groupKey = handle ? `h:${handle}` : name ? `n:${key(name)}` : `s:${sku}`;
            if (!groups.has(groupKey)) groups.set(groupKey, { handle, rows: [] });
            groups.get(groupKey).rows.push({ raw, rowNo, sku, existingProduct, existingVariant });
        });

        // 2. Build updates for existing SKUs and inserts for new SKUs
        const productPatches = new Map(); // product id -> { main, fromVariant }
        const variantPatches = [];
        const touchedRows = [];
        const newProducts = [];
        const newVariants = [];
        const getPatch = (id) => {
            if (!productPatches.has(id)) productPatches.set(id, {});
            return productPatches.get(id);
        };

        for (const group of groups.values()) {
            const firstRow = group.rows[0].raw;
            const fallbackNames = [1, 2, 3, 4].map(i => cellText(firstRow[`option${i}_name`]));

            // Existing product this group belongs to: via its handle, or via an existing SKU in the group
            const existingRow = group.rows.find(r => r.existingProduct || r.existingVariant);
            const targetProductId = (group.handle && productByHandle.get(group.handle)?.id)
                || existingRow?.existingProduct?.id
                || existingRow?.existingVariant?.product_id
                || null;

            const newRows = [];
            for (const r of group.rows) {
                if (!r.existingProduct && !r.existingVariant) {
                    newRows.push(r);
                    continue;
                }
                if (mode !== 'upsert') {
                    results.skipped++;
                    continue;
                }

                const productId = r.existingProduct?.id || r.existingVariant?.product_id;
                const productFields = readProductFields(r.raw, r.rowNo, productById.get(productId));
                const variantFields = readVariantFields(r.raw, r.rowNo, fallbackNames, false);

                if (r.existingProduct) {
                    // The product's own row: product-level + per-SKU values
                    getPatch(productId).main = { ...productFields, ...variantFields };
                } else if (productId && !getPatch(productId).fromVariant) {
                    // Variant row: product-level values apply only if the product's own row isn't in the file
                    getPatch(productId).fromVariant = productFields;
                }
                if (r.existingVariant) {
                    variantPatches.push({ id: r.existingVariant.id, ...variantFields });
                }
                touchedRows.push({ productId, variantId: r.existingVariant?.id });
            }

            if (newRows.length === 0) continue;

            let productHandle = null;
            let variantRows = newRows;
            if (!targetProductId) {
                const main = newRows[0];
                const productFields = readProductFields(main.raw, main.rowNo);
                const variantFields = readVariantFields(main.raw, main.rowNo, fallbackNames, true);
                if (!productFields.name || variantFields.mrp_price === undefined) {
                    const extra = newRows.length > 1 ? ` (its ${newRows.length - 1} variant row(s) were not created either)` : '';
                    results.errors.push(`Row ${main.rowNo}: Product Name and MRP are required to create "${main.sku}"${extra}`);
                    continue;
                }
                productHandle = uniqueValue(group.handle || slugify(productFields.name), usedHandles);
                newProducts.push({
                    ...productFields,
                    ...variantFields,
                    ...Object.fromEntries(PRICE_FIELDS.map(f => [f, variantFields[f] ?? 0])),
                    sku: main.sku,
                    handle: productHandle,
                    slug: pickUniqueSlug(productSlugFromName(productFields.name), usedSlugs),
                    images: variantFields.images || [],
                    unit: productFields.unit || '1',
                    gst_percentage: productFields.gst_percentage ?? 18,
                    is_featured: productFields.is_featured ?? true,
                    is_active: productFields.is_active ?? true
                });
                variantRows = newRows.slice(1);
            }

            for (const r of variantRows) {
                const variantFields = readVariantFields(r.raw, r.rowNo, fallbackNames, true);
                newVariants.push({
                    ...variantFields,
                    ...Object.fromEntries(PRICE_FIELDS.map(f => [f, variantFields[f] ?? 0])),
                    product_id: targetProductId,
                    product_handle: productHandle,
                    sku: r.sku,
                    images: variantFields.images || []
                });
            }
        }

        // The product's own row wins over values coming from its variant rows
        const productPatchRows = [...productPatches].map(([id, patch]) => {
            const merged = { id };
            for (const source of [patch.fromVariant, patch.main]) {
                for (const [k, v] of Object.entries(source || {})) {
                    if (v !== undefined) merged[k] = v;
                }
            }
            return merged;
        });

        // 3. Write everything for this batch in ONE transaction (all or nothing)
        const newProductFields = [['name', 'text'], ['handle', 'text'], ['slug', 'text'], ['sku', 'text'],
            ...VARIANT_FIELDS, ...PRODUCT_FIELDS.filter(([c]) => c !== 'name')];
        const newVariantFields = [['product_id', 'uuid'], ['product_handle', 'text'], ['sku', 'text'], ...VARIANT_FIELDS];
        const variantCols = VARIANT_FIELDS.map(([c]) => c);
        const now = Object.values(PRICE_TIMESTAMPS).map(() => 'CURRENT_TIMESTAMP').join(', ');

        try {
            await withTransaction(async (client) => {
                const changedProducts = await applyPatches(client, 'products', [...PRODUCT_FIELDS, ...VARIANT_FIELDS], productPatchRows);
                const changedVariants = await applyPatches(client, 'product_variants', VARIANT_FIELDS, variantPatches);
                results.updated = changedProducts.size;
                results.variants_updated = changedVariants.size;
                results.unchanged = touchedRows.filter(t => !changedProducts.has(t.productId) && !changedVariants.has(t.variantId)).length;

                if (newProducts.length > 0) {
                    const cols = newProductFields.map(([c]) => c);
                    const inserted = await client.query(`
                        INSERT INTO products (${cols.join(', ')}, variants, videos, ${Object.values(PRICE_TIMESTAMPS).join(', ')}, updated_at)
                        SELECT ${cols.map(c => `i.${c}`).join(', ')}, '[]'::jsonb, '[]'::jsonb, ${now}, CURRENT_TIMESTAMP
                        FROM jsonb_to_recordset($1::jsonb) AS i(${recordDef(newProductFields)})
                        ON CONFLICT DO NOTHING
                        RETURNING id
                    `, [JSON.stringify(newProducts)]);
                    results.created = inserted.rows.length;
                    if (inserted.rows.length < newProducts.length) {
                        results.warnings.push(`${newProducts.length - inserted.rows.length} new product(s) already existed and were not changed`);
                    }
                }

                if (newVariants.length > 0) {
                    const inserted = await client.query(`
                        INSERT INTO product_variants (product_id, sku, ${variantCols.join(', ')}, is_default, is_active, ${Object.values(PRICE_TIMESTAMPS).join(', ')}, updated_at)
                        SELECT COALESCE(i.product_id, p.id), i.sku, ${variantCols.map(c => `i.${c}`).join(', ')}, false, true, ${now}, CURRENT_TIMESTAMP
                        FROM jsonb_to_recordset($1::jsonb) AS i(${recordDef(newVariantFields)})
                        LEFT JOIN products p ON i.product_id IS NULL AND p.handle = i.product_handle
                        WHERE COALESCE(i.product_id, p.id) IS NOT NULL
                        ON CONFLICT DO NOTHING
                        RETURNING id
                    `, [JSON.stringify(newVariants)]);
                    results.variants_created = inserted.rows.length;
                    if (inserted.rows.length < newVariants.length) {
                        results.warnings.push(`${newVariants.length - inserted.rows.length} new variant(s) could not be added (SKU already exists or product not created)`);
                    }
                }

                // Renamed products get a URL slug from the new name (after inserts, so slugs never clash)
                for (const patch of productPatchRows) {
                    if (patch.name && changedProducts.has(patch.id)) await syncProductSlug(patch.id, patch.name, client);
                }
            });
        } catch (dbErr) {
            console.error('Bulk upload batch failed:', dbErr);
            Object.assign(results, { created: 0, updated: 0, variants_created: 0, variants_updated: 0, unchanged: 0 });
            results.errors.push(`Database error - nothing in this batch was saved: ${dbErr.message}`);
        }

        results.processing_time_ms = Date.now() - startTime;
        return sendResponse(results);
    } catch (error) {
        console.error('Error in bulk upload:', error);
        return sendResponse({ error: 'Failed to process bulk upload' }, 500);
    }
}

// GET /api/products/export - one row per SKU (product row + its variants) in the bulk template layout
export async function exportProducts(searchParams) {
    try {
        const where = [];
        const params = [];
        const addFilter = (sql, value) => {
            params.push(value);
            where.push(sql.replaceAll('?', `$${params.length}`));
        };

        const collectionId = searchParams.get('collection_id');
        const categoryId = searchParams.get('category_id');
        const subCategoryId = parseInt(searchParams.get('sub_category_id'));
        const brandId = searchParams.get('brand_id');
        const tagId = searchParams.get('tag_id');
        const search = searchParams.get('search');
        const status = searchParams.get('status');

        if (collectionId) addFilter('c.parent_collection_id = ?', collectionId);
        if (categoryId) addFilter('p.category_id = ?', categoryId);
        if (!isNaN(subCategoryId)) addFilter('p.sub_category_id = ?', subCategoryId);
        if (brandId) addFilter('p.brand_id = ?', brandId);
        if (tagId) addFilter('p.tag_id = ?', tagId);
        if (search) {
            addFilter(`(p.name ILIKE ? OR p.sku ILIKE ? OR EXISTS (
                SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.sku ILIKE ?))`, `%${search}%`);
        }
        if (status === 'active') where.push('p.is_active = true');
        if (status === 'inactive') where.push('p.is_active = false');

        const products = await query(`
            SELECT p.*, pc.name AS collection_name, c.name AS category_name, sc.name AS sub_category_name,
                   pt.name AS tag_name, b.name AS brand_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN parent_collections pc ON c.parent_collection_id = pc.id
            LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
            LEFT JOIN product_tags pt ON p.tag_id = pt.id
            LEFT JOIN brands b ON p.brand_id = b.id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY c.name NULLS LAST, p.name, p.sku
        `, params);

        const productIds = products.rows.map(p => p.id);
        const variants = productIds.length === 0 ? { rows: [] } : await query(`
            SELECT * FROM product_variants WHERE product_id = ANY($1::uuid[])
            ORDER BY is_default DESC, sku
        `, [productIds]);
        const variantsByProduct = new Map();
        for (const v of variants.rows) {
            if (!variantsByProduct.has(v.product_id)) variantsByProduct.set(v.product_id, []);
            variantsByProduct.get(v.product_id).push(v);
        }

        // Size/Color cells are left blank when they just repeat the Size/Color option,
        // so editing the option value in Excel also keeps the legacy column in sync.
        const legacyColumn = (item, column, namePattern) => {
            const option = [1, 2, 3, 4].find(i => namePattern.test(item[`option${i}_name`] || ''));
            return item[column] && (!option || item[`option${option}_value`] !== item[column]) ? item[column] : '';
        };
        const skuColumns = (item) => ({
            sku: item.sku,
            ...Object.fromEntries([1, 2, 3, 4].flatMap(i => [
                [`option${i}_name`, item[`option${i}_name`] || ''],
                [`option${i}_value`, item[`option${i}_value`] || '']
            ])),
            size: legacyColumn(item, 'size', /size/i),
            color: legacyColumn(item, 'color', /colou?r/i),
            ...Object.fromEntries(PRICE_FIELDS.map(f => [f, item[f] === null || item[f] === undefined ? '' : Number(item[f])])),
            images: imageUrls(item.images).join(', ')
        });

        const rows = [];
        for (const p of products.rows) {
            const shared = {
                product_handle: p.handle || '',
                product_name: p.name,
                collection: p.collection_name || '',
                category: p.category_name || '',
                sub_category: p.sub_category_name || '',
                tag: p.tag_name || '',
                brand: p.brand_name || '',
                description: p.description || '',
                short_description: p.short_description || '',
                hsn_code: p.hsn_code || '',
                tax_class: p.tax_class || '',
                buy_url: p.buy_url || '',
                unit: p.unit || '',
                is_active: p.is_active === false ? 'FALSE' : 'TRUE',
                is_featured: p.is_featured ? 'TRUE' : 'FALSE'
            };
            rows.push({ ...shared, ...skuColumns(p) });
            for (const v of variantsByProduct.get(p.id) || []) {
                // Products created from the admin form repeat their own SKU as a variant - export it once
                if (v.sku !== p.sku) rows.push({ ...shared, ...skuColumns(v) });
            }
        }

        return sendResponse({ rows, products: products.rows.length });
    } catch (error) {
        console.error('Error exporting products:', error);
        return sendResponse({ error: 'Failed to export products' }, 500);
    }
}
