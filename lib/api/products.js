import { query } from '@/lib/simple-db';
import { NextResponse } from 'next/server';

const sendResponse = (data, status = 200) => {
    return NextResponse.json(data, { status });
};

// GET /api/products
export async function getProducts(searchParams) {
    try {
        const category = searchParams.get('category');
        const sub_category = searchParams.get('sub_category');
        const brand = searchParams.get('brand');
        const collection_id = searchParams.get('collection_id');
        // Accept both naming conventions for price parameters
        const price_min = searchParams.get('price_min') || searchParams.get('min_price');
        const price_max = searchParams.get('price_max') || searchParams.get('max_price');
        const is_featured = searchParams.get('is_featured');
        const search = searchParams.get('search');
        const sort = searchParams.get('sort');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '100'); // Increased default for grouping
        const offset = (page - 1) * limit;
        const showHiddenQuotes = searchParams.get('showHiddenQuotes') === 'true';

        let whereClause = 'WHERE p.is_active = true';
        if (!showHiddenQuotes) {
            whereClause += ' AND (p.is_quote_hidden IS NULL OR p.is_quote_hidden = false)';
        }
        const queryParams = [];
        let paramCount = 1;

        // Resolve category slugs to IDs
        if (category) {
            const categories = category.split(',').filter(Boolean);
            if (categories.length > 0) {
                // Check if these are UUIDs or slugs
                const isUUID = categories[0].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

                if (isUUID) {
                    // Direct UUID filtering
                    whereClause += ` AND p.category_id = ANY($${paramCount++}::uuid[])`;
                    queryParams.push(categories);
                } else {
                    // Slug-based filtering - resolve to IDs
                    const categoryResult = await query(
                        'SELECT id FROM categories WHERE slug = ANY($1::text[])',
                        [categories]
                    );
                    const categoryIds = categoryResult.rows.map(r => r.id);
                    if (categoryIds.length > 0) {
                        whereClause += ` AND p.category_id = ANY($${paramCount++}::uuid[])`;
                        queryParams.push(categoryIds);
                    }
                }
            }
        }

        if (sub_category) {
            const subCategories = sub_category.split(',').filter(Boolean).map(id => parseInt(id)).filter(id => !isNaN(id));
            if (subCategories.length > 0) {
                whereClause += ` AND p.sub_category_id = ANY($${paramCount++}::int[])`;
                queryParams.push(subCategories);
            }
        }

        // Resolve brand slugs to IDs
        if (brand) {
            const brands = brand.split(',').filter(Boolean);
            if (brands.length > 0) {
                // Check if these are UUIDs or slugs
                const isUUID = brands[0].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

                if (isUUID) {
                    // Direct UUID filtering
                    whereClause += ` AND p.brand_id = ANY($${paramCount++}::uuid[])`;
                    queryParams.push(brands);
                } else {
                    // Slug-based filtering - resolve to IDs
                    const brandResult = await query(
                        'SELECT id FROM brands WHERE slug = ANY($1::text[])',
                        [brands]
                    );
                    const brandIds = brandResult.rows.map(r => r.id);
                    if (brandIds.length > 0) {
                        whereClause += ` AND p.brand_id = ANY($${paramCount++}::uuid[])`;
                        queryParams.push(brandIds);
                    }
                }
            }
        }

        if (collection_id) {
            whereClause += ` AND c.parent_collection_id = $${paramCount++}`;
            queryParams.push(collection_id);
        }
        if (price_min) {
            whereClause += ` AND REPLACE(p.mrp_price::text, ',', '')::numeric >= $${paramCount++}`;
            queryParams.push(price_min);
        }
        if (price_max) {
            whereClause += ` AND REPLACE(p.mrp_price::text, ',', '')::numeric <= $${paramCount++}`;
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

        // Tag filter (ID based)
        const tag = searchParams.get('tag');
        if (tag) {
            // Validate UUID to prevent SQL errors if junk passed
            if (tag.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                whereClause += ` AND p.tag_id = $${paramCount++}`;
                queryParams.push(tag);
            }
        }

        // custom priority tag sorting
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
            // Put products with this tag FIRST, then normal sort
            // Use parameterized query for ID (paramCount is current)
            // We'll pass prioritize_tag value as a param
            orderBy = `(CASE WHEN p.tag_id = $${paramCount++} THEN 0 ELSE 1 END) ASC, ${orderBy}`;
            queryParams.push(prioritize_tag);
        }

        if (sort === 'price_asc') orderBy = "REPLACE(p.mrp_price::text, ',', '')::numeric ASC";
        if (sort === 'price_desc') orderBy = "REPLACE(p.mrp_price::text, ',', '')::numeric DESC";
        if (sort === 'newest') orderBy = 'p.created_at DESC';
        if (sort === 'name_asc') orderBy = 'p.name ASC';

        const dataQuery = `
            SELECT p.*, b.name as brand_name, c.name as category_name, sc.name as sub_category_name, pt.name as tag_name,
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
                        'mrp_price', pv.mrp_price,
                        'dealer_price', pv.dealer_price,
                        'counter_price', pv.counter_price,
                        'recommended_price', pv.recommended_price,
                        'shop_price', pv.shop_price,
                        'inventory', pv.inventory,
                        'is_default', pv.is_default,
                        'images', pv.images
                    ) ORDER BY pv.is_default DESC, pv.sku
                ) FROM product_variants pv 
                WHERE pv.product_id = p.id AND pv.is_active = true),
                '[]'::json
            ) as product_variants
            ${baseJoin}
            ${whereClause}
            ORDER BY ${orderBy}
            LIMIT $${paramCount++} OFFSET $${paramCount}
        `;

        const countQuery = `
            SELECT COUNT(*)
            ${baseJoin}
            ${whereClause}
        `;

        const pagingParams = [...queryParams, limit, offset];

        const [productsResult, countResult] = await Promise.all([
            query(dataQuery, pagingParams),
            query(countQuery, queryParams)
        ]);

        return sendResponse({
            products: productsResult.rows,
            total: parseInt(countResult.rows[0].count),
            page,
            limit,
            totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
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
                            'mrp_price', pv.mrp_price,
                            'dealer_price', pv.dealer_price,
                            'counter_price', pv.counter_price,
                            'recommended_price', pv.recommended_price,
                            'shop_price', pv.shop_price,
                            'inventory', pv.inventory,
                            'is_default', pv.is_default,
                            'images', pv.images
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
            a_plus_content, is_discontinued, is_quote_hidden, buy_url, gst_percentage, hsn_code, unit
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
        size, color, option1_name, option1_value, option2_name, option2_value
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $25, $15, $16, $17, $18, true, $19, $20, $21, $22, $23, $24, $26, $27, $28, $29, $30, $31, $32)
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
                data.option2_value || null
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
                        mrp_price, dealer_price, counter_price, recommended_price, shop_price,
                        inventory, is_default, is_active, images
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, $16)`,
                    [
                        product_id,
                        variantSku,
                        variant.size || variant.option1_value || '',
                        variant.color || variant.option2_value || '',
                        variant.option1_name || '',
                        variant.option1_value || '',
                        variant.option2_name || '',
                        variant.option2_value || '',
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
            size, color, option1_name, option1_value, option2_name, option2_value
        } = data;

        // Detect if any price field is being updated
        const priceFields = ['mrp_price', 'dealer_price', 'counter_price', 'recommended_price', 'shop_price'];
        const isPriceUpdate = priceFields.some(field => data[field] !== undefined);
        const priceUpdatedAt = isPriceUpdate ? new Date().toISOString() : null;

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
        price_updated_at = COALESCE($27, price_updated_at),
        updated_at = CURRENT_TIMESTAMP,
        size = COALESCE($28, size),
        color = COALESCE($29, color),
        option1_name = COALESCE($30, option1_name),
        option1_value = COALESCE($31, option1_value),
        option2_name = COALESCE($32, option2_name),
        option2_value = COALESCE($33, option2_value)
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
                priceUpdatedAt,
                size, color, option1_name, option1_value, option2_name, option2_value
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
                                variant.images ? JSON.stringify(variant.images) : '[]'
                            ]
                        );
                    } else {
                        // Create new variant
                        await query(
                            `INSERT INTO product_variants (
                                product_id, sku, size, color,
                                option1_name, option1_value, option2_name, option2_value,
                                mrp_price, dealer_price, counter_price, recommended_price, shop_price,
                                inventory, is_default, is_active, images
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, $16)`,
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
                                variant.is_default || index === 0
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

// POST /api/products/bulk - HIGH PERFORMANCE version with batch transactions
export async function bulkUploadProducts(dataArray) {
    const startTime = Date.now();

    try {
        if (!Array.isArray(dataArray)) {
            return sendResponse({ error: 'Data must be an array' }, 400);
        }

        // Parallel fetch all mapping data in single queries
        const [categories, subCategories, brands, existingProducts, existingVariants] = await Promise.all([
            query('SELECT id, name FROM categories'),
            query('SELECT id, name, category_id FROM sub_categories'),
            query('SELECT id, name FROM brands'),
            query('SELECT id, sku, handle FROM products'),
            query('SELECT id, sku, product_id FROM product_variants')
        ]);

        // Build lookup maps for O(1) access
        const categoryMap = Object.fromEntries(categories.rows.map(c => [c.name.toLowerCase().trim(), c.id]));
        const brandMap = Object.fromEntries(brands.rows.map(b => [b.name.toLowerCase().trim(), b.id]));
        const productByHandle = Object.fromEntries(existingProducts.rows.map(p => [p.handle, p.id]));
        const productBySku = Object.fromEntries(existingProducts.rows.map(p => [p.sku, p.id]));
        const variantBySku = Object.fromEntries(existingVariants.rows.map(v => [v.sku, { id: v.id, product_id: v.product_id }]));

        const subCategoryMap = {};
        subCategories.rows.forEach(sc => {
            const key = `${sc.category_id}_${sc.name.toLowerCase().trim()}`;
            subCategoryMap[key] = sc.id;
        });

        const results = {
            created: 0,
            updated: 0,
            variants_created: 0,
            variants_updated: 0,
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

        // Group rows by product_handle
        const productGroups = {};
        for (const [index, item] of dataArray.entries()) {
            const handle = item.product_handle || item.sku;
            if (!productGroups[handle]) {
                productGroups[handle] = [];
            }
            productGroups[handle].push({ ...item, _rowIndex: index + 1 });
        }

        // Process in batches for transaction efficiency
        const BATCH_SIZE = 50;
        const handles = Object.keys(productGroups);

        for (let i = 0; i < handles.length; i += BATCH_SIZE) {
            const batchHandles = handles.slice(i, i + BATCH_SIZE);

            // Start transaction for this batch
            await query('BEGIN');

            try {
                for (const handle of batchHandles) {
                    const rows = productGroups[handle];
                    const firstRow = rows[0];

                    try {
                        const productName = firstRow.product_name || firstRow.name;
                        const { sku, mrp_price, dealer_price, counter_price, recommended_price, shop_price,
                            category, sub_category, brand, description, short_description,
                            hsn_code, tax_class, buy_url, is_featured, is_active, unit } = firstRow;

                        if (!productName || !sku || !mrp_price) {
                            results.errors.push(`Row ${firstRow._rowIndex}: Name, SKU, MRP required`);
                            continue;
                        }

                        // Fast lookup from pre-fetched maps
                        const category_id = category ? categoryMap[category.toLowerCase().trim()] : null;
                        if (category && !category_id) {
                            results.errors.push(`Row ${firstRow._rowIndex}: Category "${category}" not found`);
                            continue;
                        }

                        const brand_id = brand ? brandMap[brand.toLowerCase().trim()] : null;
                        if (brand && !brand_id) {
                            results.errors.push(`Row ${firstRow._rowIndex}: Brand "${brand}" not found`);
                            continue;
                        }

                        let sub_category_id = null;
                        if (sub_category && category_id) {
                            sub_category_id = subCategoryMap[`${category_id}_${sub_category.toLowerCase().trim()}`];
                        }

                        // Check existing product from pre-fetched data (no query needed)
                        let product_id = productByHandle[handle] || productBySku[sku];

                        if (product_id) {
                            // UPDATE existing product
                            await query(
                                `UPDATE products SET
                                    name = $1, handle = COALESCE($2, handle),
                                    description = COALESCE($3, description),
                                    short_description = COALESCE($4, short_description),
                                    mrp_price = $5, dealer_price = $6, counter_price = $7,
                                    recommended_price = $8, shop_price = $9,
                                    category_id = COALESCE($10, category_id),
                                    sub_category_id = COALESCE($11, sub_category_id),
                                    brand_id = COALESCE($12, brand_id),
                                    hsn_code = COALESCE($13, hsn_code),
                                    tax_class = COALESCE($14, tax_class),
                                    buy_url = COALESCE($15, buy_url),
                                    is_featured = $16, is_active = $17,
                                    unit = COALESCE($18, unit),
                                    images = COALESCE($20, images),
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE id = $19`,
                                [productName, handle, description, short_description, mrp_price,
                                    dealer_price || 0, counter_price || 0, recommended_price || 0, shop_price || 0,
                                    category_id, sub_category_id, brand_id, hsn_code, tax_class, buy_url,
                                    is_featured ?? false, is_active ?? true, unit, product_id, parseImages(firstRow.images)]
                            );
                            results.updated++;
                        } else {
                            // INSERT new product
                            const slug = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                            const insertResult = await query(
                                `INSERT INTO products (
                                    name, slug, handle, description, short_description, sku,
                                    mrp_price, dealer_price, counter_price, recommended_price, shop_price,
                                    category_id, sub_category_id, brand_id, is_featured, is_active,
                                    hsn_code, tax_class, buy_url, images, videos, variants, unit
                                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true,$16,$17,$18,$19,'[]','[]',$20)
                                RETURNING id`,
                                [productName, slug, handle, description || '', short_description || '', sku,
                                    mrp_price, dealer_price || 0, counter_price || 0, recommended_price || 0, shop_price || 0,
                                    category_id, sub_category_id, brand_id, is_featured ?? false,
                                    hsn_code || '', tax_class || '', buy_url || '', unit || '1', parseImages(firstRow.images)]
                            );
                            product_id = insertResult.rows[0].id;
                            productByHandle[handle] = product_id;
                            productBySku[sku] = product_id;
                            results.created++;
                        }

                        // Process variants for this product
                        const isOnlyVariant = rows.length === 1;

                        for (const [variantIndex, row] of rows.entries()) {
                            const isDefault = isOnlyVariant || variantIndex === 0;
                            const variantSku = row.sku;
                            const existingVar = variantBySku[variantSku];

                            if (existingVar) {
                                // UPDATE variant
                                await query(
                                    `UPDATE product_variants SET
                                        product_id = $1, size = COALESCE($3, size), color = COALESCE($4, color),
                                        option1_name = COALESCE($5, option1_name), option1_value = COALESCE($6, option1_value),
                                        option2_name = COALESCE($7, option2_name), option2_value = COALESCE($8, option2_value),
                                        mrp_price = $9, dealer_price = $10, counter_price = $11,
                                        recommended_price = $12, shop_price = $13,
                                        inventory = COALESCE($14, inventory), is_default = $15,
                                        images = COALESCE($16, images),
                                        updated_at = CURRENT_TIMESTAMP
                                    WHERE sku = $2`,
                                    [product_id, variantSku,
                                        row.size || row.option1_value, row.color || row.option2_value,
                                        row.option1_name, row.option1_value, row.option2_name, row.option2_value,
                                        row.mrp_price, row.dealer_price || 0, row.counter_price || 0,
                                        row.recommended_price || 0, row.shop_price || 0,
                                        row.inventory || row.stock_quantity || 0, isDefault, parseImages(row.images)]
                                );
                                results.variants_updated++;
                            } else {
                                // INSERT variant
                                await query(
                                    `INSERT INTO product_variants (
                                        product_id, sku, size, color,
                                        option1_name, option1_value, option2_name, option2_value,
                                        mrp_price, dealer_price, counter_price, recommended_price, shop_price,
                                        inventory, is_default, images
                                    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
                                    [product_id, variantSku,
                                        row.size || row.option1_value, row.color || row.option2_value,
                                        row.option1_name, row.option1_value, row.option2_name, row.option2_value,
                                        row.mrp_price, row.dealer_price || 0, row.counter_price || 0,
                                        row.recommended_price || 0, row.shop_price || 0,
                                        row.inventory || row.stock_quantity || 0, isDefault, parseImages(row.images)]
                                );
                                variantBySku[variantSku] = { id: null, product_id };
                                results.variants_created++;
                            }
                        }
                    } catch (err) {
                        results.errors.push(`Handle ${handle}: ${err.message}`);
                    }
                }

                // Commit batch
                await query('COMMIT');
            } catch (batchErr) {
                await query('ROLLBACK');
                results.errors.push(`Batch error: ${batchErr.message}`);
            }
        }

        results.processing_time_ms = Date.now() - startTime;
        return sendResponse(results);
    } catch (error) {
        console.error('Error in bulk upload:', error);
        return sendResponse({ error: 'Failed to process bulk upload' }, 500);
    }
}
