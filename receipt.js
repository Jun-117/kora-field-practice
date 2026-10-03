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
  'swap': ['M4 7h12l-3-3', 'M20 17H8l3 3'],
  'spark': ['M12 3v3M12 18v3M3 12h3M18 12h3', 'M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1'],
  'tap': ['M4 10h9a3 3 0 0 1 3 3v2M13 10V6h3M4 10v4h4v-4M16 15v4'],
  'phone': ['M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z'],
  'user': ['M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8z', 'M4 21a8 8 0 0 1 16 0'],
};
const DEV = '०१२३४५६७८९';
export const devanagari = (n) => String(n).replace(/\d/g, (d) => DEV[Number(d)]);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const niceDate = (iso) => { if (!R.isDate(iso)) return String(iso || ''); const d = R.parseD(iso); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
export const bsText = (iso) => { const b = B.adToBs(iso); return b ? `${devanagari(b.y)} ${B.BS_MONTHS_NE[b.m - 1]} ${devanagari(b.d)}` : ''; };
export const bsShort = (iso) => { const b = B.adToBs(iso); return b ? `${B.BS_MONTHS_NE[b.m - 1]} ${devanagari(b.d)}` : ''; }; /* v0.15: month + day only (ranges) */
const NE_CO = 'कोरा केयर प्राइभेट लिमिटेड'; /* 🟢 registered Nepali name (OCR, 2026-09-07) — the Nepali is the legal name, English alongside */
export const REFERRAL_SHARE = 0.5; /* v0.15 (Tara 10/3 "한 달 무료는 너무 퍼주는거" → Jun: 50% coupon for the referrer) */
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
  const span = (b) => { const nx = after(b); return [b.due, nx ? R.addDays(nx.due, -1) : R.addDays(b.due, 29)]; };
  const period = (b) => { if (!b) return ''; const [f, to] = span(b); return `${shortDate(f)} → ${niceDate(to)}`; };
  const periodBs = (b) => { if (!b) return ''; const [f, to] = span(b); return `${bsShort(f)} → ${bsShort(to)}`; }; /* v0.15: every date also in BS (Tara 10/3) */
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
    bill: paidBill ? `${ord(paidBill.k)} · ${period(paidBill)}` : (sp.extra !== undefined ? String(pay.type || '') : '—'), billBs: paidBill ? periodBs(paidBill) : '',
    held, segs, depMonths: p.depositMonths, depTotal: p.depositTotal,
    next: nb ? `${niceDate(nb.due)} · NPR ${money(nb.amount)}` : 'Paid up · सबै तिरिएको', nextBs: nb ? bsText(nb.due) : '',
    ...coOf(co),
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
  const ct = 0; cv.height = Math.round(hgt) * SCALE; const ctx2 = cv.getContext('2d'); ctx2.scale(SCALE, SCALE); /* v0.14: canvas = exactly the card */
  paint(ctx2, d, im, ct, hgt, false);
  return cv;
}
// draws the page + card; returns the card height it needed (measure = true draws on a throwaway canvas)
function paint(ctx, d, im, ct, cb, measure) {
  const cx = 0, cw = W; /* v0.14 (Jun 10/3 "0px"): the card is the picture — no grey page, no shadow, no rounded corners */
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  const L = cx + 22, Rt = cx + cw - 22, IW = Rt - L; let y = ct + 26;
  // ---- head
  y = head(ctx, im, L, Rt, y, d.credit ? 'CREDIT NOTE' : 'PAYMENT RECEIPT', d.credit ? 'क्रेडिट नोट' : 'भुक्तानी रसिद', d.no, `${d.date}${d.bs ? ' · ' + d.bs : ''}`, d); /* v0.15: one head for every card — legal name on top */
  ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + cw, y); ctx.stroke();
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
  kv('CUSTOMER · ग्राहक', d.name, L, y + 10); kv('CODE · कोड', d.code, col2, y + 10);
  kv(d.credit ? 'CREDIT TYPE · क्रेडिट' : 'PAID BY · माध्यम', [d.method, d.ref].filter(Boolean).join(' · '), L, y + 44); kv('BILL · बिल', d.bill, col2, y + 44);
  if (d.billBs) text(ctx, d.billBs, col2, y + 44 + 29, { f: font(400, 9.5), color: C.mute, max: colW }); /* v0.15: the same period in BS under the bill */
  y += d.billBs ? 86 : 74; ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(Rt, y); ctx.stroke();
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
  text(ctx, 'TOTAL · जम्मा · NPR', L, y + 24, { f: font(700, 11), color: C.ink, ls: 0.7 });
  text(ctx, money(d.total), Rt, y + 25, { f: font(800, 16), color: C.navy, align: 'right' });
  y += 38 + 10;
  // ---- deposit box
  const dl = wrap(ctx, 'Refunded in full when the unit comes back. · मेसिन फिर्ता गर्दा पूरै फिर्ता हुन्छ।', IW - 24, font(400, 9.5));
  const dh = 10 + 12 + 7 + 6 + 8 + dl.length * 13 + 8;
  ctx.fillStyle = C.sky; rr(ctx, L, y, IW, dh, 12); ctx.fill();
  text(ctx, 'Deposit held so far · धरौटी', L + 12, y + 21, { f: font(600, 10.5), color: C.navy });
  text(ctx, `${d.segs} / ${d.depMonths} · NPR ${money(d.held)} of ${money(d.depTotal)}`, Rt - 12, y + 21, { f: font(600, 10.5), color: C.navy, align: 'right' });
  const bx = L + 12, bw = IW - 24, by = y + 29, sw = bw / d.depMonths;
  for (let i = 0; i < d.depMonths; i++) { ctx.fillStyle = i < d.segs ? C.blue : '#fff'; rr(ctx, bx + i * sw, by, sw - 2, 6, 3); ctx.fill(); }
  dl.forEach((ln, i) => text(ctx, ln, L + 12, y + 51 + i * 13, { f: font(400, 9.5), color: C.skyInk }));
  y += dh + 10;
  // ---- next bill
  y += dateBox(ctx, L, Rt, IW, y, `Next bill · ${NE.nextBill}`, d.next, d.nextBs) + 16; ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + cw, y); ctx.stroke();
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
  refer: 'छिमेकी ल्याउनुहोस्', both: 'दुवैलाई १ महिना निःशुल्क', half: 'तपाईंको अर्को बिल आधा मूल्य', code: 'तपाईंको कोड', nextBill: 'अर्को बिल', person: 'तपाईंको KORA व्यक्ति', firstVisit: 'पहिलो भ्रमण', report: 'भ्रमण रिपोर्ट', water: 'आजको पानी', did: 'हामीले गरेको काम', next: 'अर्को भ्रमण', filters: 'फिल्टरहरू', thanks: 'धन्यवाद',
};
function head(ctx, im, L, Rt, y, title, titleNe, r1, r2, co) {
  // v0.15 (Jun 10/3, from Tara: "맨 위에 KORA CARE PRIVATE LIMITED … headline에"): the legal name is the first line on its own,
  // the Nepali registered form under it; then the logo with the card title; then the number / date row. Nothing shares a line with the headline.
  const IW = Rt - L;
  text(ctx, String(co.company || 'Kora Care Private Limited').toUpperCase(), L, y + 12, { f: font(800, 13), color: C.navy, ls: 1.2, max: IW });
  text(ctx, co.companyNe || NE_CO, L, y + 27, { f: font(500, 9.5), color: C.mute, max: IW * 0.55 });
  text(ctx, [co.ward, co.pan ? `PAN ${co.pan}` : ''].filter(Boolean).join(' · '), Rt, y + 27, { f: font(400, 9.5), color: C.mute, align: 'right', max: IW * 0.42 });
  if (im) { const h = 30, w = h * im.width / im.height; ctx.drawImage(im, L, y + 44, w, h); } else text(ctx, 'KORA', L, y + 68, { f: font(800, 22), color: C.navy });
  text(ctx, title, Rt, y + 56, { f: font(700, 10), color: C.blue, align: 'right', ls: 1.4 });
  text(ctx, titleNe, Rt, y + 70, { f: font(500, 9.5), color: C.mute, align: 'right' });
  if (r1) text(ctx, r1, L, y + 94, { f: font(700, 12.5), color: C.ink, max: IW * 0.5 });
  if (r2) text(ctx, r2, Rt, y + 94, { f: font(400, 10), color: C.mute, align: 'right', max: IW * 0.48 });
  return y + (r1 || r2 ? 108 : 88);
}
// sky box with a date on the right — a second small line carries the Nepali date (v0.15: "모든 카드에 날짜들은 네팔력도")
function dateBox(ctx, L, Rt, IW, y, label, value, valueBs) {
  const bh = valueBs ? 46 : 34; ctx.fillStyle = C.sky; rr(ctx, L, y, IW, bh, 12); ctx.fill();
  icon(ctx, 'cal', L + 12, y + 11, 13, C.blue); const lw = text(ctx, label, L + 30, y + 22, { f: font(600, 11), color: C.navy, max: IW * 0.5 });
  text(ctx, value, Rt - 12, y + 22, { f: font(700, 11), color: C.navy, align: 'right', max: IW - 42 - lw - 10 });
  if (valueBs) text(ctx, valueBs, Rt - 12, y + 37, { f: font(400, 9.5), color: C.skyInk, align: 'right', max: IW - 24 });
  return bh;
}
// round staff photo (or the person icon) — the visit note and the installed card say who came (v0.15: "직원 full name+사진")
function avatar(ctx, x, y, r, img) {
  ctx.save(); ctx.beginPath(); ctx.arc(x + r, y + r, r, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
  if (img) { try { const k = Math.max((2 * r) / img.width, (2 * r) / img.height); ctx.drawImage(img, x + r - (img.width * k) / 2, y + r - (img.height * k) / 2, img.width * k, img.height * k); } catch (e) { ctx.fillStyle = '#d6dde6'; ctx.fillRect(x, y, 2 * r, 2 * r); } }
  else { ctx.fillStyle = '#d6dde6'; ctx.fillRect(x, y, 2 * r, 2 * r); icon(ctx, 'user', x + r - 9, y + r - 9, 18, C.navy); }
  ctx.restore(); ctx.beginPath(); ctx.arc(x + r, y + r, r, 0, Math.PI * 2); ctx.strokeStyle = C.blue; ctx.lineWidth = 1.5; ctx.stroke();
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
const coOf = (co) => ({ phone: co.phone || '', web: co.web || 'koracarenepal.com', ward: co.ward || 'Pokhara-13', pan: co.pan || '', company: co.name || 'Kora Care Private Limited', companyNe: co.nameNe || NE_CO });

export function referralData(x, co = {}) {
  return { name: x.c.name || '', code: x.c.code || '', price: money(R.PRICES.monthly), half: money(Math.round(R.PRICES.monthly * REFERRAL_SHARE)), ...coOf(co) };
}
export async function drawReferralCard(d) {
  // Jun 2026-10-02 "그래 이거로하자" = H3: logo · two-tone headline · smaller code band (name inside) · you / neighbour · one guide line · one footer line
  const H2 = 450; // 1080 × 1350 (4:5)
  const im = await logo();
  const cv = document.createElement('canvas'); cv.width = W * SCALE; cv.height = H2 * SCALE;
  const ctx = cv.getContext('2d'); ctx.scale(SCALE, SCALE);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H2); /* v0.14: 0px */
  const cx = 0, cw = W, ct = 0, cb = H2;
  const L = cx + 26, Rt = cx + cw - 26, IW = Rt - L, mid = L + IW / 2; let y = ct + 30;
  if (im) { const h = 26, w = h * im.width / im.height; ctx.drawImage(im, L, y, w, h); }
  // v0.15: the block below is ~250px tall — centre it between the logo line and the footer instead of stacking it at the top
  const blockH = 24 + 19 + 18 + 76 + 14 + 62 + 26 + 4; const free = (cb - 60) - (y + 26) - blockH; y += 26 + Math.max(24, Math.round(free / 2));
  text(ctx, 'Bring a neighbour.', mid, y, { f: font(800, 20), color: C.navy, align: 'center' }); y += 24;
  text(ctx, 'Your next bill: half price.', mid, y, { f: font(800, 20), color: C.blue, align: 'center' }); y += 19; /* v0.15: 50% for the referrer (Tara 10/3) */
  text(ctx, `${NE.refer} — ${NE.half}`, mid, y, { f: font(500, 10.5), color: C.mute, align: 'center', max: IW }); y += 18;
  // code band
  const kb = 76; ctx.save(); rr(ctx, L, y, IW, kb, 16); ctx.clip();
  const g = ctx.createLinearGradient(L, y, L + IW, y + kb); g.addColorStop(0, C.navy); g.addColorStop(1, C.blue); ctx.fillStyle = g; ctx.fillRect(L, y, IW, kb); ctx.restore();
  text(ctx, `YOUR CODE · ${NE.code}`, mid, y + 18, { f: font(400, 9), color: 'rgba(255,255,255,.8)', align: 'center', ls: 1.4 });
  text(ctx, d.code, mid, y + 49, { f: font(800, 26), color: '#fff', align: 'center', ls: 1 });
  text(ctx, d.name, mid, y + 66, { f: font(400, 10), color: 'rgba(255,255,255,.85)', align: 'center', max: IW - 40 });
  y += kb + 14;
  // one box: what the referrer gets (the neighbour's side is not promised on the card — Jun 10/3)
  const bh = 62; ctx.fillStyle = C.sky; rr(ctx, L, y, IW, bh, 14); ctx.fill();
  text(ctx, 'YOU · तपाईं', mid, y + 22, { f: font(600, 8.5), color: C.skyInk, align: 'center', ls: 1 });
  text(ctx, `50% off your next bill · NPR ${d.half}`, mid, y + 45, { f: font(700, 15), color: C.navy, align: 'center', max: IW - 16 });
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
export function visitData(x, v, co = {}, photos = {}, who = {}) {
  // v0.14 (Jun 10/3 #7): the visit NOTE — a record, not a proof. No TDS, no stamp. Rows = what we did; PP changed → the two photos slide in.
  const f = (n) => (n === null || n === undefined || n === '' || !Number.isFinite(Number(n))) ? null : Number(n);
  const filters = v.filters || [];
  const rows = [];
  if (filters.length) rows.push({ ic: 'swap', t: `${filters.join(', ')} filter${filters.length > 1 ? 's' : ''} — new ${filters.length > 1 ? 'ones' : 'one'} in`, s: `the old ${filters.length > 1 ? 'ones' : 'one'} taken away` });
  else rows.push({ ic: 'drop', t: `${v.visitType || 'Purifier'} — checked`, s: 'flow and tap fine' });
  if (v.sanitised === 'Yes') rows.push({ ic: 'spark', t: 'Housing and tube cleaned', s: '' });
  if (f(v.flow) !== null || f(v.tdsAfter) !== null) rows.push({ ic: 'tap', t: 'Tap checked', s: '' });
  const nextFilter = (x.fd || []).filter((q) => q.due && q.type !== 'Sanitise' && !filters.includes(q.type)).sort((p, q) => String(p.due).localeCompare(String(q.due)))[0]; /* a filter changed today is not the next one due */
  const nv = R.isDate(v.nextVisitDate) ? v.nextVisitDate : '';
  const pp = (x.fd || []).find((q) => q.type === 'PP');
  // v0.15 filters-together: the next change is one visit with every filter that falls due before it (x.fb from the model)
  const fb = x.fb && x.fb.types && x.fb.types.some((q) => !filters.includes(q)) ? x.fb : null;
  const nextF = nv ? (fb && fb.date <= R.addDays(nv, 14) ? ' · filters' : !fb && nextFilter && nextFilter.due <= R.addDays(nv, 14) ? ' · ' + nextFilter.type + ' filter' : '') : '';
  return {
    name: x.c.name || '', code: x.c.code || '', date: niceDate(v.date), bs: bsText(v.date), tech: who.name || v.technician || '', techPhoto: who.photo || null, rows,
    ppChanged: filters.includes('PP'), ppBefore: photos.before || null, ppAfter: photos.after || null,
    ppMonths: pp && R.isDate(pp.last) && R.isDate(v.date) && pp.last < v.date ? Math.max(1, Math.round(R.daysBetween(pp.last, v.date) / 30.44)) : null,
    next: nv ? `${niceDate(nv)}${nextF}` : '', nextBs: nv ? bsText(nv) : '', ...coOf(co),
  };
}
export async function drawVisitReport(d) {
  const im = await logo();
  const probe = document.createElement('canvas'); probe.width = W; probe.height = H;
  const hgt = paintVisit(probe.getContext('2d'), d, im);
  const cv = document.createElement('canvas'); cv.width = W * SCALE; cv.height = Math.round(hgt) * SCALE;
  const ctx = cv.getContext('2d'); ctx.scale(SCALE, SCALE); paintVisit(ctx, d, im);
  return cv;
}
function photoBox(ctx, x0, y, gw, ph, img, cap, pad) {
  ctx.fillStyle = C.sky; rr(ctx, x0, y, gw, ph + pad, 14); ctx.fill();
  ctx.save(); rr(ctx, x0, y, gw, ph, 14); ctx.clip();
  if (img) { try { const r = Math.max(gw / img.width, ph / img.height); ctx.drawImage(img, x0 + (gw - img.width * r) / 2, y + (ph - img.height * r) / 2, img.width * r, img.height * r); } catch (e) { ctx.fillStyle = '#b9c5d3'; ctx.fillRect(x0, y, gw, ph); } }
  else { ctx.fillStyle = '#b9c5d3'; ctx.fillRect(x0, y, gw, ph); text(ctx, 'photo', x0 + gw / 2, y + ph / 2 + 4, { f: font(400, 10), color: '#2f3f52', align: 'center' }); }
  ctx.restore(); if (cap) text(ctx, cap, x0 + gw / 2, y + ph + 16, { f: font(600, 9.5), color: C.navy, align: 'center', max: gw - 10 });
}
function paintVisit(ctx, d, im) {
  const cx = 0, cw = W, ct = 0; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  const L = cx + 22, Rt = cx + cw - 22, IW = Rt - L; let y = ct + 26;
  y = head(ctx, im, L, Rt, y, 'VISIT NOTE', NE.report, d.date, d.bs, d);
  ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + cw, y); ctx.stroke();
  y += 24; text(ctx, 'We came by today.', L, y, { f: font(800, 19), color: C.navy }); y += 16; text(ctx, 'आज हामी आयौं', L, y, { f: font(500, 10), color: C.mute });
  // who came — full name + photo (v0.15, Tara 10/3)
  y += 12; const av = 19; avatar(ctx, L, y, av, d.techPhoto);
  text(ctx, d.tech || 'KORA CARE', L + 2 * av + 10, y + 16, { f: font(700, 12.5), color: C.navy, max: IW - 2 * av - 14 });
  text(ctx, `your KORA person · ${NE.person}`, L + 2 * av + 10, y + 31, { f: font(400, 9.5), color: C.mute, max: IW - 2 * av - 14 });
  y += 2 * av + 12; ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(Rt, y); ctx.stroke();
  for (const it of d.rows) {
    const top = y + 9; ctx.fillStyle = C.sky; rr(ctx, L, top, 24, 24, 7); ctx.fill(); icon(ctx, it.ic, L + 5, top + 5, 14, C.blue);
    text(ctx, it.t, L + 33, top + 13, { f: font(400, 12.5), color: C.ink, max: IW - 36 });
    if (it.s) text(ctx, it.s, L + 33, top + 27, { f: font(400, 9.5), color: C.mute });
    y += it.s ? 46 : 36; ctx.save(); ctx.setLineDash([1, 2]); ctx.strokeStyle = '#cfd7e1'; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(Rt, y); ctx.stroke(); ctx.restore();
  }
  if (d.ppChanged) { y += 10; const gw = (IW - 10) / 2, ph = 88; photoBox(ctx, L, y, gw, ph, d.ppBefore, d.ppMonths ? `used PP · ${d.ppMonths} months` : 'used PP', 24); photoBox(ctx, L + gw + 10, y, gw, ph, d.ppAfter, 'new PP', 24); y += ph + 24; }
  if (d.next) { y += 12; y += dateBox(ctx, L, Rt, IW, y, `Next visit · ${NE.next}`, d.next, d.nextBs); }
  y += 16; ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + cw, y); ctx.stroke(); y += 22;
  y = foot(ctx, d, L, Rt, IW, y, 'Anything wrong with the water or the purifier? WhatsApp us.');
  return y - ct;
}
// v0.14 (#B install card): photo of the purifier · who installed · two promises · first visit
export function installData(x, co = {}, photo = null, who = {}) {
  const c = x.c; const first = R.isDate(c.installDate) ? R.addMonths(c.installDate, 1) : '';
  return { name: c.name || '', code: c.code || '', date: niceDate(c.installDate), bs: bsText(c.installDate), tech: who.name || c.agent || '', techPhoto: who.photo || null, photo, first: first ? `${niceDate(first)} · we come to you` : '', firstBs: first ? bsText(first) : '', ...coOf(co) };
}
export async function drawInstallCard(d) {
  const im = await logo();
  const probe = document.createElement('canvas'); probe.width = W; probe.height = 450; const need = paintInstall(probe.getContext('2d'), d, im, 450);
  const H2 = Math.max(450, Math.ceil(need)); /* 4:5 when it fits, taller when the content needs it (v0.15) */
  const cv = document.createElement('canvas'); cv.width = W * SCALE; cv.height = H2 * SCALE; const ctx = cv.getContext('2d'); ctx.scale(SCALE, SCALE);
  paintInstall(ctx, d, im, H2);
  return cv;
}
function paintInstall(ctx, d, im, H2) {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H2);
  const L = 22, Rt = W - 22, IW = Rt - L; let y = 26;
  y = head(ctx, im, L, Rt, y, 'INSTALLED', 'जडान भयो', d.date, d.bs, d);
  ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  y += 24; text(ctx, 'Your KORA is in.', L, y, { f: font(800, 19), color: C.navy }); y += 16; text(ctx, 'तपाईंको KORA जडान भयो', L, y, { f: font(500, 10), color: C.mute });
  y += 14; const pw = 118, ph = 80; photoBox(ctx, L, y, pw, ph, d.photo, '', 0);
  avatar(ctx, L + pw + 17, y + ph / 2 - 19, 19, d.techPhoto);
  text(ctx, 'Installed by', L + pw + 64, y + 18, { f: font(400, 9.5), color: C.mute });
  text(ctx, d.tech || 'KORA CARE', L + pw + 64, y + 34, { f: font(700, 12.5), color: C.navy, max: IW - pw - 70 });
  text(ctx, `your KORA person · ${NE.person}`, L + pw + 64, y + 49, { f: font(400, 9.5), color: C.mute, max: IW - pw - 70 });
  text(ctx, `${d.date}${d.bs ? ' · ' + d.bs : ''}`, L + pw + 64, y + 64, { f: font(400, 9.5), color: C.mute, max: IW - pw - 70 });
  y += ph + 14; ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(Rt, y); ctx.stroke();
  for (const it of [{ ic: 'swap', t: 'We change every filter — you never buy one', s: 'all of them together, on one visit' }, { ic: 'phone', t: 'We call you in 7 days to check all is well', s: '' }]) {
    const top = y + 9; ctx.fillStyle = C.sky; rr(ctx, L, top, 24, 24, 7); ctx.fill(); icon(ctx, it.ic, L + 5, top + 5, 14, C.blue);
    text(ctx, it.t, L + 33, top + 13, { f: font(400, 12.5), color: C.ink, max: IW - 36 }); if (it.s) text(ctx, it.s, L + 33, top + 27, { f: font(400, 9.5), color: C.mute });
    y += it.s ? 46 : 36; ctx.save(); ctx.setLineDash([1, 2]); ctx.strokeStyle = '#cfd7e1'; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(Rt, y); ctx.stroke(); ctx.restore();
  }
  if (d.first) { y += 12; y += dateBox(ctx, L, Rt, IW, y, `First visit · ${NE.firstVisit}`, d.first, d.firstBs); }
  const fy = Math.max(H2 - 62, y + 34); ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(0, fy - 16); ctx.lineTo(W, fy - 16); ctx.stroke();
  const end = foot(ctx, d, L, Rt, IW, fy + 4, 'Anything wrong with the water or the purifier? WhatsApp us.');
  return end; /* height the content needs */
}
