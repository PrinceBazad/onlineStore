import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext.jsx';

export default function Footer() {
  const { settings } = useData();
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="f-col">
          <h3>{settings.storeName}</h3>
          <p>
            {settings.heroSubheading}
          </p>
        </div>
        <div className="f-col">
          <h4>Quick Links</h4>
          <ul>
            <li><Link to="/catalog">Catalog</Link></li>
            <li><Link to="/track">Track Order</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>
        <div className="f-col">
          <h4>Categories</h4>
          <ul>
            <li><Link to="/catalog?cat=Suits">Suits</Link></li>
            <li><Link to="/catalog?cat=Ethnic">Ethnic</Link></li>
            <li><Link to="/catalog?cat=Lehenga">Lehenga</Link></li>
            <li><Link to="/catalog?cat=Saree">Saree</Link></li>
          </ul>
        </div>
        <div className="f-col">
          <h4>Stay Connected</h4>
          <p>Follow us on social media for new drops and offers.</p>
          <div className="socials">
            <span>f</span><span>✿</span><span>▶</span>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>Payment methods: UPI · Credit/Debit Cards · Cash on Delivery</p>
        <p>© {new Date().getFullYear()} {settings.storeName}. All rights reserved.</p>
      </div>
    </footer>
  );
}