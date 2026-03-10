const emailService = require('./emailService');

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://atyors.com';

function buildPaymentSuccessHtml({ amount, description, cardBrand, cardLast4, date }) {
  const brand = (cardBrand || 'card').charAt(0).toUpperCase() + (cardBrand || 'card').slice(1);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

<tr><td align="center" style="padding:32px 24px 16px;">
  <img src="${BASE_URL}/icons/icon-192.png" alt="atyors" width="48" height="48" style="display:block;border-radius:10px;" />
  <p style="margin:8px 0 0;font-size:14px;font-weight:600;color:#6b7280;letter-spacing:0.5px;">ATYORS</p>
</td></tr>

<tr><td style="padding:0 24px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" /></td></tr>

<tr><td align="center" style="padding:32px 24px 8px;">
  <div style="display:inline-block;width:56px;height:56px;background:#d1fae5;border-radius:50%;text-align:center;line-height:56px;">
    <span style="font-size:28px;color:#059669;">&#10003;</span>
  </div>
</td></tr>

<tr><td align="center" style="padding:8px 24px 8px;">
  <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;">Your payment was successful!</h1>
</td></tr>

<tr><td align="center" style="padding:0 24px 24px;">
  <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.5;">
    Thank you for your payment!<br/>
    Your payment for <strong>${description}</strong> has been received.
  </p>
</td></tr>

<tr><td style="padding:0 24px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" /></td></tr>

<tr><td style="padding:24px;">
  <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#111827;">Order Summary</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;" />

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#6b7280;">Total Charged</td>
    </tr>
    <tr>
      <td style="padding:0 0 16px;font-size:20px;font-weight:700;color:#059669;">$${amount}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#6b7280;">Payment method</td>
    </tr>
    <tr>
      <td style="padding:0 0 16px;font-size:14px;font-weight:600;color:#111827;">${brand} ****${cardLast4}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#6b7280;">Date</td>
    </tr>
    <tr>
      <td style="padding:0 0 8px;font-size:14px;font-weight:600;color:#111827;">${date}</td>
    </tr>
  </table>
</td></tr>

<tr><td style="padding:0 24px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" /></td></tr>

<tr><td style="padding:24px;text-align:center;">
  <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">
    If you have questions, write to us at
    <a href="mailto:admin@atyors.com" style="color:#2563eb;text-decoration:none;">admin@atyors.com</a>
  </p>
  <p style="margin:0;font-size:12px;color:#d1d5db;">atyors &mdash; At Your Service</p>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

function buildPaymentFailedHtml({ description }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

<tr><td align="center" style="padding:32px 24px 16px;">
  <img src="${BASE_URL}/icons/icon-192.png" alt="atyors" width="48" height="48" style="display:block;border-radius:10px;" />
  <p style="margin:8px 0 0;font-size:14px;font-weight:600;color:#6b7280;letter-spacing:0.5px;">ATYORS</p>
</td></tr>

<tr><td style="padding:0 24px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" /></td></tr>

<tr><td align="center" style="padding:32px 24px 8px;">
  <div style="display:inline-block;width:56px;height:56px;background:#fee2e2;border-radius:50%;text-align:center;line-height:56px;">
    <span style="font-size:28px;color:#dc2626;">!</span>
  </div>
</td></tr>

<tr><td align="center" style="padding:8px 24px 8px;">
  <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;">Payment could not be processed</h1>
</td></tr>

<tr><td align="center" style="padding:0 24px 24px;">
  <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.5;">
    We were unable to charge your card for <strong>${description}</strong>.<br/>
    Please update your payment method in your Profile to avoid any interruption.
  </p>
</td></tr>

<tr><td align="center" style="padding:0 24px 24px;">
  <a href="${BASE_URL}/profile" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">Update Payment Method</a>
</td></tr>

<tr><td style="padding:0 24px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" /></td></tr>

<tr><td style="padding:24px;text-align:center;">
  <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">
    If you have questions, write to us at
    <a href="mailto:admin@atyors.com" style="color:#2563eb;text-decoration:none;">admin@atyors.com</a>
  </p>
  <p style="margin:0;font-size:12px;color:#d1d5db;">atyors &mdash; At Your Service</p>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

async function sendPaymentSuccessEmail(user, { amount, description, cardBrand, cardLast4 }) {
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
  const amountStr = parseFloat(amount).toFixed(2);
  try {
    await emailService.send({
      to: user.email,
      subject: 'Payment confirmed — atyors',
      text: `Your payment of $${amountStr} for ${description} has been received. Thank you!\n\nPayment method: ${cardBrand || 'Card'} ****${cardLast4}\nDate: ${date}\n\natyors — At Your Service`,
      html: buildPaymentSuccessHtml({ amount: amountStr, description, cardBrand, cardLast4, date }),
    });
  } catch (err) {
    console.error(`[PaymentEmail] Failed to send success email to ${user.email}:`, err.message);
  }
}

async function sendPaymentFailedEmail(user, { description }) {
  try {
    await emailService.send({
      to: user.email,
      subject: 'Payment issue — atyors',
      text: `We were unable to process payment for ${description}. Please update your payment method in your Profile.\n\natyors — At Your Service`,
      html: buildPaymentFailedHtml({ description }),
    });
  } catch (err) {
    console.error(`[PaymentEmail] Failed to send failure email to ${user.email}:`, err.message);
  }
}

module.exports = { sendPaymentSuccessEmail, sendPaymentFailedEmail };
