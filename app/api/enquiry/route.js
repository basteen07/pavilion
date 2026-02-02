import { NextResponse } from 'next/server';
import { sendEnquiryEmail } from '@/lib/email';

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, email, phone, message, product } = body;

        // Validation
        if (!name || !email || !phone || !product) {
            return NextResponse.json(
                { success: false, message: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Send email
        const result = await sendEnquiryEmail({
            name,
            email,
            phone,
            message,
            product
        });

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: 'Enquiry sent successfully'
            });
        } else {
            return NextResponse.json(
                { success: false, message: result.error || 'Failed to send enquiry' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('[Enquiry API] Error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}
