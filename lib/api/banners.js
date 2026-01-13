import { query } from '@/lib/simple-db';
import { NextResponse } from 'next/server';

const sendResponse = (data, status = 200) => {
    return NextResponse.json(data, { status });
};

export async function fetchBanners(options = {}) {
    const { activeOnly } = options;
    let sql = 'SELECT * FROM banners';
    const values = [];

    if (activeOnly) {
        sql += ' WHERE is_active = true';
    }

    sql += ' ORDER BY created_at ASC';

    const result = await query(sql, values);
    return result.rows;
}

export async function getBanners(params) {
    const activeOnly = params.get('activeOnly') === 'true';

    try {
        const banners = await fetchBanners({ activeOnly });
        return sendResponse(banners);
    } catch (error) {
        console.error('Error fetching banners:', error);
        return sendResponse({ error: 'Failed to fetch banners' }, 500);
    }
}

export async function createBanner(data) {
    const { title, desktop_image_url, mobile_image_url, link, display_order, is_active } = data;

    try {
        const result = await query(
            `INSERT INTO banners (title, desktop_image_url, mobile_image_url, link, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [title, desktop_image_url, mobile_image_url, link, display_order || 0, is_active ?? true]
        );
        return sendResponse(result.rows[0], 201);
    } catch (error) {
        console.error('Error creating banner:', error);
        return sendResponse({ error: 'Failed to create banner' }, 500);
    }
}

export async function updateBanner(id, data) {
    const { title, desktop_image_url, mobile_image_url, link, display_order, is_active } = data;

    try {
        const result = await query(
            `UPDATE banners 
       SET title = $1, desktop_image_url = $2, mobile_image_url = $3, link = $4, display_order = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
            [title, desktop_image_url, mobile_image_url, link, display_order, is_active, id]
        );

        if (result.rows.length === 0) {
            return sendResponse({ error: 'Banner not found' }, 404);
        }

        return sendResponse(result.rows[0]);
    } catch (error) {
        console.error('Error updating banner:', error);
        return sendResponse({ error: 'Failed to update banner' }, 500);
    }
}

export async function deleteBanner(id) {
    try {
        const result = await query('DELETE FROM banners WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return sendResponse({ error: 'Banner not found' }, 404);
        }
        return sendResponse({ success: true });
    } catch (error) {
        console.error('Error deleting banner:', error);
        return sendResponse({ error: 'Failed to delete banner' }, 500);
    }
}
