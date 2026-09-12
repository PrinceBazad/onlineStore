import React, { useState, useEffect } from 'react';
import { useSearchParams, Navigate, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

import { formatINR, formatDateTime } from '../utils/format.js';
import { fetchDelhiveryTrack, isDelhiveryOrder } from '../utils/delhivery.js';


const ORD_TIMELINE = [
  { status: 'placed', label: 'Order Placed' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'packed', label: 'Packed' },
  { status: 'shipped', label: 'Shipped' },
  { status: 'delivered', label: 'Delivered' },
];

export default function OrderStatus() {
  const { user } = useAuth();
  const { findOrder, canCancel, cancelOrder } = useData();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [err, setErr] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [courierTrack, setCourierTrack] = useState(null);
  const [courierBusy, setCourierBusy] = useState(false);

  // Live courier tracking for shipped/delivered Delhivery parcels.
  const loadCourierTrack = async () => {
    const awb = order?.trackingNo;
    if (!awb) return;
    setCourierBusy(true);
    const t = await fetchDelhiveryTrack(awb);
    setCourierTrack(t.ok ? t : t.configured === false ? { notConfigured: true } : { error: t.error });
    setCourierBusy(false);
  };

  useEffect(() => {
    setCourierTrack(null);
    if (!order || !order.trackingNo) return undefined;
    if (!isDelhiveryOrder(order)) return undefined;
    if (!(order.status === 'shipped' || order.status === 'delivered')) return undefined;
    let cancelled = false;
    (async () => {
      const t = await fetchDelhiveryTrack(order.trackingNo);
      if (cancelled) return;
      setCourierTrack(t.ok ? t : t.configured === false ? { notConfigured: true } : { error: t.error });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, order?.status]);

  useEffect(() => {
    const q = params.get('order');
    if (q) {
      setQuery(q);
      const found = findOrder(q);
      setOrder(found || null);
      setNotFound(!found);
    }
  }, [params, findOrder]);

  if (!user) {
    return <Navigate to="/login" replace state={{ from: '/track' }} />;
  }

  const search = (e) => {
    e.preventDefault();
    const found = findOrder(query.trim());
    setOrder(found || null);
    setNotFound(!found);
  };

  const currentIndex = order
    ? ORD_TIMELINE.findIndex((t) => t.status === order.status)
    : -1;

  const eligible = order && canCancel(order);
  const latestStatus = order?.status || '';
  const isPacked = latestStatus === 'packed';
  const isShippedOrLater = latestStatus === 'shipped' || latestStatus === 'delivered';

  const onCancel = async (e) => {
    e.preventDefault();
    if (!eligible || cancelling) return;
    const latest = findOrder(order.id);
    const st = latest?.status || order.status;
    if (['packed', 'shipped', 'delivered', 'cancelled'].includes(st)) {
      setErr('This order can no longer be cancelled (current status: ' + st + ').');
      if (latest) setOrder(latest);
      return;
    }
    setCancelling(true);
    setErr('');
    try {
      const payRef = order?.payment?.ref ? String(order.payment.ref) : '';
      const isOnlinePayment =
        order?.payment?.gateway === 'Razorpay' && payRef.startsWith('pay_');
      let refundInfo = null;
      if (isOnlinePayment) {
        const res = await fetch('/api/refund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            paymentRef: payRef,
            amount: order.total,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.refunded) {
          throw new Error(data.error || 'Refund failed. Please contact support.');
        }
        refundInfo = {
          type: 'razorpay_refund',
          refundId: data.refundId || null,
          refundedAt: new Date().toISOString(),
          note: 'Refund initiated to the original payment method. It will be credited back to the same account in 5-7 working days.',
        };
      } else {
        refundInfo = {
          type: 'no_payment_refund',
          refundedAt: new Date().toISOString(),
          note: 'No online payment was made for this order, so no refund was needed.',
        };
      }
      cancelOrder(order.id, refundInfo);
      navigate('/orders', { state: { cancelledOrder: order.id, refundInfo } });
    } catch (ex) {
      setErr(ex.message || 'Could not cancel this order.');
      setCancelling(false);
    }
  };

  const ownsOrder =
    order &&
    (order.userId === user.id ||
      (order.customerEmail &&
        order.customerEmail.toLowerCase() === user.email.toLowerCase()));

  return (
    <main className="page track">
      <div className="page-head">
        <h1>Track Your Order</h1>
        <p>Enter your order ID to see its live status.</p>
      </div>

      <form onSubmit={search} className="track-form">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. ORD-K8X2F9ABC1"
          className="search-input"
        />
        <button className="btn btn-gold">Track order</button>
      </form>

      {notFound && <p className="error center">No order found with that ID. Please check and try again.</p>}

      {order && (
        <div className="track-result card-box">
          <div className="track-head">
            <div>
              <h2>Order {order.id}</h2>
              <p className="muted">Placed on {formatDateTime(order.orderDate)}</p>
            </div>
            <span className={`status-badge ${order.status}`}>{order.status.toUpperCase()}</span>
          </div>

          <div className="timeline">
            {ORD_TIMELINE.map((t, i) => {
              const done = i <= currentIndex;
              const isCurrent = i === currentIndex;
              return (
                <div className={`tl-step ${done ? 'done' : ''} ${isCurrent ? 'current' : ''}`} key={t.status}>
                  <div className="tl-dot">{done ? '✓' : i + 1}</div>
                  <div>
                    <strong>{t.label}</strong>
                    {isCurrent && <span className="tl-now">Current status</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {order.status === 'shipped' || order.status === 'delivered' ? (
            <div className="card-box inner" style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <h3 style={{ margin: 0 }}>Courier tracking</h3>
                {order.trackingNo && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={loadCourierTrack}
                    disabled={courierBusy}
                  >
                    {courierBusy ? 'Checking…' : '⟳ Refresh'}
                  </button>
                )}
              </div>
              {order.trackingNo ? (
                <p className="muted" style={{ margin: '6px 0' }}>
                  📦 {order.courier || 'Courier'} · <strong>{order.trackingNo}</strong>
                  {order.delhivery?.expectedDelivery ? ` · Expected by ${formatDateTime(order.delhivery.expectedDelivery)}` : ''}
                </p>
              ) : (
                <p className="muted" style={{ margin: '6px 0' }}>
                  A courier tracking number will appear here once your parcel is handed over to the courier.
                </p>
              )}
              {courierTrack?.notConfigured && (
                <p className="muted small">
                  Live courier updates are coming soon. Meanwhile, your order status above is kept up to date by our team.
                </p>
              )}
              {courierTrack?.error && !courierTrack?.notConfigured && (
                <p className="muted small">Could not load live courier updates right now. Please refresh later.</p>
              )}
              {courierTrack?.ok && (
                <>
                  <p className="small" style={{ margin: '6px 0' }}>
                    Current: <strong>{courierTrack.status}</strong>
                  </p>
                  <ul className="audit-list">
                    {courierTrack.scans.map((sc, i) => (
                      <li key={i}>
                        <strong>{sc.status}</strong>
                        {sc.location ? ` · ${sc.location}` : ''}
                        {sc.detail ? ` — ${sc.detail}` : ''}
                        {sc.time ? <span className="muted"> · {formatDateTime(sc.time)}</span> : null}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : null}

          <div className="track-meta">
            <div className="card-box inner">
              <h3>Items</h3>
              <ul className="sum-items">
                {order.items.map((it) => (
                  <li key={it.id}><span>{it.name} × {it.qty}</span><span>{formatINR(it.price * it.qty)}</span></li>
                ))}
              </ul>
              <div className="sum-lines">
                <div><span>Total</span><span>{formatINR(order.total)}</span></div>
              </div>
            </div>
            <div className="card-box inner">
              <h3>Payment</h3>
              <p><strong>{order.payment.mode}</strong> · {order.payment.status === 'paid' ? 'Paid' : 'Pending (COD)'}</p>
              <h3 className="m-top">Ship to</h3>
              <p>
                {order.customer?.name}<br />
                {order.shipping?.address}, {order.shipping?.city},<br />
                {order.shipping?.state} — {order.shipping?.pincode}
              </p>
              <p className="muted">{order.customer?.phone}</p>
            </div>
          </div>

          {order.status === 'cancelled' ? (
            <div className="cancel-box cant">
              <h3>Order Cancelled</h3>
              {order.refundInfo && (
                <>
                  <p><strong>Refund:</strong> {order.refundInfo.type === 'razorpay_refund' ? 'Refund initiated' : 'No refund needed'}</p>
                  <p>{order.refundInfo.note}</p>
                  {order.refundInfo.refundId && <p className="muted tiny">Refund ID: {order.refundInfo.refundId}</p>}
                  {order.refundInfo.type === 'razorpay_refund' && (
                    <p className="cancel-explain">The money will be credited back to the same account or payment method you used for this order in 5-7 working days.</p>
                  )}
                </>
              )}
            </div>
          ) : isPacked ? (
            <div className="cancel-box cant">
              <h3>Cannot Cancel - Order Packed</h3>
              <p className="cancel-explain">
                This order has been packed and is being prepared for shipment. Cancellation is not available once the order is packed.
              </p>
            </div>
          ) : isShippedOrLater ? (
            <div className="cancel-box cant">
              <h3>Cannot Cancel - Order Shipped</h3>
              <p className="cancel-explain">
                This order has already been shipped. Cancellation is not available for shipped orders.
              </p>
            </div>
          ) : ownsOrder && eligible ? (
            <div className="cancel-box">
              <h3>Cancel this order</h3>
              <div className="cancel-row">
                <div>
                  <p className="muted tiny">You can cancel this order before it is packed.</p>
                </div>
                <button
                  className="btn btn-block cancel-btn"
                  onClick={onCancel}
                  disabled={cancelling}
                >
                  {cancelling ? 'Cancelling...' : `Cancel order - ${formatINR(order.total)}`}
                </button>
              </div>
              {err && <p className="error" style={{ marginTop: 8 }}>{err}</p>}
              <p className="cancel-explain">
                If you cancel, the order will be cancelled and any online payment will be refunded to the original payment method.
              </p>
            </div>
          ) : (
            <div className="cancel-box cant">
              <h3>Cancellation Not Available</h3>
              <p className="cancel-explain">
                You can only cancel orders that are in Placed or Confirmed status and belong to your account.
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}