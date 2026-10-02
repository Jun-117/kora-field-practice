// Image receipt (v0.12, Jun 2026-10-01 "이거로 하자"): the WhatsApp picture of a payment, drawn on a canvas on the phone.
// 1080 × 2340 (a phone screen, 1:2.17) so it fills the screen when opened. Design = the "v2 merge" mock of 2026-10-01
// (repo product/brand/receipt/). Everything below is drawn in CSS px (360-wide design) and scaled ×3 — no library, works offline.
import * as R from './logic.js';
import * as B from './bs.js';

const W = 360, H = 780, SCALE = 3;
const C = { navy: '#0d2d5e', blue: '#1f6fb2', sky: '#dff1fb', ink: '#15202b', mute: '#6b7786', line: '#e6ebf1', page: '#dfe6ee', green: '#22c55e', greenInk: '#06321a', skyInk: '#3b5a7c' };
const FONT = '-apple-system, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, "Noto Sans Devanagari", sans-serif';
const font = (w, px) => `${w} ${px}px ${FONT}`;
// the line icons of the mock (24-unit boxes, stroke 2, round caps) — one set, one colour
const ICON = {
  drop: ['M12 3c3.5 4.6 6 7.8 6 11a6 6 0 0 1-12 0c0-3.2 2.5-6.4 6-11z'],
  lock: ['M5 11h14v10H5z', 'M8 11V8a4 4 0 0 1 8 0v3'],
  cal: ['M3 5h18v16H3z', 'M3 10h18M8 3v4M16 3v4'],
  chat: ['M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z'],
  globe: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z', 'M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18'],
  pin: ['M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z', 'M12 7.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z'],
  check: ['M4 12.5l5 5L20 7'],
  install: ['M4 20h16', 'M6 20V9l6-5 6 5v11', 'M10 20v-6h4v6'],
  credit: ['M4 12h16', 'M14 6l6 6-6 6'],
};
const DEV = '०१२३४५६७८९';
export const devanagari = (n) => String(n).replace(/\d/g, (d) => DEV[Number(d)]);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const niceDate = (iso) => { if (!R.isDate(iso)) return String(iso || ''); const d = R.parseD(iso); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
export const bsText = (iso) => { const b = B.adToBs(iso); return b ? `${devanagari(b.y)} ${B.BS_MONTHS_NE[b.m - 1]} ${devanagari(b.d)}` : ''; };
const ord = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][Math.min(n % 10, 4) % 4] || 'th');
const money = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN');
// receipt number: date + the tail of the payment id (unique per payment, stable across phones)
export const receiptNo = (pay) => `R-${String(pay.date || '').replace(/-/g, '').slice(2)}-${String(pay.id || '').replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase() || '0000'}`;

