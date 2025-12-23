import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function PUT(req, { params }) {
    try {
        const { id } = params
        const body = await req.json()
        const { title, location, type, description, requirements, display_order, is_active } = body

        const result = await query(
            `UPDATE careers_jobs 
             SET title = $1, location = $2, type = $3, description = $4, requirements = $5, display_order = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP
             WHERE id = $8 RETURNING *`,
            [title, location, type, description, requirements, display_order, is_active, id]
        )
        return NextResponse.json(result.rows[0])
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(req, { params }) {
    try {
        const { id } = params
        await query('DELETE FROM careers_jobs WHERE id = $1', [id])
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
