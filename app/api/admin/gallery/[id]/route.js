import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function PUT(req, { params }) {
    try {
        const { id } = params
        const body = await req.json()
        const { title, description, cover_image, type, display_order, is_active } = body

        const result = await query(
            `UPDATE gallery_albums 
             SET title = $1, description = $2, cover_image = $3, type = $4, display_order = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
             WHERE id = $7 RETURNING *`,
            [title, description, cover_image, type, display_order, is_active, id]
        )
        return NextResponse.json(result.rows[0])
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(req, { params }) {
    try {
        const { id } = params
        await query('DELETE FROM gallery_albums WHERE id = $1', [id])
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
