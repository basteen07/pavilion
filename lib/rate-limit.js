/**
 * Rate Limiter — In-memory sliding-window implementation.
 *
 * Supports IP-based and user-based limiting with configurable windows.
 * Stale entries are auto-cleaned every 5 minutes to prevent memory leaks.
 *
 * OWASP Reference: https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html
 */

import { NextResponse } from 'next/server';

// ─── Store ────────────────────────────────────────────────────────────────────
// Map<string, { timestamps: number[], blockedUntil: number | null }>
const store = new Map();

// Auto-cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs) {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = now;

    const cutoff = now - windowMs * 2; // Keep entries for 2x window as safety margin
    for (const [key, entry] of store.entries()) {
        // Remove entries where all timestamps are expired
        if (entry.timestamps.every((t) => t < cutoff)) {
            store.delete(key);
        }
    }
}

// ─── Core limiter ─────────────────────────────────────────────────────────────
/**
 * Check if a request should be rate-limited.
 *
 * @param {string}  key       – Unique identifier (IP, userId, or composite)
 * @param {number}  maxHits   – Max allowed requests in the window
 * @param {number}  windowMs  – Time window in milliseconds
 * @returns {{ limited: boolean, remaining: number, retryAfterSec: number }}
 */
function checkLimit(key, maxHits, windowMs) {
    cleanup(windowMs);

    const now = Date.now();
    const entry = store.get(key) || { timestamps: [], blockedUntil: null };

    // If currently blocked, check if block has expired
    if (entry.blockedUntil && now < entry.blockedUntil) {
        const retryAfterSec = Math.ceil((entry.blockedUntil - now) / 1000);
        return { limited: true, remaining: 0, retryAfterSec };
    }

    // Slide the window — keep only timestamps within the current window
    entry.timestamps = entry.timestamps.filter((t) => t > now - windowMs);

    if (entry.timestamps.length >= maxHits) {
        // Block for the remainder of the window
        const oldestInWindow = entry.timestamps[0];
        const retryAfterSec = Math.ceil((oldestInWindow + windowMs - now) / 1000);
        entry.blockedUntil = now + retryAfterSec * 1000;
        store.set(key, entry);
        return { limited: true, remaining: 0, retryAfterSec };
    }

    // Record this request
    entry.timestamps.push(now);
    entry.blockedUntil = null;
    store.set(key, entry);

    return {
        limited: false,
        remaining: maxHits - entry.timestamps.length,
        retryAfterSec: 0,
    };
}

// ─── IP extraction helper ─────────────────────────────────────────────────────
/**
 * Extract the client IP from a Next.js request.
 * Falls back through X-Forwarded-For → X-Real-IP → 'unknown'.
 */
export function getClientIP(request) {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    const realIP = request.headers.get('x-real-ip');
    if (realIP) return realIP;
    return 'unknown';
}

// ─── Response builder ─────────────────────────────────────────────────────────
/**
 * Build a standard 429 Too Many Requests response.
 * Includes Retry-After header per RFC 6585.
 */
function rateLimitResponse(retryAfterSec) {
    const res = NextResponse.json(
        {
            error: 'Too many requests. Please try again later.',
            retryAfter: retryAfterSec,
        },
        { status: 429 }
    );
    res.headers.set('Retry-After', String(retryAfterSec));
    res.headers.set('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000) + retryAfterSec));
    return res;
}

// ─── Preset limiters ──────────────────────────────────────────────────────────

/**
 * Rate limiter for authentication endpoints (login, register, forgot-password).
 * Strict: 5 attempts per 15 minutes per IP.
 *
 * @param {Request} request
 * @returns {NextResponse|null} – Returns 429 response if limited, null if OK
 */
export function authRateLimit(request) {
    const ip = getClientIP(request);
    const key = `auth:${ip}`;
    const { limited, retryAfterSec } = checkLimit(key, 5, 15 * 60 * 1000);
    return limited ? rateLimitResponse(retryAfterSec) : null;
}

/**
 * Rate limiter for public GET endpoints (products, categories, brands, etc.).
 * Standard: 100 requests per minute per IP.
 *
 * @param {Request} request
 * @returns {NextResponse|null}
 */
export function publicGetRateLimit(request) {
    const ip = getClientIP(request);
    const key = `pub-get:${ip}`;
    const { limited, retryAfterSec } = checkLimit(key, 100, 60 * 1000);
    return limited ? rateLimitResponse(retryAfterSec) : null;
}

/**
 * Rate limiter for public POST endpoints (enquiry, validate-email).
 * Moderate: 10 requests per 5 minutes per IP.
 *
 * @param {Request} request
 * @returns {NextResponse|null}
 */
export function publicPostRateLimit(request) {
    const ip = getClientIP(request);
    const key = `pub-post:${ip}`;
    const { limited, retryAfterSec } = checkLimit(key, 10, 5 * 60 * 1000);
    return limited ? rateLimitResponse(retryAfterSec) : null;
}

/**
 * Rate limiter for file uploads.
 * 20 requests per 10 minutes per user (or IP if unauthenticated).
 *
 * @param {Request} request
 * @param {string}  [userId] – Authenticated user ID
 * @returns {NextResponse|null}
 */
export function uploadRateLimit(request, userId) {
    const identifier = userId || getClientIP(request);
    const key = `upload:${identifier}`;
    const { limited, retryAfterSec } = checkLimit(key, 20, 10 * 60 * 1000);
    return limited ? rateLimitResponse(retryAfterSec) : null;
}

/**
 * Rate limiter for admin API endpoints.
 * Generous: 200 requests per minute per user.
 *
 * @param {string} userId – Authenticated admin user ID
 * @returns {NextResponse|null}
 */
export function adminRateLimit(userId) {
    const key = `admin:${userId}`;
    const { limited, retryAfterSec } = checkLimit(key, 200, 60 * 1000);
    return limited ? rateLimitResponse(retryAfterSec) : null;
}
