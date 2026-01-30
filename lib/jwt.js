import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key');

// Session expiry configuration
const SESSION_CONFIG = {
    superadmin: '7d',    // Superadmin: 7 days
    admin: '8h',         // Admin/staff: 8 hours (work day)
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