// What goes on the picture. x = the customer's model row (c, led), pay = the payment, co = company lines.
export function receiptData(x, pay, co = {}) {
  const led = x.led || { splits: {}, bills: [], depositCollected: 0, nextBill: null };
  const sp = led.splits[pay.id] || {};
  const p = R.PRICES;
  const paidBill = sp.extra !== undefined ? null : (led.bills.find((b) => b.paidOn === pay.date) || led.bills.filter((b) => b.paid > 0 && b.due <= pay.date).slice(-1)[0] || null);
  const shortDate = (iso) => niceDate(iso).replace(/ \d{4}$/, '');
  const after = (b) => led.bills.find((q) => q.k === b.k + 1) || (R.isDate(x.c.installDate) ? { k: b.k + 1, due: R.billDue(x.c.installDate, b.k + 1), amount: R.billAmount(b.k + 1, p).amount, paid: 0 } : null); /* the ledger stops at today — the next bill may not exist yet */
  const period = (b) => { if (!b) return ''; const nx = after(b); const to = nx ? R.addDays(nx.due, -1) : R.addDays(b.due, 29); return `${shortDate(b.due)} → ${niceDate(to)}`; };
  const lines = [];
  if (sp.extra !== undefined) lines.push({ ic: 'credit', t: String(pay.type || 'Payment'), s: '', v: sp.extra });
  else {
    if (sp.install > 0.01) lines.push({ ic: 'install', t: 'Installation / first month · जडान', s: 'first-day 4,900 · includes month 1', v: sp.install });
    if (sp.subscription > 0.01) lines.push({ ic: 'drop', t: 'Monthly subscription · मासिक शुल्क', s: paidBill ? `${ord(paidBill.k)} bill · ${period(paidBill)}` : 'monthly bill', v: sp.subscription });
    if (sp.deposit > 0.01) lines.push({ ic: 'lock', t: 'Refundable deposit · फिर्ता हुने धरौटी', s: `instalment ${paidBill ? Math.max(1, Math.min(p.depositMonths, paidBill.k - 1)) : Math.round(sp.deposit / p.depositMonthly)} of ${p.depositMonths} · not a fee`, v: sp.deposit });
    if (sp.unallocated > 0.01) lines.push({ ic: 'credit', t: 'Credit carried forward · अग्रिम', s: 'counts toward the next bill', v: sp.unallocated });
  }
  const discount = Number(pay.discount) > 0 && pay.approval !== 'Rejected' ? Number(pay.discount) : 0;
  const discountNote = discount && pay.approval === 'Pending' ? 'discount · waiting for approval' : 'discount';
  const credit = R.isNonCash(pay); /* referral / service credit: nothing was paid — a credit note */
  // deposit held as of this bill (an old receipt shows what was held then, not today's total)
  const held = Math.round(paidBill ? led.bills.filter((b) => b.k <= paidBill.k).reduce((t, b) => t + (b.parts ? b.parts.deposit : 0), 0) : (led.depositCollected || 0)), segs = Math.max(0, Math.min(p.depositMonths, Math.round(held / p.depositMonthly)));
  const nb = (paidBill && after(paidBill)) || led.nextBill;
  return {
    name: x.c.name || '', code: x.c.code || '', no: receiptNo(pay), date: niceDate(pay.date), bs: bsText(pay.date),
    method: credit ? String(pay.type || 'Credit') : (pay.method || ''), ref: credit ? '' : (pay.ref || ''), total: Number(pay.amount) || 0, lines, discount, discountNote, credit,
    bill: paidBill ? `${ord(paidBill.k)} · ${period(paidBill)}` : (sp.extra !== undefined ? String(pay.type || '') : '—'),
    held, segs, depMonths: p.depositMonths, depTotal: p.depositTotal,
    next: nb ? `${niceDate(nb.due)} · NPR ${money(nb.amount)}` : 'Paid up · सबै तिरिएको',
    phone: co.phone || '', web: co.web || 'koracarenepal.com', ward: co.ward || 'Pokhara-13', pan: co.pan || '', company: co.name || 'KORA CARE Pvt. Ltd.',
  };
}

let logoP = null;
function logo() {
  if (!logoP) logoP = new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = './logo.png'; });
  return logoP;
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); } }
function icon(ctx, name, x, y, size, color, lw = 2) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 24, size / 24); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.fillStyle = 'transparent';
  for (const d of ICON[name] || []) ctx.stroke(new Path2D(d));
  ctx.restore();
}
function text(ctx, s, x, y, { f = font(400, 12), color = C.ink, align = 'left', ls = 0, max = 0 } = {}) {
  ctx.font = f;
  if (max) { let px = Number((f.match(/(\d+(?:\.\d+)?)px/) || [])[1]) || 12; while (ctx.measureText(s).width > max && px > 8) { px -= 0.5; ctx.font = f.replace(/\d+(?:\.\d+)?px/, px + 'px'); } } ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = ls ? `${ls}px` : '0px';
  ctx.fillText(s, x, y);
  const w = ctx.measureText(s).width; if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'; return w;
}
function wrap(ctx, s, maxW, f) { ctx.font = f; const out = []; let cur = ''; for (const w of String(s).split(' ')) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; }

