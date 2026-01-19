import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // 1. Add display_order to sub_categories
        await query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sub_categories' AND column_name='display_order') THEN
                    ALTER TABLE sub_categories ADD COLUMN display_order INT DEFAULT 0;
                END IF;
            END $$;
        `);

        // 2. Add display_order to product_tags
        await query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_tags' AND column_name='display_order') THEN
                    ALTER TABLE product_tags ADD COLUMN display_order INT DEFAULT 0;
                END IF;
            END $$;
        `);

        // 3. Ensure categories has display_order (it should, but just in case)
        await query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='display_order') THEN
                    ALTER TABLE categories ADD COLUMN display_order INT DEFAULT 0;
                END IF;
            END $$;
        `);

        return NextResponse.json({ success: true, message: 'Migration for display_order completed' });
    } catch (error) {
        console.error('Migration failed:', error);
        return NextResponse.json({ error: error.message }, 500);
    }
}
