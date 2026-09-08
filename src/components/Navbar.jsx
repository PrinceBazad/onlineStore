import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useData } from '../context/DataContext.jsx';
import Logo from './Logo.jsx';

const links = [
  { to: '/', label: 'Home' },
  { to: '/catalog', label: 'Catalog' },
  { to: '/track', label: 'Track Order' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar({ onCartOpen }) {
  const { user, isAdmin, logout } = useAuth();
  const { totalItems } = useCart();
  const { count: savedCount } = useWishlist();
  const { settings } = useData();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="navbar">
      {/* top strip */}
      <div className="topstrip">
        <span>{settings.announcement}</span>
      </div>

      <nav className="nav-inner">
                <Link to="/" className="brand" onClick={closeMenu}>
          <Logo />
          <span className="brand-text">
            {settings.storeName} <em>{settings.tagline}</em>
          </span>
        </Link>

        <ul className="nav-links">
          {links.map((l) => (
            <li key={l.to}>
              <Link to={l.to}>{l.label}</Link>
            </li>
          ))}
          {user && (
            <li>
              <Link to="/orders">My Orders</Link>
            </li>
          )}
          {user && (
            <li>
              <Link to="/wishlist">Saved{savedCount ? ` (${savedCount})` : ''}</Link>
            </li>
          )}
          {isAdmin && (
            <li>
              <Link to="/admin">Admin</Link>
            </li>
          )}
        </ul>

        <div className="nav-actions">
          {user ? (
            <div className="user-menu">
              <span className="user-chip">{user.name.split(' ')[0]}</span>
              <button className="linklike" onClick={() => { logout(); }}>
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-ghost btn-sm">
              Log in
            </Link>
          )}
          <button
            className="menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
          <button className="cart-btn" onClick={onCartOpen} aria-label="Open cart">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
              stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6h15l-1.5 9h-12L5 3H2" />
              <circle cx="9" cy="20" r="1.6" />
              <circle cx="18" cy="20" r="1.6" />
            </svg>
            <span className="badge">{totalItems}</span>
          </button>
        </div>
      </nav>

      {/* mobile menu */}
      <div className={"mobile-menu" + (menuOpen ? ' open' : '')}>
        {links.map((l) => (
          <Link key={l.to} to={l.to} onClick={closeMenu}>{l.label}</Link>
        ))}
        {user && <Link to="/orders" onClick={closeMenu}>My Orders</Link>}
        {user && <Link to="/wishlist" onClick={closeMenu}>Saved{savedCount ? ` (${savedCount})` : ''}</Link>}
        {isAdmin && <Link to="/admin" onClick={closeMenu}>Admin</Link>}
        {user ? (
          <button className="linklike mobile-logout" onClick={() => { logout(); closeMenu(); }}>
            Logout
          </button>
        ) : (
          <Link to="/login" onClick={closeMenu}>Log in</Link>
        )}
      </div>
    </header>
  );
}