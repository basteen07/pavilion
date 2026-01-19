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

            ORDER BY c.display_order ASC, c.name ASC
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
        const { name, image_url, parent_collection_id, display_order } = data;
        if (!name) return sendResponse({ error: 'Name is required' }, 400);

        const slug = slugify(name);

        const result = await query(
            'INSERT INTO categories (name, slug, image_url, parent_collection_id, display_order, is_active) VALUES ($1, $2, $3, $4, $5, true) RETURNING *',
            [name, slug, image_url, parent_collection_id || null, display_order || 0]
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
        const { name, image_url, is_active, parent_collection_id, display_order } = data;

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
           parent_collection_id = COALESCE($5, parent_collection_id),
           display_order = COALESCE($6, display_order)
       WHERE id = $7 
       RETURNING *`,
            [name, slug, image_url, is_active, parent_collection_id, display_order, id]
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

        queryStr += ' GROUP BY sc.id ORDER BY sc.display_order ASC, sc.name ASC';

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
        const { name, category_id, image_url, display_order } = data;
        if (!name || !category_id) return sendResponse({ error: 'Name and Category ID required' }, 400);

        const result = await query(
            'INSERT INTO sub_categories (name, category_id, image_url, display_order, is_active) VALUES ($1, $2, $3, $4, true) RETURNING *',
            [name, category_id, image_url, display_order || 0]
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
        const { name, category_id, image_url, is_active, display_order } = data;
        const result = await query(
            `UPDATE sub_categories 
       SET name = COALESCE($1, name), 
           category_id = COALESCE($2, category_id),
           image_url = COALESCE($3, image_url),
           is_active = COALESCE($4, is_active),
           display_order = COALESCE($5, display_order)
       WHERE id = $6 
       RETURNING *`,
            [name, category_id, image_url, is_active, display_order, id]
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

// ============ TAGS (CHILD CATEGORIES) ============

// GET /api/tags?subCategoryId=...
// GET /api/tags?subCategoryId=...
export async function getTags(subCategoryId) {
    try {
        let queryStr = 'SELECT * FROM product_tags WHERE is_active = true';
        const params = [];

        if (subCategoryId) {
            queryStr += ' AND sub_category_id = $1';
            params.push(subCategoryId);
        }

        queryStr += ' ORDER BY display_order ASC, name ASC';

        const result = await query(queryStr, params);
        return sendResponse(result.rows);
    } catch (error) {
        console.error('Error fetching tags:', error);
        return sendResponse({ error: 'Failed to fetch tags' }, 500);
    }
}

// POST /api/tags
// POST /api/tags
export async function createTag(data) {
    try {
        const { name, category_id, sub_category_id, brand_ids, display_order } = data;
        if (!name || !sub_category_id) return sendResponse({ error: 'Name and Sub-Category ID required' }, 400);

        const result = await query(
            'INSERT INTO product_tags (name, category_id, sub_category_id, brand_ids, display_order, is_active) VALUES ($1, $2, $3, $4, $5, true) RETURNING *',
            [name, category_id || null, sub_category_id, JSON.stringify(brand_ids || []), display_order || 0]
        );
        return sendResponse(result.rows[0], 201);
    } catch (error) {
        console.error('Error creating tag:', error);
        return sendResponse({ error: 'Failed to create tag' }, 500);
    }
}

// PUT /api/tags/[id]
// PUT /api/tags/[id]
export async function updateTag(id, data) {
    try {
        const { name, category_id, sub_category_id, brand_ids, is_active, display_order } = data;
        const result = await query(
            `UPDATE product_tags 
       SET name = COALESCE($1, name), 
           category_id = COALESCE($2, category_id),
           sub_category_id = COALESCE($3, sub_category_id),
           brand_ids = COALESCE($4, brand_ids),
           is_active = COALESCE($5, is_active),
           display_order = COALESCE($6, display_order)
       WHERE id = $7 
       RETURNING *`,
            [name, category_id, sub_category_id, brand_ids ? JSON.stringify(brand_ids) : null, is_active, display_order, id]
        );

        if (result.rows.length === 0) return sendResponse({ error: 'Tag not found' }, 404);
        return sendResponse(result.rows[0]);
    } catch (error) {
        console.error('Error updating tag:', error);
        return sendResponse({ error: 'Failed to update tag' }, 500);
    }
}

// DELETE /api/tags/[id]
export async function deleteTag(id) {
    try {
        const result = await query('DELETE FROM product_tags WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) return sendResponse({ error: 'Tag not found' }, 404);
        return sendResponse({ success: true, message: 'Tag deleted' });
    } catch (error) {
        console.error('Error deleting tag:', error);
        return sendResponse({ error: 'Failed to delete tag' }, 500);
    }
}
