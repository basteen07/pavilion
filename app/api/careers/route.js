import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { publicGetRateLimit } from '@/lib/rate-limit'

export async function GET(request) {
    try {
        // SECURITY: Rate limit public GET (100 per min per IP)
        const limited = publicGetRateLimit(request);
        if (limited) return limited;

        const result = await query('SELECT * FROM careers_jobs WHERE is_active = true ORDER BY display_order ASC, created_at DESC')
        return NextResponse.json(result.rows)
    } catch (error) {
        console.error('Careers API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
