// ─────────────────────────────────────────────────────────────
// api/delhivery/create-shipment.js — Book a Delhivery shipment
// for a packed order: returns the AWB (waybill) + label PDF URL.
// Staff then confirms "Ship" with the pre-filled AWB. Requires
// DELHIVERY_API_TOKEN; without it returns configured:false so the
// UI falls back to manual AWB entry from the Delhivery panel.
// ─────────────────────────────────────────────────────────────
import { createShipment, isConfigured } from '../../shared/delhivery.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { order, pickup } = req.body || {};
  if (!order || !order.id) {
    return res.status(400).json({ error: 'order (with id) is required' });
  }
  if (!order.shipping?.pincode || !order.customer?.phone) {
    return res.status(400).json({ error: 'order must include shipping pincode and customer phone' });
  }

  if (!isConfigured()) {
    return res.json({
      ok: false,
      configured: false,
      error:
        'Delhivery is not connected yet. Book the shipment in the Delhivery panel and enter the AWB manually.',
    });
  }

  try {
    const result = await createShipment(order, pickup || {});
    if (!result.ok) {
      console.error('[delhivery] create-shipment failed:', result.error, result.raw || '');
      return res.status(502).json({ ok: false, configured: true, error: result.error });
    }
    console.log('[delhivery] waybill created:', { orderId: order.id, waybill: result.waybill });
    return res.json({ ok: true, configured: true, waybill: result.waybill, labelUrl: result.labelUrl });
  } catch (err) {
    console.error('create-shipment error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to create shipment' });
  }
}
