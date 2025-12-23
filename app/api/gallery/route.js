import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
    try {
        const result = await query('SELECT * FROM gallery_albums WHERE is_active = true ORDER BY display_order ASC, created_at DESC')
        return NextResponse.json(result.rows)
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
