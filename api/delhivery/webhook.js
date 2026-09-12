// ─────────────────────────────────────────────────────────────
// api/delhivery/webhook.js — Receives Delhivery status pushes.
//
// Flow: verify shared secret → normalize the payload → find the
// matching order (by waybill) in Firestore → merge the scans into
// order.delhivery → if Delhivery reports Delivered/RTO, move the
// order to delivered/returned (with audit entry) → email customer.
//
// Configure in Delhivery with:
//   URL:    https://<your-domain>/api/delhivery/webhook?secret=<DELHIVERY_WEBHOOK_SECRET>
// Always answers 200 so Delhivery does not disable the webhook.
// ─────────────────────────────────────────────────────────────
import { trackByAwb, isConfigured, mapToStoreStatus } from '../../shared/delhivery.mjs';
import { getOrdersDoc, patchOrdersDoc } from '../../shared/firestoreRest.mjs';
import { sendOrderMail } from '../../shared/mail.mjs';

function secretOk(req) {
  const expected = String(process.env.DELHIVERY_WEBHOOK_SECRET || '').trim();
  if (!expected) return true; // not configured — accept (logged as warning)
  const given =
    String(req.query.secret || '') ||
    String(req.headers['x-delhivery-signature'] || req.headers['x-webhook-secret'] || '');
  return given === expected;
}

/** Pull waybill + status out of the various Delhivery webhook shapes. */
function parseEvent(body) {
  const b = body || {};
  const waybill =
    b.waybill || b.wbn || b.awb || b.Waybill || b?.Shipment?.Waybill || b?.EventData?.Waybill || '';
  const status =
    b.current_status || b.Status || b?.Shipment?.Status?.Status || b?.EventData?.Status || '';
  return { waybill: String(waybill || '').trim(), status: String(status || '').trim() };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!secretOk(req)) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }

  try {
    // Safe body read — never let a malformed/BOM-prefixed body crash the fn.
    let body = {};
    try {
      body = req.body || {};
    } catch {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = JSON.parse(Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, '') || '{}');
    }
    const { waybill, status } = parseEvent(body);
    console.log('[delhivery] webhook:', JSON.stringify({ waybill, status }));

    if (!waybill) {
      console.warn('[delhivery] webhook without waybill — accepted, nothing to do');
      return res.json({ ok: true, ignored: 'no waybill in payload' });
    }
    if (!isConfigured()) {
      return res.json({ ok: true, ignored: 'Delhivery token not configured yet' });
    }

    // Pull the freshest tracking data directly from Delhivery (webhook
    // payloads vary; the API is the source of truth).
    const track = await trackByAwb(waybill);

    // Locate the order in Firestore by tracking number.
    const ordersDoc = await getOrdersDoc();
    if (!ordersDoc.ok) {
      console.warn('[delhivery] cannot read orders from Firestore:', ordersDoc.error);
      return res.json({ ok: true, ignored: 'orders document unavailable' });
    }
    const orders = ordersDoc.data || [];
    const idx = orders.findIndex(
      (o) => String(o.trackingNo || '').trim() === waybill || o.delhivery?.awb === waybill
    );
    if (idx === -1) {
      console.warn('[delhivery] no order matches waybill', waybill);
      return res.json({ ok: true, ignored: 'order not found' });
    }

    const order = orders[idx];
    const now = new Date().toISOString();
    const scans = track.ok ? track.scans : [];
    const courierStatus = track.ok ? track.status : status;
    const target = track.ok ? track.storeStatus : mapToStoreStatus(status);

    const next = [...orders];
    const updated = {
      ...order,
      courier: order.courier || 'Delhivery',
      delhivery: {
        ...(order.delhivery || {}),
        awb: waybill,
        status: courierStatus,
        ndr: Boolean(track.ndr),
        expectedDelivery: track.expectedDelivery || order.delhivery?.expectedDelivery || null,
        scans: scans.length ? scans : order.delhivery?.scans || [],
        lastSyncedAt: now,
      },
    };

    // Terminal statuses (delivered / returned) flow through the pipeline
    // with an audit entry; in-flight updates only refresh the scans.
    let mailed = false;
    if ((target === 'delivered' || target === 'returned') && order.status !== target) {
      updated.status = target;
      updated.statusHistory = [
        ...(order.statusHistory || []),
        {
          status: target,
          label: target === 'delivered' ? 'Delivered' : 'Returned',
          by: { name: 'Delhivery (auto)', role: 'courier' },
          note: `Auto-synced from Delhivery scan: ${courierStatus}`,
          at: now,
        },
      ];
      if (target === 'delivered' && (order.customerEmail || order.customer?.email)) {
        try {
          await sendOrderMail({
            type: 'delivered',
            to: order.customerEmail || order.customer?.email,
            order: {
              id: order.id,
              customerName: order.customer?.name,
              total: order.total,
              paymentMode: order.payment?.mode,
              orderDate: order.orderDate,
              trackingNo: waybill,
              courier: 'Delhivery',
            },
          });
          mailed = true;
        } catch (mailErr) {
          console.error('[delhivery] status mail failed:', mailErr.message);
        }
      }
    }
    next[idx] = updated;

    const write = await patchOrdersDoc(next);
    console.log('[delhivery] webhook processed:', {
      waybill,
      order: order.id,
      status: updated.status,
      scans: updated.delhivery.scans.length,
      written: write.written,
      mailed,
      writeError: write.error || null,
    });
    return res.json({ ok: true, order: order.id, status: updated.status, written: write.written });
  } catch (err) {
    console.error('delhivery webhook error:', err);
    // Never fail a webhook — Delhivery retries aggressively.
    return res.json({ ok: true, ignored: 'processing error' });
  }
}
