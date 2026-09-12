// ─────────────────────────────────────────────────────────────
// shared/delhivery.mjs — Delhivery API client (token-ready).
//
// ACTIVATION: set these env vars in Vercel and the integration
// switches on with zero code changes:
//   DELHIVERY_API_TOKEN      — the API token from Delhivery (required)
//   DELHIVERY_PICKUP_NAME    — registered warehouse/pickup name (optional;
//                              defaults to the account's default pickup)
//   DELHIVERY_WEBHOOK_SECRET — shared secret for /api/delhivery/webhook
//
// Until DELHIVERY_API_TOKEN exists, every endpoint reports
// { configured: false } and the UI falls back to manual AWB entry.
// ─────────────────────────────────────────────────────────────

// Production: https://track.delhivery.com
// Sandbox/demo (when Delhivery issues a staging token): usually
// https://staging.track.delhivery.com — set DELHIVERY_API_BASE to it
// while testing, and remove it when going live.
const BASE = String(process.env.DELHIVERY_API_BASE || 'https://track.delhivery.com').replace(/\/+$/, '');

export function isConfigured() {
  return Boolean(String(process.env.DELHIVERY_API_TOKEN || '').trim());
}

function authHeaders(extra = {}) {
  return {
    Authorization: `Token ${String(process.env.DELHIVERY_API_TOKEN || '').trim()}`,
    Accept: 'application/json',
    ...extra,
  };
}

function authFetch(url, options = {}) {
  return fetch(url, { ...options, headers: authHeaders(options.headers) });
}

// ── Create a shipment (waybill) ──────────────────────────────
// order: { id, customer:{name,phone}, shipping:{address,city,state,pincode},
//          items:[{name,qty}], payment:{mode,status}, total }
// Returns { ok, waybill, labelUrl, raw } or { ok:false, error }.
export async function createShipment(order, pickup = {}) {
  if (!isConfigured()) return { ok: false, error: 'Delhivery API token not configured' };

  const ship = order.shipping || {};
  const items = (order.items || []).map((it) => `${it.name} x${it.qty}`).join(', ');
  const isCod = String(order.payment?.mode || '').toLowerCase() === 'cod' && order.payment?.status !== 'paid';

  const shipment = {
    name: order.customer?.name || 'Customer',
    add: ship.address || '',
    pin: String(ship.pincode || '').slice(0, 6),
    city: ship.city || '',
    state: ship.state || '',
    country: 'India',
    phone: String(order.customer?.phone || '').replace(/\D/g, '').slice(-10),
    order: order.id,
    payment_mode: isCod ? 'COD' : 'Prepaid',
    total_amount: String(order.total || 0),
    cod_amount: isCod ? String(order.total || 0) : '0',
    products_desc: (items || 'Apparel').slice(0, 180),
    quantity: Math.max(1, (order.items || []).reduce((s, it) => s + (Number(it.qty) || 1), 0)),
    shipment_width: '30',
    shipment_height: '5',
    shipment_length: '25',
    weight: '500', // grams — adjust per product later if needed
    seller_name: pickup.sellerName || order.storeName || 'Store',
  };

  const payload = {
    shipments: [shipment],
    pickup_location: {
      name: pickup.name || String(process.env.DELHIVERY_PICKUP_NAME || 'Primary'),
      add: pickup.address || ship.address || '',
      city: pickup.city || ship.city || '',
      pin_code: pickup.pincode || String(ship.pincode || '').slice(0, 6),
      country: 'India',
      phone: pickup.phone || shipment.phone,
    },
  };

  try {
    const body = new URLSearchParams({ format: 'json', data: JSON.stringify(payload) });
    const res = await authFetch(`${BASE}/api/cmu/create.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = raw?.rmk || raw?.error || raw?.message || `HTTP ${res.status}`;
      return { ok: false, error: `Delhivery rejected the shipment: ${msg}`, raw };
    }
    const pkg = Array.isArray(raw) ? raw[0] : raw?.packages?.[0] || raw;
    const waybill = pkg?.waybill || raw?.waybill || '';
    if (!waybill) return { ok: false, error: 'Delhivery returned no waybill', raw };
    return {
      ok: true,
      waybill: String(waybill),
      labelUrl: pkg?.label_url || raw?.label_url || '',
      raw,
    };
  } catch (err) {
    return { ok: false, error: err.message || 'Network error calling Delhivery' };
  }
}

// ── Track by AWB ─────────────────────────────────────────────
// Returns { ok, awb, status, storeStatus, scans, lastScan } .
export async function trackByAwb(awb) {
  const wbn = String(awb || '').trim();
  if (!wbn) return { ok: false, error: 'awb required' };
  if (!isConfigured()) return { ok: false, error: 'Delhivery API token not configured', configured: false };

  try {
    let raw = null;
    // Newer shipments endpoint first, fall back to legacy packages endpoint.
    let res = await authFetch(`${BASE}/track/v1/shipments/?awbs=${encodeURIComponent(wbn)}&format=json`);
    if (res.ok) raw = await res.json().catch(() => null);
    if (!raw || !(raw.ShipmentData || raw.shipment_data)) {
      res = await authFetch(`${BASE}/api/v1/packages/json/?wbn=${encodeURIComponent(wbn)}`);
      raw = res.ok ? await res.json().catch(() => null) : null;
    }
    if (!raw) return { ok: false, error: `Delhivery tracking unavailable (HTTP ${res.status})` };

    const shipment = raw.ShipmentData?.[0]?.Shipment || raw.shipment_data?.[0]?.Shipment || null;
    if (!shipment) return { ok: false, error: 'No shipment found for this AWB' };

    const scans = normalizeScans(shipment);
    const current = shipment.Status || shipment.StatusDetails || {};
    const statusText = current.Status || current.StatusInformation || shipment.status || '';
    return {
      ok: true,
      awb: shipment.Waybill || wbn,
      status: String(statusText),
      storeStatus: mapToStoreStatus(statusText),
      ndr: /undeliver/i.test(String(statusText)) && !/rto/i.test(String(statusText)),
      scans,
      lastScan: scans[0] || null,
      expectedDelivery: shipment.ExpectedDeliveryDate || shipment.Expected_delivery_date || null,
    };
  } catch (err) {
    return { ok: false, error: err.message || 'Network error calling Delhivery' };
  }
}

// ── Normalizers / mapping ────────────────────────────────────
function normalizeScans(shipment) {
  const rawScans = shipment.Scans || shipment.scans || [];
  const list = rawScans.map((s) => {
    const sc = s.Scan || s.scan || s;
    const detail = sc.ScanDetail || sc.scan_detail || {};
    return {
      status: sc.ScanType || sc.scan_type || sc.ScanStatus || sc.scan_status || sc.Status || '',
      detail: sc.Scan || sc.scan || detail.Instruction || detail.Remark || '',
      location: detail.ScannedLocation || detail.scanned_location || sc.ScannedLocation || '',
      time: detail.ScannedAt || detail.scanned_at || sc.ScannedAt || sc.Time || '',
    };
  });
  // Most recent first.
  return list.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
}

/**
 * Map a Delhivery status string to our canonical pipeline.
 * Returns 'delivered' | 'returned' | 'shipped' (anything in-flight is
 * still "shipped" from the store's point of view).
 */
export function mapToStoreStatus(raw) {
  const s = String(raw || '').toLowerCase();
  if (s.includes('rto') && s.includes('deliver')) return 'returned';
  if (s.includes('lost') || s.includes('damaged')) return 'returned';
  if (s.includes('delivered') && !s.includes('rto')) return 'delivered';
  if (s.includes('rto')) return 'returned';
  return 'shipped';
}

