import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';

// Birthday / anniversary gift engine.
// When a logged-in customer's saved special date falls in the CURRENT month
// and they have not been gifted this year, the site:
//   1. creates a deterministic coupon (HBD-2026-XXXX / ANNIV-2026-XXXX),
//   2. shows a celebratory pop-up with the code,
//   3. emails the same code to the customer's own address (fire-and-forget).
// The code is deterministic per user + year, so logging in on several devices
// never creates duplicate coupons or re-sends the email.
export default function SpecialDayCheck() {
  const { user, updateUserProfile } = useAuth();
  const { coupons, addCoupon, settings } = useData();
  const [gift, setGift] = useState(null); // { code, specialType }

  useEffect(() => {
    if (!user || !user.specialDate) return;
    if (user.role && user.role !== 'customer') return; // staff accounts skip

    const specialDate = String(user.specialDate || '');
    if (!specialDate || specialDate.indexOf('-') < 0) return;

    const year = new Date().getFullYear();
    const thisMonth = new Date().getMonth() + 1;
    const specialMonth = Number(specialDate.slice(5, 7));
    if (specialMonth === 0 || specialMonth !== thisMonth) return; // not their month

    if (Number(user.lastGiftYear || 0) === year) return; // already gifted this year
    try {
      if (localStorage.getItem(`houselaxmicloth_gift_${user.id}_${year}`)) return;
    } catch {
      /* storage unavailable */
    }

    const type = String(user.specialDateType || 'Birthday');
    const stem = type === 'Anniversary' ? 'ANNIV' : 'HBD';
    const code = `${stem}-${year}-${String(user.id || 'U').slice(-4).toUpperCase()}`;

    // Idempotent: reuse an existing coupon with the same code (multi-device safe).
    if (!coupons.some((c) => c.code === code)) {
      addCoupon({
        code,
        type: 'percent',
        value: Math.max(1, Math.min(99, Number(settings.specialDayPercent || 15))),
        minOrder: Number(settings.specialDayMinOrder || 0),
      });
    }

    // Email the code to the customer's OWN address only (optional API — never blocks).
    try {
      fetch('/api/send-specialday-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          name: user.name || '',
          specialType: type,
          code,
        }),
      }).catch(() => {});
    } catch {
      /* offline — popup still works */
    }

    // Remember for the rest of this year (local + profile/Firestore).
    try {
      localStorage.setItem(`houselaxmicloth_gift_${user.id}_${year}`, '1');
    } catch {
      /* storage full */
    }
    updateUserProfile({ lastGiftYear: year }).catch(() => {});

    setGift({ code, specialType: type });
  }, [user]);

  if (!gift) return null;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(gift.code);
    } catch {
      /* clipboard blocked on some browsers */
    }
    setGift(null);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Your birthday gift">
      <div className="modal-card gift-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>🎉 Happy {gift.specialType}!</h2>
          <button type="button" className="modal-close" onClick={() => setGift(null)} aria-label="Close">✕</button>
        </div>
        <div style={{ padding: 16, textAlign: 'center' }}>
          <p className="muted">
            {user?.name ? `${user.name}, a ` : 'A '}little thank-you for being with us — here&apos;s a gift
            code for your special day:
          </p>
          <button
            type="button"
            className="gift-code"
            onClick={copyCode}
            title="Click to copy the code"
            aria-label="Copy gift code"
          >
            {gift.code}
          </button>
          <p className="muted tiny">Tap the code to copy it — then use it at checkout this month.</p>
          {user?.email && <p className="muted tiny">We&apos;ve also emailed it to {user.email} 🎁</p>}
          <div className="row-gap" style={{ marginTop: 8 }}>
            <button type="button" className="btn btn-gold" onClick={() => setGift(null)}>
              🎉 Thank you!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}