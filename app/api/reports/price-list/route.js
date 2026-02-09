import { query } from '@/lib/simple-db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);

        // Extract filters
        const category = searchParams.get('category');
        const sub_category = searchParams.get('sub_category');
        const brand = searchParams.get('brand');
        const tag = searchParams.get('tag'); // Tag ID
        const collection_id = searchParams.get('collection_id');
        const search = searchParams.get('search');

        let whereClause = 'WHERE p.is_active = true';
        const queryParams = [];
        let paramCount = 1;

        // Resolve category slugs/IDs
        if (category && category !== 'all') {
            const categories = category.split(',').filter(Boolean);
            if (categories.length > 0) {
                const isUUID = categories[0].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
                if (isUUID) {
                    whereClause += ` AND p.category_id = ANY($${paramCount++}::uuid[])`;
                    queryParams.push(categories);
                } else {
                    const categoryResult = await query('SELECT id FROM categories WHERE slug = ANY($1::text[])', [categories]);
                    const categoryIds = categoryResult.rows.map(r => r.id);
                    if (categoryIds.length > 0) {
                        whereClause += ` AND p.category_id = ANY($${paramCount++}::uuid[])`;
                        queryParams.push(categoryIds);
                    }
                }
            }
        }

        // Sub-category Filter
        if (sub_category && sub_category !== 'all') {
            // Assuming sub_category is passed as ID since it's an integer in the DB (based on previous observations, but wait...)
            // In lib/api/products.js: "p.sub_category_id = ANY($...::int[])"
            // So sub_category_id is INTEGER.
            const subCategories = sub_category.split(',').filter(Boolean).map(id => parseInt(id)).filter(id => !isNaN(id));
            if (subCategories.length > 0) {
                whereClause += ` AND p.sub_category_id = ANY($${paramCount++}::int[])`;
                queryParams.push(subCategories);
            }
        }

        // Brand Filter
        if (brand && brand !== 'all') {
            const brands = brand.split(',').filter(Boolean);
            if (brands.length > 0) {
                const isUUID = brands[0].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
                if (isUUID) {
                    whereClause += ` AND p.brand_id = ANY($${paramCount++}::uuid[])`;
                    queryParams.push(brands);
                } else {
                    const brandResult = await query('SELECT id FROM brands WHERE slug = ANY($1::text[])', [brands]);
                    const brandIds = brandResult.rows.map(r => r.id);
                    if (brandIds.length > 0) {
                        whereClause += ` AND p.brand_id = ANY($${paramCount++}::uuid[])`;
                        queryParams.push(brandIds);
                    }
                }
            }
        }

        // Tag Filter
        if (tag && tag !== 'all') {
            // Validate UUID
            if (tag.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                whereClause += ` AND p.tag_id = $${paramCount++}`;
                queryParams.push(tag);
            }
        }

        // Collection Filter (if applicable to schema, keeping it generic)
        if (collection_id && collection_id !== 'all') {
            // Note: 'c' alias is for categories, parent_collection_id might be there?
            // Checking lib/api/products.js: "p.category_id = c.id ... AND c.parent_collection_id = $..."
            whereClause += ` AND c.parent_collection_id = $${paramCount++}`;
            queryParams.push(collection_id);
        }

        // Search
        if (search) {
            whereClause += ` AND (p.name ILIKE $${paramCount} OR p.sku ILIKE $${paramCount})`;
            queryParams.push(`%${search}%`);
            paramCount++;
        }

        const queryText = `
            SELECT 
                p.id, p.name, p.sku, p.short_description, 
                p.mrp_price, p.dealer_price, p.shop_price, p.counter_price, p.recommended_price,
                p.stock_quantity,
                b.name as brand_name, 
                c.name as category_name, 
                sc.name as sub_category_name,
                pt.name as tag_name,
                COALESCE(
                    (SELECT json_agg(
                        json_build_object(
                            'sku', pv.sku,
                            'size', pv.size,
                            'color', pv.color,
                            'option1_name', pv.option1_name,
                            'option1_value', pv.option1_value,
                            'option2_name', pv.option2_name,
                            'option2_value', pv.option2_value,
                            'mrp_price', pv.mrp_price,
                            'dealer_price', pv.dealer_price,
                            'shop_price', pv.shop_price,
                            'inventory', pv.inventory
                        ) ORDER BY pv.sku
                    ) FROM product_variants pv 
                    WHERE pv.product_id = p.id AND pv.is_active = true),
                    '[]'::json
                ) as variants
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
            LEFT JOIN product_tags pt ON p.tag_id = pt.id
            ${whereClause}
            ORDER BY b.name ASC, p.name ASC
        `;

        const result = await query(queryText, queryParams);

        return NextResponse.json({
            data: result.rows,
            count: result.rowCount
        });

    } catch (error) {
        console.error('Price List Report API Error:', error);
        return NextResponse.json({ error: 'Failed to generate report data' }, { status: 500 });
    }
}
