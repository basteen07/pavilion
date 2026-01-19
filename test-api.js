const { getCustomerById } = require('./lib/api/customers');
require('dotenv').config();

async function test() {
    const id = 'fce30c59-6bd0-4377-a6f3-7fd694dda4de';
    try {
        const response = await getCustomerById(id);
        const data = await response.json();
        console.log('API Data:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Test failed:', err);
    }
}

test();
