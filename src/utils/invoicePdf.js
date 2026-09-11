import jsPDF from "jspdf";
import * as qrcode from "qrcode";

const MONEY = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const fmtDt = (d) => {
  if (!d) return "";
  const x = new Date(d);
  return x.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) + " · " +
    x.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

// Each item row ready for the PDF table
export function invoiceLines(order, settings) {
  const s = settings || {};
  const items = (order?.items || []).map((it) => ({
    name: it.name,
    qty: it.qty || 1,
    price: Number(it.price || 0),
    total: Number(it.price || 0) * (it.qty || 1),
  }));
  const subtotal = items.reduce((a, b) => a + b.total, 0);
  const shipping = Number(order?.shippingFee ?? 0);
  const total = Number(order?.total ?? subtotal + shipping);
  return {
    brand: s.storeName || "Houselaxmicloth",
    tagline: s.tagline || "Ethnic fashion store",
    phone: s.contactPhone || "",
    email: s.contactEmail || "",
    address: s.contactAddress || "",
    invoiceNo: order?.id || "ORD-",
    date: fmtDt(order?.orderDate),
    status: (order?.status || "placed").toUpperCase(),
    payment: order?.payment?.mode?.toUpperCase() || "—",
    customer: order?.customer || {},
    shippingAddr: order?.shipping || {},
    items,
    subtotal,
    shipping,
    total,
  };
}
const wraps = (doc, text, maxW, size) => {
  doc.setFontSize(size);
  const out = doc.splitTextToSize(text || "", maxW);
  return out.length ? out : [""];
};

