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

export async function POST() {
    try {
        const results = [];

        // 1. Products: Add price_updated_at
        try {
            await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMP`);
            results.push({ table: 'products', column: 'price_updated_at', status: 'checked/added' });
        } catch (e) {
            results.push({ table: 'products', column: 'price_updated_at', error: e.message });
        }

        // 2. B2B Customers: Add approved_by
        try {
            await query(`ALTER TABLE b2b_customers ADD COLUMN IF NOT EXISTS approved_by TEXT`);
            results.push({ table: 'b2b_customers', column: 'approved_by', status: 'checked/added' });
        } catch (e) {
            results.push({ table: 'b2b_customers', column: 'approved_by', error: e.message });
        }

        // 3. Orders: Add edited_by
        try {
            await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS edited_by TEXT`);
            results.push({ table: 'orders', column: 'edited_by', status: 'checked/added' });
        } catch (e) {
            results.push({ table: 'orders', column: 'edited_by', error: e.message });
        }

        return NextResponse.json({
            success: true,
            migrations: results
        });
    } catch (error) {
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
