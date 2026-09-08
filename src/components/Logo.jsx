import React from 'react';
import { useData } from '../context/DataContext.jsx';

/**
 * Renders the store logo from an uploaded image (URL) when set,
 * otherwise falls back to the configurable letter-based brand mark.
 */
export default function Logo() {
  const { settings } = useData();
  const letter = settings.logoLetter || (settings.storeName && settings.storeName[0]) || 'B';
  const url = settings.logoUrl;

  if (url) {
    return (
      <img
        src={url}
        alt={`${settings.storeName || 'Store'} logo`}
        className="brand-logo"
        style={settings.logoWidth ? { width: `${settings.logoWidth}px` } : undefined}
      />
    );
  }

  return <span className="brand-mark">{letter}</span>;
}
