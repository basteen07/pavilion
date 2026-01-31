import { NextResponse } from 'next/server';
import { query } from '@/lib/simple-db';
import { hashPassword } from '@/lib/auth';

// CORS helper
function handleCORS(response) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
}

export async function OPTIONS() {
    return handleCORS(new NextResponse(null, { status: 200 }));
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { token, password } = body;

        if (!token || !password) {
            return handleCORS(NextResponse.json({ error: 'Token and password are required' }, { status: 400 }));
        }

        // Verify token
        const result = await query(
            `SELECT id, email FROM users 
       WHERE reset_token = $1 
       AND reset_token_expiry > NOW() 
       AND is_active = true`,
            [token]
        );

        if (result.rows.length === 0) {
            return handleCORS(NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 }));
        }

        const user = result.rows[0];

        // Update password
        const hashedPassword = await hashPassword(password);

        // Update DB: set new password, clear reset token fields
        await query(
            `UPDATE users 
       SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL 
       WHERE id = $2`,
            [hashedPassword, user.id]
        );

        console.log(`[ResetPassword] Password reset successfully for user ${user.email} (ID: ${user.id})`);

        return handleCORS(NextResponse.json({
            success: true,
            message: 'Password has been reset successfully. You can now login.'
        }));

    } catch (error) {
        console.error('Reset password error:', error);
        return handleCORS(NextResponse.json({
            error: 'Internal server error',
            message: error.message
        }, { status: 500 }));
    }
}
