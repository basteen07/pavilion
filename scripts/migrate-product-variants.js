/**
 * Migration script to create product_variants table and update products table
 * Run with: node scripts/migrate-product-variants.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();

    try {
        console.log('Starting product variants migration...\n');

        // Begin transaction
        await client.query('BEGIN');

        // 1. Add handle column to products table if not exists
        console.log('1. Adding handle column to products table...');
        await client.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS handle TEXT;
        `);
        console.log('   ✓ handle column added');

        // Create index on handle
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_products_handle ON products(handle);
        `);
        console.log('   ✓ handle index created');

        // 2. Create product_variants table
        console.log('\n2. Creating product_variants table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS product_variants (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                product_id UUID REFERENCES products(id) ON DELETE CASCADE,
                sku TEXT UNIQUE NOT NULL,
                size TEXT,
                color TEXT,
                option1_name TEXT,
                option1_value TEXT,
                option2_name TEXT,
                option2_value TEXT,
                option3_name TEXT,
                option3_value TEXT,
                mrp_price NUMERIC NOT NULL DEFAULT 0,
                dealer_price NUMERIC DEFAULT 0,
                counter_price NUMERIC DEFAULT 0,
                recommended_price NUMERIC DEFAULT 0,
                shop_price NUMERIC DEFAULT 0,
                inventory INTEGER DEFAULT 0,
                is_default BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('   ✓ product_variants table created');

        // 3. Create indexes on product_variants
        console.log('\n3. Creating indexes on product_variants...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
        `);
        console.log('   ✓ idx_variants_product created');

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
        `);
        console.log('   ✓ idx_variants_sku created');

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_variants_active ON product_variants(is_active);
        `);
        console.log('   ✓ idx_variants_active created');

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_variants_default ON product_variants(product_id, is_default);
        `);
        console.log('   ✓ idx_variants_default created');

        // 4. Migrate existing products to have a default variant
        console.log('\n4. Migrating existing products to have default variants...');

        // First, update handle for existing products (use slug as handle if not set)
        await client.query(`
            UPDATE products 
            SET handle = slug 
            WHERE handle IS NULL;
        `);
        console.log('   ✓ handle populated from slug');

        // Create default variant for each product that doesn't have one
        const result = await client.query(`
            INSERT INTO product_variants (
                product_id, sku, mrp_price, dealer_price, counter_price, 
                recommended_price, shop_price, inventory, is_default
            )
            SELECT 
                p.id, 
                p.sku, 
                COALESCE(p.mrp_price, 0), 
                COALESCE(p.dealer_price, 0), 
                COALESCE(p.counter_price, 0),
                COALESCE(p.recommended_price, 0), 
                COALESCE(p.shop_price, 0), 
                COALESCE(p.stock_quantity, 0),
                true
            FROM products p
            WHERE NOT EXISTS (
                SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id
            )
            ON CONFLICT (sku) DO NOTHING;
        `);
        console.log(`   ✓ ${result.rowCount} default variants created`);

        // Commit transaction
        await client.query('COMMIT');

        console.log('\n========================================');
        console.log('Migration completed successfully!');
        console.log('========================================');

        // Verify the migration
        const variantCount = await client.query('SELECT COUNT(*) FROM product_variants;');
        const productCount = await client.query('SELECT COUNT(*) FROM products;');

        console.log(`\nVerification:`);
        console.log(`  Products: ${productCount.rows[0].count}`);
        console.log(`  Variants: ${variantCount.rows[0].count}`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\n❌ Migration failed:', err.message);
        console.error(err.stack);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch(console.error);
