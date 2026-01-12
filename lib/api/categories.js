import { query } from '@/lib/simple-db';
import { NextResponse } from 'next/server';

// Helper for sending responses
const sendResponse = (data, status = 200) => {
    return NextResponse.json(data, { status });
};

// GET /api/categories
export async function getCategories() {
    try {
        const result = await query(`
            SELECT c.*,
                   (SELECT COUNT(*) FROM sub_categories sc WHERE sc.category_id = c.id AND sc.is_active = true) as sub_category_count
            FROM categories c
            ORDER BY c.name
        `);
        return sendResponse(result.rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        return sendResponse({ error: 'Failed to fetch categories' }, 500);
    }
}

// Helper to slugify text
function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

// POST /api/categories
export async function createCategory(data) {
    try {
        const { name, image_url, parent_collection_id } = data;
        if (!name) return sendResponse({ error: 'Name is required' }, 400);

        const slug = slugify(name);

        const result = await query(
            'INSERT INTO categories (name, slug, image_url, parent_collection_id, is_active) VALUES ($1, $2, $3, $4, true) RETURNING *',
            [name, slug, image_url, parent_collection_id || null]
        );
        return sendResponse(result.rows[0], 201);
    } catch (error) {
        console.error('Error creating category:', error);
        // Handle duplicate slug error
        if (error.code === '23505') {
            return sendResponse({ error: 'Category with this name/slug already exists' }, 409);
        }
        return sendResponse({ error: 'Failed to create category' }, 500);
    }
}

// PUT /api/categories/[id]
export async function updateCategory(id, data) {
    try {
        const { name, image_url, is_active, parent_collection_id } = data;

        let slug = undefined;
        if (name) {
            slug = slugify(name);
        }

        const result = await query(
            `UPDATE categories 
       SET name = COALESCE($1, name), 
           slug = COALESCE($2, slug),
           image_url = COALESCE($3, image_url),
           is_active = COALESCE($4, is_active),
           parent_collection_id = COALESCE($5, parent_collection_id)
       WHERE id = $6 
       RETURNING *`,
            [name, slug, image_url, is_active, parent_collection_id, id]
        );

        if (result.rows.length === 0) return sendResponse({ error: 'Category not found' }, 404);
        return sendResponse(result.rows[0]);
    } catch (error) {
        console.error('Error updating category:', error);
        if (error.code === '23505') {
            return sendResponse({ error: 'Category with this name/slug already exists' }, 409);
        }
        return sendResponse({ error: 'Failed to update category' }, 500);
    }
}

// DELETE /api/categories/[id]
export async function deleteCategory(id) {
    try {
        const result = await query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) return sendResponse({ error: 'Category not found' }, 404);
        return sendResponse({ success: true, message: 'Category deleted' });
    } catch (error) {
        console.error('Error deleting category:', error);
        return sendResponse({ error: 'Failed to delete category. Check if it refers to existing products.' }, 500);
    }
}

// ============ SUB-CATEGORIES ============

// GET /api/sub-categories?categoryId=...
export async function getSubCategories(categoryId) {
    try {
        let queryStr = `
            SELECT sc.*, 
                   array_remove(array_agg(DISTINCT p.brand_id), NULL) as brand_ids,
                   (SELECT COUNT(DISTINCT brand_id) FROM products p WHERE p.sub_category_id = sc.id AND p.is_active = true) as brand_count
            FROM sub_categories sc
            LEFT JOIN products p ON p.sub_category_id = sc.id AND p.is_active = true
            WHERE sc.is_active = true
        `;
        const params = [];

        if (categoryId) {
            queryStr += ' AND sc.category_id = $1';
            params.push(categoryId);
        }

        queryStr += ' GROUP BY sc.id ORDER BY sc.name';

        const result = await query(queryStr, params);
        return sendResponse(result.rows);
    } catch (error) {
        console.error('Error fetching sub-categories:', error);
        return sendResponse({ error: 'Failed to fetch sub-categories' }, 500);
    }
}

// POST /api/sub-categories
export async function createSubCategory(data) {
    try {
        const { name, category_id, image_url } = data;
        if (!name || !category_id) return sendResponse({ error: 'Name and Category ID required' }, 400);

        const result = await query(
            'INSERT INTO sub_categories (name, category_id, image_url, is_active) VALUES ($1, $2, $3, true) RETURNING *',
            [name, category_id, image_url]
        );
        return sendResponse(result.rows[0], 201);
    } catch (error) {
        console.error('Error creating sub-category:', error);
        return sendResponse({ error: 'Failed to create sub-category' }, 500);
    }
}

// PUT /api/sub-categories/[id]
export async function updateSubCategory(id, data) {
    try {
        const { name, category_id, image_url, is_active } = data;
        const result = await query(
            `UPDATE sub_categories 
       SET name = COALESCE($1, name), 
           category_id = COALESCE($2, category_id),
           image_url = COALESCE($3, image_url),
           is_active = COALESCE($4, is_active)
       WHERE id = $5 
       RETURNING *`,
            [name, category_id, image_url, is_active, id]
        );

        if (result.rows.length === 0) return sendResponse({ error: 'Sub-category not found' }, 404);
        return sendResponse(result.rows[0]);
    } catch (error) {
        console.error('Error updating sub-category:', error);
        return sendResponse({ error: 'Failed to update sub-category' }, 500);
    }
}

// DELETE /api/sub-categories/[id]
export async function deleteSubCategory(id) {
    try {
        const result = await query('DELETE FROM sub_categories WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) return sendResponse({ error: 'Sub-category not found' }, 404);
        return sendResponse({ success: true, message: 'Sub-category deleted' });
    } catch (error) {
        console.error('Error deleting sub-category:', error);
        return sendResponse({ error: 'Failed to delete sub-category' }, 500);
    }
}
