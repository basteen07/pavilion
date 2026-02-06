/**
 * Performance optimization migration script
 * Adds indexes, views, and optimizations for 15,000+ products
 * Run with: node scripts/optimize-variant-performance.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    // Performance tuning
    max: 20,                     // Max connections
    idleTimeoutMillis: 30000,    // Close idle connections after 30s
    connectionTimeoutMillis: 5000 // Fail fast on connection issues
});

async function optimize() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting Performance Optimization...\n');
        await client.query('BEGIN');

        // 1. Add composite indexes for common queries
        console.log('1. Creating composite indexes...');

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_variants_product_active 
            ON product_variants(product_id, is_active);
        `);
        console.log('   ✓ idx_variants_product_active');

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_variants_product_default 
            ON product_variants(product_id, is_default) WHERE is_default = true;
        `);
        console.log('   ✓ idx_variants_product_default (partial)');

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_products_active_category 
            ON products(category_id, is_active) WHERE is_active = true;
        `);
        console.log('   ✓ idx_products_active_category (partial)');

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_products_active_brand 
            ON products(brand_id, is_active) WHERE is_active = true;
        `);
        console.log('   ✓ idx_products_active_brand (partial)');

        // 2. Create optimized view for product with default variant
        console.log('\n2. Creating optimized views...');

        await client.query(`
            CREATE OR REPLACE VIEW products_with_default_variant AS
            SELECT 
                p.id,
                p.sku as product_sku,
                p.name,
                p.slug,
                p.handle,
                p.short_description,
                p.description,
                p.category_id,
                p.brand_id,
                p.images,
                p.is_featured,
                p.is_active,
                p.hsn_code,
                p.gst_percentage,
                p.unit,
                c.name as category_name,
                b.name as brand_name,
                COALESCE(pv.sku, p.sku) as variant_sku,
                COALESCE(pv.mrp_price, p.mrp_price) as mrp_price,
                COALESCE(pv.dealer_price, p.dealer_price) as dealer_price,
                COALESCE(pv.counter_price, p.counter_price) as counter_price,
                COALESCE(pv.recommended_price, p.recommended_price) as recommended_price,
                COALESCE(pv.shop_price, p.shop_price) as shop_price,
                COALESCE(pv.inventory, p.stock_quantity) as stock_quantity,
                pv.size,
                pv.color,
                pv.option1_name,
                pv.option1_value,
                pv.option2_name,
                pv.option2_value,
                (SELECT COUNT(*) FROM product_variants WHERE product_id = p.id AND is_active = true) as variant_count
            FROM products p
            LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = true
            LEFT JOIN categories c ON c.id = p.category_id
            LEFT JOIN brands b ON b.id = p.brand_id
            WHERE p.is_active = true;
        `);
        console.log('   ✓ products_with_default_variant view');

        // 3. Create view for all variants of a product
        await client.query(`
            CREATE OR REPLACE VIEW product_all_variants AS
            SELECT 
                p.id as product_id,
                p.name as product_name,
                p.handle,
                p.images,
                pv.id as variant_id,
                pv.sku,
                pv.size,
                pv.color,
                pv.option1_name,
                pv.option1_value,
                pv.option2_name,
                pv.option2_value,
                pv.mrp_price,
                pv.dealer_price,
                pv.counter_price,
                pv.recommended_price,
                pv.shop_price,
                pv.inventory,
                pv.is_default,
                pv.is_active
            FROM products p
            INNER JOIN product_variants pv ON pv.product_id = p.id
            WHERE p.is_active = true AND pv.is_active = true
            ORDER BY p.name, pv.is_default DESC, pv.sku;
        `);
        console.log('   ✓ product_all_variants view');

        // 4. Add statistics for query planner
        console.log('\n3. Updating table statistics...');
        await client.query('ANALYZE products;');
        console.log('   ✓ products analyzed');
        await client.query('ANALYZE product_variants;');
        console.log('   ✓ product_variants analyzed');

        await client.query('COMMIT');

        // 5. Display performance stats
        console.log('\n========================================');
        console.log('Performance Optimization Complete!');
        console.log('========================================');

        const stats = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM products) as total_products,
                (SELECT COUNT(*) FROM product_variants) as total_variants,
                (SELECT COUNT(*) FROM products WHERE is_active = true) as active_products,
                (SELECT COUNT(*) FROM product_variants WHERE is_active = true) as active_variants
        `);

        console.log(`\nDatabase Stats:`);
        console.log(`  Total Products: ${stats.rows[0].total_products}`);
        console.log(`  Total Variants: ${stats.rows[0].total_variants}`);
        console.log(`  Active Products: ${stats.rows[0].active_products}`);
        console.log(`  Active Variants: ${stats.rows[0].active_variants}`);

        // Test query performance
        console.log(`\nQuery Performance Test:`);
        const start = Date.now();
        await client.query('SELECT * FROM products_with_default_variant LIMIT 100');
        console.log(`  100 products with variants: ${Date.now() - start}ms`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\n❌ Optimization failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

optimize().catch(console.error);
