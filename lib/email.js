import nodemailer from 'nodemailer';

// Check if real email sending is enabled
const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';

// Create nodemailer transporter
let transporter = null;
if (EMAIL_ENABLED) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Core email sending function
export async function sendEmail({ to, subject, html, text, attachments }) {
  if (!EMAIL_ENABLED || !transporter) {
    // Mock mode - log emails instead of sending
    console.log('\n=== MOCK EMAIL SERVICE ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Text:', text || 'N/A');
    console.log('HTML:', html?.substring(0, 200) + '...' || 'N/A');
    console.log('=========================\n');

    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      message: 'Email logged (mock service)'
    };
  }

  try {
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Pavilion Sports'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
      attachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[Email] Sent successfully:', info.messageId);

    return {
      success: true,
      messageId: info.messageId,
      message: 'Email sent successfully'
    };
  } catch (error) {
    console.error('[Email] Failed to send:', error.message);
    return {
      success: false,
      error: error.message,
      message: 'Failed to send email'
    };
  }
}

// Send quotation email
export async function sendQuotationEmail(quotation, customerEmail) {
  const subject = `Quotation #${quotation.quotation_number} from Pavilion Sports`;
  const text = `Please find attached your quotation #${quotation.quotation_number}.`;

  const attachments = [];
  if (quotation.pdfData) {
    attachments.push({
      filename: `Quotation_${quotation.quotation_number}.pdf`,
      content: quotation.pdfData,
      encoding: 'base64',
      contentType: 'application/pdf'
    });
  }

  return await sendEmail({
    to: customerEmail,
    subject,
    text,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Pavilion Sports</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #1e3a8a;">Quotation #${quotation.quotation_number}</h2>
          <p>Please find attached the quotation details.</p>
          <p>Thank you for your interest in Pavilion Sports products.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="font-size: 12px; color: #6b7280;">This is an automated email from Pavilion Sports.</p>
        </div>
      </div>
    `,
    attachments // Pass attachments to the core function
  });
}

// Send order confirmation email
export async function sendOrderConfirmationEmail(order, customerEmail) {
  const subject = `Order Confirmation #${order.order_number}`;
  const text = `Your order #${order.order_number} has been received. Total: ₹${order.total}`;

  return await sendEmail({
    to: customerEmail,
    subject,
    text,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Order Confirmed!</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #1e3a8a;">Order #${order.order_number}</h2>
          <p>Thank you for your order!</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Total Amount:</strong> ₹${order.total}</p>
            <p><strong>Status:</strong> <span style="color: #f59e0b;">${order.status}</span></p>
          </div>
        </div>
      </div>
    `
  });
}

// Send B2B approval email
export async function sendB2BApprovalEmail(customerEmail, status) {
  const subject = status === 'approved'
    ? 'Your Wholesale Account Has Been Approved'
    : 'Your Wholesale Account Application Update';

  const text = status === 'approved'
    ? 'Congratulations! Your Wholesale account has been approved. You can now place orders.'
    : `Your Wholesale account application status: ${status}`;

  const bgColor = status === 'approved' ? '#16a34a' : '#f59e0b';

  return await sendEmail({
    to: customerEmail,
    subject,
    text,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${bgColor}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">${subject}</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <p style="font-size: 16px;">${text}</p>
        </div>
      </div>
    `
  });
}

// Send order update email
export async function sendOrderUpdateEmail(order, customerEmail) {
  const subject = `Order Updated: #${order.order_number}`;
  const text = `Your order #${order.order_number} has been updated by Pavilion Sports. New Total: ₹${order.total}`;

  const itemsHtml = order.items?.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.product_name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.unit_price}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.line_total}</td>
    </tr>
  `).join('') || '';

  return await sendEmail({
    to: customerEmail,
    subject,
    text,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Order Update</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #1e3a8a;">Order #${order.order_number}</h2>
          <p>Hello, your order has been updated by Pavilion Sports with the latest availability and pricing.</p>
          <table style="width: 100%; border-collapse: collapse; background: white; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 10px; text-align: left;">Product</th>
                <th style="padding: 10px; text-align: center;">Qty</th>
                <th style="padding: 10px; text-align: right;">Unit Price</th>
                <th style="padding: 10px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div style="background: white; padding: 20px; border-radius: 8px;">
            <p><strong>Subtotal:</strong> ₹${order.subtotal}</p>
            <p><strong>Discount:</strong> ₹${order.discount || 0}</p>
            <p><strong>Tax:</strong> ₹${order.tax || 0}</p>
            <p style="font-size: 18px;"><strong>Total Amount:</strong> ₹${order.total}</p>
            ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ''}
          </div>
          <p style="margin-top: 20px;">Thank you for choosing Pavilion Sports.</p>
        </div>
      </div>
    `
  });
}