// Draw the receipt. Returns the canvas (1080 × 2340).
export async function drawReceipt(d) {
  const im = await logo();
  const probe = document.createElement('canvas'); probe.width = W; probe.height = H;
  const hgt = paint(probe.getContext('2d'), d, im, 30, H - 30, true);
  const cv = document.createElement('canvas'); cv.width = W * SCALE; cv.height = H * SCALE;
  const ctx = cv.getContext('2d'); ctx.scale(SCALE, SCALE);
  const ct = Math.max(24, Math.round((H - hgt) / 2));
  paint(ctx, d, im, ct, ct + hgt, false);
  return cv;
}
// draws the page + card; returns the card height it needed (measure = true draws on a throwaway canvas)
function paint(ctx, d, im, ct, cb, measure) {
  const cx = 8, cw = W - 16;
  ctx.fillStyle = C.page; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.shadowColor = 'rgba(13,45,94,.18)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5; ctx.fillStyle = '#fff'; rr(ctx, cx, ct, cw, cb - ct, 20); ctx.fill(); ctx.restore();
  const L = cx + 22, Rt = cx + cw - 22, IW = Rt - L; let y = ct + 26;
  // ---- head
  if (im) { const h = 34, w = h * im.width / im.height; ctx.drawImage(im, L, y, w, h); } else text(ctx, 'KORA', L, y + 28, { f: font(800, 26), color: C.navy });
  text(ctx, d.credit ? 'CREDIT NOTE' : 'PAYMENT RECEIPT', Rt, y + 10, { f: font(700, 10), color: C.blue, align: 'right', ls: 1.4 });
  text(ctx, d.credit ? 'क्रेडिट नोट' : 'भुक्तानी रसिद', Rt, y + 24, { f: font(500, 9.5), color: C.mute, align: 'right' });
  text(ctx, d.no, Rt, y + 44, { f: font(700, 12.5), color: C.ink, align: 'right' });
  text(ctx, `${d.date}${d.bs ? ' · ' + d.bs : ''}`, Rt, y + 58, { f: font(400, 10), color: C.mute, align: 'right' });
  text(ctx, `${d.company} · ${d.ward}`, L, y + 49, { f: font(400, 9.5), color: C.mute, max: IW * 0.58 });
  if (d.pan) text(ctx, `PAN ${d.pan}`, L, y + 62, { f: font(400, 9.5), color: C.mute });
  y += 76; ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + cw, y); ctx.stroke();
  // ---- total band
  y += 18; const bh = 74;
  ctx.save(); rr(ctx, L, y, IW, bh, 14); ctx.clip();
  const g = ctx.createLinearGradient(L, y, L + IW, y + bh); g.addColorStop(0, '#0f3a73'); g.addColorStop(0.7, '#1f6fb2'); g.addColorStop(1, '#2d86c8'); ctx.fillStyle = g; ctx.fillRect(L, y, IW, bh);
  ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.beginPath(); ctx.arc(L + IW - 20 + 75, y - 50 + 75, 75, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.arc(L + IW - 48 - 35, y + 14 + 35, 35, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  text(ctx, d.credit ? 'CREDIT APPLIED · क्रेडिट' : 'TOTAL PAID · जम्मा', L + 16, y + 26, { f: font(400, 10), color: 'rgba(255,255,255,.85)', ls: 1.2 });
  const nw = text(ctx, 'NPR', L + 16, y + 58, { f: font(600, 14), color: 'rgba(255,255,255,.9)' });
  text(ctx, money(d.total), L + 16 + nw + 5, y + 58, { f: font(800, 30), color: '#fff' });
  ctx.font = font(800, 10.5); const pw = ctx.measureText(d.credit ? 'CREDIT' : 'PAID').width + 44;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; ctx.fillStyle = C.green; rr(ctx, Rt - 16 - pw, y + 16, pw, 22, 11); ctx.fill(); ctx.restore();
  icon(ctx, 'check', Rt - 16 - pw + 10, y + 21, 12, C.greenInk, 3.2);
  text(ctx, d.credit ? 'CREDIT' : 'PAID', Rt - 16 - 12, y + 31, { f: font(800, 10.5), color: C.greenInk, align: 'right', ls: 0.6 });
  text(ctx, [d.method, d.ref].filter(Boolean).join(' · '), Rt - 16, y + 54, { f: font(400, 9.5), color: 'rgba(255,255,255,.85)', align: 'right' });
  y += bh + 18;
  // ---- who
  const col2 = L + IW / 2 + 7;
  const colW = IW / 2 - 10;
  const kv = (k, v, x0, yy) => { text(ctx, k, x0, yy, { f: font(400, 9.5), color: C.mute, ls: 0.8 }); text(ctx, v, x0, yy + 15, { f: font(600, 12.5), color: C.ink, max: colW }); };
  kv('CUSTOMER · ग्राहक', d.name, L, y + 10); kv('CUSTOMER CODE', d.code, col2, y + 10);
  kv(d.credit ? 'CREDIT TYPE' : 'PAID BY', [d.method, d.ref].filter(Boolean).join(' · '), L, y + 44); kv('BILL · बिल', d.bill, col2, y + 44);
  y += 74; ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(Rt, y); ctx.stroke();
  // ---- items
  const rows = d.lines.slice(); if (d.discount > 0) rows.push({ ic: 'credit', t: 'Discount · छुट', s: d.discountNote, v: -d.discount });
  for (const it of rows) {
    const top = y + 9; ctx.fillStyle = C.sky; rr(ctx, L, top, 24, 24, 7); ctx.fill(); icon(ctx, it.ic, L + 5, top + 5, 14, C.blue);
    text(ctx, it.t, L + 33, top + 13, { f: font(400, 12.5), color: C.ink });
    if (it.s) text(ctx, it.s, L + 33, top + 27, { f: font(400, 9.5), color: C.mute });
    text(ctx, (it.v < 0 ? '−' : '') + money(Math.abs(it.v)), Rt, top + 15, { f: font(600, 12.5), color: C.ink, align: 'right' });
    y += it.s ? 46 : 36; ctx.save(); ctx.setLineDash([1, 2]); ctx.strokeStyle = '#cfd7e1'; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(Rt, y); ctx.stroke(); ctx.restore();
  }
  y += 6; ctx.fillStyle = '#f6f8fb'; rr(ctx, L - 10, y, IW + 20, 38, 10); ctx.fill();
  text(ctx, 'TOTAL · NPR', L, y + 24, { f: font(700, 11), color: C.ink, ls: 0.7 });
  text(ctx, money(d.total), Rt, y + 25, { f: font(800, 16), color: C.navy, align: 'right' });
  y += 38 + 10;
  // ---- deposit box
  const dl = wrap(ctx, 'Refunded in full when the unit comes back. · मेसिन फिर्ता गर्दा पूरै फिर्ता हुन्छ।', IW - 24, font(400, 9.5));
  const dh = 10 + 12 + 7 + 6 + 8 + dl.length * 13 + 8;
  ctx.fillStyle = C.sky; rr(ctx, L, y, IW, dh, 12); ctx.fill();
  text(ctx, 'Deposit held so far', L + 12, y + 21, { f: font(600, 10.5), color: C.navy });
  text(ctx, `${d.segs} / ${d.depMonths} · NPR ${money(d.held)} of ${money(d.depTotal)}`, Rt - 12, y + 21, { f: font(600, 10.5), color: C.navy, align: 'right' });
  const bx = L + 12, bw = IW - 24, by = y + 29, sw = bw / d.depMonths;
  for (let i = 0; i < d.depMonths; i++) { ctx.fillStyle = i < d.segs ? C.blue : '#fff'; rr(ctx, bx + i * sw, by, sw - 2, 6, 3); ctx.fill(); }
  dl.forEach((ln, i) => text(ctx, ln, L + 12, y + 51 + i * 13, { f: font(400, 9.5), color: C.skyInk }));
  y += dh + 10;
  // ---- next bill
  ctx.fillStyle = C.sky; rr(ctx, L, y, IW, 34, 12); ctx.fill();
  icon(ctx, 'cal', L + 12, y + 11, 13, C.blue); text(ctx, 'Next bill', L + 30, y + 22, { f: font(600, 11), color: C.navy });
  text(ctx, d.next, Rt - 12, y + 22, { f: font(700, 11), color: C.navy, align: 'right' });
  y += 34 + 16; ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + cw, y); ctx.stroke();
  // ---- foot
  y += 22; text(ctx, 'Thank you · धन्यवाद', L, y, { f: font(700, 13), color: C.navy });
  y = contacts(ctx, d, L, Rt, y + 20) + 18; const fl = wrap(ctx, 'Generated by KORA Field · The VAT bill number is on the tax invoice given at the door.', IW, font(400, 9)); fl.forEach((ln, i) => text(ctx, ln, L, y + i * 13, { f: font(400, 9), color: C.mute }));
  y += (fl.length - 1) * 13 + 22;
  return y - ct;
}

