import React from 'react';
import { useData } from '../context/DataContext.jsx';

export default function About() {
  const { settings } = useData();
  const name = (settings.storeName || 'Our store').trim();
  return (
    <main className="page">
      <div className="page-head">
        <h1>About Us</h1>
        <p>The story behind {name}</p>
      </div>
      <section className="card-box about">
        <h2>Our Story</h2>
        <p>
          {name} began with a simple love for traditional Indian
          craftsmanship. What started as a small collection of hand-worked suits
          has grown into a trusted destination for premium ethnic wear — from
          heavy 3D Punjabi suits to elegant anarkalis and silk sarees.
        </p>
        <p>
          Every piece in our catalog is selected for its fabric, finish and
          fit. We work directly with skilled artisans to bring you designs that
          blend timeless tradition with modern appeal — all at honest prices.
        </p>
        <h2>What we offer</h2>
        <ul className="about-list">
          <li>✔ Premium designer suits, lehengas & sarees</li>
          <li>✔ Secure online payments — UPI, Cards & Cash on Delivery</li>
          <li>✔ Live order tracking from our doorstep to yours</li>
          <li>✔ Fast, reliable pan-India delivery</li>
          <li>✔ Dedicated customer support</li>
        </ul>
      </section>
    </main>
  );
}