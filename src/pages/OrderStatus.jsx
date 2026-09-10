import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Navigate, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatINR, formatDateTime } from '../utils/format.js';

export default function OrderStatus() {
  const { user } = useAuth();
  const { findOrder, canCancel, cancelTimeRemaining, cancelOrder } = useData();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const timerRef = useRef(null);

  // NOTE: all hooks MUST be called on every render — React forbids
  // returning early before a hook (error #300). The auth redirect below
  // is therefore placed AFTER every useState/useEffect call.
  useEffect(() => {
    const q = params.get('order');
    if (q) {
      setQuery(q);
      const found = findOrder(q);
      setOrder(found || null);
      setNotFound(!found);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  if (!user) {
    return <Navigate to="/login" replace state={{ from: '/track' }} />;
  }

  const search = (e) => {
    e.preventDefault();
    const found = findOrder(query.trim());
    setOrder(found || null);
    setNotFound(!found);
  };

  const timeline = [
    { status: 'placed', label: 'Order Placed' },
    { status: 'confirmed', label: 'Confirmed' },
    { status: 'shipped', label: 'Shipped' },
    { status: 'delivered', label: 'Delivered' },
  ];
  const currentIndex = order
    ? timeline.findIndex((t) => t.status === order.status)
    : -1;

  const eligible = order && canCancel(order);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (!eligible) {
      setRemaining(null);
      return;
    }
    // Recompute remaining time every second so the displayed MM:SS
    // actually decrements on screen.
    const tick = () => {
      setRemaining(cancelTimeRemaining(order));
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [order && order.id, eligible]);

  const onCancel = (e) => {
    e.preventDefault();
    if (!eligible) return;
    cancelOrder(order.id);
    navigate('/orders');
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
            {timeline.map((t, i) => {
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

          {eligible ? (
            <div className="cancel-box">
              <h3>Cancel this order</h3>
              {remaining ? (
                <>
                  <div className="cancel-row">
                    <div>
                      <p className="muted tiny">Time remaining to cancel</p>
                      <p className="cancel-count">
                        {String(remaining.mins).padStart(2, '0')}:{' '}
                        {String(remaining.secs).padStart(2, '0')}
                      </p>
                    </div>
                    <button
                      className="btn btn-block cancel-btn"
                      onClick={onCancel}
                    >
                      Cancel order · {formatINR(order.total)}
                    </button>
                  </div>
                  <p className="cancel-explain">
                    You can cancel this order within 1 hour of placing it. After that, cancellation is not available.
                  </p>
                </>
              ) : (
                <p className="cancel-explain">This order can be cancelled within 1 hour of placing it. Time has expired.</p>
              )}
            </div>
          ) : ownsOrder ? (
            <div className="cancel-box cant">
              <h3>Cancellation window closed</h3>
              <p className="cancel-explain">
                This order was placed more than 1 hour ago and can no longer be cancelled.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}