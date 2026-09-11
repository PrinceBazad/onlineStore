import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { formatINR, formatDateTime } from '../utils/format.js';
import { invoicePdfUrl, downloadInvoicePdf } from '../utils/invoicePdf.js';

const TIMELINE = [
  { status: 'placed', label: 'Placed' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'packed', label: 'Packed' },
  { status: 'shipped', label: 'Shipped' },
  { status: 'delivered', label: 'Delivered' },
];

export default function OrderManage() {
  const { user, isAdmin } = useAuth();
  const { orders, updateOrderStatus, settings } = useData();
  const { id } = useParams();
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  // Scoped page: only THIS order is ever shown. No tabs, no other orders, no settings.
  const order = orders.find((o) => o.id.toLowerCase() === String(id || '').toLowerCase());

  if (!user) {
    return <Navigate to="/login" replace state={{ from: `/order-manage/${id}` }} />;
  }

  const idx = order ? TIMELINE.findIndex((t) => t.status === order.status) : -1;

  return (
    <main className="page">
      <section className="card-box">
        <h1>Order Management</h1>
        <p className="muted">
          Scoped view for <strong>{id}</strong> — only this order is visible.
        </p>
      </section>

      {!isAdmin && (
        <section className="card-box" style={{ borderColor: 'var(--err)' }}>
          <p className="error" style={{ fontSize: '1.02rem', marginBottom: 6 }}>
            ⛔ You have no access to update the status of this order.
          </p>
          <p className="muted small">
            You are signed in as <strong>{user?.email}</strong>. Only the store admin can change the
            order status. You may view the details below in read-only mode.
          </p>
        </section>
      )}

      {!order && (
        <section className="card-box">
          <p className="error">Order not found. Please check the order number.</p>
        </section>
      )}

      {order && (
        <section className="card-box">
          <div className="ord-head">
            <strong style={{ fontSize: '1.05rem' }}>Order {order.id}</strong>
            <span className="muted">{formatDateTime(order.orderDate)}</span>
            <span className={`status-badge ${order.status}`}>{order.status.toUpperCase()}</span>
            <span className="ord-total">{formatINR(order.total)} · {order.payment?.mode}</span>
          </div>

          {isAdmin && (
            <div className="ord-actions" style={{ marginTop: 10 }}>
              <label className="ord-status-set">
                <span className="muted">Update status:</span>
                <select
                  value={order.status}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === order.status) return;
                    const label = val.charAt(0).toUpperCase() + val.slice(1);
                    if (val === 'cancelled' && !window.confirm(`Cancel order ${order.id}? This cannot be undone.`)) {
                      return;
                    }
                    updateOrderStatus(order.id, val, label);
                  }}
                >
                  {TIMELINE.map((t) => (
                    <option key={t.status} value={t.status}>{t.label}</option>
                  ))}
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <button
                type="button"
                className="btn btn-sm btn-gold"
                onClick={() => setInvoiceOrder(order)}
              >
                🧾 View Invoice PDF
              </button>
            </div>
          )}

          {idx >= 0 && (
            <div className="tl-row" style={{ marginTop: 16 }}>
              {TIMELINE.map((t, i) => (
                <div key={t.status} className={`tl-step ${i < idx ? 'done' : i === idx ? 'current' : ''}`}>
                  <div className="tl-dot">{i < idx ? '✓' : i + 1}</div>
                  <strong>{t.label}</strong>
                </div>
              ))}
            </div>
          )}
          <div className="ord-body" style={{ marginTop: 14 }}>
            <div>
              <p className="muted">{order.customer?.name} · {order.customer?.phone}</p>
              <p className="muted">
                {order.shipping?.address}, {order.shipping?.city}, {order.shipping?.state} — {order.shipping?.pincode}
              </p>
              <ul className="sum-items">
                {order.items.map((it) => (
                  <li key={it.id}>
                    <span>{it.name} × {it.qty}</span>
                    <span className="muted">{formatINR(it.price * it.qty)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card-box inner">
              <h3>Payment</h3>
              <p>
                <strong>{order.payment?.mode}</strong> ·{' '}
                {order.payment?.status === 'paid' ? 'Paid' : 'Pending (COD)'}
              </p>
              {order.payment?.gateway && <p className="muted tiny">{order.payment.gateway}</p>}
              <div className="sum-lines">
                <div><span>Subtotal</span><span>{formatINR(order.subtotal)}</span></div>
                <div><span>Shipping</span><span>{order.shippingFee > 0 ? formatINR(order.shippingFee) : 'FREE'}</span></div>
                <div><span>Total</span><span>{formatINR(order.total)}</span></div>
              </div>
              {order.refundInfo && (
                <p className="muted tiny" style={{ marginTop: 6 }}>
                  Refund: {order.refundInfo.type === 'razorpay_refund' ? 'initiated' : order.refundInfo.note || '—'}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {invoiceOrder && (
        <ManageInvoiceModal order={invoiceOrder} settings={settings} onClose={() => setInvoiceOrder(null)} />
      )}
    </main>
  );
}

function ManageInvoiceModal({ order, settings, onClose }) {
  const [url, setUrl] = useState('');
  React.useEffect(() => {
    let u = null;
    invoicePdfUrl(order, settings).then((v) => {
      u = v;
      setUrl(v);
    });
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [order, settings]);
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card invoice-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 860 }}>
        <div className="modal-head">
          <h2>Invoice — {order.id}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div style={{ padding: 16 }}>
          <div className="row-gap" style={{ marginBottom: 12 }}>
            <span className="muted">{formatDateTime(order.orderDate)} · {formatINR(order.total)}</span>
            <span style={{ flex: 1 }} />
            <button type="button" className="btn btn-sm btn-gold" onClick={() => downloadInvoicePdf(order, settings)}>
              ⬇ Download PDF
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>Close</button>
          </div>
          {url ? (
            <iframe
              title={`Invoice ${order.id}`}
              src={url}
              style={{ width: '100%', height: 520, border: '1px solid var(--line)', borderRadius: 8, background: '#fff' }}
            />
          ) : (
            <p className="muted">Preparing PDF…</p>
          )}
        </div>
      </div>
    </div>
  );
}
