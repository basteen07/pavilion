import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { adminRateLimit } from '@/lib/rate-limit';
import { verifyToken } from '@/lib/auth';

export async function GET(request, { params }) {
    try {
        // Rate limit
        const limited = adminRateLimit(request);
        if (limited) return limited;

        // Auth check
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'super_admin')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = params;

        // Fetch applications for this job
        const result = await query(
            `SELECT * FROM job_applications 
             WHERE job_id = $1 
             ORDER BY created_at DESC`,
            [id]
        );

        return NextResponse.json(result.rows);

    } catch (error) {
        console.error('Error fetching applications:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
