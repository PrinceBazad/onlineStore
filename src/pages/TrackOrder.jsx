import React, { useState, useEffect } from 'react';

export default function TrackOrder() {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Reset order state on mount to prevent stale data issues
    setOrder(null);
    setError('');
  }, []);

  const handleTrack = (e) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    // ... tracking logic
  };

  return (
    <div className="page">
      <div className="container">
        <h1>Track Your Order</h1>
        <form onSubmit={handleTrack}>
          <label>Order ID
            <input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="Enter your order ID"
            />
          </label>
          <button type="submit" className="btn btn-gold">Track Order</button>
        </form>
        {order && (
          <div className="order-details">
            {/* order details */}
          </div>
        )}
      </div>
    </div>
  );
}
