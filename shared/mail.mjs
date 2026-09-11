// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// shared/mail.mjs â€” Transactional order e-mails (Resend.com).
// Lives OUTSIDE api/ so Vercel never treats it as a function.
// Sends only if RESEND_API_KEY is configured â€” otherwise it logs
// and skips, so the store keeps working until you add the key.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.MAIL_FROM || 'onboarding@resend.dev';
const APP_ORIGIN = process.env.APP_ORIGIN || 'https://online-store-sigma-three.vercel.app';
const STORE_NAME = process.env.STORE_NAME || 'Houselaxmicloth Suit Collection';

const money = (n) => "â‚¹" + Number(n || 0).toLocaleString("en-IN");

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Compose subject + HTML body for a given mail type. */
export function renderOrderMail(type, orderRaw) {
  const o = orderRaw || {};
  const id = esc(o.id);
  const name = esc(o.customerName || 'there');
  const track = `${APP_ORIGIN}/#/order-manage/${encodeURIComponent(o.id || '')}`;
  const total = money(o.total);
  const mode = esc(o.paymentMode || 'online');
  const tracking = o.trackingNo ? `${esc(o.courier || 'Courier')} Â· ${esc(o.trackingNo)}` : '';

  const COPY = {
    confirmed: {
      subject: `âœ… Order confirmed â€” ${o.id}`,
      title: 'Your order is confirmed',
      body: `Thanks for shopping with us${name === 'there' ? '' : `, ${name}`}! We have received your order <strong>${id}</strong> and will start packing it shortly.`,
      extra: `Payment method: <strong>${mode}</strong> Â· Order total: <strong>${total}</strong>`,
    },
    shipped: {
      subject: `ðŸšš Your order has shipped â€” ${o.id}`,
      title: 'Your order is on the way!',
      body: `Great news${name === 'there' ? '' : `, ${name}`} â€” your order <strong>${id}</strong> is out for delivery.`,
      extra: tracking ? `Tracking: <strong>${tracking}</strong>` : `Track your order to see live status.`,
    },
    delivered: {
      subject: `ðŸ“¦ Order delivered â€” ${o.id}`,
      title: 'Your order has been delivered',
      body: `Hi${name === 'there' ? '' : ` ${name}`}, your order <strong>${id}</strong> was delivered. We hope you love it!`,
      extra: 'If anything is missing or damaged, reply to this email and we will help.',
    },
    cancelled: {
      subject: `Order cancelled â€” ${o.id}`,
      title: 'Your order was cancelled',
      body: `Hi${name === 'there' ? '' : ` ${name}`}, your order <strong>${id}</strong> has been cancelled. Any paid amount will be refunded to the original payment method.`,
      extra: 'Questions? Reply to this email and our team will assist you.',
    },
  };

  const c = COPY[type] || COPY.confirmed;
  const html = `<!doctype html>
<html>
<body style="font-family:Arial,Helvetica,sans-serif;background:#faf6f0;padding:24px;max-width:600px;margin:0 auto">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:14px;border:1px solid #eadfd6;overflow:hidden">
    <tr>
      <td style="padding:22px 28px;background:#9b1c3d;color:#fff">
        <div style="font-size:20px;font-weight:700">${esc(STORE_NAME)}</div>
        <div style="font-size:13px;opacity:.85">Ethnic fashion store</div>
      </td>
    </tr>
    <tr>
      <td style="padding:26px 28px">
        <h1 style="font-size:21px;margin:0 0 12px">${c.title}</h1>
        <p style="font-size:15px;line-height:1.6;margin:0 0 14px">${c.body}</p>
        <p style="font-size:14px;margin:0 0 18px">${c.extra}</p>
        <a href="${track}" style="display:inline-block;background:#9b1c3d;color:#fff;text-decoration:none;padding:11px 22px;border-radius:30px;font-size:14px">Track your order</a>
        <p style="font-size:12px;color:#7c6f72;margin:22px 0 0">Order total: <strong>${total}</strong> Â· This is a system-generated email. No reply is monitored.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return { subject: c.subject, html };
}

/** Send a status e-mail. Always returns { ok } â€” never throws. */
export async function sendOrderMail({ type, to, order }) {
  const email = String(to || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'invalid recipient' };
  if (!KEY) {
    console.log(`[mail] skipped (no RESEND_API_KEY): ${type} â†’ ${email}`);
    return { ok: true, skipped: true };
  }
  const { subject, html } = renderOrderMail(type, order);
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${STORE_NAME} <${FROM_EMAIL}>`,
        to: [email],
        subject,
        html,
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error('[mail] resend error', resp.status, text.slice(0, 300));
      return { ok: false, error: `resend ${resp.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error('[mail] send error:', err.message);
    return { ok: false, error: err.message };
  }
}