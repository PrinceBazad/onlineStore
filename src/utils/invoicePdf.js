export function invoiceLines(order, settings) {
  const L = [];
  const storeName = settings?.storeName || 'Houselaxmicloth Suit Collection';
  L.push({ t: storeName, s: 17, b: true, gap: 22 });
  if (settings?.tagline) L.push({ t: settings.tagline, s: 10, gap: 14 });
  L.push({ t: [settings?.contactPhone, settings?.contactEmail].filter(Boolean).join('  |  '), s: 9, gap: 12 });
  if (settings?.contactAddress) L.push({ t: settings.contactAddress, s: 9, gap: 18 });
  L.push({ t: `Invoice  ${order.id}`, s: 13, b: true, gap: 18 });
  L.push({ t: `Placed: ${fmtDt(order.orderDate)}      Status: ${String(order.status || '').toUpperCase()}`, s: 9.5, gap: 12 });
  L.push({ t: `Customer: ${order.customer?.name || '-'}   ${order.customer?.phone || ''}`, s: 9.5, gap: 12 });
  L.push({ t: `Email: ${order.customerEmail || order.customer?.email || '-'}`, s: 9.5, gap: 12 });
  L.push({ t: `Ship to: ${[order.shipping?.address, order.shipping?.city, order.shipping?.state, order.shipping?.pincode].filter(Boolean).join(', ')}`, s: 9.5, gap: 12 });
  L.push({ t: `Payment: ${order.payment?.mode || '-'}${order.payment ? ` (${order.payment.status || ''})` : ''}`, s: 9.5, gap: 18 });
  L.push({ t: 'Items', s: 11, b: true, gap: 16 });
  (order.items || []).forEach((it, i) => {
    L.push({ t: `${i + 1}. ${it.name}  x ${it.qty}   -   Rs.${Number(it.price * it.qty || 0).toLocaleString('en-IN')}`, s: 9.5, gap: 14 });
  });
  L.push({ t: `Subtotal: Rs.${Number(order.subtotal ?? order.total ?? 0).toLocaleString('en-IN')}`, s: 9.5, gap: 13 });
  L.push({ t: `Shipping: Rs.${Number(order.shippingFee ?? 0).toLocaleString('en-IN')}`, s: 9.5, gap: 13 });
  L.push({ t: `Total: Rs.${Number(order.total || 0).toLocaleString('en-IN')}`, s: 12, b: true, gap: 20 });
  L.push({ t: 'Thank you for shopping with us!', s: 9.5, gap: 12 });
  return L;
}

function esc(s) {
  return String(s ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildPdfBytes(order, settings) {
  const lines = invoiceLines(order, settings);
  const W = 595, H = 842, ML = 56, TOP = 70, BOT = 60;
  const pages = [[]];
  let y = H - TOP;
  lines.forEach((ln) => {
    if (y - ln.gap < BOT) { pages.push([]); y = H - TOP; }
    const size = ln.s;
    const style = ln.b ? '/F2' : '/F1';
    y -= ln.gap * 0.72 + size * 0.5;
    pages[pages.length - 1].push(`BT ${style} ${size} Tf ${ML} ${y.toFixed(1)} Td (${esc(ln.t)}) Tj ET`);
    y -= size * 0.7;
  });
  const objs = [];
  objs.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objs.push(`2 0 obj\n<< /Type /Pages /Kids [${pages.map((_, i) => `${4 + i} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`);
  objs.push('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  objs.push('7 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');
  const pageIds = pages.map((_, i) => 4 + i);
  pages.forEach((ops, i) => {
    const stream = ops.join('\n') + '\n';
    const len = new TextEncoder().encode(stream).length;
    objs.push(`${pageIds[i]} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 7 0 R >> >> /Contents ${10 + i} 0 R >>\nendobj\n`);
  });
  pages.forEach((ops, i) => {
    const stream = ops.join('\n') + '\n';
    const len = new TextEncoder().encode(stream).length;
    objs.push(`${10 + i} 0 obj\n<< /Length ${len} >>\nstream\n${stream}endstream\nendobj\n`);
  });
  const maxId = 10 + pages.length - 1;
  const byId = {};
  objs.forEach((o) => { byId[parseInt(o.split(' ')[0], 10)] = o; });
  let out = '%PDF-1.4\n';
  const offsets = {};
  for (let id = 1; id <= maxId; id++) {
    if (!byId[id]) continue;
    offsets[id] = new TextEncoder().encode(out).length;
    out += byId[id];
  }
  const xrefAt = new TextEncoder().encode(out).length;
  out += `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id++) {
    out += byId[id] ? `${String(offsets[id]).padStart(10, '0')} 00000 n \n` : '0000000000 00000 f \n';
  }
  out += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return new TextEncoder().encode(out);
}

function fmtDt(iso) {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch { return String(iso); }
}

export function invoicePdfUrl(order, settings) {
  const bytes = buildPdfBytes(order, settings);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}

export function downloadInvoicePdf(order, settings) {
  const url = invoicePdfUrl(order, settings);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${order.id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
