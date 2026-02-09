const { bulkUploadProducts } = require('../lib/api/products');

async function testDedup() {
    console.log('Testing deduplication logic in bulkUploadProducts...');

    // Mock data with duplicate handles and duplicate SKUs
    const mockData = [
        { product_name: 'Test P1', product_handle: 'h1', sku: 's1', mrp_price: 100 },
        { product_name: 'Test P1 Duplicate', product_handle: 'h1', sku: 's2', mrp_price: 200 }, // Same handle, diff SKU
        { product_name: 'Test P2', product_handle: 'h2', sku: 's3', mrp_price: 300 },
        { product_name: 'Test P2 Variation', product_handle: 'h3', sku: 's3', mrp_price: 400 }, // Diff handle, same SKU
    ];

    try {
        const results = await bulkUploadProducts(mockData);
        console.log('Upload Result:', JSON.stringify(results, null, 2));
    } catch (err) {
        console.error('Upload Failed:', err);
    }
}

testDedup();
