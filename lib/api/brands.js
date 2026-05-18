import { query } from '@/lib/simple-db';
import { NextResponse } from 'next/server';

const sendResponse = (data, status = 200) => {
    return NextResponse.json(data, { status });
};

// Internal fetch function
export async function fetchBrands(options = {}) {
    const { categoryId, subCategoryId, tagId, hasProducts } = options;
    const params = [];
    let queryStr = `
        SELECT b.*, 
               c.name as category_name, 
               s.name as sub_category_name,
               (SELECT COUNT(*) FROM products p WHERE p.brand_id = b.id AND p.is_active = true) as product_count
        FROM brands b
        LEFT JOIN categories c ON b.category_id = c.id
        LEFT JOIN sub_categories s ON b.sub_category_id = s.id
        WHERE b.is_active = true
    `;

    if (hasProducts || tagId) {
        // Strict filtering: only brands that have active products in the specified category, sub-category, or tag context
        queryStr += ` AND EXISTS (
            SELECT 1 FROM products p
            WHERE p.brand_id = b.id AND p.is_active = true
        `;
        if (categoryId) {
            params.push(categoryId);
            queryStr += ` AND p.category_id = $${params.length}`;
        }
        if (subCategoryId) {
            params.push(subCategoryId);
            queryStr += ` AND p.sub_category_id = $${params.length}`;
        }
        if (tagId) {
            params.push(tagId);
            queryStr += ` AND p.tag_id = $${params.length}`;
        }
        queryStr += `)`;
    } else if (categoryId || subCategoryId) {
        // Fallback for admin or data entry pages: allow global brands (NULL category/subcategory)
        if (subCategoryId) {
            queryStr += ` AND (b.sub_category_id = $${params.length + 1} OR b.sub_category_id IS NULL)`;
            params.push(subCategoryId);
        } else if (categoryId) {
            queryStr += ` AND (b.category_id = $${params.length + 1} OR b.category_id IS NULL)`;
            params.push(categoryId);
        }
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
        const tagId = searchParams?.get?.('tag_id') || searchParams?.tag_id;
        const hasProducts = searchParams?.get?.('has_products') === 'true' || searchParams?.has_products === true;

        const brands = await fetchBrands({ categoryId, subCategoryId, tagId, hasProducts });
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
        const { name, image_url, logo_url } = data;
        if (!name) return sendResponse({ error: 'Name is required' }, 400);

        // Check if brand already exists (Case insensitive)
        const existing = await query('SELECT * FROM brands WHERE LOWER(name) = LOWER($1)', [name.trim()]);
        if (existing.rows.length > 0) {
            return sendResponse(existing.rows[0]); // Return existing instead of erroring
        }

        const slug = generateSlug(name);

        const result = await query(
            'INSERT INTO brands (name, slug, image_url, logo_url, is_active) VALUES ($1, $2, $3, $4, true) RETURNING *',
            [name.trim(), slug, image_url, logo_url]
        );
        return sendResponse(result.rows[0], 201);
    } catch (error) {
        console.error('Error creating brand:', error);
        // Handle duplicate slug error (fallback)
        if (error.code === '23505') { // unique_violation
            const existing = await query('SELECT * FROM brands WHERE LOWER(name) = LOWER($1) OR slug = $2', [name.trim(), generateSlug(name)]);
            if (existing.rows.length > 0) return sendResponse(existing.rows[0]);
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
