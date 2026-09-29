import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/simple-db';
import { uploadRateLimit } from '@/lib/rate-limit';
import { resolveUploadFolder, recordUpload } from '@/lib/api/media';

export async function POST(request) {
    try {
        // SECURITY: Require authentication for uploads
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const payload = await verifyToken(token);
        if (!payload || !payload.userId) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }

        const result = await query(
            `SELECT u.id, r.name AS role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id
             WHERE u.id = $1 AND u.is_active = true`,
            [payload.userId]
        );
        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
        }
        const user = result.rows[0];
        const isStaff = ['superadmin', 'admin', 'staff'].includes(user.role_name);

        // SECURITY: Rate limit uploads per user (per 10 min). Staff upload many product images at once.
        const limited = uploadRateLimit(request, user.id, isStaff ? 300 : 20);
        if (limited) return limited;

        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // SECURITY: Validate file size (max 10MB)
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
        }

        // SECURITY: Validate file type
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
            'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel', 'text/csv'];
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
        }

        // Images are filed into an Image Library folder (also used as the blob path prefix)
        const isImage = file.type.startsWith('image/');
        const folder = isImage
            ? await resolveUploadFolder(isStaff ? formData.get('folder') : 'customer-uploads').catch(() => 'general')
            : null;

        // Use Vercel Blob
        const blob = await put(folder ? `${folder}/${file.name}` : file.name, file, {
            access: 'public',
            addRandomSuffix: true,
        });

        let media = null;
        if (isImage) {
            try {
                media = await recordUpload({
                    url: blob.url,
                    pathname: blob.pathname,
                    fileName: file.name,
                    folder,
                    mimeType: file.type,
                    size: file.size,
                    userId: user.id
                });
            } catch (err) {
                // The file is uploaded; a library record failure must not fail the upload
                console.error('Media library record failed:', err.message);
            }
        }

        return NextResponse.json({
            url: blob.url,
            success: true,
            id: blob.url,
            media
        });
    } catch (error) {
        console.error('Upload error:', error);
        // SECURITY: Never expose error details in production
        return NextResponse.json({
            error: 'Upload failed',
            ...(process.env.NODE_ENV !== 'production' ? { message: error.message } : {})
        }, { status: 500 });
    }
}
