/**
 * Comprehensive Schema Verification Script
 * Tests that initializeDatabase() creates all 37 tables with correct columns,
 * foreign keys, and indexes — matching the live production database exactly.
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ─── Expected Schema Definition ─────────────────────────────────────────────
const EXPECTED_TABLES = {
    // 1. Core Identity & Access
    roles: ['id', 'name', 'permissions', 'created_at'],
    permissions: ['id', 'name', 'description', 'created_at'],
    role_permissions: ['role_id', 'permission_id', 'created_at'],
    users: ['id', 'email', 'password_hash', 'name', 'phone', 'role', 'role_id', 'full_name', 'mfa_enabled', 'mfa_secret', 'is_active', 'last_active_at', 'password_reset_token', 'password_reset_expires', 'reset_token', 'reset_token_expiry', 'created_at'],
    sessions: ['id', 'user_id', 'token', 'expires_at', 'created_at'],

    // 2. Content Management
    cms_pages: ['id', 'title', 'slug', 'content', 'is_published', 'content_blocks', 'image_url', 'template', 'is_active', 'created_at', 'updated_at'],
    banners: ['id', 'title', 'desktop_image_url', 'mobile_image_url', 'link', 'display_order', 'is_active', 'created_at', 'updated_at'],
    homepage_banners: ['id', 'title', 'subtitle', 'image_url', 'cta_text', 'cta_link', 'display_order', 'is_active', 'created_at'],
    blog_posts: ['id', 'title', 'slug', 'excerpt', 'content', 'featured_image', 'author_id', 'is_published', 'published_at', 'meta_title', 'meta_description', 'image_url', 'is_active', 'tags', 'created_at', 'updated_at'],
    testimonials: ['id', 'customer_name', 'customer_photo', 'profession', 'rating', 'testimonial', 'is_featured', 'is_active', 'display_order', 'created_at', 'updated_at'],
    site_settings: ['id', 'meta_title', 'meta_description', 'head_scripts', 'body_scripts', 'google_analytics_id', 'updated_at'],
    system_settings: ['id', 'key', 'value', 'type', 'description', 'updated_at'],

    // 3. Product Catalog Hierarchy
    parent_collections: ['id', 'name', 'slug', 'image_desktop', 'image_mobile', 'is_active', 'created_at', 'updated_at'],
    categories: ['id', 'name', 'slug', 'description', 'parent_id', 'parent_collection_id', 'image_url', 'display_order', 'is_active', 'created_at', 'updated_at'],
    sub_categories: ['id', 'name', 'category_id', 'image_url', 'display_order', 'is_active', 'created_at', 'updated_at'],
    brands: ['id', 'name', 'slug', 'logo_url', 'description', 'image_url', 'category_id', 'sub_category_id', 'is_featured', 'is_active', 'display_order', 'created_at', 'updated_at'],
    product_tags: ['id', 'name', 'category_id', 'sub_category_id', 'brand_ids', 'display_order', 'is_active', 'created_at', 'updated_at'],

    // 4. Products & Variants
    products: ['id', 'sku', 'name', 'slug', 'handle', 'short_description', 'description', 'a_plus_content', 'category_id', 'sub_category_id', 'brand_id', 'tag_id', 'mrp_price', 'shop_price', 'dealer_price', 'counter_price', 'recommended_price', 'discount_percentage', 'size', 'color', 'option1_name', 'option1_value', 'option2_name', 'option2_value', 'option3_name', 'option3_value', 'option4_name', 'option4_value', 'stock_quantity', 'images', 'videos', 'variants', 'unit', 'unit_type', 'tax_class', 'hsn_code', 'gst_percentage', 'buy_url', 'is_featured', 'allow_quote', 'is_quote_hidden', 'is_discontinued', 'is_active', 'price_updated_at', 'mrp_updated_at', 'dealer_price_updated_at', 'counter_price_updated_at', 'recommended_price_updated_at', 'shop_price_updated_at', 'created_at', 'updated_at'],
    product_variants: ['id', 'product_id', 'sku', 'size', 'color', 'option1_name', 'option1_value', 'option2_name', 'option2_value', 'option3_name', 'option3_value', 'option4_name', 'option4_value', 'mrp_price', 'dealer_price', 'counter_price', 'recommended_price', 'shop_price', 'inventory', 'images', 'is_default', 'is_active', 'price_updated_at', 'mrp_updated_at', 'dealer_price_updated_at', 'counter_price_updated_at', 'recommended_price_updated_at', 'shop_price_updated_at', 'created_at', 'updated_at'],
    product_images: ['id', 'product_id', 'image_url', 'alt_text', 'display_order', 'is_primary'],

    // 5. Customers
    customer_types: ['id', 'name', 'discount_percentage', 'base_price_type', 'percentage', 'created_at'],
    customers: ['id', 'email', 'password_hash', 'company_name', 'name', 'contact_person', 'phone', 'gstin', 'gst_number', 'address', 'city', 'state', 'pincode', 'customer_type', 'customer_type_id', 'entity_type', 'display_name_type', 'type', 'discount_percentage', 'primary_contact_name', 'primary_contact_email', 'primary_contact_phone', 'contacts', 'is_approved', 'mfa_enabled', 'mfa_secret', 'is_active', 'created_at', 'updated_at'],
    customer_addresses: ['id', 'customer_id', 'address_type', 'address_line1', 'address_line2', 'city', 'state', 'pincode', 'country', 'is_default', 'created_at'],
    b2b_customers: ['id', 'user_id', 'company_name', 'gstin', 'business_type', 'address', 'city', 'state', 'pincode', 'status', 'approved_by', 'approved_at', 'discount_percentage', 'is_active', 'first_name', 'last_name', 'pan_number', 'address_line2', 'terms_and_conditions', 'admin_comments', 'approval_token', 'created_at', 'updated_at'],
    b2b_customer_events: ['id', 'customer_id', 'admin_id', 'event_type', 'description', 'metadata', 'created_at'],

    // 6. Quotations
    quotations: ['id', 'quotation_number', 'customer_id', 'created_by', 'total_amount', 'subtotal', 'tax', 'tax_rate', 'shipping_cost', 'discount_type', 'discount_value', 'show_total', 'status', 'notes', 'terms_conditions', 'customer_snapshot', 'reference_number', 'valid_until', 'created_at', 'updated_at'],
    quotation_items: ['id', 'quotation_id', 'product_id', 'product_name', 'slug', 'quantity', 'unit_price', 'line_total', 'total_price', 'mrp', 'dealer_price', 'recommended_price', 'discount', 'is_detailed', 'short_description', 'image_url', 'uom'],

    // 7. Orders
    orders: ['id', 'order_number', 'customer_id', 'total', 'subtotal', 'discount', 'tax', 'status', 'notes', 'products', 'fulfillment', 'edited_by', 'created_at', 'updated_at'],
    order_items: ['id', 'order_id', 'product_id', 'product_name', 'quantity', 'unit_price', 'discount_percentage', 'line_total', 'quantity_fulfilled', 'status'],
    order_comments: ['id', 'order_id', 'user_id', 'customer_id', 'comment', 'is_internal', 'created_at'],

    // 8. Careers
    careers_jobs: ['id', 'title', 'location', 'type', 'description', 'requirements', 'display_order', 'is_active', 'created_at', 'updated_at'],
    job_applications: ['id', 'job_id', 'full_name', 'email', 'phone', 'linkedin_url', 'portfolio_url', 'cover_letter', 'status', 'created_at', 'updated_at'],
    jobs: ['id', 'title', 'department', 'location', 'employment_type', 'description', 'requirements', 'salary_range', 'is_active', 'created_at', 'updated_at'],
    job_listings: ['id', 'title', 'slug', 'department', 'location', 'employment_type', 'description', 'is_active', 'created_at'],

    // 9. Gallery
    gallery_albums: ['id', 'title', 'slug', 'description', 'cover_image', 'type', 'display_order', 'is_active', 'created_at', 'updated_at'],
    gallery_items: ['id', 'album_id', 'type', 'url', 'thumbnail_url', 'caption', 'width', 'height', 'display_order', 'created_at'],

    // 10. System & Logs
    activity_logs: ['id', 'admin_id', 'customer_id', 'quotation_id', 'order_id', 'event_type', 'description', 'metadata', 'created_at'],
};

const EXPECTED_FOREIGN_KEYS = [
    { table: 'users', column: 'role_id', ref_table: 'roles', ref_column: 'id' },
    { table: 'sessions', column: 'user_id', ref_table: 'users', ref_column: 'id' },
    { table: 'role_permissions', column: 'role_id', ref_table: 'roles', ref_column: 'id' },
    { table: 'role_permissions', column: 'permission_id', ref_table: 'permissions', ref_column: 'id' },
    { table: 'blog_posts', column: 'author_id', ref_table: 'users', ref_column: 'id' },
    { table: 'categories', column: 'parent_id', ref_table: 'categories', ref_column: 'id' },
    { table: 'categories', column: 'parent_collection_id', ref_table: 'parent_collections', ref_column: 'id' },
    { table: 'sub_categories', column: 'category_id', ref_table: 'categories', ref_column: 'id' },
    { table: 'brands', column: 'category_id', ref_table: 'categories', ref_column: 'id' },
    { table: 'brands', column: 'sub_category_id', ref_table: 'sub_categories', ref_column: 'id' },
    { table: 'product_tags', column: 'category_id', ref_table: 'categories', ref_column: 'id' },
    { table: 'product_tags', column: 'sub_category_id', ref_table: 'sub_categories', ref_column: 'id' },
    { table: 'products', column: 'category_id', ref_table: 'categories', ref_column: 'id' },
    { table: 'products', column: 'sub_category_id', ref_table: 'sub_categories', ref_column: 'id' },
    { table: 'products', column: 'brand_id', ref_table: 'brands', ref_column: 'id' },
    { table: 'products', column: 'tag_id', ref_table: 'product_tags', ref_column: 'id' },
    { table: 'product_variants', column: 'product_id', ref_table: 'products', ref_column: 'id' },
    { table: 'product_images', column: 'product_id', ref_table: 'products', ref_column: 'id' },
    { table: 'customer_addresses', column: 'customer_id', ref_table: 'customers', ref_column: 'id' },
    { table: 'customers', column: 'customer_type_id', ref_table: 'customer_types', ref_column: 'id' },
    { table: 'b2b_customers', column: 'user_id', ref_table: 'users', ref_column: 'id' },
    { table: 'b2b_customers', column: 'approved_by', ref_table: 'users', ref_column: 'id' },
    { table: 'b2b_customer_events', column: 'customer_id', ref_table: 'b2b_customers', ref_column: 'id' },
    { table: 'b2b_customer_events', column: 'admin_id', ref_table: 'users', ref_column: 'id' },
    { table: 'quotations', column: 'customer_id', ref_table: 'customers', ref_column: 'id' },
    { table: 'quotations', column: 'created_by', ref_table: 'users', ref_column: 'id' },
    { table: 'quotation_items', column: 'quotation_id', ref_table: 'quotations', ref_column: 'id' },
    { table: 'quotation_items', column: 'product_id', ref_table: 'products', ref_column: 'id' },
    { table: 'orders', column: 'customer_id', ref_table: 'b2b_customers', ref_column: 'id' },
    { table: 'order_items', column: 'order_id', ref_table: 'orders', ref_column: 'id' },
    { table: 'order_items', column: 'product_id', ref_table: 'products', ref_column: 'id' },
    { table: 'order_comments', column: 'order_id', ref_table: 'orders', ref_column: 'id' },
    { table: 'order_comments', column: 'user_id', ref_table: 'users', ref_column: 'id' },
    { table: 'order_comments', column: 'customer_id', ref_table: 'customers', ref_column: 'id' },
    { table: 'job_applications', column: 'job_id', ref_table: 'careers_jobs', ref_column: 'id' },
    { table: 'gallery_items', column: 'album_id', ref_table: 'gallery_albums', ref_column: 'id' },
    { table: 'activity_logs', column: 'admin_id', ref_table: 'users', ref_column: 'id' },
    { table: 'activity_logs', column: 'customer_id', ref_table: 'customers', ref_column: 'id' },
    { table: 'activity_logs', column: 'quotation_id', ref_table: 'quotations', ref_column: 'id' },
    { table: 'activity_logs', column: 'order_id', ref_table: 'orders', ref_column: 'id' },
];

const EXPECTED_INDEXES = [
    'idx_products_category',
    'idx_products_brand',
    'idx_products_active',
    'idx_products_slug',
    'idx_product_variants_product',
    'idx_product_variants_sku',
    'idx_sub_categories_category',
    'idx_users_email',
    'idx_sessions_token',
    'idx_sessions_user',
    'idx_job_applications_job_id',
    'idx_orders_customer',
    'idx_order_items_order',
    'idx_quotation_items_quotation',
    'idx_activity_logs_event',
    'idx_customers_email',
];

// ─── Test Execution ──────────────────────────────────────────────────────────
const fs = require('fs');
let totalPass = 0;
let totalFail = 0;
const failures = [];
const output = [];

function log(msg) { output.push(msg); }
function pass(msg) { totalPass++; log(`  ✅ ${msg}`); }
function fail(msg) { totalFail++; failures.push(msg); log(`  ❌ ${msg}`); }

async function verifyTables() {
    log('\n══════════════════════════════════════════');
    log('  TEST 1: TABLE EXISTENCE (37 expected)');
    log('══════════════════════════════════════════');

    const res = await pool.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
    const dbTables = res.rows.map(r => r.table_name);
    const expectedNames = Object.keys(EXPECTED_TABLES).sort();

    for (const t of expectedNames) {
        if (dbTables.includes(t)) {
            pass(`Table "${t}" exists`);
        } else {
            fail(`Table "${t}" MISSING from database`);
        }
    }

    // Check for unexpected tables in DB not in our schema
    const extraTables = dbTables.filter(t => !expectedNames.includes(t));
    if (extraTables.length > 0) {
        log(`\n  ⚠️  Extra tables in DB not in db.js: ${extraTables.join(', ')}`);
    }

    log(`\n  Tables: ${expectedNames.length} expected, ${dbTables.length} in DB`);
}

async function verifyColumns() {
    log('\n══════════════════════════════════════════');
    log('  TEST 2: COLUMN VERIFICATION');
    log('══════════════════════════════════════════');

    for (const [table, expectedCols] of Object.entries(EXPECTED_TABLES)) {
        const res = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [table]);
        const dbCols = res.rows.map(r => r.column_name);

        if (dbCols.length === 0) {
            fail(`Table "${table}" — no columns found (table may not exist)`);
            continue;
        }

        const missingCols = expectedCols.filter(c => !dbCols.includes(c));
        const extraCols = dbCols.filter(c => !expectedCols.includes(c));

        if (missingCols.length === 0) {
            pass(`Table "${table}" — all ${expectedCols.length} columns present`);
        } else {
            fail(`Table "${table}" — MISSING columns: ${missingCols.join(', ')}`);
        }

        if (extraCols.length > 0) {
            log(`    ⚠️  Extra columns in DB: ${extraCols.join(', ')}`);
        }
    }
}

async function verifyForeignKeys() {
    log('\n══════════════════════════════════════════');
    log('  TEST 3: FOREIGN KEY CONSTRAINTS');
    log('══════════════════════════════════════════');

    const res = await pool.query(`
    SELECT 
      tc.table_name, 
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  `);

    const dbFks = res.rows.map(r => `${r.table_name}.${r.column_name}->${r.foreign_table_name}.${r.foreign_column_name}`);

    for (const fk of EXPECTED_FOREIGN_KEYS) {
        const key = `${fk.table}.${fk.column}->${fk.ref_table}.${fk.ref_column}`;
        if (dbFks.includes(key)) {
            pass(`FK: ${fk.table}.${fk.column} -> ${fk.ref_table}.${fk.ref_column}`);
        } else {
            fail(`FK MISSING: ${fk.table}.${fk.column} -> ${fk.ref_table}.${fk.ref_column}`);
        }
    }
}

async function verifyIndexes() {
    log('\n══════════════════════════════════════════');
    log('  TEST 4: INDEXES');
    log('══════════════════════════════════════════');

    const res = await pool.query(`
    SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
  `);
    const dbIndexes = res.rows.map(r => r.indexname);

    for (const idx of EXPECTED_INDEXES) {
        if (dbIndexes.includes(idx)) {
            pass(`Index "${idx}" exists`);
        } else {
            fail(`Index "${idx}" MISSING`);
        }
    }
}

async function main() {
    log('╔══════════════════════════════════════════════════╗');
    log('║    SCHEMA VERIFICATION — Full Test Suite        ║');
    log('║    Testing initializeDatabase() output          ║');
    log('╚══════════════════════════════════════════════════╝');

    try {
        await verifyTables();
        await verifyColumns();
        await verifyForeignKeys();
        await verifyIndexes();

        log('\n══════════════════════════════════════════');
        log('  FINAL RESULTS');
        log('══════════════════════════════════════════');
        log(`  ✅ Passed: ${totalPass}`);
        log(`  ❌ Failed: ${totalFail}`);
        log(`  Total:   ${totalPass + totalFail}`);

        if (failures.length > 0) {
            log('\n  ── FAILURES SUMMARY ──');
            failures.forEach(f => log(`  • ${f}`));
        }

        log(`\n  VERDICT: ${totalFail === 0 ? '🎉 ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'}`);
        log('');

        // Write results to file
        const report = output.join('\n');
        fs.writeFileSync('schema-test-results.txt', report, 'utf8');
        console.log(report);
        console.log('\nResults also saved to schema-test-results.txt');

        process.exit(totalFail === 0 ? 0 : 1);
    } catch (error) {
        console.error('Test execution error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
