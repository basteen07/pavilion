const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testRegistration() {
    console.log('--- STARTING REGISTRATION TEST ---');
    const testEmail = `test_wholesale_${Date.now()}@example.com`;
    const testCompany = `Test Company ${Date.now()}`;

    try {
        // 1. Simulate Registration (Mock API call logic)
        console.log(`1. Simulating registration for ${testEmail}...`);

        // Mock token generation
        const approvalToken = 'test_token_' + Math.random().toString(36).substring(7);

        // Find B2B role
        const roleRes = await pool.query("SELECT id FROM roles WHERE name = 'b2b_user'");
        const roleId = roleRes.rows[0].id;

        // Create User
        const userRes = await pool.query(
            "INSERT INTO users (email, password_hash, name, role_id, is_active) VALUES ($1, $2, $3, $4, false) RETURNING id",
            [testEmail, 'mock_hash', 'Test User', roleId]
        );
        const userId = userRes.rows[0].id;

        // Create B2B Customer with token
        const b2bRes = await pool.query(
            `INSERT INTO b2b_customers 
            (user_id, company_name, city, state, pincode, status, approval_token) 
            VALUES ($1, $2, $3, $4, $5, 'pending', $6) 
            RETURNING id, approval_token`,
            [userId, testCompany, 'Mumbai', 'Maharashtra', '400001', approvalToken]
        );

        console.log('✔ User and Customer created.');
        console.log('✔ Approval Token generated:', b2bRes.rows[0].approval_token);

        // 2. Verify Approval Link Generation
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const approvalLink = `${baseUrl}/admin/approve-customer?token=${approvalToken}`;
        console.log('2. Generated Approval Link:', approvalLink);

        // 3. Simulate Admin Approval (Mock POST /admin/approve-by-token)
        console.log('3. Simulating admin approval...');
        const discount = 15;

        // Update customer
        await pool.query(
            "UPDATE b2b_customers SET status = 'approved', discount_percentage = $1, approval_token = NULL WHERE approval_token = $2",
            [discount, approvalToken]
        );

        // Activate user
        await pool.query("UPDATE users SET is_active = true WHERE id = $1", [userId]);

        console.log('✔ Customer status updated to approved.');
        console.log('✔ User account activated.');
        console.log('✔ Approval token cleared.');

        // 4. Final verification
        const finalRes = await pool.query(
            "SELECT u.is_active, c.status, c.discount_percentage, c.approval_token FROM users u JOIN b2b_customers c ON u.id = c.user_id WHERE u.id = $1",
            [userId]
        );

        const result = finalRes.rows[0];
        console.log('\nFinal State:');
        console.log('- User Active:', result.is_active);
        console.log('- Customer Status:', result.status);
        console.log('- Discount %:', result.discount_percentage);
        console.log('- Token (should be null):', result.approval_token);

        if (result.is_active === true && result.status === 'approved' && result.approval_token === null) {
            console.log('\n✅ TEST PASSED SUCCESSFULLY!');
        } else {
            console.log('\n❌ TEST FAILED!');
        }

    } catch (err) {
        console.error('Test failed with error:', err);
    } finally {
        await pool.end();
    }
}

testRegistration();
