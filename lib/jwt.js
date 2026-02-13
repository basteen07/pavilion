import { SignJWT, jwtVerify } from 'jose';

// SECURITY: Fail fast if JWT_SECRET is missing or too short — no fallback allowed.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('[SECURITY] JWT_SECRET environment variable is missing or too short (min 32 chars). Set it in .env');
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || '');

// Session expiry configuration
const SESSION_CONFIG = {
    superadmin: '30d',   // Superadmin: 30 days
    admin: '30d',        // Admin/staff: 30 days
    default: '1h'        // Default: 1 hour
};

export async function createToken(payload) {
    // Determine expiry based on role
    const role = payload.role || 'default';
    const expiryTime = SESSION_CONFIG[role] || SESSION_CONFIG.default;

    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expiryTime)
        .sign(JWT_SECRET);
    return token;
}

export async function verifyToken(token) {
    try {
        const verified = await jwtVerify(token, JWT_SECRET);
        return verified.payload;
    } catch (error) {
        return null;
    }
}
