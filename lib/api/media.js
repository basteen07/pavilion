import { query } from '@/lib/simple-db';
import { NextResponse } from 'next/server';

const sendResponse = (data, status = 200) => {
    return NextResponse.json(data, { status });
};

// Folders every uploader in the app files into. Order = display order.
export const SYSTEM_FOLDERS = [
    ['products', 'Products'],
    ['product-variants', 'Product Variants'],
    ['categories', 'Categories'],
    ['collections', 'Collections'],
    ['brands', 'Brands'],
    ['banners', 'Banners'],
    ['blogs', 'Blogs'],
    ['gallery', 'Gallery'],
    ['pages', 'Pages & Content'],
    ['general', 'General'],
    ['customer-uploads', 'Customer Uploads'],
    ['imported', 'Imported (older uploads)']
];

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|svg|avif|bmp)$/i;

// Tables that never reference media (skipped by the "is this image used?" check)
const USAGE_SKIP_TABLES = ['media_library', 'media_folders', 'activity_logs', 'sessions'];

export const folderSlug = (name) => String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

// PERFORMANCE: create tables once per process
let tablesReady = false;
export async function ensureMediaTables() {
    if (tablesReady) return;
    await query(`
        CREATE TABLE IF NOT EXISTS media_folders (
            slug TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            is_system BOOLEAN NOT NULL DEFAULT false,
            sort_order INTEGER NOT NULL DEFAULT 1000,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await query(`
        CREATE TABLE IF NOT EXISTS media_library (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            url TEXT NOT NULL UNIQUE,
            pathname TEXT,
            file_name TEXT,
            folder TEXT NOT NULL DEFAULT 'general',
            mime_type TEXT,
            size_bytes BIGINT,
            alt TEXT,
            uploaded_by UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_media_library_folder ON media_library (folder, created_at DESC)`);
    await query(`
        INSERT INTO media_folders (slug, name, is_system, sort_order)
        SELECT slug, name, true, ord FROM unnest($1::text[], $2::text[]) WITH ORDINALITY AS f(slug, name, ord)
        ON CONFLICT (slug) DO UPDATE SET is_system = true, sort_order = EXCLUDED.sort_order
    `, [SYSTEM_FOLDERS.map(f => f[0]), SYSTEM_FOLDERS.map(f => f[1])]);
    tablesReady = true;
}

// Unknown folders fall back to "general" so uploaders can't create folders by accident
export async function resolveUploadFolder(folder) {
    await ensureMediaTables();
    const slug = folderSlug(folder);
    if (!slug) return 'general';
    const result = await query('SELECT slug FROM media_folders WHERE slug = $1', [slug]);
    return result.rows.length ? slug : 'general';
}

// Called by /api/upload after an image is stored
export async function recordUpload({ url, pathname, fileName, folder, mimeType, size, userId }) {
    await ensureMediaTables();
    const result = await query(`
        INSERT INTO media_library (url, pathname, file_name, folder, mime_type, size_bytes, uploaded_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (url) DO NOTHING
        RETURNING *
    `, [url, pathname, fileName, folder, mimeType, size, userId || null]);
    return result.rows[0] || null;
}

// GET /api/media/folders
export async function listFolders() {
    try {
        await ensureMediaTables();
        const [folders, total] = await Promise.all([
            query(`
                SELECT f.slug, f.name, f.is_system, COUNT(m.id)::int AS count
                FROM media_folders f
                LEFT JOIN media_library m ON m.folder = f.slug
                GROUP BY f.slug
                ORDER BY f.sort_order, f.name
            `),
            query('SELECT COUNT(*)::int AS count FROM media_library')
        ]);
        return sendResponse({ folders: folders.rows, total: total.rows[0].count });
    } catch (error) {
        console.error('Error listing media folders:', error);
        return sendResponse({ error: 'Failed to load folders' }, 500);
    }
}

// POST /api/media/folders { name }
export async function createFolder(data) {
    try {
        await ensureMediaTables();
        const name = String(data?.name || '').trim();
        const slug = folderSlug(name);
        if (!slug) return sendResponse({ error: 'Folder name is required' }, 400);
        const result = await query(
            'INSERT INTO media_folders (slug, name) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING RETURNING *',
            [slug, name.slice(0, 80)]
        );
        if (result.rows.length === 0) return sendResponse({ error: 'A folder with this name already exists' }, 409);
        return sendResponse({ ...result.rows[0], count: 0 }, 201);
    } catch (error) {
        console.error('Error creating media folder:', error);
        return sendResponse({ error: 'Failed to create folder' }, 500);
    }
}

// PUT /api/media/folders/:slug { name } - custom folders only (the slug stays the same)
export async function renameFolder(slug, data) {
    try {
        await ensureMediaTables();
        const name = String(data?.name || '').trim();
        if (!name) return sendResponse({ error: 'Folder name is required' }, 400);
        const result = await query(
            'UPDATE media_folders SET name = $2 WHERE slug = $1 AND is_system = false RETURNING *',
            [slug, name.slice(0, 80)]
        );
        if (result.rows.length === 0) return sendResponse({ error: 'Folder not found or cannot be renamed' }, 404);
        return sendResponse(result.rows[0]);
    } catch (error) {
        console.error('Error renaming media folder:', error);
        return sendResponse({ error: 'Failed to rename folder' }, 500);
    }
}

// DELETE /api/media/folders/:slug - custom folders only; its images move to "General" (nothing is deleted)
export async function deleteFolder(slug) {
    try {
        await ensureMediaTables();
        const folder = await query('SELECT is_system FROM media_folders WHERE slug = $1', [slug]);
        if (folder.rows.length === 0) return sendResponse({ error: 'Folder not found' }, 404);
        if (folder.rows[0].is_system) return sendResponse({ error: 'Built-in folders cannot be deleted' }, 400);
        const moved = await query(`UPDATE media_library SET folder = 'general' WHERE folder = $1`, [slug]);
        await query('DELETE FROM media_folders WHERE slug = $1', [slug]);
        return sendResponse({ success: true, moved_to_general: moved.rowCount });
    } catch (error) {
        console.error('Error deleting media folder:', error);
        return sendResponse({ error: 'Failed to delete folder' }, 500);
    }
}

// GET /api/media?folder=&search=&page=&limit=
export async function listMedia(searchParams) {
    try {
        await ensureMediaTables();
        const folder = searchParams.get('folder') || null;
        const search = searchParams.get('search')?.trim() || null;
        const page = Math.max(parseInt(searchParams.get('page') || '1') || 1, 1);
        const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '60') || 60, 1), 200);

        const result = await query(`
            SELECT id, url, pathname, file_name, folder, mime_type, size_bytes, alt, created_at,
                   COUNT(*) OVER() AS _total
            FROM media_library
            WHERE ($1::text IS NULL OR folder = $1)
              AND ($2::text IS NULL OR file_name ILIKE $2 OR alt ILIKE $2 OR url ILIKE $2)
            ORDER BY created_at DESC, id
            LIMIT $3 OFFSET $4
        `, [folder, search ? `%${search}%` : null, limit, (page - 1) * limit]);

        const total = result.rows.length ? parseInt(result.rows[0]._total) : 0;
        return sendResponse({
            items: result.rows.map(({ _total, ...item }) => item),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error listing media:', error);
        return sendResponse({ error: 'Failed to load images' }, 500);
    }
}

// POST /api/media/move { ids: [], folder }
export async function moveMedia(data) {
    try {
        await ensureMediaTables();
        const ids = Array.isArray(data?.ids) ? data.ids : [];
        if (ids.length === 0) return sendResponse({ error: 'No images selected' }, 400);
        const folder = await query('SELECT slug FROM media_folders WHERE slug = $1', [data?.folder]);
        if (folder.rows.length === 0) return sendResponse({ error: 'Folder not found' }, 404);
        const result = await query('UPDATE media_library SET folder = $2 WHERE id = ANY($1::uuid[])', [ids, data.folder]);
        return sendResponse({ success: true, moved: result.rowCount });
    } catch (error) {
        console.error('Error moving media:', error);
        return sendResponse({ error: 'Failed to move images' }, 500);
    }
}

// Tables whose rows contain this URL (products, variants, banners, blogs, ...)
async function findUsage(url) {
    const tables = await query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND NOT (table_name = ANY($1::text[]))
    `, [USAGE_SKIP_TABLES]);
    const usedIn = [];
    for (const { table_name } of tables.rows) {
        try {
            const hit = await query(`SELECT 1 FROM "${table_name.replace(/"/g, '""')}" t WHERE strpos(t::text, $1) > 0 LIMIT 1`, [url]);
            if (hit.rows.length) usedIn.push(table_name);
        } catch (err) {
            console.error(`Media usage check skipped ${table_name}:`, err.message);
        }
    }
    return usedIn;
}

// DELETE /api/media/:id - refuses while the image is still used anywhere
export async function deleteMedia(id) {
    try {
        await ensureMediaTables();
        const found = await query('SELECT * FROM media_library WHERE id = $1', [id]);
        if (found.rows.length === 0) return sendResponse({ error: 'Image not found' }, 404);
        const item = found.rows[0];

        const usedIn = await findUsage(item.url);
        if (usedIn.length > 0) {
            const where = usedIn.map(t => t.replace(/_/g, ' ')).join(', ');
            return sendResponse({ error: `This image is still used in: ${where}. Remove it there first.`, used_in: usedIn }, 409);
        }

        try {
            const { del } = await import('@vercel/blob');
            await del(item.url);
        } catch (err) {
            // Only files in our blob store can be deleted; a missing file is fine
            console.error('Blob delete failed (continuing):', err.message);
        }
        await query('DELETE FROM media_library WHERE id = $1', [id]);
        return sendResponse({ success: true, item });
    } catch (error) {
        console.error('Error deleting media:', error);
        return sendResponse({ error: 'Failed to delete image' }, 500);
    }
}

// POST /api/media/sync - adds images uploaded before the library existed (from Vercel Blob)
export async function syncFromBlob() {
    try {
        await ensureMediaTables();
        const { list } = await import('@vercel/blob');
        const folders = new Set((await query('SELECT slug FROM media_folders')).rows.map(r => r.slug));

        let cursor;
        let scanned = 0;
        const rows = [];
        do {
            const page = await list({ cursor, limit: 1000 });
            for (const blob of page.blobs) {
                scanned++;
                if (!IMAGE_EXTENSIONS.test(blob.pathname)) continue;
                const parts = blob.pathname.split('/');
                const prefix = parts.length > 1 ? parts[0] : null;
                rows.push({
                    url: blob.url,
                    pathname: blob.pathname,
                    file_name: parts[parts.length - 1],
                    folder: prefix && folders.has(prefix) ? prefix : 'imported',
                    size_bytes: blob.size ?? null,
                    created_at: blob.uploadedAt ? new Date(blob.uploadedAt).toISOString() : new Date().toISOString()
                });
            }
            cursor = page.hasMore ? page.cursor : undefined;
        } while (cursor);

        let imported = 0;
        for (let i = 0; i < rows.length; i += 1000) {
            const result = await query(`
                INSERT INTO media_library (url, pathname, file_name, folder, size_bytes, created_at)
                SELECT url, pathname, file_name, folder, size_bytes, created_at
                FROM jsonb_to_recordset($1::jsonb) AS x(url text, pathname text, file_name text, folder text, size_bytes bigint, created_at timestamptz)
                ON CONFLICT (url) DO NOTHING
            `, [JSON.stringify(rows.slice(i, i + 1000))]);
            imported += result.rowCount;
        }
        return sendResponse({ success: true, scanned, images: rows.length, imported });
    } catch (error) {
        console.error('Error syncing media from blob:', error);
        return sendResponse({ error: 'Failed to import existing uploads' }, 500);
    }
}
