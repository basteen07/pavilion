import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(req, { params }) {
    try {
        const { id } = params
        const result = await query('SELECT * FROM gallery_items WHERE album_id = $1 ORDER BY display_order ASC', [id])
        return NextResponse.json(result.rows)
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req, { params }) {
    try {
        const { id } = params // album_id
        const body = await req.json()
        const { type, url, thumbnail_url, caption, display_order, width, height } = body

        const result = await query(
            `INSERT INTO gallery_items (album_id, type, url, thumbnail_url, caption, display_order, width, height) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [id, type || 'image', url, thumbnail_url, caption, display_order || 0, width, height]
        )
        return NextResponse.json(result.rows[0])
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
