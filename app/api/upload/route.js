import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/simple-db';
import { uploadRateLimit } from '@/lib/rate-limit';

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

        const result = await query('SELECT id FROM users WHERE id = $1 AND is_active = true', [payload.userId]);
        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
        }
        const user = result.rows[0];

        // SECURITY: Rate limit uploads (20 per 10 min per user)
        const limited = uploadRateLimit(request, user.id);
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

        // Use Vercel Blob
        const blob = await put(file.name, file, {
            access: 'public',
            addRandomSuffix: true,
        });

        return NextResponse.json({
            url: blob.url,
            success: true,
            id: blob.url
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