export const canvasBlob = (cv) => new Promise((res) => cv.toBlob((b) => res(b), 'image/png'));
// Share via the phone's share sheet (WhatsApp → the customer). Returns 'shared' | 'unsupported' | 'cancelled'.
export async function shareImage(blob, name) {
  const file = new File([blob], name, { type: 'image/png' });
  if (!navigator.share || !navigator.canShare || !navigator.canShare({ files: [file] })) return 'unsupported';
  try { await navigator.share({ files: [file], title: name }); return 'shared'; } catch (e) { return 'cancelled'; }
}

// ---------------------------------------------------------------------------------------------------------------
// v0.13 (Jun 2026-10-02 "뭐 할거 더 없어?"): two more customer-facing pictures on the same engine
//   🎁 referral card — "bring a neighbour, you both get a month free" with the customer's own code (word-of-mouth)
//   🧪 visit report  — what we did today: raw → purified TDS, filters changed, flow, sanitising, next visit (the reason the fee is worth it)
// ---------------------------------------------------------------------------------------------------------------
const NE = { // 🔴 Nepali drafts — Tara to check
  refer: 'छिमेकी ल्याउनुहोस्', both: 'दुवैलाई १ महिना निःशुल्क', code: 'तपाईंको कोड', report: 'भ्रमण रिपोर्ट', water: 'आजको पानी', did: 'हामीले गरेको काम', next: 'अर्को भ्रमण', filters: 'फिल्टरहरू', thanks: 'धन्यवाद',
};
function head(ctx, im, L, Rt, y, title, titleNe, r1, r2, co) {
  if (im) { const h = 34, w = h * im.width / im.height; ctx.drawImage(im, L, y, w, h); } else text(ctx, 'KORA', L, y + 28, { f: font(800, 26), color: C.navy });
  text(ctx, title, Rt, y + 10, { f: font(700, 10), color: C.blue, align: 'right', ls: 1.4 });
  text(ctx, titleNe, Rt, y + 24, { f: font(500, 9.5), color: C.mute, align: 'right' });
  if (r1) text(ctx, r1, Rt, y + 44, { f: font(700, 12.5), color: C.ink, align: 'right' });
  if (r2) text(ctx, r2, Rt, y + 58, { f: font(400, 10), color: C.mute, align: 'right' });
  text(ctx, `${co.company} · ${co.ward}`, L, y + 49, { f: font(400, 9.5), color: C.mute, max: (Rt - L) * 0.58 });
  if (co.pan) text(ctx, `PAN ${co.pan}`, L, y + 62, { f: font(400, 9.5), color: C.mute });
  return y + 76;
}
function contacts(ctx, d, L, Rt, y) { /* icon + text pairs, wrapping to the next line when the row is full */
  let fx = L; ctx.font = font(400, 10);
  for (const [ic, s] of [['chat', d.phone], ['globe', d.web], ['pin', d.ward]]) { if (!s) continue; const w = ctx.measureText(s).width + 16; if (fx > L && fx + w > Rt) { fx = L; y += 18; } icon(ctx, ic, fx, y - 10, 12, C.blue); text(ctx, s, fx + 16, y, { f: font(400, 10), color: C.ink }); fx += w + 14; }
  return y;
}
function foot(ctx, d, L, Rt, IW, y, small) {
  text(ctx, `Thank you · ${NE.thanks}`, L, y, { f: font(700, 13), color: C.navy });
  y = contacts(ctx, d, L, Rt, y + 20) + 18; const fl = wrap(ctx, small, IW, font(400, 9)); fl.forEach((ln, i) => text(ctx, ln, L, y + i * 13, { f: font(400, 9), color: C.mute }));
  return y + (fl.length - 1) * 13 + 22;
}
const coOf = (co) => ({ phone: co.phone || '', web: co.web || 'koracarenepal.com', ward: co.ward || 'Pokhara-13', pan: co.pan || '', company: co.name || 'KORA CARE Pvt. Ltd.' });

