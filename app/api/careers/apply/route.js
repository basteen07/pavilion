import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendJobApplicationEmail, sendApplicationReceivedEmail } from '@/lib/email';
import { publicPostRateLimit } from '@/lib/rate-limit';

export async function POST(request) {
    try {
        // Rate limit: 5 applications per hour per IP to prevent spam
        const limited = publicPostRateLimit(request);
        if (limited) return limited;

        const body = await request.json();
        const { job_id, full_name, email, phone, linkedin_url, portfolio_url, cover_letter } = body;

        // Validation
        if (!job_id || !full_name || !email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify job exists and is active
        const jobResult = await query('SELECT * FROM careers_jobs WHERE id = $1 AND is_active = true', [job_id]);
        if (jobResult.rows.length === 0) {
            return NextResponse.json({ error: 'Job not found or closed' }, { status: 404 });
        }
        const job = jobResult.rows[0];

        // Check if already applied (optional spam prevention - same email, same job, last 7 days)
        const existing = await query(
            `SELECT id FROM job_applications 
             WHERE job_id = $1 AND email = $2 AND created_at > NOW() - INTERVAL '7 days'`,
            [job_id, email]
        );

        if (existing.rows.length > 0) {
            return NextResponse.json({ error: 'You have already applied for this position recently.' }, { status: 409 });
        }

        // Save application
        const result = await query(
            `INSERT INTO job_applications 
             (job_id, full_name, email, phone, linkedin_url, portfolio_url, cover_letter)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, created_at`,
            [job_id, full_name, email, phone, linkedin_url, portfolio_url, cover_letter]
        );

        const application = {
            id: result.rows[0].id,
            job_id,
            full_name,
            email,
            phone,
            linkedin_url,
            portfolio_url,
            cover_letter,
            created_at: result.rows[0].created_at
        };

        // Send emails asynchronously (don't block response)
        // 1. Notify Admin
        const adminEmail = process.env.SMTP_USER;
        if (adminEmail) {
            sendJobApplicationEmail(adminEmail, application, job.title).catch(err =>
                console.error('Failed to send admin notification:', err)
            );
        }

        // 2. Notify Applicant
        sendApplicationReceivedEmail(email, full_name, job.title).catch(err =>
            console.error('Failed to send applicant confirmation:', err)
        );

        return NextResponse.json({
            success: true,
            message: 'Application submitted successfully',
            id: application.id
        });

    } catch (error) {
        console.error('Application submission error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
