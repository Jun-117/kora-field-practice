// Customer pictures (v0.12 image receipt → v0.16 theme v2, Jun 2026-10-03 "이거로 당연히 적용 시켜야지"): drawn on a canvas on the phone,
// 360-wide design units × 3 = 1080 px wide, height = the content (0 px of page around the card). No library, works offline.
// THEME v2 (one theme for every card): navy→blue header band carrying the legal name on its first line, a white logo chip and the card title ·
// white body · icons = white line icons in solid navy / blue circles · one gradient band per card · sky "next" row · the same footer everywhere.
import * as R from './logic.js';
import * as B from './bs.js';

const W = 360, SCALE = 3;
const C = { navy: '#0d2d5e', blue: '#1f6fb2', sky: '#dff1fb', skyLine: '#bfe0f5', ink: '#15202b', mute: '#6b7786', line: '#e6ebf1', green: '#22c55e', greenInk: '#06321a', skyInk: '#3b5a7c', tot: '#f3f6fa', lite: '#8fd3f4', photo: '#b9c5d3' };
const FONT = '-apple-system, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, "Noto Sans Devanagari", sans-serif';
const font = (w, px) => `${w} ${px}px ${FONT}`;
// line icons (24-unit boxes, round caps) — drawn white inside a filled circle
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
  swap: ['M4 7h12l-3-3', 'M20 17H8l3 3'],
  clean: ['M3 20l6-6', 'M14 4l6 6-8 8-6-6z'],
  tap: ['M4 10h9a3 3 0 0 1 3 3v2M13 10V6h3M4 10v4h4v-4M16 15v4'],
  phone: ['M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z'],
  user: ['M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8z', 'M4 21a8 8 0 0 1 16 0'],
  qr: ['M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z', 'M14 14h3v3h-3zM17 17h3v3h-3zM14 20h1M20 14h0'],
};
const DEV = '०१२३४५६७८९';
export const devanagari = (n) => String(n).replace(/\d/g, (d) => DEV[Number(d)]);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const niceDate = (iso) => { if (!R.isDate(iso)) return String(iso || ''); const d = R.parseD(iso); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
export const bsText = (iso) => { const b = B.adToBs(iso); return b ? `${devanagari(b.y)} ${B.BS_MONTHS_NE[b.m - 1]} ${devanagari(b.d)}` : ''; };
export const bsShort = (iso) => { const b = B.adToBs(iso); return b ? `${B.BS_MONTHS_NE[b.m - 1]} ${devanagari(b.d)}` : ''; }; /* month + day only (ranges) */
const NE_CO = 'कोरा केयर प्राइभेट लिमिटेड'; /* 🟢 registered Nepali name (OCR, 2026-09-07) — the Nepali is the legal name, English alongside */
export const REFERRAL_SHARE = 0.5; /* v0.15 (Tara 10/3 "한 달 무료는 너무 퍼주는거" → Jun: 50% coupon for the referrer) */
const ord = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][Math.min(n % 10, 4) % 4] || 'th');
const money = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN');
// receipt number: date + the tail of the payment id (unique per payment, stable across phones)
export const receiptNo = (pay) => `R-${String(pay.date || '').replace(/-/g, '').slice(2)}-${String(pay.id || '').replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase() || '0000'}`;
const NE = { // 🔴 Nepali drafts — Tara to check
  refer: 'छिमेकी ल्याउनुहोस्', half: 'तपाईंको अर्को बिल आधा मूल्य', code: 'तपाईंको कोड', report: 'भ्रमण नोट', next: 'अर्को भ्रमण', thanks: 'धन्यवाद', nextBill: 'अर्को बिल', person: 'तपाईंको KORA व्यक्ति', firstVisit: 'पहिलो भ्रमण',
  installed: 'जडान भयो', isIn: 'तपाईंको KORA जडान भयो', came: 'आज हामी आयौं', receipt: 'भुक्तानी रसिद', creditNote: 'क्रेडिट नोट', total: 'जम्मा', customer: 'ग्राहक', codeK: 'कोड', bill: 'बिल', payBy: 'माध्यम', deposit: 'धरौटी',
  billDue: 'बिल तिर्ने', thisMonth: 'यो महिना', bankApp: 'बैंकको एप → ग्यालरीबाट QR स्क्यान', scan: 'स्क्यान गरी तिर्नुहोस्', paidQ: 'तिर्नुभयो? स्क्रिनसट पठाउनुहोस्',
};
// v0.16: bill k's day with pauses counted (a paused home's bill days move — the plain schedule printed "2 Nov → 1 Nov")
const dueOf = (c, k) => { const d = R.billDays(c).dues[k - 1]; return R.isDate(d) ? d : R.billDue(c.installDate, k); };
const coOf = (co) => ({ phone: co.phone || '', web: co.web || 'koracarenepal.com', ward: co.ward || 'Pokhara-13', pan: co.pan || '', company: co.name || 'Kora Care Private Limited', companyNe: co.nameNe || NE_CO, bankLine: co.bankLine || '' });