async function buildInvoicePdf(order, settings) {
  const L = invoiceLines(order, settings);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.getPageWidth();                     // 210
  const H = doc.getPageHeight();                    // 297
  const M = 14;                                         // margin
  const CW = W - M * 2;                                 // content width
  let y = 0;

  const brandR = 155, brandG = 28, brandB = 61;
  const inkR = 43, inkG = 34, inkB = 38;

  // ---------- Header band ----------
  doc.setFillColor(250, 240, 243);
  doc.rect(0, 0, W, 30, "F");
  doc.setDrawColor(brandR, brandG, brandB);
  doc.setLineWidth(0.8);
  doc.line(M, 30, W - M, 30);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(brandR, brandG, brandB);
  doc.text(M, 13, L.brand);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(inkR, inkG, inkB);
  doc.text(M, 19, L.tagline);

  doc.setFontSize(8);
  const contactBits = [L.phone, L.email, L.address].filter(Boolean);
  let cx = M;
  for (const bit of contactBits) {
    doc.text(cx, 25, bit);
    cx += doc.getTextWidth(bit) + 6;
  }

  // Right side of header: INVOICE title + meta
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(brandR, brandG, brandB);
  doc.text(W - M, 12, "TAX INVOICE", { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(inkR, inkG, inkB);
  const meta = [
    `Invoice No.  ${L.invoiceNo}`,
    `Date        ${L.date}`,
    `Status      ${L.status}`,
    `Payment     ${L.payment}`,
  ];
  for (const line of meta) {
    doc.text(W - M, 20 + (meta.indexOf(line) * 4.6), line, { align: "right" });
  }

  // ---------- Bill To ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(inkR, inkG, inkB);
  doc.text(M, 40, "BILLED TO");
  doc.setDrawColor(brandR, brandG, brandB);
  doc.setLineWidth(0.4);
  doc.line(M, 41.5, M + 45, 41.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const cust = L.customer;
  const addr = L.shippingAddr;
  const custLines = [
    `${cust.name || "Customer"}`,
    `${cust.phone || ""}`,
    `${cust.email || ""}`,
    `${addr.address || ""}${addr.city ? ", " + addr.city : ""}${addr.pincode ? " — " + addr.pincode : ""}`,
  ].filter(Boolean);
  y = 34;
  for (const cl of custLines) {
    y += 5.5;
    doc.text(M, y, cl);
  }

  // ---------- Items table ----------
  y += 6;
  const th = 7;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setFillColor(brandR, brandG, brandB);
  doc.setTextColor(255, 255, 255);
  doc.rect(M, y, CW, th, "F");
  doc.text(M + 2, y + 4.6, "#");
  doc.text(M + 10, y + 4.6, "ITEM");
  doc.text(M + 62, y + 4.6, "QTY", { align: "center" });
  doc.text(M + 80, y + 4.6, "RATE", { align: "center" });
  doc.text(M + 108, y + 4.6, "AMOUNT", { align: "center" });
  y += th;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(inkR, inkG, inkB);
  let n = 0;
  for (const it of L.items) {
    if (y > H - 40) {
      doc.addPage();
      y = M;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(inkR, inkG, inkB);
      doc.text(M, y + 3, `${L.brand} — ${L.invoiceNo} (continued)`);
      y += 8;
      doc.setFont("helvetica", "normal");
    }
    n += 1;
    const nameLines = wraps(doc, it.name, 92, 9);
    let rowH = Math.max(th, nameLines.length * 4.2 + 2);
    doc.setDrawColor(220, 214, 219);
    doc.setLineWidth(0.2);
    doc.line(M, y, W - M, y);
    doc.setFontSize(9);
    doc.text(M + 2, y + 4.6, String(n));
    doc.text(M + 10, y + 4.6, nameLines[0]);
    if (nameLines.length > 1) {
      for (let li = 1; li < nameLines.length; li++) doc.text(M + 10, y + 4.6 + li * 4.2, nameLines[li]);
    }
    doc.text(M + 62, y + 4.6, String(it.qty), { align: "center" });
    doc.text(M + 80, y + 4.6, MONEY(it.price), { align: "center" });
    doc.text(M + 108, y + 4.6, MONEY(it.total), { align: "center" });
    y += rowH;
  }
  doc.line(M, y, W - M, y);
  y += 5;

  // ---------- Totals ----------
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(M, y, "Subtotal");
  doc.text(M + 108, y, MONEY(L.subtotal), { align: "center" });
  y += 5.6;
  doc.text(M, y, "Shipping");
  doc.text(M + 108, y, L.shipping > 0 ? MONEY(L.shipping) : "FREE", { align: "center" });
  y += 6.2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(brandR, brandG, brandB);
  doc.text(M, y, "TOTAL DUE");
  doc.text(M + 108, y, MONEY(L.total), { align: "center" });

  // ---------- QR code ----------
  const base = window.location.origin || `${window.location.protocol}//${window.location.host}`;
  const qrTarget = `${base}/#/order-manage/${encodeURIComponent(L.invoiceNo)}`;
  const qrSide = 30;
  try {
    const qrData = await qrcode.toDataURL(qrTarget);
    const qx = W - M - qrSide;
    const qy = Math.min(y + 10, H - 52);
    doc.setFillColor(250, 240, 243);
    doc.rect(qx - 4, qy - 4, qrSide + 8, qrSide + 20, "F");
    doc.addImage(qrData, "PNG", qx, qy, qrSide, qrSide);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(inkR, inkG, inkB);
    doc.text(qx + qrSide / 2, qy + qrSide + 6, "Scan to open", { align: "center" });
    doc.text(qx + qrSide / 2, qy + qrSide + 10.5, "order in admin", { align: "center" });
  } catch (e) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(160, 150, 154);
    doc.text(W - M, y + 10, `QR: ${encodeURIComponent(qrTarget)}`, { align: "right" });
  }

  // ---------- Thank-you ----------
  const ty = H - 34;
  doc.setDrawColor(220, 214, 219);
  doc.setLineWidth(0.3);
  doc.line(M, ty, W - M, ty);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(inkR, inkG, inkB);
  doc.text(M, ty + 6, `Thank you for shopping with ${L.brand}!`);
  doc.setFontSize(8);
  doc.text(M, ty + 12, "This is a system-generated invoice. For order support, contact " + (L.phone || L.email || "the store"));

  const buf = doc.output("arraybuffer");
  return new Blob([buf], { type: "application/pdf" });
}

/** Returns an object URL for in-browser preview (async). Caller must revoke it. */
export async function invoicePdfUrl(order, settings) {
  const blob = await buildInvoicePdf(order, settings);
  return URL.createObjectURL(blob);
}

/** Generates the PDF and triggers a browser download. */
export async function downloadInvoicePdf(order, settings) {
  const blob = await buildInvoicePdf(order, settings);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-${order?.id || "download"}.pdf`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}