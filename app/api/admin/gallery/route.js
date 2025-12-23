import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
    try {
        const result = await query('SELECT * FROM gallery_albums ORDER BY display_order ASC, created_at DESC')
        return NextResponse.json(result.rows)
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req) {
    try {
        const body = await req.json()
        const { title, description, cover_image, type, display_order, is_active } = body

        // Simple slug generation
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);

        const result = await query(
            `INSERT INTO gallery_albums (title, slug, description, cover_image, type, display_order, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [title, slug, description, cover_image, type || 'photo', display_order || 0, is_active]
        )
        return NextResponse.json(result.rows[0])
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