// ================= data =================
// What goes on the receipt. x = the customer's model row (c, led), pay = the payment, co = company lines.
export function receiptData(x, pay, co = {}, pays = null, today = '') {
  const led = x.led || { splits: {}, bills: [], depositCollected: 0, nextBill: null };
  const sp = led.splits[pay.id] || {};
  const p = R.PRICES;
  // v0.16: the customer's newest payment → its bills = the ones whose paid amount it actually changed (a credit or a part-payment lands
  // where the money went — credits are booked first, so the old "paid on this date" guess pointed at the wrong bill), and "next bill" = the
  // first bill still open now, with only what is left on it. An older receipt (the ledger has moved on since) keeps the old reading.
  let paidBill = null, firstBill = null, nextOpen = null;
  const own = Array.isArray(pays) ? pays.filter((q) => q.customerId === x.c.id && Number(q.amount) > 0) : null;
  if (own && sp.extra === undefined && R.isDate(today) && !own.some((q) => q.id !== pay.id && String(q.date) > String(pay.date))) {
    const l0 = R.ledger(x.c, own.filter((q) => q.id !== pay.id), today);
    const touched = led.bills.filter((b) => { const b0 = l0.bills.find((q) => q.k === b.k); return Math.abs((Number(b.paid) || 0) - (b0 ? Number(b0.paid) || 0 : 0)) > 0.0001; });
    if (touched.length) { firstBill = touched[0]; paidBill = touched[touched.length - 1]; nextOpen = led.nextBill || null; }
  }
  if (!paidBill) paidBill = sp.extra !== undefined ? null : (led.bills.find((b) => b.paidOn === pay.date) || led.bills.filter((b) => b.paid > 0 && b.due <= pay.date).slice(-1)[0] || null);
  if (!firstBill) firstBill = paidBill;
  const shortDate = (iso) => niceDate(iso).replace(/ \d{4}$/, '');
  const after = (b) => led.bills.find((q) => q.k === b.k + 1) || (R.isDate(x.c.installDate) ? { k: b.k + 1, due: dueOf(x.c, b.k + 1), amount: R.billAmount(b.k + 1, p).amount, paid: 0 } : null); /* the ledger stops at today — the next bill may not exist yet */
  const span = (b) => { const nx = after(b); return [b.due, nx ? R.addDays(nx.due, -1) : R.addDays(b.due, 29)]; };
  const many = !!(paidBill && firstBill && firstBill.k !== paidBill.k);
  const period = (b) => { if (!b) return ''; const f = (many && b === paidBill ? firstBill : b).due; const to = span(b)[1]; return `${shortDate(f)} → ${niceDate(to)}`; };
  const periodBs = (b) => { if (!b) return ''; const f = (many && b === paidBill ? firstBill : b).due; const to = span(b)[1]; return `${bsShort(f)} → ${bsShort(to)}`; }; /* every date also in BS (Tara 10/3) */
  const kLabel = (b) => (many ? `${ord(firstBill.k)}–${ord(b.k)}` : ord(b.k));
  const lines = [];
  if (sp.extra !== undefined) lines.push({ ic: 'credit', bg: C.blue, t: String(pay.type || 'Payment'), s: '', v: sp.extra });
  else {
    if (sp.install > 0.01) lines.push({ ic: 'install', bg: C.navy, t: 'Installation / first month · जडान', s: 'first-day 4,900 · includes month 1', v: sp.install });
    if (sp.subscription > 0.01) lines.push({ ic: 'drop', bg: C.navy, t: 'Monthly subscription · मासिक शुल्क', s: paidBill ? `${kLabel(paidBill)} bill · ${period(paidBill)}` : 'monthly bill', v: sp.subscription });
    if (sp.deposit > 0.01) lines.push({ ic: 'lock', bg: C.blue, t: 'Refundable deposit · फिर्ता हुने धरौटी', s: `${many ? 'instalments ' + Math.max(1, Math.min(p.depositMonths, firstBill.k - 1)) + '–' : 'instalment '}${paidBill ? Math.max(1, Math.min(p.depositMonths, paidBill.k - 1)) : Math.round(sp.deposit / p.depositMonthly)} of ${p.depositMonths} · not a fee`, v: sp.deposit });
    if (sp.unallocated > 0.01) lines.push({ ic: 'credit', bg: C.blue, t: 'Credit carried forward · अग्रिम', s: 'counts toward the next bill', v: sp.unallocated });
  }
  const discount = Number(pay.discount) > 0 && pay.approval !== 'Rejected' ? Number(pay.discount) : 0;
  const discountNote = discount && pay.approval === 'Pending' ? 'waiting for approval' : ''; /* v0.16: no repeated word under "Discount" */
  const credit = R.isNonCash(pay); /* referral / service credit: nothing was paid — a credit note */
  // deposit held as of this bill (an old receipt shows what was held then, not today's total)
  const held = Math.round(paidBill ? led.bills.filter((b) => b.k <= paidBill.k).reduce((t, b) => t + (b.parts ? b.parts.deposit : 0), 0) : (led.depositCollected || 0)), segs = Math.max(0, Math.min(p.depositMonths, Math.round(held / p.depositMonthly)));
  const nb = nextOpen || (paidBill && after(paidBill)) || led.nextBill;
  const nbLeft = !nb ? 0 : nb === nextOpen ? Math.max(0, (Number(nb.amount) || 0) - (Number(nb.paid) || 0)) : Number(nb.amount) || 0; /* newest payment: what is left now · older receipt: the bill as it was */
  return {
    name: x.c.name || '', code: x.c.code || '', no: receiptNo(pay), date: niceDate(pay.date), bs: bsText(pay.date),
    method: credit ? String(pay.type || 'Credit') : (pay.method || ''), ref: credit ? '' : (pay.ref || ''), total: Number(pay.amount) || 0, lines, discount, discountNote, credit,
    bill: paidBill ? `${kLabel(paidBill)} · ${period(paidBill)}` : (sp.extra !== undefined ? String(pay.type || '') : '—'), billBs: paidBill ? periodBs(paidBill) : '',
    held, segs, depMonths: p.depositMonths, depTotal: p.depositTotal,
    next: nb ? `${niceDate(nb.due)} · NPR ${money(nbLeft)}` : 'Paid up · सबै तिरिएको', nextBs: nb ? bsText(nb.due) : '',
    ...coOf(co),
  };
}
export function referralData(x, co = {}) {
  return { name: x.c.name || '', code: x.c.code || '', price: money(R.PRICES.monthly), half: money(Math.round(R.PRICES.monthly * REFERRAL_SHARE)), ...coOf(co) };
}
export function visitData(x, v, co = {}, photos = {}, who = {}) {
  // v0.14 (Jun 10/3 #7): the visit NOTE — a record, not a proof. No TDS, no stamp. Rows = what we did; PP changed → the two photos slide in.
  const f = (n) => (n === null || n === undefined || n === '' || !Number.isFinite(Number(n))) ? null : Number(n);
  const filters = v.filters || [];
  const rows = [];
  if (filters.length) rows.push({ ic: 'swap', bg: C.navy, tb: `${filters.join(', ')} filter${filters.length > 1 ? 's' : ''}`, t: ` — new ${filters.length > 1 ? 'ones' : 'one'} in`, s: `the old ${filters.length > 1 ? 'ones' : 'one'} taken away` });
  else rows.push({ ic: 'drop', bg: C.navy, tb: `${v.visitType || 'Purifier'}`, t: ' — checked', s: 'flow and tap fine' });
  if (v.sanitised === 'Yes') rows.push({ ic: 'clean', bg: C.blue, t: 'Housing and tube cleaned', s: '' });
  if (f(v.flow) !== null || f(v.tdsAfter) !== null) rows.push({ ic: 'tap', bg: C.blue, t: 'Tap checked', s: '' });
  const nextFilter = (x.fd || []).filter((q) => q.due && q.type !== 'Sanitise' && !filters.includes(q.type)).sort((p, q) => String(p.due).localeCompare(String(q.due)))[0]; /* a filter changed today is not the next one due */
  const nv = R.isDate(v.nextVisitDate) ? v.nextVisitDate : '';
  const pp = (x.fd || []).find((q) => q.type === 'PP');
  // filters-together: the next change is one visit with every filter that falls due before it (x.fb from the model)
  const fb = x.fb && x.fb.types && x.fb.types.some((q) => !filters.includes(q)) ? x.fb : null;
  const nextF = nv ? (fb && fb.date <= R.addDays(nv, 14) ? ' · filters' : !fb && nextFilter && nextFilter.due <= R.addDays(nv, 14) ? ' · ' + nextFilter.type + ' filter' : '') : '';
  return {
    name: x.c.name || '', code: x.c.code || '', date: niceDate(v.date), bs: bsText(v.date), tech: who.name || v.technician || '', techPhoto: who.photo || null, rows,
    ppChanged: filters.includes('PP'), ppBefore: photos.before || null, ppAfter: photos.after || null,
    ppMonths: pp && R.isDate(pp.last) && R.isDate(v.date) && pp.last < v.date ? Math.max(1, Math.round(R.daysBetween(pp.last, v.date) / 30.44)) : null,
    next: nv ? `${niceDate(nv)}${nextF}` : '', nextBs: nv ? bsText(nv) : '', ...coOf(co),
  };
}
export function installData(x, co = {}, photo = null, who = {}) {
  const c = x.c; const first = R.isDate(c.installDate) ? R.addMonths(c.installDate, 1) : '';
  return { name: c.name || '', code: c.code || '', date: niceDate(c.installDate), bs: bsText(c.installDate), tech: who.name || c.agent || '', techPhoto: who.photo || null, photo, first: first ? `${niceDate(first)} · we come to you` : '', firstBs: first ? bsText(first) : '', ...coOf(co) };
}
// v0.16 (#7, Jun 10/3 "회사 QR · 카드에 넣으면 될듯"): the bill of the month with the company QR — the customer saves the picture,
// opens the bank app, scans from the gallery. The QR itself is uploaded in Settings (never in the code); qr = an Image or null.
export function billData(x, co = {}, qr = null, today = '') {
  const led = x.led || { bills: [], nextBill: null }; const p = R.PRICES;
  const first = (x.dn && x.dn.bill) || led.bills.find((q) => q.status !== 'paid') || led.nextBill; if (!first) return null;
  // every unpaid bill from the first open one up to today — a home two months late owes both, and the card says so
  const until = R.isDate(today) && today > first.due ? today : first.due;
  let open = led.bills.filter((q) => q.status !== 'paid' && R.isDate(q.due) && q.due >= first.due && q.due <= until); if (!open.length) open = [first];
  const last = open[open.length - 1];
  const nx = led.bills.find((q) => q.k === last.k + 1) || (R.isDate(x.c.installDate) && last.k ? { due: dueOf(x.c, last.k + 1) } : null);
  const to = nx ? R.addDays(nx.due, -1) : R.addDays(last.due, 29);
  const comp = (q) => (q.subscription !== undefined ? q : R.billAmount(q.k || 2, p)); /* a ledger bill carries its make-up; otherwise the price rule */
  const left = (q, part) => Math.max(0, (Number(comp(q)[part]) || 0) - (q.parts ? Number(q.parts[part]) || 0 : 0)); /* what is still unpaid of that part */
  const sum = (f) => Math.round(open.reduce((s, q) => s + f(q), 0));
  const owed = sum((q) => Math.max(0, (Number(q.amount) || 0) - (Number(q.paid) || 0)));
  const inst = sum((q) => left(q, 'install')), sub = sum((q) => left(q, 'subscription')), dep = sum((q) => left(q, 'deposit'));
  const depNo = (q) => Math.max(1, Math.min(p.depositMonths, (q.k || 2) - 1));
  const bits = []; if (inst) bits.push(`${money(inst)} installation`); if (sub) bits.push(`${money(sub)} subscription`); if (dep) bits.push(`${money(dep)} deposit`);
  const many = open.length > 1; const short = (iso) => niceDate(iso).replace(/ \d{4}$/, '');
  return {
    name: x.c.name || '', code: x.c.code || '', amount: money(owed), many, label: many ? `TO PAY · ${open.length} bills` : 'THIS MONTH', labelNe: many ? 'तिर्नुपर्ने' : NE.thisMonth,
    k: many ? `${ord(open[0].k)} – ${ord(last.k)} bill` : (first.k ? `${ord(first.k)} bill` : 'bill'), period: `${short(open[0].due)} → ${niceDate(to)}`, periodBs: `${bsShort(open[0].due)} → ${bsShort(to)}`,
    due: niceDate(open[0].due), dueBs: bsText(open[0].due), late: x.dn && x.dn.days > 0 ? `${x.dn.days} day${x.dn.days === 1 ? '' : 's'} late` : '',
    split: bits.join(' + ') || money(owed), splitNote: dep ? `deposit ${many ? depNo(open.find((q) => left(q, 'deposit') > 0) || open[0]) + '–' + depNo(last) : depNo(last)} of ${p.depositMonths} · refunded when the unit comes back` : inst ? 'first-day payment · month 1 included' : 'monthly subscription',
    qr, ...coOf(co),
  };
}

