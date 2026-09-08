import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/*
 * Smooth page-transition wrapper.
 * The children are always kept mounted (React Router swaps the route
 * content inside <Routes> in-place) so there is never a blank/flicker
 * state.  On every route change we do a quick 150 ms fade+slide "pulse"
 * then return to full opacity — feels fluid without ever unmounting.
 */
export default function PageTransition({ children }) {
  const loc = useLocation();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(false);                       // quick dim
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, [loc.pathname, loc.search]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  return (
    <div className={`page-transition ${visible ? 'page-visible' : 'page-pulse'}`}>
      {children}
    </div>
  );
}