// Send password reset email
export async function sendPasswordResetEmail(email, resetToken, userName) {
  const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  const subject = 'Reset Your Password - Pavilion Sports';
  const text = `Hello ${userName || 'User'}, you requested a password reset. Click this link to reset your password: ${resetUrl}. This link expires in 1 hour.`;

  return await sendEmail({
    to: email,
    subject,
    text,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Password Reset</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <p>Hello <strong>${userName || 'User'}</strong>,</p>
          <p>You requested a password reset for your Pavilion Sports account.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #7c3aed; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This link will expire in <strong>1 hour</strong>.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="font-size: 11px; color: #9ca3af;">
            If the button doesn't work, copy and paste this link:<br>
            <a href="${resetUrl}" style="color: #7c3aed;">${resetUrl}</a>
          </p>
        </div>
      </div>
    `
  });
}

// Send B2B Registration Pending Email to User
export async function sendB2BRegistrationPendingEmail(userEmail, companyName) {
  const subject = 'Wholesale Registration Received - Pavilion Sports';
  const text = `Hello, thank you for registering with Pavilion Sports Wholesale Portal. Your application for ${companyName} is currently under review. We will notify you once it is approved.`;

  return await sendEmail({
    to: userEmail,
    subject,
    text,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e3a8a; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Registration Received</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <p>Hello,</p>
          <p>Thank you for your interest in the <strong>Pavilion Sports Wholesale Portal</strong>.</p>
          <p>Your registration for <strong>${companyName}</strong> has been received and is currently under review by our administration team.</p>
          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #1e40af;"><strong>Status:</strong> Pending Approval</p>
          </div>
          <p>You will receive another email once your account has been approved and activated. Thank you for your patience.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="font-size: 12px; color: #6b7280;">This is an automated message from Pavilion Sports.</p>
        </div>
      </div>
    `
  });
}

// Send B2B Admin Notification Email
export async function sendB2BAdminRegistrationNotification(adminEmail, customerDetails, approvalLink) {
  const subject = 'NEW Wholesale Registration Request';
  const text = `New wholesale registration request from ${customerDetails.company_name} (${customerDetails.email}). Review and approve: ${approvalLink}`;

  return await sendEmail({
    to: adminEmail,
    subject,
    text,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">New Wholesale Request</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <p>A new wholesale registration request has been submitted and requires your attention.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #dc2626;">Customer Details</h3>
            <p><strong>Company:</strong> ${customerDetails.company_name}</p>
            <p><strong>Contact:</strong> ${customerDetails.first_name} ${customerDetails.last_name}</p>
            <p><strong>Email:</strong> ${customerDetails.email}</p>
            <p><strong>Phone:</strong> ${customerDetails.phone}</p>
            <p><strong>Location:</strong> ${customerDetails.city}, ${customerDetails.state}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${approvalLink}" style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Review and Approve Request
            </a>
          </div>
          <p style="font-size: 12px; color: #6b7280;">Security Note: This link is unique and secure for this registration request.</p>
        </div>
      </div>
    `
  });
}

// Send Product Enquiry Email
export async function sendEnquiryEmail({ name, email, phone, message, product }) {
  const adminEmail = process.env.SMTP_USER; // Defaulting to SMTP_USER as admin email
  const subject = `[ENQUIRY] New Inquiry for ${product.name}`;

  const text = `
    New inquiry from: ${name}
    Email: ${email}
    Phone: ${phone}
    
    Product: ${product.name}
    SKU: ${product.sku || 'N/A'}
    Price: ₹${product.selling_price || product.mrp_price}
    
    Message:
    ${message}
  `;

  return await sendEmail({
    to: adminEmail,
    subject,
    text,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #dc2626; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">New Product Enquiry</h1>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          <h2 style="color: #111827; margin-top: 0; font-size: 20px;">Customer Details</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 100px;">Name:</td>
              <td style="padding: 8px 0; color: #111827; font-weight: bold;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Email:</td>
              <td style="padding: 8px 0; color: #111827; font-weight: bold;"><a href="mailto:${email}" style="color: #dc2626; text-decoration: none;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
              <td style="padding: 8px 0; color: #111827; font-weight: bold;">${phone}</td>
            </tr>
          </table>

          <h2 style="color: #111827; margin-top: 0; font-size: 20px;">Product Information</h2>
          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 32px; border: 1px solid #f3f4f6;">
            <p style="margin: 0; font-weight: bold; font-size: 16px; color: #111827;">${product.name}</p>
            <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">SKU: ${product.sku || 'N/A'}</p>
            <p style="margin: 8px 0 0 0; color: #111827; font-weight: bold;">Price: ₹${product.selling_price || product.mrp_price}</p>
          </div>

          <h2 style="color: #111827; margin-top: 0; font-size: 20px;">Message</h2>
          <div style="background: #ffffff; border-left: 4px solid #dc2626; padding: 12px 20px; color: #4b5563; font-style: italic; line-height: 1.6;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">This enquiry was sent from the Pavilion Sports website.</p>
        </div>
      </div>
    `
  });
}

