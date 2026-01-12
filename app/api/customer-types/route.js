import { query } from '@/lib/simple-db';
import { NextResponse } from 'next/server';

// Initialize Table (Lazy migration)
const initTable = async () => {
    await query(`
        CREATE TABLE IF NOT EXISTS customer_types (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            discount_percentage NUMERIC DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    // Seed default types if empty
    const check = await query('SELECT count(*) FROM customer_types');
    if (parseInt(check.rows[0].count) === 0) {
        await query(`
            INSERT INTO customer_types (name, discount_percentage)
            VALUES ('Regular', 0), ('Enterprise', 10), ('Wholesale', 15)
        `);
    }
    // Ensure customers table has type column
    try {
        await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Regular'`);
    } catch (e) { console.error('Migration error:', e); }
};

export async function GET() {
    try {
        await initTable();
        const result = await query('SELECT * FROM customer_types ORDER BY id');
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching customer types:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await initTable();
        const { name, discount_percentage, id } = await req.json();

        if (id) {
            // Update
            const res = await query(
                'UPDATE customer_types SET name = $1, discount_percentage = $2 WHERE id = $3 RETURNING *',
                [name, discount_percentage, id]
            );
            return NextResponse.json(res.rows[0]);
        } else {
            // Create
            const res = await query(
                'INSERT INTO customer_types (name, discount_percentage) VALUES ($1, $2) RETURNING *',
                [name, discount_percentage]
            );
            return NextResponse.json(res.rows[0]);
        }
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        await query('DELETE FROM customer_types WHERE id = $1', [id]);
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
