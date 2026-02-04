// Quick test for is_detailed persistence
const API_URL = 'http://localhost:3000/api';

async function testDetailedViewSaving() {
  console.log('=== TESTING DETAILED VIEW SAVING ===\n');

  try {
    // Get admin token (you may need to set this)
    const adminToken = process.env.ADMIN_TOKEN || 'test-token';
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    };

    // STEP 1: Create a test quotation
    console.log('STEP 1: Creating test quotation with detailed view...');
    const createPayload = {
      customer_id: 1,
      status: 'Draft',
      items: [
        {
          product_id: 1,
          product_name: 'Test Cricket Bat',
          quantity: 2,
          unit_price: 500,
          mrp: 750,
          dealer_price: 400,
          discount: 0,
          slug: 'test-bat',
          category_name: 'Sports',
          sub_category_name: 'Cricket',
          brand_name: 'TestBrand',
          short_description: 'Test bat with detailed view',
          image_url: '/placeholder.png',
          is_detailed: true,  // IMPORTANT: Enable detailed view
          uom: 'Pair'
        }
      ],
      show_total: true,
      tax_rate: 18
    };

    const createResponse = await fetch(`${API_URL}/admin/quotations`, {
      method: 'POST',
      headers,
      body: JSON.stringify(createPayload)
    });

    const created = await createResponse.json();
    const quoteId = created.id;

    if (!quoteId) {
      console.log('ERROR: Failed to create quotation');
      console.log(created);
      return;
    }

    console.log(`✓ Created quotation ID: ${quoteId}`);
    console.log(`  Response is_detailed: ${created.items?.[0]?.is_detailed}`);

    // STEP 2: Fetch the quotation
    console.log('\nSTEP 2: Fetching quotation to verify save...');
    const fetchResponse = await fetch(`${API_URL}/admin/quotations/${quoteId}`, {
      headers
    });

    const fetched = await fetchResponse.json();
    console.log(`✓ Fetched quotation`);
    console.log(`  DB is_detailed: ${fetched.items?.[0]?.is_detailed}`);
    console.log(`  DB is_detailed type: ${typeof fetched.items?.[0]?.is_detailed}`);

    if (fetched.items?.[0]?.is_detailed !== true && fetched.items?.[0]?.is_detailed !== 1) {
      console.log(`\n⚠️  PROBLEM: is_detailed not saved properly!`);
      console.log(`   Expected: true or 1`);
      console.log(`   Got: ${fetched.items?.[0]?.is_detailed}`);
    } else {
      console.log(`\n✓ VERIFIED: is_detailed saved correctly`);
    }

    // STEP 3: Edit the quotation - toggle is_detailed OFF
    console.log('\nSTEP 3: Editing to toggle is_detailed to false...');
    const updatePayload = {
      status: 'Draft',
      items: [
        {
          ...createPayload.items[0],
          is_detailed: false  // Toggle to false
        }
      ],
      show_total: true,
      tax_rate: 18
    };

    const updateResponse = await fetch(`${API_URL}/admin/quotations/${quoteId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updatePayload)
    });

    const updated = await updateResponse.json();
    console.log(`✓ Updated quotation`);
    console.log(`  Response is_detailed: ${updated.items?.[0]?.is_detailed}`);

    // STEP 4: Fetch again to verify update
    console.log('\nSTEP 4: Fetching to verify update...');
    const fetchResponse2 = await fetch(`${API_URL}/admin/quotations/${quoteId}`, {
      headers
    });

    const fetched2 = await fetchResponse2.json();
    console.log(`✓ Fetched quotation again`);
    console.log(`  DB is_detailed: ${fetched2.items?.[0]?.is_detailed}`);

    if (fetched2.items?.[0]?.is_detailed === true || fetched2.items?.[0]?.is_detailed === 1) {
      console.log(`\n⚠️  PROBLEM: is_detailed didn't toggle to false!`);
      console.log(`   Expected: false or 0`);
      console.log(`   Got: ${fetched2.items?.[0]?.is_detailed}`);
    } else {
      console.log(`\n✓ VERIFIED: is_detailed toggled correctly to false`);
    }

    // STEP 5: Toggle back to true
    console.log('\nSTEP 5: Editing to toggle is_detailed back to true...');
    const updatePayload2 = {
      status: 'Draft',
      items: [
        {
          ...createPayload.items[0],
          is_detailed: true  // Toggle back to true
        }
      ],
      show_total: true,
      tax_rate: 18
    };

    const updateResponse2 = await fetch(`${API_URL}/admin/quotations/${quoteId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updatePayload2)
    });

    const updated2 = await updateResponse2.json();
    console.log(`✓ Updated quotation`);

    // STEP 6: Final fetch
    console.log('\nSTEP 6: Final verification...');
    const fetchResponse3 = await fetch(`${API_URL}/admin/quotations/${quoteId}`, {
      headers
    });

    const fetched3 = await fetchResponse3.json();
    console.log(`✓ Fetched quotation final`);
    console.log(`  DB is_detailed: ${fetched3.items?.[0]?.is_detailed}`);

    if (fetched3.items?.[0]?.is_detailed === true || fetched3.items?.[0]?.is_detailed === 1) {
      console.log(`\n✓ SUCCESS: is_detailed persists correctly through multiple edits!`);
    } else {
      console.log(`\n⚠️  PROBLEM: Final is_detailed value is: ${fetched3.items?.[0]?.is_detailed}`);
    }

    console.log('\n=== TEST COMPLETE ===');

  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testDetailedViewSaving();
