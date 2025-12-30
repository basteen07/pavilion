// Mock email service - logs emails instead of sending

export async function sendEmail({ to, subject, html, text }) {
  console.log('\n=== MOCK EMAIL SERVICE ===');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('Text:', text || 'N/A');
  console.log('HTML:', html || 'N/A');
  console.log('=========================\n');

  return {
    success: true,
    messageId: `mock-${Date.now()}`,
    message: 'Email logged (mock service)'
  };
}

export async function sendQuotationEmail(quotation, customerEmail) {
  const subject = `Quotation #${quotation.quotation_number} from Pavilion Sports`;
  const text = `Your quotation #${quotation.quotation_number} is ready. Total: ₹${quotation.total}`;

  return await sendEmail({
    to: customerEmail,
    subject,
    text,
    html: `
      <h2>Quotation #${quotation.quotation_number}</h2>
      <p>Thank you for your interest in Pavilion Sports products.</p>
      <p><strong>Total Amount:</strong> ₹${quotation.total}</p>
      <p>Please contact us for any questions.</p>
    `
  });
}

export async function sendOrderConfirmationEmail(order, customerEmail) {
  const subject = `Order Confirmation #${order.order_number}`;
  const text = `Your order #${order.order_number} has been received. Total: ₹${order.total}`;

  return await sendEmail({
    to: customerEmail,
    subject,
    text,
    html: `
      <h2>Order Confirmation #${order.order_number}</h2>
      <p>Thank you for your order!</p>
      <p><strong>Total Amount:</strong> ₹${order.total}</p>
      <p><strong>Status:</strong> ${order.status}</p>
    `
  });
}

export async function sendB2BApprovalEmail(customerEmail, status) {
  const subject = status === 'approved'
    ? 'Your B2B Account Has Been Approved'
    : 'Your B2B Account Application Update';

  const text = status === 'approved'
    ? 'Congratulations! Your B2B account has been approved. You can now place orders.'
    : `Your B2B account application status: ${status}`;

  return await sendEmail({
    to: customerEmail,
    subject,
    text,
    html: `
      <h2>${subject}</h2>
      <p>${text}</p>
    `
  });
}
export async function sendOrderUpdateEmail(order, customerEmail) {
  const subject = `Order Updated: #${order.order_number}`;
  const text = `Your order #${order.order_number} has been updated by Pavilion Sports. New Total: ₹${order.total}`;

  const itemsHtml = order.items.map(item => `
    <tr>
      <td>${item.product_name}</td>
      <td>${item.quantity}</td>
      <td>₹${item.unit_price}</td>
      <td>₹${item.line_total}</td>
    </tr>
  `).join('');

  return await sendEmail({
    to: customerEmail,
    subject,
    text,
    html: `
      <h2>Order Update: #${order.order_number}</h2>
      <p>Hello,</p>
      <p>Your order has been updated by Pavilion Sports with the latest availability and pricing.</p>
      <table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th>Product</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <p><strong>Subtotal:</strong> ₹${order.subtotal}</p>
      <p><strong>Discount:</strong> ₹${order.discount || 0}</p>
      <p><strong>Tax:</strong> ₹${order.tax || 0}</p>
      <p><strong>Total Amount:</strong> ₹${order.total}</p>
      <p><strong>Notes:</strong> ${order.notes || 'N/A'}</p>
      <p>Thank you for choosing Pavilion Sports.</p>
    `
  });
}
