// ─────────────────────────────────────────────────────────────
// api/delhivery/track.js — Public tracking proxy. Looks up a
// Delhivery AWB and returns normalized scans + the suggested
// store status. Keeps DELHIVERY_API_TOKEN server-side only.
// GET /api/delhivery/track?awb=XXXX
// ─────────────────────────────────────────────────────────────
import { trackByAwb, isConfigured } from '../../shared/delhivery.mjs';

export default async function handler(req, res) {
  const awb = String(req.query.awb || '').trim();
  if (!awb) {
    return res.status(400).json({ ok: false, error: 'awb query param is required' });
  }
  if (!isConfigured()) {
    return res.json({
      ok: false,
      configured: false,
      error: 'Delhivery is not connected yet. Live courier tracking will appear once the API token is added.',
    });
  }

  try {
    const result = await trackByAwb(awb);
    if (!result.ok) {
      return res.status(404).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error('delhivery track error:', err);
    return res.status(500).json({ ok: false, error: 'Tracking lookup failed' });
  }
}
