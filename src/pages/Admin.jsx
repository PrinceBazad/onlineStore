import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { formatINR, formatDateTime } from '../utils/format.js';
import { productImage } from '../db.js';

const CATS = ['Suits', 'Ethnic', 'Lehenga', 'Saree', 'Daily Wear'];
const NEXT_STATUS = {
  placed: ['confirmed', 'Confirmed'],
  confirmed: ['shipped', 'Shipped'],
  shipped: ['delivered', 'Delivered'],
};

const ALL_PAY = [
  { id: 'upi', label: 'UPI' },
  { id: 'card', label: 'Card' },
  { id: 'cod', label: 'COD' },
];

const emptyForm = {
  name: '',
  description: '',
  category: 'Suits',
  price: '',
  mrp: '',
  stock: 10,
  featured: false,
  color: '#9b1c3d',
  shippingCost: 99,
  paymentMethods: ['upi', 'card', 'cod'],
  returnsAccepted: true,
  returnDays: 7,
  customImage: '',
};

export default function Admin() {
  const { isAdmin } = useAuth();
  const { products, orders, settings, updateSettings, addProduct, updateProduct, deleteProduct, updateOrderStatus } = useData();
  const [tab, setTab] = useState('products');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState('');
  const [s, setS] = useState(settings);
  const [savedMsg, setSavedMsg] = useState('');

  if (!isAdmin) {
    return <Navigate to="/login" replace state={{ from: '/admin' }} />;
  }

  const setSField = (k) => (e) => setS({ ...s, [k]: e.target.value });

  const saveSettings = (e) => {
    e.preventDefault();
    updateSettings(s);
    setSavedMsg('Settings saved & applied right away.');
    setTimeout(() => setSavedMsg(''), 2500);
  };

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [k]: val });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMsg('Please select an image file.');
      setTimeout(() => setMsg(''), 2500);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMsg('Image must be under 5MB.');
      setTimeout(() => setMsg(''), 2500);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm({ ...form, customImage: ev.target.result });
    };
    reader.readAsDataURL(file);
  };

  const clearCustomImage = () => {
    setForm({ ...form, customImage: '' });
  };

  const submit = (e) => {
    e.preventDefault();
    if (form.paymentMethods.length === 0) {
      setMsg('Select at least one payment method.');
      setTimeout(() => setMsg(''), 2500);
      return;
    }
    const customImg = form.customImage && form.customImage.trim() !== '' ? form.customImage.trim() : null;
    const data = {
      ...form,
      price: Number(form.price),
      mrp: Number(form.mrp) || Math.round(Number(form.price) * 1.25 / 10) * 10,
      image: customImg || productImage(form.name.toUpperCase(), form.color),
      shippingCost: Number(form.shippingCost) || 0,
      returnsAccepted: Boolean(form.returnsAccepted),
      returnDays: form.returnsAccepted ? Math.max(0, Number(form.returnDays) || 0) : 0,
    };
    if (editingId) {
      updateProduct(editingId, data);
      setMsg('Product updated.');
    } else {
      addProduct(data);
      setMsg('Product added.');
    }
    setForm(emptyForm);
    setEditingId(null);
    setTimeout(() => setMsg(''), 2000);
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    const isCustomImage = p.image && (p.image.startsWith('http') || p.image.startsWith('data:'));
    setForm({
      name: p.name,
      description: p.description,
      category: p.category,
      price: p.price,
      mrp: p.mrp,
      stock: p.stock,
      featured: p.featured,
      color: p.color,
      shippingCost: p.shippingCost ?? 99,
      paymentMethods: p.paymentMethods || ['upi', 'card', 'cod'],
      returnsAccepted: p.returnsAccepted ?? true,
      returnDays: p.returnDays ?? 7,
      customImage: isCustomImage ? p.image : '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const togglePayMethod = (id) => {
    setForm((f) => {
      const has = f.paymentMethods.includes(id);
      const next = has
        ? f.paymentMethods.filter((m) => m !== id)
        : [...f.paymentMethods, id];
      return { ...f, paymentMethods: next };
    });
  };
  return (
    <main className="page admin">
      <div className="page-head">
        <h1>Admin Dashboard</h1>
        <p>Manage products & orders</p>
      </div>

      <div className="admin-tabs">
        <button className={tab === 'products' ? 'chip active' : 'chip'} onClick={() => setTab('products')}>
          Products ({products.length})
        </button>
        <button className={tab === 'orders' ? 'chip active' : 'chip'} onClick={() => setTab('orders')}>
          Orders ({orders.length})
        </button>
        <button className={tab === 'settings' ? 'chip active' : 'chip'} onClick={() => setTab('settings')}>
          Settings
        </button>
      </div>

      {tab === 'products' && (
        <>
          <section className="card-box">
            <h2>{editingId ? 'Edit product' : 'Add a new product'}</h2>
            {msg && <p className="ok">{msg}</p>}
            <form onSubmit={submit} className="form">
              <div className="grid2">
                <label>Name<input value={form.name} onChange={set('name')} required /></label>
                <label>Category<select value={form.category} onChange={set('category')}>
                  {CATS.map((c) => <option key={c}>{c}</option>)}
                </select></label>
              </div>
              <label>Description<textarea rows="2" value={form.description} onChange={set('description')} required /></label>

              {/* ── Image: URL or file upload ─────────────────── */}
              <div className="image-upload-section">
                <label>Product image — URL
                  <input
                    value={form.customImage.startsWith('data:') ? '' : form.customImage}
                    onChange={(e) => setForm({ ...form, customImage: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                  <span className="muted tiny">Paste any image URL. Upload a file below to auto-replace it.</span>
                </label>
                <div className="image-upload-or">OR</div>
                <label className="image-upload-btn">
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  <span>📁 Upload photo from device</span>
                </label>
                {form.customImage && form.customImage.trim() !== '' && (
                  <div className="image-preview-row">
                    <img src={form.customImage} alt="Preview" className="image-preview-thumb" />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={clearCustomImage}>✕ Remove</button>
                  </div>
                )}
              </div>

              <div className="grid3">
                <label>Price (â‚¹)<input type="number" min="0" value={form.price} onChange={set('price')} required /></label>
                <label>MRP (â‚¹)<input type="number" min="0" value={form.mrp} onChange={set('mrp')} placeholder="Optional" /></label>
                <label>Stock<input type="number" min="0" value={form.stock} onChange={set('stock')} /></label>
              </div>
              <div className="grid2">
                <label>Image tint<input type="color" value={form.color} onChange={set('color')} /></label>
                <label className="inline-check">
                  <input type="checkbox" checked={form.featured} onChange={set('featured')} />
                  Show as featured product
                </label>
              </div>
              {/* â”€â”€ Shipping cost â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              <div className="grid2">
                <label>Shipping cost per unit (â‚¹)
                  <input
                    type="number"
                    min="0"
                    value={form.shippingCost}
                    onChange={(e) => setForm({ ...form, shippingCost: e.target.value })}
                    placeholder="99"
                  />
                  <span className="muted tiny">Set to 0 for free shipping on this product.</span>
                </label>
                <div>
                  <label style={{ display: 'block', marginBottom: 4 }}>Accepted payment methods</label>
                  <div className="pay-checks">
                    {ALL_PAY.map((m) => (
                      <label key={m.id} className="check">
                        <input
                          type="checkbox"
                          checked={form.paymentMethods.includes(m.id)}
                          onChange={() => togglePayMethod(m.id)}
                        />
                        {m.label}
                      </label>
                    ))}
                  </div>
                  <span className="muted tiny">Uncheck to disable a method for this product.</span>
                </div>
              </div>

              {/* â”€â”€ Returns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              <div className="return-box">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={form.returnsAccepted}
                    onChange={(e) => setForm({ ...form, returnsAccepted: e.target.checked })}
                  />
                  Returns accepted
                </label>
                {form.returnsAccepted && (
                  <label className="return-days">
                    Return window (days)
                    <input
                      type="number"
                      min="0"
                      value={form.returnDays}
                      onChange={(e) => setForm({ ...form, returnDays: e.target.value })}
                      placeholder="7"
                    />
                  </label>
                )}
              </div>

              <div className="row-gap">
                <button className="btn btn-gold" type="submit">
                  {editingId ? 'Update product' : 'Add product'}
                </button>
                {editingId && (
                  <button type="button" className="btn btn-ghost"
                    onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                    Cancel edit
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="card-box">
            <h2>All products</h2>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Featured</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td><Link to={`/product/${p.id}`}>{p.name}</Link></td>
                      <td>{p.category}</td>
                      <td>{formatINR(p.price)}</td>
                      <td>{p.stock}</td>
                      <td>{p.featured ? 'â˜…' : 'â€”'}</td>
                      <td className="row-gap">
                        <button className="btn btn-sm" onClick={() => startEdit(p)}>Edit</button>
                        <button className="btn btn-sm danger" onClick={() => deleteProduct(p.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      {tab === 'orders' && (
        <section className="card-box">
          <h2>All orders</h2>
          {orders.length === 0 ? (
            <p className="muted">No orders yet. Orders placed by customers will appear here.</p>
          ) : (
            <div className="orders-list">
              {orders.map((o) => (
                <div className="order-row" key={o.id}>
                  <div className="ord-head">
                    <strong>Order {o.id}</strong>
                    <span className="muted">{formatDateTime(o.orderDate)}</span>
                    <span className={`status-badge ${o.status}`}>{o.status.toUpperCase()}</span>
                    <span className="ord-total">{formatINR(o.total)} Â· {o.payment.mode}</span>
                  </div>
                  <div className="ord-body">
                    <div>
                      <p className="muted">{o.customer?.name} Â· {o.customer?.phone}</p>
                      <p className="muted">{o.shipping?.address}, {o.shipping?.city} â€” {o.shipping?.pincode}</p>
                      <ul className="sum-items">
                        {o.items.map((it) => (
                          <li key={it.id}><span>{it.name} Ã— {it.qty}</span></li>
                        ))}
                      </ul>
                    </div>
                    <div className="ord-actions">
                      {NEXT_STATUS[o.status] ? (
                        <button
                          className="btn btn-sm"
                          onClick={() => updateOrderStatus(o.id, NEXT_STATUS[o.status][0], NEXT_STATUS[o.status][1])}
                        >
                          Mark as {NEXT_STATUS[o.status][1]}
                        </button>
                      ) : (
                        <span className="muted">Completed</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    {tab === 'settings' && (
        <section className="card-box">
          <h2>Store settings</h2>
          <p className="muted">These changes are applied across the site instantly.</p>
          <form onSubmit={saveSettings} className="form settings-form">
            <div className="grid2">
              <label>Store name
                <input value={s.storeName} onChange={setSField('storeName')} />
              </label>
              <label>Logo letter
                <input maxLength={1} value={s.logoLetter} onChange={setSField('logoLetter')} />
              </label>
            </div>
            <label>Tagline (below the store name)
              <input value={s.tagline} onChange={setSField('tagline')} />
            </label>
            <label>Announcement bar
              <input value={s.announcement} onChange={setSField('announcement')} />
            </label>
            <label>Hero heading (home page)
              <input value={s.heroHeading} onChange={setSField('heroHeading')} />
            </label>
            <label>Hero subheading (home page)
              <input value={s.heroSubheading} onChange={setSField('heroSubheading')} />
            </label>
            <label>Free shipping threshold (â‚¹)
              <input type="number" min="0" value={s.freeShippingThreshold || 0} onChange={setSField('freeShippingThreshold')} placeholder="1499" />
              <span className="muted tiny">Orders at or above this amount get free shipping. Set to 0 to disable.</span>
            </label>
            <div className="grid2">
              <label>Contact phone
                <input value={s.contactPhone} onChange={setSField('contactPhone')} />
              </label>
              <label>Contact email
                <input value={s.contactEmail} onChange={setSField('contactEmail')} />
              </label>
            </div>
            <label>Contact address
              <input value={s.contactAddress} onChange={setSField('contactAddress')} />
            </label>
                        
            <label>Razorpay Key ID (payment gateway)
              <input value={s.razorpayKeyId || ''} onChange={setSField('razorpayKeyId')} placeholder="rzp_test_XXXX / rzp_live_XXXX" />
              <span className="muted tiny">Used to accept live UPI & card payments via Razorpay. Use a TEST key for sandbox or your LIVE key for real money.</span>
            </label>
            <label>Free shipping threshold (â‚¹)
              <input type="number" min="0" value={s.freeShippingThreshold || 0} onChange={setSField('freeShippingThreshold')} placeholder="1499" />
              <span className="muted tiny">Orders at or above this amount get free shipping. Per-product shipping fees still apply below this threshold.</span>
            </label>
            <div className="pay-mode-row">
              <label style={{ display: 'block', marginBottom: 4 }}>Payment mode</label>
              <div className="pay-mode-options">
                {[
                  { id: 'demo', label: 'Demo', desc: 'Simulated payments â€” no real money' },
                  { id: 'auto', label: 'Auto', desc: 'Try Razorpay, fall back to demo' },
                  { id: 'live', label: 'Live', desc: 'Real payments only â€” no fallback' },
                ].map((opt) => (
                  <label key={opt.id} className={`pay-mode-opt ${(s.paymentMode || 'demo') === opt.id ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMode"
                      checked={(s.paymentMode || 'demo') === opt.id}
                      onChange={() => setS({ ...s, paymentMode: opt.id })}
                    />
                    <div>
                      <strong>{opt.label}</strong>
                      <span>{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            {savedMsg && <p className="ok">{savedMsg}</p>}
            <button className="btn btn-gold" type="submit">Save settings</button>
          </form>
        </section>
      )}

      </main>
  );
}
