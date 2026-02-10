import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/simple-db';

export async function POST(request) {
    console.log('Upload Request Received');
    try {
        // Simple authentication check
        const authHeader = request.headers.get('authorization');
        let user = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = await verifyToken(token);
            if (payload && payload.userId) {
                const result = await query('SELECT id FROM users WHERE id = $1 AND is_active = true', [payload.userId]);
                if (result.rows.length > 0) user = result.rows[0];
            }
        }

        console.log('Upload User:', user ? user.id : 'Unauthenticated');

        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            console.error('No file in formData');
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        console.log('File detected:', file.name, 'Size:', file.size, 'Type:', file.type);

        // Use Vercel Blob
        // Note: BLOB_READ_WRITE_TOKEN must be in .env
        const blob = await put(file.name, file, {
            access: 'public',
            addRandomSuffix: true,
        });

        console.log('Upload successful. URL:', blob.url);

        // Return object structure
        return NextResponse.json({
            url: blob.url,
            success: true,
            // We can return more metadata if needed
            id: blob.url // Using URL as ID for now or blob.pathname if needed
        });
    } catch (error) {
        console.error('Upload error details:', error);
        return NextResponse.json({ error: 'Upload failed', message: error.message }, { status: 500 });
    }
}
