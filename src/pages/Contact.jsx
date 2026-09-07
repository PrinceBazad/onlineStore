import React, { useState } from 'react';
import { useData } from '../context/DataContext.jsx';

export default function Contact() {
  const { settings } = useData();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <main className="page">
      <div className="page-head">
        <h1>Contact Us</h1>
        <p>We'd love to hear from you</p>
      </div>

      <div className="contact-grid">
        <section className="card-box">
          <h2>Get in touch</h2>
          {sent ? (
            <p className="ok">✅ Thank you! We'll get back to you within 24 hours.</p>
          ) : (
            <form onSubmit={submit} className="form">
              <label>Name<input value={form.name} onChange={set('name')} required /></label>
              <label>Email<input type="email" value={form.email} onChange={set('email')} required /></label>
              <label>Message<textarea rows="5" value={form.message} onChange={set('message')} required /></label>
              <button className="btn btn-gold" type="submit">Send message</button>
            </form>
          )}
        </section>
        <aside className="card-box">
          <h2>Store information</h2>
          <p><strong>📍 Address</strong><br />{settings.contactAddress}</p>
          <p><strong>📞 Phone</strong><br />{settings.contactPhone}</p>
          <p><strong>✉️ Email</strong><br />{settings.contactEmail}</p>
          <p><strong>🕘 Hours</strong><br />Mon – Sat · 10:00 AM – 8:00 PM</p>
        </aside>
      </div>
    </main>
  );
}