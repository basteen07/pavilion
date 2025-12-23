import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
    try {
        const result = await query('SELECT * FROM careers_jobs ORDER BY display_order ASC, created_at DESC')
        return NextResponse.json(result.rows)
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req) {
    try {
        const body = await req.json()
        const { title, location, type, description, requirements, display_order, is_active } = body

        // Validate
        if (!title || !description) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const result = await query(
            `INSERT INTO careers_jobs (title, location, type, description, requirements, display_order, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [title, location, type, description, requirements, display_order || 0, is_active]
        )
        return NextResponse.json(result.rows[0])
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
