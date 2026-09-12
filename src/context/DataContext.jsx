import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { db } from '../db.js';
import { listenFromFirestore } from '../db.js';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [products, setProducts] = useState(db.getProducts());
  const [orders, setOrders] = useState(db.getOrders());
  const [settings, setSettings] = useState(db.getSettings());
  const [reviews, setReviews] = useState(db.getReviews());
  const [messages, setMessages] = useState(db.getMessages());

  const updateSettings = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    db.saveSettings(next);
  };

  // Keep every open tab in sync when settings/data change in another tab
  // (e.g. switching payment mode in Admin should apply to the checkout tab instantly).
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'houselaxmicloth_settings') setSettings(db.getSettings());
      else if (e.key === 'houselaxmicloth_products') setProducts(db.getProducts());
      else if (e.key === 'houselaxmicloth_orders') setOrders(db.getOrders());
      else if (e.key === 'houselaxmicloth_reviews') setReviews(db.getReviews());
      else if (e.key === 'houselaxmicloth_messages') setMessages(db.getMessages());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Sync across devices via Firestore
  useEffect(() => {
    const unsubProducts = listenFromFirestore('houselaxmicloth_products', setProducts);
    const unsubOrders = listenFromFirestore('houselaxmicloth_orders', setOrders);
    const unsubSettings = listenFromFirestore('houselaxmicloth_settings', setSettings);
    const unsubReviews = listenFromFirestore('houselaxmicloth_reviews', setReviews);
    const unsubMessages = listenFromFirestore('houselaxmicloth_messages', setMessages);

    return () => {
      unsubProducts();
      unsubOrders();
      unsubSettings();
      unsubReviews();
      unsubMessages();
    };
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
    products.find((p) => p.id === productId)
      ? reviews.filter((r) => r.productId === productId)
      : [];

  const ratingFor = (productId) => {
    const list = reviewsFor(productId);
    if (!list.length) return { avg: 0, count: 0 };
    return {
      avg: list.reduce((s, x) => s + x.rating, 0) / list.length,
      count: list.length,
    };
  };

  // ----- message helpers -----
  const addMessage = ({ name, email, message }) => {
    const msg = {
      id: db.uid('MSG-'),
      name,
      email,
      message,
      status: 'pending',
      date: new Date().toISOString(),
    };
    const next = [msg, ...messages];
    setMessages(next);
    db.saveMessages(next);
    return msg;
  };

  const updateMessageStatus = (id, status) => {
    const next = messages.map((m) => (m.id === id ? { ...m, status } : m));
    setMessages(next);
    db.saveMessages(next);
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
      payment: payload.payment,
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
    // Order confirmation e-mail (fire-and-forget; skips when no mail API configured).
    postApi('/api/send-order-mail', {
      type: 'confirmed',
      to: order.customerEmail || order.customer?.email,
      order: {
        id: order.id,
        customerEmail: order.customerEmail || order.customer?.email,
        customerName: order.customer?.name,
        total: order.total,
        paymentMode: order.payment?.mode,
        orderDate: order.orderDate,
        storeName: settings.storeName,
      },
    });
    return order;
  };

  const canCancel = (order) => {
    if (!order) return false;
    if (order.status === 'cancelled' || order.status === 'packed' || order.status === 'shipped' || order.status === 'delivered') {
      return false;
    }
    return true;
  };

  // Orders that are still in progress (anything not delivered/cancelled).
  // While the user has such an order, name + mobile editing is locked.
  const TERMINAL_ORDER_STATUSES = ['delivered', 'cancelled'];
  const isOrderProcessing = (o) => {
    if (!o) return false;
    return !TERMINAL_ORDER_STATUSES.includes(String(o.status || '').toLowerCase());
  };
  const hasProcessingOrdersForUser = (u) => {
    if (!u) return false;
    return orders.some((o) => {
      const mine =
        (o.userId && u.id && o.userId === u.id) ||
        (o.customerEmail && u.email && String(o.customerEmail).toLowerCase() === String(u.email).toLowerCase());
      return mine && isOrderProcessing(o);
    });
  };

  const cancelOrder = (orderId, refundInfo) => {
    const next = orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            status: 'cancelled',
            statusHistory: [
              ...(o.statusHistory || []),
              { status: 'cancelled', label: 'Cancelled by customer', at: new Date().toISOString() },
            ],
            refundInfo: refundInfo || {
              type: 'self_cancel',
              cancelledAt: new Date().toISOString(),
              note: 'Cancelled by customer.',
            },
          }
        : o
    );
    setOrders(next);
    db.saveOrders(next);
  };

  const updateOrderStatus = (id, status, label, opts = {}) => {
    const at = new Date().toISOString();
    const by = opts.by
      ? {
          uid: opts.by.uid || opts.by.id,
          name: opts.by.name || opts.by.email || 'staff',
          role: opts.by.role || 'staff',
        }
      : null;
    let prevStatus = null;
    let changed = null;
    const next = orders.map((o) => {
      if (o.id !== id) return o;
      prevStatus = o.status;
      changed = {
        ...o,
        status,
        trackingNo: opts.trackingNo !== undefined ? opts.trackingNo : o.trackingNo,
        courier: opts.courier !== undefined ? opts.courier : o.courier,
        statusHistory: [
          ...(o.statusHistory || []),
          { status, label: label || status, by, note: opts.note || '', at },
        ],
      };
      return changed;
    });
    setOrders(next);
    db.saveOrders(next);

    if (changed) {
      // Server-side audit + status e-mail (fire-and-forget; safe when the API is missing).
      postApi('/api/update-order-status', {
        orderId: id,
        status,
        label: label || status,
        note: opts.note || '',
        trackingNo: changed.trackingNo || '',
        courier: changed.courier || '',
        previousStatus: prevStatus,
        by,
        orderInfo: {
          id: changed.id,
          customerEmail: changed.customerEmail || changed.customer?.email,
          customerName: changed.customer?.name,
          total: changed.total,
          paymentMode: changed.payment?.mode,
          orderDate: changed.orderDate,
          storeName: settings.storeName,
        },
      });
    }
  };

  // Internal (staff) notes on an order — visible to every staff member.
  const addOrderNote = (orderId, note, by) => {
    if (!note || !String(note).trim()) return;
    const entry = {
      id: db.uid('N-'),
      by: by ? { uid: by.uid || by.id, name: by.name || by.email || 'staff' } : null,
      note: String(note).trim(),
      at: new Date().toISOString(),
    };
    const next = orders.map((o) =>
      o.id === orderId ? { ...o, notes: [...(o.notes || []), entry] } : o
    );
    setOrders(next);
    db.saveOrders(next);
  };

  // Merge Delhivery courier data (scans/status/label) into an order
  // WITHOUT touching statusHistory — used by the tracking auto-sync.
  const mergeDelhivery = (orderId, delhiveryPatch) => {
    const at = new Date().toISOString();
    const next = orders.map((o) => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        courier: o.courier || 'Delhivery',
        delhivery: {
          ...(o.delhivery || {}),
          ...delhiveryPatch,
          lastSyncedAt: delhiveryPatch.lastSyncedAt || at,
        },
      };
    });
    setOrders(next);
    db.saveOrders(next);
  };

  // Best-effort calls to the Vercel API functions. Never blocks the store.
  const postApi = async (path, body) => {
    try {
      await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      /* dev/offline — server API is optional */
    }
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
      addOrderNote,
      mergeDelhivery,
      findOrder,
      canCancel,
      cancelOrder,
      isOrderProcessing,
      hasProcessingOrdersForUser,
      messages,
      addMessage,
      updateMessageStatus,
    }),
    [products, orders, settings, reviews, messages]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
