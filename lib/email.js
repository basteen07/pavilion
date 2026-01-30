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
export async function sendEmail({ to, subject, html, text }) {
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
  const text = `Your quotation #${quotation.quotation_number} is ready. Total: ₹${quotation.total}`;

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
          <p>Thank you for your interest in Pavilion Sports products.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Total Amount:</strong> <span style="font-size: 24px; color: #16a34a;">₹${quotation.total}</span></p>
          </div>
          <p>Please contact us for any questions.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="font-size: 12px; color: #6b7280;">This is an automated email from Pavilion Sports.</p>
        </div>
      </div>
    `
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
    ? 'Your B2B Account Has Been Approved'
    : 'Your B2B Account Application Update';

  const text = status === 'approved'
    ? 'Congratulations! Your B2B account has been approved. You can now place orders.'
    : `Your B2B account application status: ${status}`;

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
