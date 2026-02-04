const fetch = require('node-fetch');
const { Pool } = require('pg');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000/api';
const POOL = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runTest() {
    console.log('--- Starting System Logic Verification ---');

    // 1. Get Authentication Token (We need to simulate a login or just use DB access to get a user)
    // For simplicity, we'll try to use the API directly if public, but these are protected.
    // So we'll bypass auth logic by using a custom script that imports the library functions directly
    // imitating the API behavior but running in-process for speed and direct verification.

    // Actually, we can just use the DB to insert a temp user if needed, or bypass auth middleware
    // But better: Use the library functions directly like the API does.

    try {
        const { createQuotation, updateQuotation, getQuotationById } = require('./lib/api/quotations.js');
        const { getProducts } = require('./lib/api/products.js');
        const { getCustomers } = require('./lib/api/customers.js');

        // Setup: Get Customer and Product
        console.log('Setting up test data...');
        const custRes = await getCustomers(new URLSearchParams('limit=1'));
        if (!custRes.customers || custRes.customers.length === 0) throw new Error('No customers found');
        const customer = custRes.customers[0];

        const prodRes = await getProducts(new URLSearchParams('limit=1'));
        if (!prodRes.products || prodRes.products.length === 0) throw new Error('No products found');
        const product = prodRes.products[0];

        console.log(`Using Customer: ${customer.id}`);
        console.log(`Using Product: ${product.id}`);

        // --- STEP 1: CREATE ---
        console.log('\n--- STEP 1: Create Quotation with is_detailed=true ---');
        const createPayload = {
            customer_id: customer.id,
            status: 'Draft',
            items: [{
                product_id: product.id,
                product_name: product.name,
                quantity: 1,
                unit_price: 100,
                mrp: 100,
                dealer_price: 80,
                is_detailed: true, // EXPLICIT TRUE
                short_description: 'Detailed View Active'
            }],
            valid_until: new Date().toISOString()
        };

        let created = await createQuotation(createPayload, null); // adminId null
        if (created.error) throw new Error(`Create failed: ${created.error}`);
        // Handle NextResponse vs raw object depending on how createQuotation returns. 
        // The file returns sendResponse which is NextResponse.json. 
        // This makes testing library functions directly hard because they return a Response object.

        // Let's re-verify the file content. Yes, it returns NextResponse.
        // So we need to parse the JSON.
        created = await created.json();

        const quoteId = created.id;
        console.log(`Created Quotation ID: ${quoteId}`);
        console.log(`Created Item is_detailed: ${created.items[0].is_detailed}`);

        if (created.items[0].is_detailed !== true) console.error('FAIL: Creation did not persist is_detailed=true');
        else console.log('PASS: Creation persistence');

        // --- STEP 2: FETCH ---
        console.log('\n--- STEP 2: Fetch Quotation ---');
        let fetchedRes = await getQuotationById(quoteId);
        let fetched = await fetchedRes.json();
        console.log(`Fetched Item is_detailed: ${fetched.items[0].is_detailed}`);

        if (fetched.items[0].is_detailed !== true) console.error('FAIL: Fetch did not return is_detailed=true');
        else console.log('PASS: Fetch persistence');

        // --- STEP 3: UPDATE (Keep True) ---
        console.log('\n--- STEP 3: Update Quotation (Keep is_detailed=true) ---');
        const updatePayload1 = {
            ...fetched,
            items: [{
                ...fetched.items[0],
                is_detailed: true // Explicitly True again
            }]
        };
        let updatedRes1 = await updateQuotation(quoteId, updatePayload1, null);
        let updated1 = await updatedRes1.json();

        // Re-fetch to be sure
        fetchedRes = await getQuotationById(quoteId);
        fetched = await fetchedRes.json();
        console.log(`Updated(1) Item is_detailed: ${fetched.items[0].is_detailed}`);
        if (fetched.items[0].is_detailed !== true) console.error('FAIL: Update did not persist is_detailed=true');
        else console.log('PASS: Update persistence (true)');

        // --- STEP 4: UPDATE (Flip to False) ---
        console.log('\n--- STEP 4: Update Quotation (Flip to False) ---');
        const updatePayload2 = {
            ...fetched,
            items: [{
                ...fetched.items[0],
                is_detailed: false // Explicitly False
            }]
        };
        let updatedRes2 = await updateQuotation(quoteId, updatePayload2, null);

        // Re-fetch
        fetchedRes = await getQuotationById(quoteId);
        fetched = await fetchedRes.json();
        console.log(`Updated(2) Item is_detailed: ${fetched.items[0].is_detailed}`);
        if (fetched.items[0].is_detailed !== false) console.error('FAIL: Update did not persist is_detailed=false');
        else console.log('PASS: Update persistence (false)');

        // Cleanup
        await POOL.query('DELETE FROM quotations WHERE id = $1', [quoteId]);
        console.log('\nCleaned up.');

    } catch (e) {
        console.error('TEST ERROR:', e);
    } finally {
        POOL.end();
    }
}

runTest();
