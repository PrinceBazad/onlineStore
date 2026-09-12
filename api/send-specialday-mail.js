// ─────────────────────────────────────────────────────────────
// api/send-specialday-mail.js — Birthday / anniversary gift-code email.
// Sent to a logged-in customer's OWN email only (no free-form recipients).
// Gracefully skips when RESEND_API_KEY is not configured.
// ─────────────────────────────────────────────────────────────
import { sendOrderMail } from '../shared/mail.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, name, specialType, code } = req.body || {};
    const target = String(to || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(target)) {
      return res.status(400).json({ error: 'Valid recipient email required' });
    }
    if (!code || !String(code).trim()) {
      return res.status(400).json({ error: 'Gift code required' });
    }

    const result = await sendOrderMail({
      type: 'specialday',
      to: target,
      order: {
        customerName: String(name || '').slice(0, 80),
        specialType: String(specialType || 'Birthday').slice(0, 20),
        code: String(code).trim().toUpperCase().slice(0, 20),
      },
    });
    res.json({ ok: true, skipped: result.skipped === true });
  } catch (err) {
    console.error('send-specialday-mail error:', err);
    res.status(500).json({ error: 'Failed to send mail' });
  }
}
