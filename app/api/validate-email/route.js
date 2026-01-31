import { NextResponse } from 'next/server';
import dns from 'dns';
import util from 'util';

// Promisify dns.resolveMx
const resolveMx = util.promisify(dns.resolveMx);

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
        const { email } = body;

        if (!email) {
            return handleCORS(NextResponse.json({ valid: false, message: 'Email is required' }, { status: 400 }));
        }

        // 1. Basic Syntax Check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return handleCORS(NextResponse.json({ valid: false, message: 'Invalid email format' }));
        }

        // 2. DNS MX Record Check
        const domain = email.split('@')[1];

        try {
            const addresses = await resolveMx(domain);

            if (addresses && addresses.length > 0) {
                return handleCORS(NextResponse.json({
                    valid: true,
                    message: 'Email domain is valid'
                }));
            } else {
                return handleCORS(NextResponse.json({
                    valid: false,
                    message: 'Domain has no mail servers (MX records)'
                }));
            }
        } catch (dnsError) {
            console.error(`DNS lookup failed for ${domain}:`, dnsError.message);

            // If domain lookup fails (ENOTFOUND, etc.)
            return handleCORS(NextResponse.json({
                valid: false,
                message: 'Invalid domain or no mail server found'
            }));
        }

    } catch (error) {
        console.error('Email validation error:', error);
        return handleCORS(NextResponse.json({
            error: 'Internal server error',
            valid: false, // Fail safe
            message: error.message
        }, { status: 500 }));
    }
}