// ================= drawing helpers =================
let logoP = null;
function logo() { if (!logoP) logoP = new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = './logo.png'; }); return logoP; }
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
const grad = (ctx, x, y, w, h) => { const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, C.navy); g.addColorStop(1, C.blue); return g; };
function glow(ctx, cx, cy, r, a) { ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }
// white line icon in a filled circle (the v2 icon)
function dotIcon(ctx, cx, cy, r, bg, name, size, lw = 2.4) { ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); icon(ctx, name, cx - size / 2, cy - size / 2, size, '#fff', lw); }
// the header band: legal name first (Jun 10/3 "맨 위에 KORA CARE PRIVATE LIMITED"), its Nepali registered form, the logo chip, the card title
function header(ctx, im, co, title, sub) {
  const hh = 92; ctx.save(); ctx.fillStyle = grad(ctx, 0, 0, W, hh); ctx.fillRect(0, 0, W, hh); ctx.beginPath(); ctx.rect(0, 0, W, hh); ctx.clip(); glow(ctx, W - 40, 20, 80, 0.07); ctx.restore();
  text(ctx, String(co.company || 'Kora Care Private Limited').toUpperCase(), 22, 19, { f: font(800, 11.5), color: '#fff', ls: 1.3, max: W - 44 });
  text(ctx, co.companyNe || NE_CO, 22, 32, { f: font(500, 9), color: 'rgba(255,255,255,.78)', max: W * 0.6 });
  let cw = 62; if (im) { const h = 20, w = h * im.width / im.height; cw = w + 16; ctx.fillStyle = '#fff'; rr(ctx, 22, 44, cw, 30, 9); ctx.fill(); ctx.drawImage(im, 30, 49, w, h); } else { ctx.fillStyle = '#fff'; rr(ctx, 22, 44, cw, 30, 9); ctx.fill(); text(ctx, 'KORA', 30, 64, { f: font(800, 15), color: C.navy }); }
  text(ctx, title, W - 22, 57, { f: font(700, 10), color: C.lite, align: 'right', ls: 1.6 });
  text(ctx, sub, W - 22, 71, { f: font(400, 9), color: 'rgba(255,255,255,.78)', align: 'right', max: W - cw - 56 });
  return hh;
}
function h1(ctx, L, y, a, b, small, IW) { text(ctx, a, L, y, { f: font(800, 19), color: C.navy, max: IW }); if (b) { y += 22; text(ctx, b, L, y, { f: font(800, 19), color: C.blue, max: IW }); } if (small) { y += 16; text(ctx, small, L, y, { f: font(500, 10), color: C.mute, max: IW }); } return y; }
// one row: circle icon · text (optional bold navy prefix) · small line · amount on the right
function row(ctx, L, Rt, y, it) {
  const h = it.s ? 46 : 38; const cy = y + h / 2; dotIcon(ctx, L + 15, cy, 15, it.bg || C.navy, it.ic, 14);
  let tx = L + 41; const ty = it.s ? y + 19 : cy + 4.5; const maxT = Rt - tx - (it.v !== undefined ? 60 : 0);
  if (it.tb) tx += text(ctx, it.tb, tx, ty, { f: font(700, 12.5), color: C.navy, max: maxT * 0.7 });
  text(ctx, it.t || '', tx, ty, { f: font(400, 12.5), color: C.ink, max: Math.max(40, maxT - (tx - L - 41)) });
  if (it.s) text(ctx, it.s, L + 41, y + 33, { f: font(400, 9.5), color: C.mute, max: Rt - L - 41 - (it.v !== undefined ? 60 : 0) });
  if (it.v !== undefined) text(ctx, (it.v < 0 ? '−' : '') + money(Math.abs(it.v)), Rt, cy + 4.5, { f: font(700, 12.5), color: C.navy, align: 'right' });
  if (!it.noLine) { ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L, y + h); ctx.lineTo(Rt, y + h); ctx.stroke(); }
  return y + h;
}
function hline(ctx, L, Rt, y) { ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(Rt, y); ctx.stroke(); }
// sky box with a date on the right — a second small line carries the Nepali date
function nextBox(ctx, L, Rt, IW, y, label, value, valueBs) {
  const bh = valueBs ? 48 : 36; ctx.fillStyle = C.sky; rr(ctx, L, y, IW, bh, 12); ctx.fill();
  dotIcon(ctx, L + 23, y + 18, 11, C.blue, 'cal', 12, 2.2); const lw = text(ctx, label, L + 40, y + 22, { f: font(700, 11), color: C.navy, max: IW * 0.5 });
  text(ctx, value, Rt - 12, y + 22, { f: font(700, 11), color: C.navy, align: 'right', max: IW - 52 - lw - 10 });
  if (valueBs) text(ctx, valueBs, Rt - 12, y + 38, { f: font(400, 9.5), color: C.skyInk, align: 'right', max: IW - 24 });
  return bh;
}
// round staff photo (or the person icon) — who came (v0.15 "직원 full name+사진")
function avatar(ctx, x, y, r, img) {
  ctx.save(); ctx.beginPath(); ctx.arc(x + r, y + r, r, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
  if (img) { try { const k = Math.max((2 * r) / img.width, (2 * r) / img.height); ctx.drawImage(img, x + r - (img.width * k) / 2, y + r - (img.height * k) / 2, img.width * k, img.height * k); } catch (e) { ctx.fillStyle = C.photo; ctx.fillRect(x, y, 2 * r, 2 * r); } }
  else { ctx.fillStyle = C.photo; ctx.fillRect(x, y, 2 * r, 2 * r); icon(ctx, 'user', x + r - 9, y + r - 9, 18, C.navy); }
  ctx.restore(); ctx.beginPath(); ctx.arc(x + r, y + r, r, 0, Math.PI * 2); ctx.strokeStyle = C.blue; ctx.lineWidth = 2; ctx.stroke();
}
function photoBox(ctx, x0, y, gw, ph, img, cap, pad) {
  ctx.fillStyle = C.sky; rr(ctx, x0, y, gw, ph + pad, 14); ctx.fill(); if (pad) { ctx.strokeStyle = C.skyLine; ctx.lineWidth = 1.5; rr(ctx, x0, y, gw, ph + pad, 14); ctx.stroke(); }
  ctx.save(); rr(ctx, x0, y, gw, ph, 14); ctx.clip();
  if (img) { try { const r = Math.max(gw / img.width, ph / img.height); ctx.drawImage(img, x0 + (gw - img.width * r) / 2, y + (ph - img.height * r) / 2, img.width * r, img.height * r); } catch (e) { ctx.fillStyle = C.photo; ctx.fillRect(x0, y, gw, ph); } }
  else { ctx.fillStyle = C.photo; ctx.fillRect(x0, y, gw, ph); const g = ctx.createLinearGradient(x0, y, x0 + gw, y + ph); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(13,45,94,.15)'); ctx.fillStyle = g; ctx.fillRect(x0, y, gw, ph); text(ctx, 'photo', x0 + gw / 2, y + ph / 2 + 4, { f: font(400, 10), color: '#2f3f52', align: 'center' }); }
  ctx.restore(); if (cap) text(ctx, cap, x0 + gw / 2, y + ph + 16, { f: font(700, 9.5), color: C.navy, align: 'center', max: gw - 10 });
}
function contacts(ctx, d, L, Rt, y, items) { /* blue circle + text pairs, wrapping when the row is full */
  let fx = L; ctx.font = font(400, 9.5);
  for (const [ic, s] of items) { if (!s) continue; const w = ctx.measureText(s).width + 21; if (fx > L && fx + w > Rt) { fx = L; y += 20; } dotIcon(ctx, fx + 8, y - 3, 8, C.blue, ic, 9, 2.4); text(ctx, s, fx + 21, y, { f: font(400, 9.5), color: C.ink }); fx += w + 12; }
  return y;
}
function foot(ctx, d, L, Rt, IW, y, thanks, small) {
  hline(ctx, L, Rt, y); y += 22; text(ctx, thanks, L, y, { f: font(700, 11.5), color: C.navy, max: IW });
  y = contacts(ctx, d, L, Rt, y + 20, [['chat', d.phone], ['globe', d.web], ['pin', d.ward]]) + 18;
  const fl = small ? wrap(ctx, small, IW, font(400, 9)) : []; fl.forEach((ln, i) => text(ctx, ln, L, y + i * 13, { f: font(400, 9), color: C.mute }));
  return y + (fl.length ? (fl.length - 1) * 13 + 22 : 8);
}
function twoPass(paintFn, minH = 0) { /* measure on a throwaway canvas, then draw at exactly the content height */
  return async (d) => { const im = await logo(); const ph = minH || 2400; const probe = document.createElement('canvas'); probe.width = W; probe.height = ph; const need = paintFn(probe.getContext('2d'), d, im, ph); /* a card that centres its block measures at its minimum height */
    const H = Math.max(minH, Math.ceil(need)); const cv = document.createElement('canvas'); cv.width = W * SCALE; cv.height = H * SCALE; const ctx = cv.getContext('2d'); ctx.scale(SCALE, SCALE); paintFn(ctx, d, im, H); return cv; };
}

// ================= receipt =================
function paintReceipt(ctx, d, im, H) {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  const L = 22, Rt = W - 22, IW = Rt - L; let y = header(ctx, im, d, d.credit ? 'CREDIT NOTE' : 'PAYMENT RECEIPT', `${d.credit ? NE.creditNote : NE.receipt} · ${d.no}`);
  // total band
  y += 16; const bh = 80; ctx.save(); rr(ctx, L, y, IW, bh, 16); ctx.clip(); ctx.fillStyle = grad(ctx, L, y, IW, bh); ctx.fillRect(L, y, IW, bh); glow(ctx, L + IW - 30, y + 20, 60, 0.08); ctx.restore();
  text(ctx, d.credit ? `CREDIT APPLIED · ${NE.creditNote}` : `TOTAL PAID · ${NE.total}`, L + 12, y + 20, { f: font(400, 9), color: 'rgba(255,255,255,.8)', ls: 1.4 });
  const nw = text(ctx, 'NPR', L + 12, y + 50, { f: font(600, 15), color: 'rgba(255,255,255,.9)' }); text(ctx, money(d.total), L + 12 + nw + 6, y + 50, { f: font(800, 28), color: '#fff' });
  text(ctx, `${d.date}${d.bs ? ' · ' + d.bs : ''}`, L + 12, y + 68, { f: font(400, 10), color: 'rgba(255,255,255,.85)', max: IW * 0.62 });
  ctx.font = font(800, 10); if ('letterSpacing' in ctx) ctx.letterSpacing = '0.8px'; const pw = ctx.measureText(d.credit ? 'CREDIT' : 'PAID').width + 38; if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'; ctx.fillStyle = C.green; rr(ctx, Rt - 12 - pw, y + 14, pw, 20, 10); ctx.fill();
  icon(ctx, 'check', Rt - 12 - pw + 9, y + 18, 11, C.greenInk, 3.2); text(ctx, d.credit ? 'CREDIT' : 'PAID', Rt - 12 - 10, y + 28, { f: font(800, 10), color: C.greenInk, align: 'right', ls: 0.8 });
  text(ctx, [d.method, d.ref].filter(Boolean).join(' · '), Rt - 12, y + 52, { f: font(400, 10), color: 'rgba(255,255,255,.85)', align: 'right', max: IW * 0.4 });
  y += bh + 14;
  // who
  const col2 = L + IW / 2 + 7, colW = IW / 2 - 10;
  const kv = (k, v, x0, yy) => { text(ctx, k, x0, yy, { f: font(400, 8.5), color: C.mute, ls: 0.7 }); text(ctx, v, x0, yy + 15, { f: font(600, 12), color: C.ink, max: colW }); };
  kv(`CUSTOMER · ${NE.customer}`, d.name, L, y + 8); kv(`CODE · ${NE.codeK}`, d.code, col2, y + 8);
  kv(`BILL · ${NE.bill}`, d.bill, L, y + 42); kv(d.credit ? `CREDIT TYPE · ${NE.creditNote}` : `PAID BY · ${NE.payBy}`, [d.method, d.ref].filter(Boolean).join(' · '), col2, y + 42);
  if (d.billBs) text(ctx, d.billBs, L, y + 70, { f: font(400, 9), color: C.mute, max: colW });
  y += d.billBs ? 82 : 70; hline(ctx, L, Rt, y);
  // items
  const rows = d.lines.slice(); if (d.discount > 0) rows.push({ ic: 'credit', bg: C.green, t: 'Discount · छुट', s: d.discountNote, v: -d.discount });
  for (const it of rows) y = row(ctx, L, Rt, y, it);
  y += 6; ctx.fillStyle = C.tot; rr(ctx, L - 10, y, IW + 20, 40, 10); ctx.fill();
  text(ctx, `TOTAL · ${NE.total} · NPR`, L + 2, y + 25, { f: font(700, 10.5), color: C.ink, ls: 0.6 }); text(ctx, money(d.total), Rt - 2, y + 26, { f: font(800, 17), color: C.navy, align: 'right' });
  y += 40 + 10;
  // deposit box
  const dl = wrap(ctx, 'Refunded in full when the unit comes back. · मेसिन फिर्ता गर्दा पूरै फिर्ता हुन्छ।', IW - 24, font(400, 9));
  const dh = 10 + 12 + 7 + 7 + 6 + dl.length * 12 + 8; ctx.fillStyle = C.sky; rr(ctx, L, y, IW, dh, 12); ctx.fill();
  text(ctx, `Deposit held so far · ${NE.deposit}`, L + 12, y + 20, { f: font(700, 10.5), color: C.navy }); text(ctx, `${d.segs} / ${d.depMonths} · NPR ${money(d.held)} of ${money(d.depTotal)}`, Rt - 12, y + 20, { f: font(700, 10.5), color: C.navy, align: 'right' });
  const bx = L + 12, bw = IW - 24, by = y + 28, sw = bw / d.depMonths; for (let i = 0; i < d.depMonths; i++) { ctx.fillStyle = i < d.segs ? C.blue : '#fff'; rr(ctx, bx + i * sw, by, sw - 2, 7, 3); ctx.fill(); }
  dl.forEach((ln, i) => text(ctx, ln, L + 12, y + 50 + i * 12, { f: font(400, 9), color: C.skyInk }));
  y += dh + 10;
  y += nextBox(ctx, L, Rt, IW, y, `Next bill · ${NE.nextBill}`, d.next, d.nextBs) + 16;
  return foot(ctx, d, L, Rt, IW, y, `Thank you · ${NE.thanks}`, 'Generated by KORA Field · The VAT bill number is on the tax invoice given at the door.');
}
export const drawReceipt = twoPass(paintReceipt);

// ================= referral card (1080 × 1350) =================
function paintReferral(ctx, d, im, H) {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  const L = 22, Rt = W - 22, IW = Rt - L, mid = L + IW / 2; const top = header(ctx, im, d, 'REFER A NEIGHBOUR', NE.refer);
  const blockH = 19 + 22 + 16 + 14 + 76 + 12 + 58 + 12 + 38 + 14 + 86; const free = H - top - blockH; let y = top + Math.max(16, Math.round(free / 2)) + 19; /* centred when the card is taller than the content (H = 450 min) */
  y = h1(ctx, L, y, 'Bring a neighbour.', 'Your next bill: half price.', `${NE.refer} — ${NE.half}`, IW) + 14;
  const kb = 76; ctx.save(); rr(ctx, L, y, IW, kb, 16); ctx.clip(); ctx.fillStyle = grad(ctx, L, y, IW, kb); ctx.fillRect(L, y, IW, kb); glow(ctx, L + IW - 30, y + 20, 60, 0.08); ctx.restore();
  text(ctx, `YOUR CODE · ${NE.code}`, mid, y + 18, { f: font(400, 9), color: 'rgba(255,255,255,.8)', align: 'center', ls: 1.4 });
  text(ctx, d.code, mid, y + 49, { f: font(800, 30), color: '#fff', align: 'center', ls: 1 }); text(ctx, d.name, mid, y + 66, { f: font(400, 10), color: 'rgba(255,255,255,.85)', align: 'center', max: IW - 40 });
  y += kb + 12; const bh = 58; ctx.fillStyle = C.sky; rr(ctx, L, y, IW, bh, 14); ctx.fill(); ctx.strokeStyle = C.skyLine; ctx.lineWidth = 1.5; rr(ctx, L, y, IW, bh, 14); ctx.stroke();
  text(ctx, 'YOU · तपाईं', mid, y + 20, { f: font(700, 8.5), color: C.blue, align: 'center', ls: 1 }); text(ctx, `50% off your next bill · NPR ${d.half}`, mid, y + 42, { f: font(800, 14), color: C.navy, align: 'center', max: IW - 20 });
  y += bh + 12; dotIcon(ctx, L + 15, y + 19, 15, C.blue, 'chat', 14);
  { const f1 = font(400, 11.5), f2 = font(700, 11.5); ctx.font = f1; const a1 = 'They WhatsApp ', a3 = ' and say this code.'; const ph = d.phone || 'KORA CARE'; const w1 = ctx.measureText(a1).width, w3 = ctx.measureText(a3).width; ctx.font = f2; const w2 = ctx.measureText(ph).width;
    if (w1 + w2 + w3 <= IW - 41) { let x = L + 41; x += text(ctx, a1, x, y + 23, { f: f1, color: C.ink }); x += text(ctx, ph, x, y + 23, { f: f2, color: C.navy }); text(ctx, a3, x, y + 23, { f: f1, color: C.ink }); y += 38; }
    else { let x = L + 41; x += text(ctx, a1, x, y + 16, { f: f1, color: C.ink }); text(ctx, ph, x, y + 16, { f: f2, color: C.navy, max: Rt - x }); text(ctx, a3.trim(), L + 41, y + 31, { f: f1, color: C.ink }); y += 44; } }
  y += 14; return foot(ctx, d, L, Rt, IW, y, `Thank you · ${NE.thanks}`, '');
}
export const drawReferralCard = twoPass(paintReferral, 450);

// ================= visit note =================
function paintVisit(ctx, d, im, H) {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  const L = 22, Rt = W - 22, IW = Rt - L; let y = header(ctx, im, d, 'VISIT NOTE', `${NE.report} · ${d.date}${d.bs ? ' · ' + d.bs : ''}`);
  y += 16 + 19; y = h1(ctx, L, y, 'We came by today.', '', NE.came, IW);
  y += 14; avatar(ctx, L, y, 19, d.techPhoto); text(ctx, d.tech || 'KORA CARE', L + 48, y + 16, { f: font(700, 12), color: C.navy, max: IW - 52 }); text(ctx, `your KORA person · ${NE.person}`, L + 48, y + 31, { f: font(400, 9.5), color: C.mute, max: IW - 52 });
  y += 38 + 12; hline(ctx, L, Rt, y);
  d.rows.forEach((it, i) => { y = row(ctx, L, Rt, y, { ...it, noLine: i === d.rows.length - 1 && !d.ppChanged && !d.next }); }); /* no double rule above the footer */
  if (d.ppChanged) { y += 12; const gw = (IW - 10) / 2, ph = 88; photoBox(ctx, L, y, gw, ph, d.ppBefore, d.ppMonths ? `used PP · ${d.ppMonths} months` : 'used PP', 26); photoBox(ctx, L + gw + 10, y, gw, ph, d.ppAfter, 'new PP', 26); y += ph + 26; }
  if (d.next) { y += 12; y += nextBox(ctx, L, Rt, IW, y, `Next visit · ${NE.next}`, d.next, d.nextBs); }
  y += 18; return foot(ctx, d, L, Rt, IW, y, `Thank you · ${NE.thanks}`, 'Anything wrong with the water or the purifier? WhatsApp us.');
}
export const drawVisitReport = twoPass(paintVisit);

// ================= installed card (1080 × 1350, taller when needed) =================
function paintInstall(ctx, d, im, H) {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  const L = 22, Rt = W - 22, IW = Rt - L; let y = header(ctx, im, d, 'INSTALLED', `${NE.installed} · ${d.date}${d.bs ? ' · ' + d.bs : ''}`);
  y += 16 + 19; y = h1(ctx, L, y, 'Your KORA is in.', '', NE.isIn, IW);
  y += 14; const pw = 118, ph = 80; photoBox(ctx, L, y, pw, ph, d.photo, '', 0);
  avatar(ctx, L + pw + 14, y + ph / 2 - 19, 19, d.techPhoto); const tx = L + pw + 60;
  text(ctx, 'Installed by', tx, y + 18, { f: font(400, 9.5), color: C.mute }); text(ctx, d.tech || 'KORA CARE', tx, y + 34, { f: font(700, 12), color: C.navy, max: Rt - tx });
  text(ctx, `your KORA person · ${NE.person}`, tx, y + 49, { f: font(400, 9.5), color: C.mute, max: Rt - tx }); text(ctx, `${d.date}${d.bs ? ' · ' + d.bs : ''}`, tx, y + 64, { f: font(400, 9.5), color: C.mute, max: Rt - tx });
  y += ph + 12; hline(ctx, L, Rt, y);
  y = row(ctx, L, Rt, y, { ic: 'swap', bg: C.navy, t: 'We change ', tb: '', s: 'all of them together, on one visit' }); /* bold inside: */
  { ctx.font = font(400, 12.5); const w1 = ctx.measureText('We change ').width; const w2 = text(ctx, 'every filter', L + 41 + w1, y - 46 + 19, { f: font(700, 12.5), color: C.navy }); text(ctx, ' — you never buy one', L + 41 + w1 + w2, y - 46 + 19, { f: font(400, 12.5), color: C.ink, max: Rt - L - 41 - w1 - w2 }); }
  y = row(ctx, L, Rt, y, { ic: 'phone', bg: C.blue, t: 'We ', s: '' }); { ctx.font = font(400, 12.5); const w1 = ctx.measureText('We ').width; const w2 = text(ctx, 'call you in 7 days', L + 41 + w1, y - 38 + 19 + 4.5, { f: font(700, 12.5), color: C.navy }); text(ctx, ' to check all is well', L + 41 + w1 + w2, y - 38 + 23.5, { f: font(400, 12.5), color: C.ink, max: Rt - L - 41 - w1 - w2 }); }
  if (d.first) { y += 12; y += nextBox(ctx, L, Rt, IW, y, `First visit · ${NE.firstVisit}`, d.first, d.firstBs); }
  y += 18; const need = foot(ctx, d, L, Rt, IW, y, `Thank you · ${NE.thanks}`, 'Anything wrong with the water or the purifier? WhatsApp us.');
  return need;
}
export const drawInstallCard = twoPass(paintInstall, 450);

// ================= bill of the month + company QR =================
function paintBill(ctx, d, im, H) {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  const L = 22, Rt = W - 22, IW = Rt - L; let y = header(ctx, im, d, 'BILL DUE', `${NE.billDue} · ${d.due}`);
  y += 16; const bh = 84; ctx.save(); rr(ctx, L, y, IW, bh, 16); ctx.clip(); ctx.fillStyle = grad(ctx, L, y, IW, bh); ctx.fillRect(L, y, IW, bh); glow(ctx, L + IW - 30, y + 20, 60, 0.08); ctx.restore();
  text(ctx, `${d.label} · ${d.labelNe}`, L + 12, y + 20, { f: font(400, 9), color: 'rgba(255,255,255,.8)', ls: 1.4, max: IW * 0.6 });
  const nw = text(ctx, 'NPR', L + 12, y + 50, { f: font(600, 15), color: 'rgba(255,255,255,.9)' }); text(ctx, d.amount, L + 12 + nw + 6, y + 50, { f: font(800, 28), color: '#fff' });
  text(ctx, `${d.k} · ${d.period}`, L + 12, y + 66, { f: font(400, 9.5), color: 'rgba(255,255,255,.85)', max: IW * 0.6 }); text(ctx, `${d.periodBs} · due ${d.due}${d.late ? ' · ' + d.late : ''}`, L + 12, y + 78, { f: font(400, 9), color: d.late ? '#ffd27a' : 'rgba(255,255,255,.75)', max: IW * 0.62 });
  text(ctx, 'CUSTOMER', Rt - 12, y + 22, { f: font(400, 9), color: 'rgba(255,255,255,.8)', align: 'right', ls: 1.2 }); text(ctx, d.name, Rt - 12, y + 40, { f: font(800, 13), color: '#fff', align: 'right', max: IW * 0.38 }); text(ctx, d.code, Rt - 12, y + 55, { f: font(400, 10), color: 'rgba(255,255,255,.85)', align: 'right' });
  y += bh + 14;
  // QR block
  const qs = 128; ctx.fillStyle = '#fff'; rr(ctx, L, y, qs, qs, 12); ctx.fill(); ctx.strokeStyle = C.navy; ctx.lineWidth = 2; rr(ctx, L, y, qs, qs, 12); ctx.stroke();
  if (d.qr) { try { ctx.imageSmoothingEnabled = false; ctx.drawImage(d.qr, L + 8, y + 8, qs - 16, qs - 16); ctx.imageSmoothingEnabled = true; } catch (e) { icon(ctx, 'qr', L + 40, y + 40, 48, C.navy, 1.6); } }
  else { icon(ctx, 'qr', L + 40, y + 36, 48, C.navy, 1.6); text(ctx, 'QR not set', L + qs / 2, y + 108, { f: font(600, 9), color: C.mute, align: 'center' }); }
  const tx = L + qs + 14, tw = Rt - tx;
  text(ctx, `SCAN TO PAY · ${NE.scan}`, tx, y + 16, { f: font(700, 9.5), color: C.blue, ls: 1.1, max: tw });
  const l1 = wrap(ctx, 'Use your bank app', tw, font(800, 13.5)); l1.forEach((ln, i) => text(ctx, ln, tx, y + 36 + i * 17, { f: font(800, 13.5), color: C.navy })); /* v0.16: bank apps only until eSewa / Khalti are tested with this QR */
  let yy = y + 36 + l1.length * 17; text(ctx, NE.bankApp, tx, yy, { f: font(500, 9.5), color: C.mute, max: tw }); yy += 15;
  const steps = wrap(ctx, '1 save this picture · 2 open your bank app · 3 scan the QR from the gallery', tw, font(400, 9.5)); steps.forEach((ln, i) => text(ctx, ln, tx, yy + i * 13, { f: font(400, 9.5), color: C.mute })); yy += steps.length * 13 + 4;
  const rem = wrap(ctx, `type ${d.amount} · write ${d.code} in the remark`, tw, font(400, 9.5)); rem.forEach((ln, i) => text(ctx, ln, tx, yy + i * 13, { f: font(400, 9.5), color: C.ink }));
  y += qs + 12; if (d.bankLine) { text(ctx, d.bankLine, L, y + 4, { f: font(400, 9), color: C.mute, max: IW }); y += 14; }
  y += 4; hline(ctx, L, Rt, y);
  y = row(ctx, L, Rt, y, { ic: 'lock', bg: C.navy, t: d.split, s: d.splitNote, noLine: true });
  y += 10; return foot(ctx, d, L, Rt, IW, y, `Paid? WhatsApp us the screenshot · ${NE.thanks}`, '');
}
export const drawBillCard = twoPass(paintBill);

export const canvasBlob = (cv) => new Promise((res) => cv.toBlob((b) => res(b), 'image/png'));
// Share via the phone's share sheet (WhatsApp → the customer). Returns 'shared' | 'unsupported' | 'cancelled'.
export async function shareImage(blob, name) {
  const file = new File([blob], name, { type: 'image/png' });
  if (!navigator.share || !navigator.canShare || !navigator.canShare({ files: [file] })) return 'unsupported';
  try { await navigator.share({ files: [file], title: name }); return 'shared'; } catch (e) { return 'cancelled'; }
}
