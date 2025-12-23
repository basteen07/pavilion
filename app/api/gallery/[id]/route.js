import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request, { params }) {
    try {
        const { id } = params
        const result = await query('SELECT * FROM gallery_items WHERE album_id = $1 ORDER BY display_order ASC', [id])
        return NextResponse.json(result.rows)
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
