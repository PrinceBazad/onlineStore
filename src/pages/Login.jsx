import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const DEMO = [
  { label: 'Admin', email: 'admin@baani.store', pass: 'admin123' },
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');

  const from = loc.state?.from || '/';

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await login(form);
      nav(from, { replace: true });
    } catch (ex) {
      setErr(ex.message);
    }
  };

  const fill = (email, pass) => setForm({ email, password: pass });

  return (
    <main className="page auth">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="muted">Log in to continue shopping</p>

        <form onSubmit={submit} className="form">
          <label>
            Email
            <input type="email" required value={form.email}
              onChange={set('email')} placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input type="password" required value={form.password}
              onChange={set('password')} placeholder="••••••••" />
          </label>

          {err && <p className="error">{err}</p>}

          <button className="btn btn-gold btn-block" type="submit">Log in</button>
        </form>

        <p className="muted center">
          New here? <Link to="/signup">Create an account</Link>
        </p>

        <div className="demo-row">
          <span>Demo login:</span>
          {DEMO.map((d) => (
            <button key={d.email} className="chip"
              onClick={() => fill(d.email, d.pass)}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}