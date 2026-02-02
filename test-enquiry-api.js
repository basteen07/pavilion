
const axios = require('axios');

async function testEnquiryAPI() {
    const payload = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        message: 'This is a test enquiry for verification.',
        product: {
            name: 'Test Product',
            sku: 'TEST-SKU',
            selling_price: 1000,
            mrp_price: 1200
        }
    };

    try {
        console.log('Testing Enquiry API...');
        // Note: Replace with actual base URL if necessary
        const response = await fetch('http://localhost:3000/api/enquiry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', data);

        if (data.success) {
            console.log('SUCCESS: enquiry API is working.');
        } else {
            console.log('FAILED: enquiry API returned error.');
        }
    } catch (error) {
        console.error('ERROR: Could not reach the API. Is the server running?', error.message);
    }
}

testEnquiryAPI();
