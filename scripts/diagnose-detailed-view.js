// Direct database diagnostic for is_detailed field
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/pavilion'
});

async function diagnoseDetailedView() {
  console.log('=== DETAILED VIEW DIAGNOSTIC ===\n');

  try {
    // 1. Check column exists and data type
    console.log('1. Checking is_detailed column...');
    const colRes = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'quotation_items' AND column_name = 'is_detailed'
    `);
    
    if (colRes.rows.length === 0) {
      console.log('   ⚠️  PROBLEM: is_detailed column does not exist!');
      return;
    }
    
    const col = colRes.rows[0];
    console.log(`   ✓ Column exists: ${col.column_name}`);
    console.log(`   ✓ Data type: ${col.data_type}`);
    console.log(`   ✓ Nullable: ${col.is_nullable}`);

    // 2. Check for NULL values
    console.log('\n2. Checking for NULL is_detailed values...');
    const nullRes = await pool.query(`
      SELECT COUNT(*) as null_count
      FROM quotation_items
      WHERE is_detailed IS NULL
    `);
    console.log(`   ${nullRes.rows[0].null_count} items have NULL is_detailed`);

    // 3. Check data distribution
    console.log('\n3. Checking is_detailed value distribution...');
    const distRes = await pool.query(`
      SELECT is_detailed, COUNT(*) as count
      FROM quotation_items
      GROUP BY is_detailed
      ORDER BY is_detailed
    `);
    
    distRes.rows.forEach(row => {
      console.log(`   is_detailed=${row.is_detailed}: ${row.count} items`);
    });

    // 4. Get recent quotations with their items
    console.log('\n4. Recent quotations with detailed view items...');
    const recentRes = await pool.query(`
      SELECT 
        q.id,
        q.quotation_number,
        q.status,
        COUNT(qi.id) as item_count,
        SUM(CASE WHEN qi.is_detailed = true THEN 1 ELSE 0 END) as detailed_items
      FROM quotations q
      LEFT JOIN quotation_items qi ON q.id = qi.quotation_id
      WHERE q.created_at > NOW() - INTERVAL '7 days'
      GROUP BY q.id, q.quotation_number, q.status
      ORDER BY q.created_at DESC
      LIMIT 10
    `);

    recentRes.rows.forEach(row => {
      console.log(`   Quotation ${row.quotation_number} (${row.status}): ${row.item_count} items, ${row.detailed_items} detailed`);
    });

    // 5. Show sample items
    console.log('\n5. Sample quotation items with is_detailed...');
    const sampleRes = await pool.query(`
      SELECT 
        qi.id,
        qi.product_name,
        qi.is_detailed,
        qi.uom,
        q.quotation_number,
        q.status
      FROM quotation_items qi
      JOIN quotations q ON qi.quotation_id = q.id
      WHERE q.created_at > NOW() - INTERVAL '7 days'
      ORDER BY qi.id DESC
      LIMIT 15
    `);

    sampleRes.rows.forEach(row => {
      console.log(`   ${row.quotation_number}/${row.product_name}: is_detailed=${row.is_detailed}, uom=${row.uom}`);
    });

    // 6. Check for any constraint issues
    console.log('\n6. Checking constraints...');
    const constraintRes = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'quotation_items'
    `);

    constraintRes.rows.forEach(row => {
      console.log(`   ${row.constraint_type}: ${row.constraint_name}`);
    });

    // 7. Test INSERT with is_detailed
    console.log('\n7. Testing INSERT with is_detailed=true...');
    try {
      const testRes = await pool.query(`
        INSERT INTO quotation_items (
          quotation_id, product_id, product_name, quantity, unit_price,
          total_price, line_total, is_detailed, uom
        ) VALUES (
          (SELECT id FROM quotations LIMIT 1),
          999,
          'TEST-DETAILED-VIEW-PRODUCT',
          1,
          100,
          100,
          100,
          true,
          'Test'
        ) RETURNING id, product_name, is_detailed, uom
      `);

      if (testRes.rows.length > 0) {
        const inserted = testRes.rows[0];
        console.log(`   ✓ Inserted test item: ${inserted.product_name}`);
        console.log(`   ✓ is_detailed=${inserted.is_detailed} (type: ${typeof inserted.is_detailed})`);
        console.log(`   ✓ uom=${inserted.uom}`);

        // Try to fetch it back
        const fetchRes = await pool.query(`
          SELECT is_detailed, uom
          FROM quotation_items
          WHERE id = $1
        `, [inserted.id]);

        if (fetchRes.rows.length > 0) {
          const fetched = fetchRes.rows[0];
          console.log(`   ✓ Fetched back: is_detailed=${fetched.is_detailed}, uom=${fetched.uom}`);
        }

        // Clean up
        await pool.query(`DELETE FROM quotation_items WHERE id = $1`, [inserted.id]);
      }
    } catch (testErr) {
      console.log(`   ✗ Test insert failed: ${testErr.message}`);
    }

    console.log('\n=== DIAGNOSTIC COMPLETE ===');

  } catch (error) {
    console.error('Diagnostic error:', error);
  } finally {
    await pool.end();
  }
}

diagnoseDetailedView();
