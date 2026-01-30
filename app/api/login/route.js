import { NextResponse } from 'next/server';
import { query } from '@/lib/simple-db';
import { hashPassword, verifyPassword, createToken, verifyToken, generateMFASecret, generateQRCode, verifyTOTP } from '@/lib/auth';

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
    console.log('Login endpoint called');
    const body = await request.json();
    const { email, password, mfa_code } = body;

    if (!email || !password) {
      return handleCORS(NextResponse.json({ error: 'Email and password required' }, { status: 400 }));
    }

    const result = await query(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.email = $1 AND u.is_active = true`,
      [email]
    );

    if (result.rows.length === 0) {
      return handleCORS(NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }));
    }

    const user = result.rows[0];
    const validPassword = await verifyPassword(password, user.password_hash);

    if (!validPassword) {
      return handleCORS(NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }));
    }

    // Check MFA
    if (user.mfa_enabled && user.mfa_secret) {
      if (!mfa_code) {
        return handleCORS(NextResponse.json({
          mfa_required: true,
          message: 'MFA code required'
        }));
      }

      const validMFA = verifyTOTP(user.mfa_secret, mfa_code);
      if (!validMFA) {
        return handleCORS(NextResponse.json({ error: 'Invalid MFA code' }, { status: 401 }));
      }
    }

    const token = await createToken({ userId: user.id, email: user.email, role: user.role_name });

    // Log login activity
    try {
      const { logActivity } = await import('@/lib/activity-logger');
      await logActivity({
        admin_id: user.id,
        event_type: 'login',
        description: `Admin ${user.name || user.email} logged in successfully.`,
        metadata: { email: user.email, role: user.role_name }
      });
    } catch (logErr) {
      console.error('Failed to log login activity:', logErr.message);
    }

    return handleCORS(NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role_name,
        mfa_enabled: user.mfa_enabled
      }
    }));

  } catch (error) {
    console.error('Login error:', error);
    return handleCORS(NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 }));
  }
}
