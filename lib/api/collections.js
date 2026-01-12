import { query } from '@/lib/simple-db';
import { NextResponse } from 'next/server';

const sendResponse = (data, status = 200) => {
    return NextResponse.json(data, { status });
};

// Helper to generate slug
const generateSlug = (name) => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

// GET /api/collections
export async function getCollections(searchParams) {
    try {
        const result = await query(`
            SELECT pc.*, 
                   (SELECT COUNT(*) FROM categories c WHERE c.parent_collection_id = pc.id AND c.is_active = true) as category_count
            FROM parent_collections pc 
            WHERE pc.is_active = true 
            ORDER BY pc.created_at ASC
        `);
        return sendResponse(result.rows);
    } catch (error) {
        console.error('Error fetching collections:', error);
        return sendResponse({ error: 'Failed to fetch collections' }, 500);
    }
}

// POST /api/collections
export async function createCollection(data) {
    try {
        const { name, image_desktop, image_mobile } = data;
        if (!name) return sendResponse({ error: 'Name is required' }, 400);

        const slug = generateSlug(name);

        const result = await query(
            'INSERT INTO parent_collections (name, slug, image_desktop, image_mobile, is_active) VALUES ($1, $2, $3, $4, true) RETURNING *',
            [name, slug, image_desktop, image_mobile]
        );
        return sendResponse(result.rows[0], 201);
    } catch (error) {
        console.error('Error creating collection:', error);
        if (error.code === '23505') {
            return sendResponse({ error: 'Collection with this name already exists' }, 409);
        }
        return sendResponse({ error: 'Failed to create collection' }, 500);
    }
}

// PUT /api/collections/[id]
export async function updateCollection(id, data) {
    try {
        const { name, image_desktop, image_mobile, is_active } = data;

        // If name is updated, regenerate slug
        let slug = undefined;
        if (name) {
            slug = generateSlug(name);
        }

        const result = await query(
            `UPDATE parent_collections SET
                name = COALESCE($1, name),
                slug = COALESCE($2, slug),
                image_desktop = COALESCE($3, image_desktop),
                image_mobile = COALESCE($4, image_mobile),
                is_active = COALESCE($5, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *`,
            [name, slug, image_desktop, image_mobile, is_active, id]
        );

        if (result.rows.length === 0) {
            return sendResponse({ error: 'Collection not found' }, 404);
        }

        return sendResponse(result.rows[0]);
    } catch (error) {
        console.error('Error updating collection:', error);
        if (error.code === '23505') {
            return sendResponse({ error: 'Collection with this name already exists' }, 409);
        }
        return sendResponse({ error: 'Failed to update collection' }, 500);
    }
}

// DELETE /api/collections/[id]
export async function deleteCollection(id) {
    try {
        // Check if has categories?
        // Let's assume on delete set null or strict.
        // Schema said ON DELETE SET NULL.

        const result = await query('DELETE FROM parent_collections WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) return sendResponse({ error: 'Collection not found' }, 404);
        return sendResponse({ success: true, message: 'Collection deleted' });
    } catch (error) {
        console.error('Error deleting collection:', error);
        return sendResponse({ error: 'Failed to delete collection' }, 500);
    }
}