// Send new job application notification to admin
export async function sendJobApplicationEmail(adminEmail, application, jobTitle) {
  const subject = `[Job Application] ${application.full_name} for ${jobTitle}`;
  const text = `
    New Job Application Received
    
    Job: ${jobTitle}
    Applicant: ${application.full_name}
    Email: ${application.email}
    Phone: ${application.phone || 'N/A'}
    LinkedIn: ${application.linkedin_url || 'N/A'}
    Portfolio: ${application.portfolio_url || 'N/A'}
    
    Cover Letter:
    ${application.cover_letter || 'N/A'}
  `;

  return await sendEmail({
    to: adminEmail,
    subject,
    text,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #dc2626; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">New Job Application</h1>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          <h2 style="color: #111827; margin-top: 0; font-size: 20px;">Applicant Details</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 120px;">Position:</td>
              <td style="padding: 8px 0; color: #111827; font-weight: bold;">${jobTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Name:</td>
              <td style="padding: 8px 0; color: #111827; font-weight: bold;">${application.full_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Email:</td>
              <td style="padding: 8px 0; color: #111827; font-weight: bold;"><a href="mailto:${application.email}" style="color: #dc2626; text-decoration: none;">${application.email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
              <td style="padding: 8px 0; color: #111827; font-weight: bold;">${application.phone || 'N/A'}</td>
            </tr>
             <tr>
              <td style="padding: 8px 0; color: #6b7280;">LinkedIn:</td>
              <td style="padding: 8px 0; color: #111827; font-weight: bold;">${application.linkedin_url ? `<a href="${application.linkedin_url}" style="color: #dc2626;">View Profile</a>` : 'N/A'}</td>
            </tr>
             <tr>
              <td style="padding: 8px 0; color: #6b7280;">Portfolio:</td>
              <td style="padding: 8px 0; color: #111827; font-weight: bold;">${application.portfolio_url ? `<a href="${application.portfolio_url}" style="color: #dc2626;">View Portfolio</a>` : 'N/A'}</td>
            </tr>
          </table>

          <h2 style="color: #111827; margin-top: 0; font-size: 20px;">Cover Letter</h2>
          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 32px; border: 1px solid #f3f4f6; color: #4b5563; line-height: 1.6;">
            ${(application.cover_letter || 'N/A').replace(/\n/g, '<br>')}
          </div>
          
          <div style="text-align: center;">
             <a href="${process.env.NEXT_PUBLIC_BASE_URL}/admin/careers" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View in Admin Panel</a>
          </div>
        </div>
      </div>
    `
  });
}

// Send application received confirmation to applicant
export async function sendApplicationReceivedEmail(applicantEmail, applicantName, jobTitle) {
  const subject = `Application Received: ${jobTitle} - Pavilion Sports`;
  const text = `Hello ${applicantName}, thank you for applying for the position of ${jobTitle} at Pavilion Sports. We have received your application.`;

  return await sendEmail({
    to: applicantEmail,
    subject,
    text,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #dc2626; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Application Received</h1>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          <p>Hello <strong>${applicantName}</strong>,</p>
          <p>Thank you for applying for the position of <strong>${jobTitle}</strong> at Pavilion Sports.</p>
          <p>We have successfully received your application and our team will review it shortly. If your profile matches our requirements, we will get in touch with you.</p>
          
          <div style="background: #f9fafb; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0;">
             <p style="margin: 0; color: #1e3a8a;"><strong>Status:</strong> Application Under Review</p>
          </div>

          <p>Best regards,<br>The Pavilion Sports Team</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">This is an automated email. Please do not reply directly.</p>
        </div>
      </div>
    `
  });
}
