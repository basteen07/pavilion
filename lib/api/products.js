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
            whereClause += ` AND p.shop_price >= $${paramCount++}`;
            queryParams.push(price_min);
        }
        if (price_max) {
            whereClause += ` AND p.shop_price <= $${paramCount++}`;
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

        const baseJoin = `
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
            LEFT JOIN product_tags pt ON p.tag_id = pt.id
        `;

        let orderBy = 'p.is_featured DESC, p.created_at DESC';
        if (sort === 'price_asc') orderBy = 'p.shop_price ASC';
        if (sort === 'price_desc') orderBy = 'p.shop_price DESC';
        if (sort === 'newest') orderBy = 'p.created_at DESC';
        if (sort === 'name_asc') orderBy = 'p.name ASC';

        const dataQuery = `
            SELECT p.*, b.name as brand_name, c.name as category_name, sc.name as sub_category_name, pt.name as tag_name
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

// GET /api/products/[slug]
export async function getProductBySlug(slug) {
    try {
        const result = await query(
            `SELECT p.*, b.name as brand_name, c.name as category_name, sc.name as sub_category_name
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

        const result = await query(
            `INSERT INTO products (
        name, slug, description, short_description, sku, mrp_price, dealer_price, counter_price, recommended_price, shop_price,
        category_id, sub_category_id, brand_id, tag_id, images, videos, variants, is_featured, is_active,
        a_plus_content, is_discontinued, is_quote_hidden, buy_url, gst_percentage, hsn_code, unit
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $24, $14, $15, $16, $17, true, $18, $19, $20, $21, $22, $23, $25)
      RETURNING *`,
            [
                name,
                slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                description,
                short_description,
                sku,
                mrp_price,
                dealer_price,
                counter_price || 0,
                recommended_price || 0,
                shop_price || (mrp_price && dealer_price ? mrp_price : 0),
                category_id,
                sub_category_id,
                brand_id,
                JSON.stringify(images || []),
                JSON.stringify(videos || []),
                JSON.stringify(variants || []),
                is_featured || false,
                a_plus_content || '',
                is_discontinued || false,
                is_quote_hidden || false,
                buy_url || '',
                gst_percentage || 18,
                hsn_code || '',
                tag_id || null,
                unit || '1'
            ]
        );

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
            a_plus_content, is_discontinued, is_quote_hidden, buy_url, gst_percentage, hsn_code, unit
        } = data;

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
        tag_id = COALESCE($24, tag_id),
        images = COALESCE($14, images),
        videos = COALESCE($15, videos),
        variants = COALESCE($16, variants),
        is_featured = COALESCE($17, is_featured),
        is_active = COALESCE($18, is_active),
        a_plus_content = COALESCE($19, a_plus_content),
        is_discontinued = COALESCE($20, is_discontinued),
        is_quote_hidden = COALESCE($21, is_quote_hidden),
        buy_url = COALESCE($22, buy_url),
        gst_percentage = COALESCE($23, gst_percentage),
        hsn_code = COALESCE($25, hsn_code),
        unit = COALESCE($26, unit),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $27
      RETURNING *`,
            [
                name, slug, description, short_description, sku, mrp_price, dealer_price, counter_price, recommended_price, shop_price,
                category_id, sub_category_id, brand_id,
                images ? JSON.stringify(images) : null,
                videos ? JSON.stringify(videos) : null,
                variants ? JSON.stringify(variants) : null,
                is_featured, is_active,
                a_plus_content, is_discontinued, is_quote_hidden, buy_url, gst_percentage,
                tag_id,
                hsn_code,
                unit,
                id
            ]
        );

        if (result.rows.length === 0) {
            return sendResponse({ error: 'Product not found' }, 404);
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

// POST /api/products/bulk
export async function bulkUploadProducts(dataArray) {
    try {
        if (!Array.isArray(dataArray)) {
            return sendResponse({ error: 'Data must be an array' }, 400);
        }

        // Fetch mapping data
        const [categories, subCategories, brands] = await Promise.all([
            query('SELECT id, name FROM categories'),
            query('SELECT id, name, category_id FROM sub_categories'),
            query('SELECT id, name FROM brands')
        ]);

        const categoryMap = Object.fromEntries(categories.rows.map(c => [c.name.toLowerCase().trim(), c.id]));
        const brandMap = Object.fromEntries(brands.rows.map(b => [b.name.toLowerCase().trim(), b.id]));

        // Subcategory map needs to handle category context
        const subCategoryMap = {};
        subCategories.rows.forEach(sc => {
            const key = `${sc.category_id}_${sc.name.toLowerCase().trim()}`;
            subCategoryMap[key] = sc.id;
        });

        const results = {
            created: 0,
            updated: 0,
            errors: []
        };

        for (const [index, item] of dataArray.entries()) {
            try {
                const {
                    name, sku, mrp_price, dealer_price, counter_price, recommended_price, shop_price,
                    category, sub_category, brand, description, short_description,
                    hsn_code, tax_class, buy_url, is_featured, is_active, unit
                } = item;

                if (!name || !sku || !mrp_price) {
                    throw new Error(`Row ${index + 1}: Name, SKU, and MRP Price are required`);
                }

                // Map category
                const category_id = category ? categoryMap[category.toLowerCase().trim()] : null;
                if (category && !category_id) {
                    throw new Error(`Row ${index + 1}: Category "${category}" not found`);
                }

                // Map brand
                const brand_id = brand ? brandMap[brand.toLowerCase().trim()] : null;
                if (brand && !brand_id) {
                    throw new Error(`Row ${index + 1}: Brand "${brand}" not found`);
                }

                // Map subcategory
                let sub_category_id = null;
                if (sub_category && category_id) {
                    const key = `${category_id}_${sub_category.toLowerCase().trim()}`;
                    sub_category_id = subCategoryMap[key];
                    if (!sub_category_id) {
                        throw new Error(`Row ${index + 1}: Sub-category "${sub_category}" not found in category "${category}"`);
                    }
                }

                // Check for existing SKU
                const existing = await query('SELECT id FROM products WHERE sku = $1', [sku]);

                if (existing.rows.length > 0) {
                    // Update
                    await query(
                        `UPDATE products SET
                            name = $1,
                            description = COALESCE($2, description),
                            short_description = COALESCE($3, short_description),
                            mrp_price = $4,
                            dealer_price = $5,
                            counter_price = $6,
                            recommended_price = $7,
                            shop_price = $8,
                            category_id = $9,
                            sub_category_id = $10,
                            brand_id = $11,
                            hsn_code = $12,
                            tax_class = $13,
                            buy_url = $14,
                            is_featured = $15,
                            is_active = $16,
                            unit = COALESCE($18, unit),
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $17`,
                        [
                            name, description, short_description, mrp_price,
                            dealer_price || 0, counter_price || 0, recommended_price || 0,
                            shop_price || mrp_price,
                            category_id, sub_category_id, brand_id,
                            hsn_code, tax_class, buy_url, is_featured ?? false, is_active ?? true,
                            existing.rows[0].id, unit
                        ]
                    );
                    results.updated++;
                } else {
                    // Insert
                    await query(
                        `INSERT INTO products (
                            name, slug, description, short_description, sku, mrp_price, dealer_price, counter_price, recommended_price, shop_price,
                            category_id, sub_category_id, brand_id, is_featured, is_active,
                            hsn_code, tax_class, buy_url, images, videos, variants,
                            a_plus_content, is_discontinued, is_quote_hidden, unit
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, $15, $16, $17, '[]', '[]', '[]', '', false, false, $18)`,
                        [
                            name, name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                            description || '', short_description || '', sku, mrp_price,
                            dealer_price || 0, counter_price || 0, recommended_price || 0,
                            shop_price || mrp_price,
                            category_id, sub_category_id, brand_id,
                            is_featured ?? false, hsn_code || '', tax_class || '', buy_url || '', unit || '1'
                        ]
                    );
                    results.created++;
                }
            } catch (err) {
                results.errors.push(err.message);
            }
        }

        return sendResponse(results);
    } catch (error) {
        console.error('Error in bulk upload:', error);
        return sendResponse({ error: 'Failed to process bulk upload' }, 500);
    }
}
