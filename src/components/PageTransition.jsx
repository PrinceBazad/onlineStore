import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/* Smooth 200 ms fade slide that runs on every page/route change. */
export default function PageTransition({ children }) {
  const loc = useLocation();
  const [key, setKey] = useState(loc.pathname + loc.search);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const path = loc.pathname + loc.search;
    if (path === key) return;                // no change
    setVisible(false);                        // fade out
    const t = setTimeout(() => {
      setKey(path);                          // swap content
      setVisible(true);                      // fade in
    }, 180);
    return () => clearTimeout(t);
  }, [loc.pathname, loc.search, key]);

  // Keep the URL scrolled to top during transitions
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  return (
    <div
      key={key}
      className={`page-transition ${visible ? 'page-enter-active' : 'page-exit-active'}`}
    >
      {children}
    </div>
  );
}
