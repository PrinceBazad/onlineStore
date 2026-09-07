import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { formatINR, formatDateTime } from '../utils/format.js';

export default function MyOrders() {
  const { user } = useAuth();
  const { orders } = useData();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: '/orders' }} />;
  }

  const mine = orders.filter(
    (o) =>
      o.userId === user.id ||
      (o.customerEmail &&
        o.customerEmail.toLowerCase() === user.email.toLowerCase())
  );

  return (
    <main className="page">
      <div className="page-head">
        <h1>My Orders</h1>
        <p>Your complete order history</p>
      </div>

      {mine.length === 0 ? (
        <div className="center empty">
          <p>You haven't placed any orders yet.</p>
          <Link to="/catalog" className="btn btn-gold">Start shopping</Link>
        </div>
      ) : (
        <div className="orders-list">
          {mine.map((o) => (
            <div className="order-row" key={o.id}>
              <div className="ord-head">
                <strong>Order {o.id}</strong>
                <span className="muted">{formatDateTime(o.orderDate)}</span>
                <span className={`status-badge ${o.status}`}>{o.status.toUpperCase()}</span>
                <span className="ord-total">{formatINR(o.total)} · {o.payment.mode}</span>
              </div>
              <div className="ord-body">
                <div>
                  <ul className="sum-items">
                    {o.items.map((it) => (
                      <li key={it.id}><span>{it.name} × {it.qty}</span><span>{formatINR(it.price * it.qty)}</span></li>
                    ))}
                  </ul>
                  <p className="muted">
                    Shipped to {o.shipping?.address}, {o.shipping?.city} — {o.shipping?.pincode}
                  </p>
                </div>
                <div className="ord-actions">
                  <Link to={`/track?order=${o.id}`} className="btn btn-sm">Track order</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}