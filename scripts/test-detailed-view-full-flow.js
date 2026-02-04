const http = require('http');

const API_BASE = 'http://localhost:3000/api';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-admin-token-here';

let testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

const apiCall = (method, path, body = null) => {
    return new Promise((resolve, reject) => {
        const url = new URL(API_BASE + path);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname + url.search,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ADMIN_TOKEN}`
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    resolve(data);
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
};

const logTest = (name, passed, details = '') => {
    const result = { name, passed, details };
    testResults.tests.push(result);
    if (passed) {
        testResults.passed++;
        console.log(`✓ ${name}`);
    } else {
        testResults.failed++;
        console.log(`✗ ${name}`);
        if (details) console.log(`  Details: ${details}`);
    }
};

async function runTests() {
    console.log('\n=== DETAILED VIEW & UoM FULL FLOW TEST ===\n');

    try {
        // STEP 1: Create a test quotation with detailed view and UoM
        console.log('STEP 1: Create quotation with is_detailed=true and uom="Pair"');
        const createPayload = {
            customer_id: 1, // Use an existing customer ID
            status: 'Draft',
            items: [
                {
                    product_id: 1,
                    product_name: 'Test Product 1',
                    quantity: 5,
                    unit_price: 100,
                    mrp: 150,
                    dealer_price: 80,
                    discount: 0,
                    slug: 'test-product-1',
                    category_name: 'Sports',
                    sub_category_name: 'Cricket',
                    brand_name: 'Brand A',
                    short_description: 'High quality cricket bat for professionals',
                    image_url: '/placeholder.png',
                    is_detailed: true,  // IMPORTANT: This should be saved
                    uom: 'Pair'         // IMPORTANT: This should be saved
                },
                {
                    product_id: 2,
                    product_name: 'Test Product 2',
                    quantity: 10,
                    unit_price: 50,
                    mrp: 75,
                    dealer_price: 40,
                    discount: 0,
                    slug: 'test-product-2',
                    category_name: 'Sports',
                    sub_category_name: 'Tennis',
                    brand_name: 'Brand B',
                    short_description: '',
                    image_url: '/placeholder.png',
                    is_detailed: false,  // This should NOT show detailed view
                    uom: 'Dozen'         // Should be saved as Dozen
                }
            ],
            show_total: true,
            tax_rate: 18,
            additional_notes: 'Test quotation',
            terms_and_conditions: 'Standard terms'
        };

        const createRes = await apiCall('POST', '/admin/quotations', createPayload);
        const quotationId = createRes?.id;
        
        logTest('Create quotation with is_detailed and uom', quotationId > 0, `Quote ID: ${quotationId}`);

        // STEP 2: Fetch the quotation to verify is_detailed and UoM were saved
        console.log('\nSTEP 2: Verify saved quotation has is_detailed and uom');
        const getRes = await apiCall('GET', `/admin/quotations/${quotationId}`);
        
        if (getRes?.items?.length > 0) {
            const item1 = getRes.items[0];
            const item2 = getRes.items[1];

            logTest('Item 1 has is_detailed=true', item1.is_detailed === true || item1.is_detailed === 1, `Got: ${item1.is_detailed}`);
            logTest('Item 1 has uom="Pair"', item1.uom === 'Pair', `Got: ${item1.uom}`);
            logTest('Item 2 has is_detailed=false', item1.is_detailed !== true, `Got: ${item2.is_detailed}`);
            logTest('Item 2 has uom="Dozen"', item2.uom === 'Dozen', `Got: ${item2.uom}`);
        } else {
            logTest('Retrieve items', false, 'No items returned');
        }

        // STEP 3: Edit the quotation (toggle is_detailed and change uom)
        console.log('\nSTEP 3: Edit quotation - toggle is_detailed and change uom');
        const updatePayload = {
            status: 'Draft',
            items: [
                {
                    ...createPayload.items[0],
                    is_detailed: false,  // Toggle OFF
                    uom: 'Single'        // Change to Single
                },
                {
                    ...createPayload.items[1],
                    is_detailed: true,   // Toggle ON
                    uom: 'Set'           // Change to Set
                }
            ],
            show_total: true,
            tax_rate: 18,
            additional_notes: 'Updated test quotation',
            terms_and_conditions: 'Updated terms'
        };

        const updateRes = await apiCall('PUT', `/admin/quotations/${quotationId}`, updatePayload);
        logTest('Update quotation', updateRes?.id === quotationId, `Updated ID: ${updateRes?.id}`);

        // STEP 4: Verify the changes were persisted
        console.log('\nSTEP 4: Verify updated quotation has correct is_detailed and uom');
        const getRes2 = await apiCall('GET', `/admin/quotations/${quotationId}`);
        
        if (getRes2?.items?.length > 0) {
            const item1Updated = getRes2.items[0];
            const item2Updated = getRes2.items[1];

            logTest('Item 1 is_detailed toggled to false', item1Updated.is_detailed !== true, `Got: ${item1Updated.is_detailed}`);
            logTest('Item 1 uom changed to "Single"', item1Updated.uom === 'Single', `Got: ${item1Updated.uom}`);
            logTest('Item 2 is_detailed toggled to true', item2Updated.is_detailed === true || item2Updated.is_detailed === 1, `Got: ${item2Updated.is_detailed}`);
            logTest('Item 2 uom changed to "Set"', item2Updated.uom === 'Set', `Got: ${item2Updated.uom}`);
        } else {
            logTest('Retrieve updated items', false, 'No items returned');
        }

        // STEP 5: Save as Sent status with preserved is_detailed and uom
        console.log('\nSTEP 5: Save as Sent status');
        const sendPayload = {
            status: 'Sent',
            items: updatePayload.items,
            show_total: true,
            tax_rate: 18,
            additional_notes: 'Sent quotation',
            terms_and_conditions: 'Final terms'
        };

        const sendRes = await apiCall('PUT', `/admin/quotations/${quotationId}`, sendPayload);
        logTest('Update to Sent status', sendRes?.id === quotationId && sendRes?.status === 'Sent', `Status: ${sendRes?.status}`);

        // STEP 6: Re-edit after being sent to verify state preservation
        console.log('\nSTEP 6: Edit sent quotation and verify is_detailed and uom preserved');
        const getRes3 = await apiCall('GET', `/admin/quotations/${quotationId}`);
        
        if (getRes3?.items?.length > 0) {
            const item1AfterSend = getRes3.items[0];
            const item2AfterSend = getRes3.items[1];

            logTest('Item 1 is_detailed still false after send', item1AfterSend.is_detailed !== true, `Got: ${item1AfterSend.is_detailed}`);
            logTest('Item 1 uom still "Single" after send', item1AfterSend.uom === 'Single', `Got: ${item1AfterSend.uom}`);
            logTest('Item 2 is_detailed still true after send', item2AfterSend.is_detailed === true || item2AfterSend.is_detailed === 1, `Got: ${item2AfterSend.is_detailed}`);
            logTest('Item 2 uom still "Set" after send', item2AfterSend.uom === 'Set', `Got: ${item2AfterSend.uom}`);
        } else {
            logTest('Verify sent quotation items', false, 'No items returned');
        }

        // STEP 7: Final comprehensive test - edit sent quotation again
        console.log('\nSTEP 7: Edit sent quotation again with different values');
        const finalUpdatePayload = {
            status: 'Sent',
            items: [
                {
                    ...updatePayload.items[0],
                    is_detailed: true,   // Toggle back to true
                    uom: 'Box'           // Change to Box
                },
                {
                    ...updatePayload.items[1],
                    is_detailed: false,  // Toggle back to false
                    uom: 'Piece'         // Change to Piece
                }
            ],
            show_total: true,
            tax_rate: 18,
            additional_notes: 'Final update',
            terms_and_conditions: 'Final conditions'
        };

        const finalUpdateRes = await apiCall('PUT', `/admin/quotations/${quotationId}`, finalUpdatePayload);
        logTest('Final update quotation', finalUpdateRes?.id === quotationId, `Updated ID: ${finalUpdateRes?.id}`);

        // STEP 8: Final verification
        console.log('\nSTEP 8: Final verification of all changes');
        const getResFinal = await apiCall('GET', `/admin/quotations/${quotationId}`);
        
        if (getResFinal?.items?.length > 0) {
            const item1Final = getResFinal.items[0];
            const item2Final = getResFinal.items[1];

            logTest('Item 1 final is_detailed=true', item1Final.is_detailed === true || item1Final.is_detailed === 1, `Got: ${item1Final.is_detailed}`);
            logTest('Item 1 final uom="Box"', item1Final.uom === 'Box', `Got: ${item1Final.uom}`);
            logTest('Item 2 final is_detailed=false', item2Final.is_detailed !== true, `Got: ${item2Final.is_detailed}`);
            logTest('Item 2 final uom="Piece"', item2Final.uom === 'Piece', `Got: ${item2Final.uom}`);
        } else {
            logTest('Final verification items', false, 'No items returned');
        }

    } catch (error) {
        console.error('Test Error:', error);
        logTest('Overall execution', false, error.message);
    }

    // Print Summary
    console.log('\n=== TEST SUMMARY ===');
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(`Total: ${testResults.tests.length}`);
    
    if (testResults.failed === 0) {
        console.log('\n✓ All tests passed! Detailed View & UoM persistence is working correctly.');
    } else {
        console.log('\n✗ Some tests failed. Check the details above.');
    }
}

runTests().catch(console.error);
