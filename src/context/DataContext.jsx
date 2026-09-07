import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { db } from '../db.js';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [products, setProducts] = useState(db.getProducts());
  const [orders, setOrders] = useState(db.getOrders());
  const [settings, setSettings] = useState(db.getSettings());
  const [reviews, setReviews] = useState(db.getReviews());

  const updateSettings = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    db.saveSettings(next);
  };
// Keep every open tab in sync when settings/data change in another tab
  // (e.g. switching payment mode in Admin should apply to the checkout tab instantly).
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'baani_settings') setSettings(db.getSettings());
      else if (e.key === 'baani_products') setProducts(db.getProducts());
      else if (e.key === 'baani_orders') setOrders(db.getOrders());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // ----- reviews -----
  const addReview = ({ productId, userId, userName, rating, comment }) => {
    const rev = {
      id: db.uid('R-'),
      productId,
      userId,
      userName,
      rating: Math.min(5, Math.max(1, Number(rating))),
      comment,
      date: new Date().toISOString(),
    };
    const idx = reviews.findIndex(
      (r) => r.productId === productId && r.userId === userId
    );
    let next;
    if (idx >= 0) {
      next = reviews.map((r, i) => (i === idx ? rev : r));
    } else {
      next = [rev, ...reviews];
    }
    setReviews(next);
    db.saveReviews(next);
  };

  const reviewsFor = (productId) =>
    reviews.filter((r) => r.productId === productId);

  const ratingFor = (productId) => {
    const rs = reviewsFor(productId);
    if (!rs.length) return { avg: 0, count: 0 };
    return {
      avg: rs.reduce((s, x) => s + x.rating, 0) / rs.length,
      count: rs.length,
    };
  };

  // ----- product admin helpers -----
  const addProduct = (data) => {
    const product = {
      id: db.uid('P-'),
      ...data,
    };
    const next = [product, ...products];
    setProducts(next);
    db.saveProducts(next);
    return product;
  };

  const updateProduct = (id, data) => {
    const next = products.map((p) => (p.id === id ? { ...p, ...data } : p));
    setProducts(next);
    db.saveProducts(next);
  };

  const deleteProduct = (id) => {
    const next = products.filter((p) => p.id !== id);
    setProducts(next);
    db.saveProducts(next);
  };

  // ----- order helpers -----
  const placeOrder = (payload) => {
    const order = {
      id: db.uid('ORD-'),
      orderDate: new Date().toISOString(),
      userId: payload.userId || null,
      customerEmail:
        payload.customer?.email ||
        (payload.userEmail ? payload.userEmail : null),
      items: payload.items,
      customer: payload.customer,
      shipping: payload.shipping,
      payment: payload.payment, // method + status
      subtotal: payload.subtotal,
      shippingFee: payload.shippingFee,
      total: payload.total,
      status: payload.payment.method === 'cod' ? 'confirmed' : 'paid',
      statusHistory: [
        {
          status: 'placed',
          label: 'Order Placed',
          at: new Date().toISOString(),
        },
      ],
    };
    const next = [order, ...orders];
    setOrders(next);
    db.saveOrders(next);
    return order;
  };

  const updateOrderStatus = (id, status, label) => {
    const next = orders.map((o) =>
      o.id === id
        ? {
            ...o,
            status,
            statusHistory: [
              ...o.statusHistory,
              { status, label, at: new Date().toISOString() },
            ],
          }
        : o
    );
    setOrders(next);
    db.saveOrders(next);
  };

  const findOrder = (id) => orders.find((o) => o.id.toLowerCase() === id.toLowerCase());

  const value = useMemo(
    () => ({
      products,
      orders,
      settings,
      updateSettings,
      reviews,
      addReview,
      reviewsFor,
      ratingFor,
      addProduct,
      updateProduct,
      deleteProduct,
      placeOrder,
      updateOrderStatus,
      findOrder,
    }),
    [products, orders, settings, reviews]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}