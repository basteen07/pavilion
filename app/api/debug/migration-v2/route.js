import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        console.log('Starting migration for multiple brands...');

        // 1. Check if brand_ids exists, if not, create it
        await query(`
            DO $$ 
            BEGIN 
                -- Add brand_ids column if it doesn't exist
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_tags' AND column_name='brand_ids') THEN
                    ALTER TABLE product_tags ADD COLUMN brand_ids JSONB DEFAULT '[]';
                END IF;
            END $$;
        `);

        // 2. Migrate existing data (brand_id -> brand_ids)
        // Check if brand_id column exists
        const checkBrandId = await query(`
            SELECT 1 FROM information_schema.columns WHERE table_name='product_tags' AND column_name='brand_id'
        `);

        if (checkBrandId.rows.length > 0) {
            console.log('Migrating data from brand_id to brand_ids...');
            await query(`
                UPDATE product_tags 
                SET brand_ids = jsonb_build_array(brand_id) 
                WHERE brand_id IS NOT NULL AND (brand_ids IS NULL OR jsonb_array_length(brand_ids) = 0);
            `);

            // 3. Drop brand_id column
            console.log('Dropping brand_id column...');
            await query(`ALTER TABLE product_tags DROP COLUMN brand_id`);
        }

        return NextResponse.json({ success: true, message: 'Migration to multiple brands completed successfully' });
    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
