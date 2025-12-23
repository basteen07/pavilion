const fetch = require('node-fetch'); // Assuming node-fetch is available or using native fetch in modern Node
// Node 18+ has global fetch.

const BASE_URL = 'http://localhost:3000/api';

async function testAuth() {
    try {
        console.log('Testing Normal Registration...');
        const email = `test_normal_${Date.now()}@example.com`;
        const res = await fetch(`${BASE_URL}/register`, {
            method: 'POST',
            body: JSON.stringify({
                email,
                password: 'password123',
                name: 'Test Normal'
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        console.log('Register Response:', JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('Testing Login...');
            const loginRes = await fetch(`${BASE_URL}/login`, {
                method: 'POST',
                body: JSON.stringify({ email, password: 'password123' }),
                headers: { 'Content-Type': 'application/json' }
            });
            const loginData = await loginRes.json();
            console.log('Login Response:', JSON.stringify(loginData, null, 2));

            if (loginData.user && loginData.user.role === 'normal_user') {
                console.log('SUCCESS: User has correct role normal_user');
            } else {
                console.log('FAILURE: User role mismatch or missing');
            }
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

// Ensure server is running or this is a dry run script for logic verification.
// Currently I cannot run localhost:3000 unless the user has it running.
// If the user's dev server is not running, this will fail.
// I will just check DB directly via script if I can't hit API.
// But checking the API logic file modifications was the main goal.

console.log('To verify, please ensure dev server is running.');
// testAuth();