export function referralData(x, co = {}) {
  return { name: x.c.name || '', code: x.c.code || '', price: money(R.PRICES.monthly), ...coOf(co) };
}
export async function drawReferralCard(d) {
  // Jun 2026-10-02 "그래 이거로하자" = H3: logo · two-tone headline · smaller code band (name inside) · you / neighbour · one guide line · one footer line
  const H2 = 450; // 1080 × 1350 (4:5)
  const im = await logo();
  const cv = document.createElement('canvas'); cv.width = W * SCALE; cv.height = H2 * SCALE;
  const ctx = cv.getContext('2d'); ctx.scale(SCALE, SCALE);
  ctx.fillStyle = '#e3eef8'; ctx.fillRect(0, 0, W, H2);
  const cx = 8, cw = W - 16, ct = 16, cb = H2 - 16;
  ctx.save(); ctx.shadowColor = 'rgba(13,45,94,.12)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5; ctx.fillStyle = '#fff'; rr(ctx, cx, ct, cw, cb - ct, 20); ctx.fill(); ctx.restore();
  const L = cx + 26, Rt = cx + cw - 26, IW = Rt - L, mid = L + IW / 2; let y = ct + 24;
  if (im) { const h = 26, w = h * im.width / im.height; ctx.drawImage(im, L, y, w, h); }
  y += 26 + 36;
  text(ctx, 'Bring a neighbour.', mid, y, { f: font(800, 20), color: C.navy, align: 'center' }); y += 24;
  text(ctx, 'You both get 1 month free.', mid, y, { f: font(800, 20), color: C.blue, align: 'center' }); y += 19;
  text(ctx, `${NE.refer} — ${NE.both}`, mid, y, { f: font(500, 10.5), color: C.mute, align: 'center', max: IW }); y += 18;
  // code band
  const kb = 76; ctx.save(); rr(ctx, L, y, IW, kb, 16); ctx.clip();
  const g = ctx.createLinearGradient(L, y, L + IW, y + kb); g.addColorStop(0, C.navy); g.addColorStop(1, C.blue); ctx.fillStyle = g; ctx.fillRect(L, y, IW, kb); ctx.restore();
  text(ctx, `YOUR CODE · ${NE.code}`, mid, y + 18, { f: font(400, 9), color: 'rgba(255,255,255,.8)', align: 'center', ls: 1.4 });
  text(ctx, d.code, mid, y + 49, { f: font(800, 26), color: '#fff', align: 'center', ls: 1 });
  text(ctx, d.name, mid, y + 66, { f: font(400, 10), color: 'rgba(255,255,255,.85)', align: 'center', max: IW - 40 });
  y += kb + 14;
  // you / neighbour
  const gw = (IW - 10) / 2, bh = 62;
  const box = (x0, k, big) => { ctx.fillStyle = C.sky; rr(ctx, x0, y, gw, bh, 14); ctx.fill(); text(ctx, k, x0 + gw / 2, y + 22, { f: font(600, 8.5), color: C.skyInk, align: 'center', ls: 1, max: gw - 16 }); text(ctx, big, x0 + gw / 2, y + 45, { f: font(700, 15), color: C.navy, align: 'center', max: gw - 16 }); };
  box(L, 'YOU · तपाईं', 'Next bill free'); box(L + gw + 10, 'NEIGHBOUR · छिमेकी', '2nd month free');
  y += bh + 26;
  // guide line: "They WhatsApp <phone> and say this code."
  ctx.font = font(400, 11); const a1 = 'They WhatsApp ', a3 = ' and say this code.'; const a2 = d.phone || 'KORA CARE';
  const w1 = ctx.measureText(a1).width, w3 = ctx.measureText(a3).width; ctx.font = font(700, 11); const w2 = ctx.measureText(a2).width;
  let x = mid - (w1 + w2 + w3) / 2; x += text(ctx, a1, x, y, { f: font(400, 11), color: C.mute }); x += text(ctx, a2, x, y, { f: font(700, 11), color: C.navy }); text(ctx, a3, x, y, { f: font(400, 11), color: C.mute });
  // footer
  const fy = cb - 24; ctx.font = font(700, 9.5); const f1 = 'KORA CARE', f2 = ' · ' + (d.web || 'koracarenepal.com'); const fw1 = ctx.measureText(f1).width; ctx.font = font(400, 9.5); const fw2 = ctx.measureText(f2).width;
  let fx = mid - (fw1 + fw2) / 2; fx += text(ctx, f1, fx, fy, { f: font(700, 9.5), color: C.navy }); text(ctx, f2, fx, fy, { f: font(400, 9.5), color: C.mute });
  return cv;
}
export function visitData(x, v, co = {}) {
  const f = (n) => (n === null || n === undefined || n === '' || !Number.isFinite(Number(n))) ? null : Number(n);
  const fd = (x.fd || []).filter((q) => q.due).map((q) => ({ type: q.type, due: niceDate(q.due), status: q.status }));
  return {
    name: x.c.name || '', code: x.c.code || '', date: niceDate(v.date), bs: bsText(v.date), tech: v.technician || '', type: v.visitType || 'Visit',
    tdsBefore: f(v.tdsBefore), tdsAfter: f(v.tdsAfter), flow: f(v.flow), sanitised: v.sanitised === 'Yes', filters: v.filters || [], minutes: f(v.durationMin),
    next: R.isDate(v.nextVisitDate) ? `${niceDate(v.nextVisitDate)}${bsText(v.nextVisitDate) ? ' · ' + bsText(v.nextVisitDate) : ''}` : '', filtersDue: fd, ...coOf(co),
  };
}
export async function drawVisitReport(d) {
  const im = await logo();
  const probe = document.createElement('canvas'); probe.width = W; probe.height = H;
  const hgt = paintVisit(probe.getContext('2d'), d, im, 30, H - 30);
  const cv = document.createElement('canvas'); cv.width = W * SCALE; cv.height = H * SCALE;
  const ctx = cv.getContext('2d'); ctx.scale(SCALE, SCALE);
  const ct = Math.max(24, Math.round((H - hgt) / 2)); paintVisit(ctx, d, im, ct, ct + hgt);
  return cv;
}
function paintVisit(ctx, d, im, ct, cb) {
  const cx = 8, cw = W - 16;
  ctx.fillStyle = C.page; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.shadowColor = 'rgba(13,45,94,.18)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5; ctx.fillStyle = '#fff'; rr(ctx, cx, ct, cw, cb - ct, 20); ctx.fill(); ctx.restore();
  const L = cx + 22, Rt = cx + cw - 22, IW = Rt - L; let y = ct + 26;
  y = head(ctx, im, L, Rt, y, 'VISIT REPORT', NE.report, d.date, d.bs ? `${d.bs}${d.tech ? ' · ' + d.tech : ''}` : d.tech, d);
  ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + cw, y); ctx.stroke();
  // band: today's water
  y += 18; const bh = 78;
  ctx.save(); rr(ctx, L, y, IW, bh, 14); ctx.clip();
  const g = ctx.createLinearGradient(L, y, L + IW, y + bh); g.addColorStop(0, '#0f3a73'); g.addColorStop(0.7, '#1f6fb2'); g.addColorStop(1, '#2d86c8'); ctx.fillStyle = g; ctx.fillRect(L, y, IW, bh);
  ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.beginPath(); ctx.arc(L + IW + 55, y + 25, 75, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  text(ctx, `WATER TODAY · ${NE.water}`, L + 16, y + 24, { f: font(400, 10), color: 'rgba(255,255,255,.85)', ls: 1.2 });
  if (d.tdsBefore !== null || d.tdsAfter !== null) {
    const a = d.tdsBefore === null ? '—' : String(d.tdsBefore), b = d.tdsAfter === null ? '—' : String(d.tdsAfter);
    let xx = L + 16; xx += text(ctx, 'TDS', xx, y + 56, { f: font(600, 13), color: 'rgba(255,255,255,.9)' }) + 8;
    xx += text(ctx, a, xx, y + 56, { f: font(800, 28), color: 'rgba(255,255,255,.8)' }) + 8;
    xx += text(ctx, '→', xx, y + 54, { f: font(600, 20), color: '#8fd3f4' }) + 8;
    xx += text(ctx, b, xx, y + 56, { f: font(800, 28), color: '#fff' }) + 6;
    text(ctx, 'ppm', xx, y + 56, { f: font(500, 10), color: 'rgba(255,255,255,.8)' });
  } else text(ctx, d.type, L + 16, y + 56, { f: font(800, 22), color: '#fff' });
  ctx.font = font(800, 10.5); const pw = ctx.measureText('CHECKED').width + 44;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; ctx.fillStyle = C.green; rr(ctx, Rt - 16 - pw, y + 16, pw, 22, 11); ctx.fill(); ctx.restore();
  icon(ctx, 'check', Rt - 16 - pw + 10, y + 21, 12, C.greenInk, 3.2);
  text(ctx, 'CHECKED', Rt - 16 - 12, y + 31, { f: font(800, 10.5), color: C.greenInk, align: 'right', ls: 0.6 });
  if (d.flow !== null) text(ctx, `${d.flow} L/min`, Rt - 16, y + 56, { f: font(500, 10), color: 'rgba(255,255,255,.85)', align: 'right' });
  y += bh + 18;
  // who
  const col2 = L + IW / 2 + 7, colW = IW / 2 - 10;
  const kv = (k, v, x0, yy) => { text(ctx, k, x0, yy, { f: font(400, 9.5), color: C.mute, ls: 0.8 }); text(ctx, v, x0, yy + 15, { f: font(600, 12.5), color: C.ink, max: colW }); };
  kv('CUSTOMER · ग्राहक', d.name, L, y + 10); kv('CUSTOMER CODE', d.code, col2, y + 10);
  y += 44; ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(Rt, y); ctx.stroke();
  // what we did
  y += 18; text(ctx, `WHAT WE DID · ${NE.did}`, L, y, { f: font(600, 9.5), color: C.mute, ls: 1 }); y += 4;
  const rows = [];
  rows.push({ ic: 'drop', t: d.type, s: d.minutes ? `${d.minutes} min on site` : '' });
  if (d.filters.length) rows.push({ ic: 'lock', t: `Filters changed: ${d.filters.join(', ')}`, s: 'old ones taken away' });
  if (d.sanitised) rows.push({ ic: 'check', t: 'Sanitised · सफाइ', s: 'housings, tube and tap' });
  for (const it of rows) {
    const top = y + 9; ctx.fillStyle = C.sky; rr(ctx, L, top, 24, 24, 7); ctx.fill(); icon(ctx, it.ic, L + 5, top + 5, 14, C.blue);
    text(ctx, it.t, L + 33, top + 13, { f: font(400, 12.5), color: C.ink, max: IW - 36 });
    if (it.s) text(ctx, it.s, L + 33, top + 27, { f: font(400, 9.5), color: C.mute });
    y += it.s ? 46 : 36; ctx.save(); ctx.setLineDash([1, 2]); ctx.strokeStyle = '#cfd7e1'; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(Rt, y); ctx.stroke(); ctx.restore();
  }
  // filters due
  if (d.filtersDue.length) {
    y += 16; text(ctx, `YOUR FILTERS · ${NE.filters}`, L, y, { f: font(600, 9.5), color: C.mute, ls: 1 }); y += 6;
    const n = d.filtersDue.length, bw = (IW - (n - 1) * 6) / n;
    d.filtersDue.forEach((q, i) => { const x0 = L + i * (bw + 6); ctx.fillStyle = q.status === 'overdue' ? '#fde8e8' : q.status === 'soon' ? '#fff4d6' : C.sky; rr(ctx, x0, y, bw, 40, 10); ctx.fill();
      text(ctx, q.type, x0 + bw / 2, y + 16, { f: font(700, 11), color: C.navy, align: 'center' }); text(ctx, q.due, x0 + bw / 2, y + 31, { f: font(400, 8.5), color: C.skyInk, align: 'center', max: bw - 6 }); });
    y += 40;
  }
  // next visit
  if (d.next) { y += 12; ctx.fillStyle = C.sky; rr(ctx, L, y, IW, 34, 12); ctx.fill(); icon(ctx, 'cal', L + 12, y + 11, 13, C.blue); text(ctx, `Next visit · ${NE.next}`, L + 30, y + 22, { f: font(600, 11), color: C.navy }); text(ctx, d.next, Rt - 12, y + 22, { f: font(700, 11), color: C.navy, align: 'right', max: IW - 130 }); y += 34; }
  y += 16; ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + cw, y); ctx.stroke(); y += 22;
  y = foot(ctx, d, L, Rt, IW, y, 'Generated by KORA Field · Anything wrong with the water or the purifier? WhatsApp us.');
  return y - ct;
}
