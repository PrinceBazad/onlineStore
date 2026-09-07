import React from 'react';

// Displays 1-5 stars. When `onChange` is provided it becomes an
// interactive rating input (0 = not picked yet).
export default function Stars({ value = 0, count = null, size = 16, onChange = null }) {
  const filled = Math.round(value);
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          type="button"
          key={i}
          className={`star ${filled >= i ? 'filled' : ''}`}
          style={{ fontSize: size + 'px' }}
          onClick={onChange ? () => onChange(i) : null}
          disabled={!onChange}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
      {count != null && <span className="star-count">({count})</span>}
    </span>
  );
}