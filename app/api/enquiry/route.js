import { NextResponse } from 'next/server';
import { sendEnquiryEmail } from '@/lib/email';
import { publicPostRateLimit } from '@/lib/rate-limit';
import { enquirySchema, validateInput } from '@/lib/validators';

export async function POST(request) {
    try {
        // SECURITY: Rate limit enquiry submissions (10 per 5 min per IP)
        const limited = publicPostRateLimit(request);
        if (limited) return limited;

        const body = await request.json();
        // SECURITY: Validate enquiry input with Zod schema
        const validation = validateInput(body, enquirySchema);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, message: validation.error },
                { status: 400 }
            );
        }
        const { name, email, phone, message, product } = validation.data;

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
