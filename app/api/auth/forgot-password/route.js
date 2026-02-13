import { NextResponse } from 'next/server';
import { query } from '@/lib/simple-db';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';
import { authRateLimit } from '@/lib/rate-limit';
import { forgotPasswordSchema, validateInput } from '@/lib/validators';

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
        // SECURITY: Rate limit password reset requests (5 per 15 min per IP)
        const limited = authRateLimit(request);
        if (limited) return handleCORS(limited);

        const body = await request.json();
        // SECURITY: Validate forgot-password input
        const validation = validateInput(body, forgotPasswordSchema);
        if (!validation.success) {
            return handleCORS(NextResponse.json({ error: validation.error }, { status: 400 }));
        }
        const { email } = validation.data;

        // Check if user exists (and is active)
        const result = await query(
            `SELECT id, name, email FROM users WHERE email = $1 AND is_active = true`,
            [email]
        );

        // If user doesn't exist, we still return success to prevent email enumeration
        // But for this internal app, maybe we act normally.
        // Let's stick to standard opaque response but log internally.
        if (result.rows.length === 0) {
            console.log(`[ForgotPassword] Request for non-existent or inactive email: ${email}`);
            // Return success anyway
            return handleCORS(NextResponse.json({
                success: true,
                message: 'If an account exists with this email, you will receive a password reset link.'
            }));
        }

        const user = result.rows[0];

        // Generate token
        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 3600000); // 1 hour from now

        // Store token in DB
        await query(
            `UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3`,
            [token, expiry, user.id]
        );

        // Send email
        await sendPasswordResetEmail(user.email, token, user.name);
        console.log(`[ForgotPassword] Reset link sent to ${user.email}`);

        return handleCORS(NextResponse.json({
            success: true,
            message: 'If an account exists with this email, you will receive a password reset link.'
        }));

    } catch (error) {
        console.error('Forgot password error:', error);
        return handleCORS(NextResponse.json({
            error: 'Internal server error',
            ...(process.env.NODE_ENV !== 'production' ? { message: error.message } : {})
        }, { status: 500 }));
    }
}
