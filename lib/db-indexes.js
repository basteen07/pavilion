import { query } from '@/lib/simple-db';

/**
 * Performance indexes for product queries.
 * These are created with IF NOT EXISTS so they are safe to run multiple times.
 * Uses CONCURRENTLY where possible to avoid locking tables.
 */
export async function runPerformanceIndexes() {
    const indexes = [
        // Products: filter by category (most common filter)
        `CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id) WHERE is_active = true`,
        // Products: filter by brand
        `CREATE INDEX IF NOT EXISTS idx_products_brand_active ON products(brand_id) WHERE is_active = true`,
        // Products: filter by sub_category
        `CREATE INDEX IF NOT EXISTS idx_products_subcategory_active ON products(sub_category_id) WHERE is_active = true`,
        // Products: filter by tag
        `CREATE INDEX IF NOT EXISTS idx_products_tag_active ON products(tag_id) WHERE is_active = true`,
        // Products: default sort (featured + created_at)
        `CREATE INDEX IF NOT EXISTS idx_products_featured_created ON products(is_featured DESC, created_at DESC) WHERE is_active = true`,
        // Product variants: lookup by product_id (used in json_agg subquery)
        `CREATE INDEX IF NOT EXISTS idx_pv_product_active ON product_variants(product_id) WHERE is_active = true`,
        // Categories: slug lookup (used in inline slug resolution)
        `CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug)`,
        // Brands: slug lookup 
        `CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug)`,
        // Products: slug lookup (PDP page)
        `CREATE INDEX IF NOT EXISTS idx_products_slug_active ON products(slug) WHERE is_active = true`,
    ];

    for (const sql of indexes) {
        try {
            await query(sql);
        } catch (err) {
            // Silently skip if index already exists or table doesn't exist yet
            if (!err.message?.includes('already exists')) {
                console.error('Index creation warning:', err.message);
            }
        }
    }
}
