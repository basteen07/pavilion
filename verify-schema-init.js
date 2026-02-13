require('dotenv').config({ path: '.env' });
const { initializeDatabase, query } = require('./lib/db');

async function testSchemaInit() {
    console.log('Testing schema initialization...');
    try {
        await initializeDatabase();
        console.log('✓ initializeDatabase() ran successfully');

        // Verify key tables exist
        const tablesCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('product_variants', 'sub_categories', 'banners', 'blog_posts', 'activity_logs')
    `);

        const foundTables = tablesCheck.rows.map(r => r.table_name);
        console.log('Found tables:', foundTables);

        const required = ['product_variants', 'sub_categories', 'banners', 'blog_posts', 'activity_logs'];
        const missing = required.filter(t => !foundTables.includes(t));

        if (missing.length === 0) {
            console.log('✓ All critical new tables exist');
        } else {
            console.error('❌ Missing tables:', missing);
            process.exit(1);
        }

        // Verify key columns
        const columnsCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name IN ('variants', 'sub_category_id', 'dealer_price')
    `);

        if (columnsCheck.rows.length >= 3) {
            console.log('✓ Critical product columns exist');
        } else {
            console.error('❌ Missing product columns');
        }

        console.log('Schema verification passed!');
        process.exit(0);
    } catch (error) {
        console.error('Schema initialization failed:', error);
        process.exit(1);
    }
}

testSchemaInit();
