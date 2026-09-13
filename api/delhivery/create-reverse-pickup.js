// ─────────────────────────────────────────────────────────────
// api/delhivery/create-reverse-pickup.js — Book a REVERSE pickup
// (customer return) via Delhivery. Returns the reverse AWB.
// Requires DELHIVERY_API_TOKEN; without it returns configured:false so
// the UI shows the return as "manual pickup" instead of failing.
// ─────────────────────────────────────────────────────────────
import { createReversePickup, isConfigured } from '../../shared/delhivery.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const readBody = async () => {
    try {
      return req.body || {};
    } catch {
      /* fall through to raw stream */
    }
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      return JSON.parse(Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, '') || '{}');
    } catch {
      return {};
    }
  };

  const { ret } = await readBody();
  if (!ret || !ret.id) {
    return res.status(400).json({ error: 'ret (with id) is required' });
  }
  if (!ret.phone) {
    return res.status(400).json({ error: 'ret must include customer phone' });
  }

  if (!isConfigured()) {
    return res.json({
      ok: false,
      configured: false,
      error: 'Delhivery is not connected yet. Book the reverse pickup manually in the Delhivery panel.',
    });
  }

  try {
    const result = await createReversePickup(ret);
    if (!result.ok) {
      console.error('[delhivery] reverse pickup failed:', result.error);
      return res.status(502).json({ ok: false, configured: true, error: result.error });
    }
    console.log('[delhivery] reverse pickup booked:', { retId: ret.id, waybill: result.waybill });
    return res.json({ ok: true, configured: true, waybill: result.waybill, demo: result.demo === true });
  } catch (err) {
    console.error('create-reverse-pickup error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to book reverse pickup' });
  }
}