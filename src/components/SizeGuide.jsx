import React, { useState } from 'react';

// Measurement charts per garment category + how-to-measure tips.
// Category is matched loosely so "Daily Wear", "Suit", etc. all resolve.
const CHARTS = [
  {
    match: ['lehenga'],
    title: 'Lehenga size guide',
    note: 'Lehenga waist is stitched slightly below the natural waist. Blouse measurements are separate.',
    columns: ['Size', 'Waist (in)', 'Hip (in)', 'Length (in)', 'Blouse (in)'],
    rows: [
      ['S (36)', '26–28', '32–34', '40–42', '32'],
      ['M (38)', '28–30', '34–36', '40–42', '34'],
      ['L (40)', '30–32', '36–38', '41–43', '36'],
      ['XL (42)', '32–34', '38–40', '41–43', '38'],
      ['XXL (44)', '34–36', '40–42', '42–44', '40'],
    ],
  },
  {
    match: ['saree'],
    title: 'Saree & blouse size guide',
    note: 'Saree fabric is free-size — choose your blouse size. Blouse includes 1" seam allowance.',
    columns: ['Size', 'Bust (in)', 'Waist (in)', 'Blouse length (in)'],
    rows: [
      ['S (36)', '32–34', '26–28', '14–15'],
      ['M (38)', '34–36', '28–30', '15'],
      ['L (40)', '36–38', '30–32', '15–16'],
      ['XL (42)', '38–40', '32–34', '16'],
      ['XXL (44)', '40–42', '34–36', '16–17'],
    ],
  },
  {
    match: ['suit', 'ethnic', 'daily'],
    title: 'Suit / kurti size guide',
    note: 'Suits are stitched semi-fitted. If you are between sizes, pick the larger one.',
    columns: ['Size', 'Bust (in)', 'Waist (in)', 'Hip (in)', 'Kurta length (in)'],
    rows: [
      ['S (36)', '34–35', '27–28', '35–36', '40–42'],
      ['M (38)', '36–37', '29–30', '37–38', '40–42'],
      ['L (40)', '38–39', '31–32', '39–40', '42–44'],
      ['XL (42)', '40–41', '33–34', '41–42', '42–44'],
      ['XXL (44)', '42–43', '35–36', '43–44', '44'],
    ],
  },
];

const FALLBACK = CHARTS[2];

const TIPS = [
  'Bust — measure around the fullest part, keeping the tape parallel to the floor.',
  'Waist — measure around the narrowest part of your natural waist.',
  'Hip — measure around the fullest part of your hips.',
  'Length — measure from the shoulder down to where the garment should end.',
  'Wear light clothing and don\u2019t pull the tape tight — it should sit snug, not squeeze.',
];

export default function SizeGuide({ category, onClose, editable = false, sizeValue = [], onSizesChange }) {
  const cat = String(category || '').toLowerCase();
  const chart = CHARTS.find((c) => c.match.some((m) => cat.includes(m))) || FALLBACK;
  const [sizes, setSizes] = useState(Array.isArray(sizeValue) ? sizeValue : []);
  const [sizeInput, setSizeInput] = useState('');

  const addSize = () => {
    const s = String(sizeInput || '').trim().toUpperCase();
    if (!s) return;
    if (!sizes.includes(s)) setSizes([...sizes, s]);
    setSizeInput('');
  };

  const removeSize = (s) => setSizes(sizes.filter((x) => x !== s));

  const done = () => {
    if (editable && onSizesChange) onSizesChange(sizes);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Size guide">
      <div className="modal-card size-guide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>📏 {editable ? 'Edit sizes & size guide' : chart.title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div style={{ padding: 16 }}>
          {editable && (
            <div className="size-editor">
              <h3 style={{ margin: '0 0 6px' }}>Sizes available for this product</h3>
              <div className="size-edit-chips">
                {sizes.length === 0 ? (
                  <span className="muted tiny">No sizes yet — add the first one below.</span>
                ) : (
                  sizes.map((s) => (
                    <span key={s} className="chip size-chip">
                      {s}
                      <button type="button" className="chip-x" onClick={() => removeSize(s)} aria-label={`Remove ${s}`}>✕</button>
                    </span>
                  ))
                )}
              </div>
              <div className="size-edit-row">
                <input
                  value={sizeInput}
                  onChange={(e) => setSizeInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSize(); } }}
                  placeholder="Enter a size (e.g. M)"
                  aria-label="New size"
                />
                <button type="button" className="btn btn-sm btn-ghost" onClick={addSize} disabled={!sizeInput.trim()}>Add</button>
              </div>
              <p className="muted tiny">
                These sizes appear on the product page and on the packing slip. Press <strong>Done</strong> to save.
              </p>
            </div>
          )}

          <h3 style={{ margin: '0 0 8px' }}>{chart.title}</h3>
          <p className="muted small" style={{ marginTop: 0 }}>{chart.note}</p>
          <div className="table-scroll">
            <table className="table size-table">
              <thead>
                <tr>{chart.columns.map((col) => <th key={col}>{col}</th>)}</tr>
              </thead>
              <tbody>
                {chart.rows.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, i) => (i === 0 ? <td key={i}><strong>{cell}</strong></td> : <td key={i}>{cell}</td>))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ margin: '14px 0 6px' }}>How to measure</h3>
          <ul className="measure-tips">
            {TIPS.map((t) => <li key={t}>{t}</li>)}
          </ul>
          <p className="muted tiny" style={{ marginBottom: 0 }}>
            All measurements are approximate — allow ±0.5" for stitching. Unsure? Message us on WhatsApp before ordering.
          </p>
          {editable && (
            <div className="row-gap" style={{ marginTop: 14 }}>
              <button type="button" className="btn btn-gold" onClick={done}>✓ Done — save sizes</button>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}