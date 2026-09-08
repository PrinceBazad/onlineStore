import React, { useEffect } from 'react';
import { useData } from '../context/DataContext.jsx';

// Keeps the browser-tab title in sync with the store name & tagline
// set by the admin (Admin → Settings). index.html holds a static
// fallback title that only shows for the split second before React loads.
export default function TitleSync() {
  const { settings } = useData();
  const name = (settings.storeName || '').trim();
  const tagline = (settings.tagline || '').trim();

  useEffect(() => {
    const title = tagline ? `${name} — ${tagline}` : name;
    document.title = title || 'Store';
  }, [name, tagline]);

  return null;
}