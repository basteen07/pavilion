import { query } from '@/lib/simple-db';
import { NextResponse } from 'next/server';

const sendResponse = (data, status = 200) => {
    return NextResponse.json(data, { status });
};

// Internal fetch function
export async function fetchBrands(options = {}) {
    const { categoryId, subCategoryId } = options;
    let queryStr;
    const params = [];

    if (categoryId || subCategoryId) {
        // Dynamic check: Get brands that have products in this category/sub-category
        queryStr = `
            SELECT b.*, COUNT(p.id) as product_count
            FROM brands b
            INNER JOIN products p ON b.id = p.brand_id
            WHERE b.is_active = true
        `;
        if (categoryId) {
            queryStr += ` AND p.category_id = $${params.length + 1}`;
            params.push(categoryId);
        }
        if (subCategoryId) {
            queryStr += ` AND p.sub_category_id = $${params.length + 1}`;
            params.push(subCategoryId);
        }
        queryStr += ' GROUP BY b.id';
    } else {
        // Default: All active brands
        queryStr = `
            SELECT b.*,
                   (SELECT COUNT(*) FROM products p WHERE p.brand_id = b.id AND p.is_active = true) as product_count
            FROM brands b 
            WHERE is_active = true
        `;
    }

    queryStr += ' ORDER BY b.name';

    const result = await query(queryStr, params);
    return result.rows;
}

// GET /api/brands?category_id=...&sub_category_id=...
export async function getBrands(searchParams) {
    try {
        const categoryId = searchParams?.get?.('category_id') || searchParams?.category_id;
        const subCategoryId = searchParams?.get?.('sub_category_id') || searchParams?.sub_category_id;

        const brands = await fetchBrands({ categoryId, subCategoryId });
        return sendResponse(brands);
    } catch (error) {
        console.error('Error fetching brands:', error);
        return sendResponse({ error: 'Failed to fetch brands' }, 500);
    }
}

// Helper to generate slug
const generateSlug = (name) => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

// POST /api/brands
export async function createBrand(data) {
    try {
        const { name, image_url, logo_url, category_id, sub_category_id } = data;
        if (!name) return sendResponse({ error: 'Name is required' }, 400);

        const slug = generateSlug(name);

        const result = await query(
            'INSERT INTO brands (name, slug, image_url, logo_url, category_id, sub_category_id, is_active) VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *',
            [name, slug, image_url, logo_url, category_id || null, sub_category_id || null]
        );
        return sendResponse(result.rows[0], 201);
    } catch (error) {
        console.error('Error creating brand:', error);
        // Handle duplicate slug error
        if (error.code === '23505') { // unique_violation
            return sendResponse({ error: 'Brand with this name already exists' }, 409);
        }
        return sendResponse({ error: 'Failed to create brand' }, 500);
    }
}

// PUT /api/brands/[id]
export async function updateBrand(id, data) {
    try {
        const { name, image_url, logo_url, category_id, sub_category_id, is_active } = data;
        const result = await query(
            `UPDATE brands 
       SET name = COALESCE($1, name), 
           image_url = COALESCE($2, image_url),
           logo_url = COALESCE($3, logo_url),
           category_id = COALESCE($4, category_id),
           sub_category_id = COALESCE($5, sub_category_id),
           is_active = COALESCE($6, is_active)
       WHERE id = $7 
       RETURNING *`,
            [name, image_url, logo_url, category_id || null, sub_category_id || null, is_active, id]
        );

        if (result.rows.length === 0) return sendResponse({ error: 'Brand not found' }, 404);
        return sendResponse(result.rows[0]);
    } catch (error) {
        console.error('Error updating brand:', error);
        return sendResponse({ error: 'Failed to update brand' }, 500);
    }
}

// DELETE /api/brands/[id]
export async function deleteBrand(id) {
    try {
        const result = await query('DELETE FROM brands WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) return sendResponse({ error: 'Brand not found' }, 404);
        return sendResponse({ success: true, message: 'Brand deleted' });
    } catch (error) {
        console.error('Error deleting brand:', error);
        return sendResponse({ error: 'Failed to delete brand' }, 500);
    }
}
