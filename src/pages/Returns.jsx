import React, { useState } from 'react';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { formatINR, formatDateTime } from '../utils/format.js';
import { bookReversePickup } from '../utils/delhivery.js';

const REASONS = [
  "Wrong size / doesn't fit",
  'Wrong item sent',
  'Damaged / defective',
  'Different from description / photo',
  'Quality not as expected',
  'Not needed anymore',
];

export default function Returns() {
  const { user } = useAuth();
  const { orders, products, settings, returns, addReturnRequest, updateReturnStatus, activeReturnForOrder } = useData();
  const [params] = useSearchParams();
  const [orderId, setOrderId] = useState(params.get('order') || '');
  const [qtyMap, setQtyMap] = useState({});
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) return <Navigate to="/login" replace state={{ from: '/returns' }} />;

  const mail = String(user.email || '').toLowerCase();
  const mine = orders.filter(
    (o) => o.userId === user.id || (o.customerEmail && String(o.customerEmail).toLowerCase() === mail)
  );
  const myReturns = returns.filter(
    (r) => r.userId === user.id || (r.email && String(r.email).toLowerCase() === mail)
  );

  const deliveredAt = (o) => {
    const entry = (o.statusHistory || []).find((h) => String(h.status).toLowerCase() === 'delivered');
    return entry && entry.at ? new Date(entry.at).getTime() : 0;
  };

  // eligible = delivered, inside the return window, and no active return yet.
  const daysFor = (o) =>
    (o.items || [])
      .map((it) => {
        const p = products.find((x) => x.id === it.id);
        return p && typeof p.returnDays === 'number' ? p.returnDays : 7;
      })
      .reduce((a, b) => Math.min(a, b), 7);

  const canReturn = (o) => {
    if (String(o.status || '').toLowerCase() !== 'delivered') return false;
    if (activeReturnForOrder(o.id)) return false;
    const d = deliveredAt(o);
    if (!d) return false;
    return Date.now() <= d + daysFor(o) * 86400000;
  };

  const eligible = mine.filter(canReturn);
  const selected = mine.find((o) => o.id === orderId);

  const setQty = (itemId, val) => {
    const max = Math.max(1, Number((selected ? selected.items.find((it) => it.id === itemId) : {}).qty) || 1);
    setQtyMap({ ...qtyMap, [itemId]: Math.max(1, Math.min(max, Number(val) || 1)) });
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    if (!selected) return setMsg('Select an order to return.');
    if (!canReturn(selected)) return setMsg('This order is not eligible for a return.');
    const items = (selected.items || [])
      .map((it) => ({ id: it.id, name: it.name, size: it.size || '', qty: qtyMap[it.id] || it.qty || 1 }))
      .filter((it) => it.qty > 0);
    if (items.length === 0) return setMsg('Select at least one item to return.');

    setBusy(true);
    const ret = addReturnRequest({ order: selected, items, reason, note, user });
    if (!ret) {
      setBusy(false);
      return setMsg('A return for this order is already in progress.');
    }

    // Auto-book the reverse pickup with Delhivery (DEMO-friendly).
    try {
      const booking = await bookReversePickup({
        ...ret,
        shipping: selected.shipping || {},
        pickupName: settings.storeName,
        paymentMode: selected.payment?.mode,
      });
      if (booking.ok && booking.waybill) {
        updateReturnStatus(ret.id, 'approved', {
          pickupAwb: booking.waybill,
          pickupBookedAt: new Date().toISOString(),
          pickupDemo: booking.demo === true,
        });
        setMsg(`✓ Pickup booked${booking.demo ? ' (Demo AWB)' : ''} — ${booking.waybill}. Delhivery will collect your return soon.`);
      } else if (booking.configured === false) {
        updateReturnStatus(ret.id, 'approved', {
          pickupNote: 'Manual pickup needed (Delhivery token not set)',
        });
        setMsg('Return registered — we will contact you to schedule the pickup, since auto booking is not configured yet.');
      } else {
        updateReturnStatus(ret.id, 'approved', { pickupNote: 'Auto booking failed — manual pickup' });
        setMsg(`Return registered. Auto pickup failed (${booking.error || 'unknown'}) — we will contact you to schedule it.`);
      }
    } catch {
      updateReturnStatus(ret.id, 'approved', { pickupNote: 'Manual pickup needed' });
      setMsg('Return registered. We will contact you to schedule the pickup.');
    } finally {
      setBusy(false);
      setNote('');
    }
  };
return (
    <main className="page">
      <div className="page-head">
        <h1>Returns &amp; exchanges</h1>
        <p>Return a delivered order — pickup arranged by {settings.storeName}</p>
      </div>

      {myReturns.length > 0 && (
        <section className="card-box">
          <h2>My return requests</h2>
          <div className="orders-list">
            {myReturns.map((r) => (
              <div className="order-row" key={r.id}>
                <div className="ord-head">
                  <strong>{r.id}</strong>
                  <span className="muted">{formatDateTime(r.requestDate)}</span>
                  <span className={`status-badge ${r.status}`}>{r.status.toUpperCase()}</span>
                </div>
                <div className="ord-body">
                  <div>
                    <p className="muted">Order {r.orderId} · {r.reason}</p>
                    <p className="muted tiny">
                      {r.items.map((it) => `${it.name}${it.size ? ` (${it.size})` : ''} ×${it.qty}`).join(', ')}
                    </p>
                  </div>
                  <div className="ord-actions">
                    <span className="muted tiny">
                      {r.pickupAwb ? `Pickup AWB: ${r.pickupAwb}` : 'Pickup pending scheduling'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card-box">
        <h2>Start a return</h2>
        {eligible.length === 0 ? (
          <p className="muted">
            No delivered orders are eligible right now. Returns can be started within the return window shown on each product.
            <Link to="/orders" className="linklike"> View my orders →</Link>
          </p>
        ) : (
          <form onSubmit={submit} className="form">
            <label>Choose a delivered order
              <select value={orderId} onChange={(e) => { setOrderId(e.target.value); setQtyMap({}); }}>
                <option value="">— Select order —</option>
                {eligible.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id} · {formatINR(o.total)} · delivered {formatDateTime(deliveredAt(o))}
                  </option>
                ))}
              </select>
            </label>

            {selected && (
              <>
                <label style={{ display: 'block', marginBottom: 6 }}>Items &amp; quantities to return</label>
                {(selected.items || []).map((it) => (
                  <div key={it.id} className="return-qty-row">
                    <span>{it.name}{it.size ? ` (Size ${it.size})` : ''} — owned {it.qty}</span>
                    <input
                      type="number"
                      min="1"
                      max={it.qty}
                      value={qtyMap[it.id] || it.qty}
                      onChange={(e) => setQty(it.id, e.target.value)}
                      aria-label={`Quantity of ${it.name}`}
                    />
                  </div>
                ))}

                <label>Reason
                  <select value={reason} onChange={(e) => setReason(e.target.value)}>
                    {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                <label>Anything else? (optional)
                  <textarea rows="2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. the blouse stitching came loose" />
                </label>

                {busy && <p className="muted">Booking the reverse pickup with Delhivery…</p>}
                <button className="btn btn-gold" type="submit" disabled={busy}>
                  {busy ? 'Booking pickup…' : 'Request return →'}
                </button>
              </>
            )}
            {msg && (
              <p className={msg.startsWith('✓') || msg.startsWith('Return registered') ? 'ok' : 'error'}>{msg}</p>
            )}
          </form>
        )}
      </section>
    </main>
  );
}