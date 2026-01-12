import { query } from '@/lib/simple-db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Check products table columns
        const result = await query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'products'
            ORDER BY ordinal_position;
        `);

        return NextResponse.json({
            success: true,
            table: 'products',
            columns: result.rows
        });
    } catch (error) {
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
