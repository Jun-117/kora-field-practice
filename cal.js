// KORA Field — calendar data: company days (public holidays, payday, filing deadlines, own events) and customer days
// (bills, visits, filters, calls, leads, moves, device arrivals, own events). Pure: the desk page draws it (desk.js pageCalendar).
import * as R from './logic.js';
import * as B from './bs.js';

// Public holidays 2083 BS (14 Apr 2026 – 13 Apr 2027) as they apply in Pokhara.
// G  = Nepal Rajpatra part 5, 2082.11.18 (MoHA notice "२०८३ सालको सरकारी तथा सार्वजनिक विदा") — every date and weekday checked 2026-09-28.
// GK = Gandaki Pradesh Rajpatra part 3, 2082.12.05 (province holidays for all offices in Gandaki).
// kind 'all' = offices closed · 'part' = only some people are off (the office stays open). Only Aswin 2083 onwards is listed.
export const HOLIDAYS = [
  { bs: [2083, 6, 9], n: 'Indra Jatra', ne: 'इन्द्रजात्रा', kind: 'part', who: 'Kathmandu Valley only', ref: 'G §5(ख)' },
  { bs: [2083, 6, 18], n: 'Jitiya', ne: 'जितिया पर्व', kind: 'part', who: 'women staff who keep it', ref: 'G §3(ख)' },
  { bs: [2083, 6, 25], n: 'Ghatasthapana', ne: 'घटस्थापना', kind: 'all', ref: 'G §2.1(ङ)' },
  { bs: [2083, 6, 31], to: [2083, 7, 6], n: 'Dashain', ne: 'दशैं बिदा', kind: 'all', ref: 'G §2.1(च)', sub: 'Phulpati → Dwadashi' },
  { bs: [2083, 7, 8], n: 'Kojagrat Purnima', ne: 'कोजाग्रत पूर्णिमा', kind: 'all', ref: 'GK #2', region: 'Gandaki' },
  { bs: [2083, 7, 22], to: [2083, 7, 26], n: 'Tihar', ne: 'तिहार बिदा', kind: 'all', ref: 'G §2.1(छ)', sub: 'Laxmi Puja → day after Bhai Tika' },
  { bs: [2083, 7, 25], n: 'Falgunanda Jayanti', ne: 'फाल्गुनन्द जयन्ती', kind: 'part', who: 'Kirat followers', ref: 'G §7.2(क)' },
  { bs: [2083, 7, 29], n: 'Chhath', ne: 'छठ पर्व', kind: 'all', ref: 'G §2.1(ज)' },
  { bs: [2083, 8, 17], n: 'Day of Persons with Disabilities', ne: 'अन्तर्राष्ट्रिय अपाङ्गता दिवस', kind: 'part', who: 'staff with a disability', ref: 'G §6.2' },
  { bs: [2083, 9, 9], n: 'Dhanya Purnima · Yomari Punhi', ne: 'धान्य पूर्णिमा · योमरी पुन्हि', kind: 'all', ref: 'G §2.1(झ)' },
  { bs: [2083, 9, 10], n: 'Christmas', ne: 'क्रिसमस डे', kind: 'all', ref: 'G §2.1(ञ)' },
  { bs: [2083, 9, 15], n: 'Tamu Lhosar', ne: 'तमू ल्होछार', kind: 'all', ref: 'G §2.1(ट)' },
  { bs: [2083, 9, 27], n: 'Prithvi Jayanti', ne: 'पृथ्वी जयन्ती', kind: 'all', ref: 'G §7.1(ख)' },
  { bs: [2083, 10, 1], n: 'Maghe Sankranti', ne: 'माघे सङ्क्रान्ति', kind: 'all', ref: 'G §2.1(ठ)' },
  { bs: [2083, 10, 16], n: "Martyrs' Day", ne: 'सहिद दिवस', kind: 'all', ref: 'G §6.1(घ)' },
  { bs: [2083, 10, 22], n: 'Gandaki Province Day', ne: 'गण्डकी प्रदेश स्थापना दिवस', kind: 'all', ref: 'GK #3', region: 'Gandaki' },
  { bs: [2083, 10, 24], n: 'Sonam Lhosar', ne: 'सोनम ल्होछार', kind: 'all', ref: 'G §2.1(ड)' },
  { bs: [2083, 10, 28], n: 'Basanta Panchami', ne: 'वसन्त पञ्चमी', kind: 'part', who: 'schools only', ref: 'G §4' },
  { bs: [2083, 11, 7], n: 'Democracy Day', ne: 'राष्ट्रिय प्रजातन्त्र दिवस', kind: 'all', ref: 'G §6.1(ङ)' },
  { bs: [2083, 11, 22], n: 'Maha Shivaratri', ne: 'महाशिवरात्री', kind: 'all', ref: 'G §2.1(ढ)' },
  { bs: [2083, 11, 24], n: "Women's Day", ne: 'अन्तर्राष्ट्रिय महिला दिवस', kind: 'all', ref: 'G §6.1(च)' },
  { bs: [2083, 11, 25], n: 'Gyalpo Lhosar', ne: 'ग्याल्पो ल्होसार', kind: 'all', ref: 'G §2.1(ण)' },
  { bs: [2083, 12, 7], n: 'Holi (hill districts)', ne: 'फागुपूर्णिमा', kind: 'all', ref: 'G §2.1(द)' },
  { bs: [2083, 12, 23], n: 'Ghode Jatra', ne: 'घोडेजात्रा', kind: 'part', who: 'Kathmandu Valley only', ref: 'G §5(घ)' },
];
// Named days inside a holiday block (the notice gives the block; these come from it or from a cross-check).
const NAMED = { '2026-10-17': ['Phulpati', 'G'], '2026-10-21': ['Vijaya Dashami (Tika)', 'kora-pokhara-local-context'], '2026-11-08': ['Laxmi Puja', 'G'], '2026-11-11': ['Bhai Tika', 'G'] };
export const HOLIDAY_GAPS = ['Eid ul-Fitr and Bakar Eid are holidays "on the day" (G §2.1 त·थ) — no date in the notice', 'Nepali year 2084 (from 14 Apr 2027) is not published yet'];
export const HOLIDAY_SRC = { G: 'Nepal Rajpatra 2082.11.18 (Home Ministry)', GK: 'Gandaki Rajpatra 2082.12.05' };

// date → [holiday]
export function holidayMap(extra = '') {
  const out = {};
  const add = (d, h) => { (out[d] = out[d] || []).push(h); };
  for (const h of HOLIDAYS) {
    const a = B.bsToAd(...h.bs); if (!a) continue;
    const z = h.to ? B.bsToAd(...h.to) : a;
    for (let d = a; d <= z; d = R.addDays(d, 1)) add(d, { ...h, day: NAMED[d] ? NAMED[d][0] : '', first: d === a, last: d === z, from: a, until: z });
  }
  // extra days off typed in Settings (company closed)
  for (const d of String(extra || '').split(/[\s,]+/).filter(R.isDate)) add(d, { n: 'Office closed (settings)', kind: 'all', ref: 'Settings', own: 1 });
  return out;
}
export const isOff = (hm, d) => new Date(d + 'T00:00:00').getDay() === 6 || (hm[d] || []).some((h) => h.kind === 'all');

// ---------- company deadlines (from the compliance list, 2026-09-28) ----------
// VAT: every Nepali month, within 25 days after the month ends (= the 25th of the next Nepali month), also with no sales. 🟢
// TDS: 25 days after the month (Income Tax Act §90(1)) · SSF: within 25 days after the month (🟢 Contribution-based Social Security Act §4(4), amended 2082 — the old 15 days is gone) — both only with staff on payroll.
// Advance tax: end of Poush 40 % · Chaitra 70 % · Asar 100 % (no payment when an instalment is under NPR 2,000). Income tax return: end of Aswin.
const VAT_FIRST = [2083, 5]; // first VAT month = Bhadra 2083 (company set up 2026-09-07, VAT monthly) — first return 🔴 confirm with the CA
const bsEnd = (y, m) => B.bsToAd(y, m, B.daysInMonth(y, m));
const bsDay = (y, m, d) => B.bsToAd(y, m, Math.min(d, B.daysInMonth(y, m)));
export function deadlines(from, to, st = {}) {
  const out = []; const push = (d, x) => { if (d && d >= from && d <= to) out.push({ d, ...x }); };
  const a = B.adToBs(from), z = B.adToBs(to); if (!a || !z) return out;
  for (let k = (a.y * 12 + a.m - 1) - 1; k <= z.y * 12 + z.m - 1; k++) {
    const y = Math.floor(k / 12), m = (k % 12) + 1; const nx = B.addBsMonths(y, m, 1); if (!B.inRange(nx.y)) continue;
    const label = B.bsLabel(y, m);
    if (y * 12 + m >= VAT_FIRST[0] * 12 + VAT_FIRST[1]) push(bsDay(nx.y, nx.m, 25), { ic: '🧾', t: `VAT return · ${label}`, sub: 'file even with no sales · IRD online', g: y === VAT_FIRST[0] && m === VAT_FIRST[1] ? '🔴' : '🟢', kind: 'tax' });
    if (st.payroll !== 'No') { /* v0.16.0 (8) Jun 10/3 "급여 기능 켜라 (처음부터 켜라)": on unless switched off */
      push(bsDay(nx.y, nx.m, 25), { ic: '🧾', t: `TDS on salaries · ${label}`, sub: 'e-TDS · §90(1): 25 days', g: '🟢', kind: 'tax' });
      push(bsDay(nx.y, nx.m, 25), { ic: '🛡️', t: `SSF contribution · ${label}`, sub: 'SSF Act §4(4): 25 days', g: '🟢', kind: 'tax' });
    }
    if (m === 9) push(bsEnd(y, m), { ic: '💰', t: 'Advance tax 1 · 40 %', sub: 'skip if under NPR 2,000', g: '🟢', kind: 'tax' });
    if (m === 12) push(bsEnd(y, m), { ic: '💰', t: 'Advance tax 2 · 70 %', sub: 'skip if under NPR 2,000', g: '🟢', kind: 'tax' });
    if (m === 3 && y >= 2084) push(bsEnd(y, m), { ic: '💰', t: 'Advance tax 3 · 100 %', sub: 'end of the fiscal year', g: '🟢', kind: 'tax' });
    if (m === 6 && y >= 2084) push(bsEnd(y, m), { ic: '📑', t: `Income tax return · FY ${y - 1}/${String(y % 100).padStart(2, '0')}`, sub: '3 months after the year ends', g: '🟢', kind: 'tax' });
    if (m === 9 && y >= 2084) push(bsEnd(y, m), { ic: '🏛️', t: 'OCR annual report', sub: '6 months after the year ends · late = NPR 100 a day', g: '🟡', kind: 'reg' });
    if (m === 3 && y >= 2084) push(bsEnd(y, m), { ic: '🛵', t: 'Scooter tax · 2 scooters', sub: 'before the end of Asar · late = 5–32 % extra', g: '🟡', kind: 'reg' });
  }
  push('2027-07-15', { ic: '🌐', t: 'EXIM code renewal', sub: 'first expiry · NPR 1,000', g: '🟡', kind: 'reg' });
  push('2027-07-03', { ic: '🌐', t: 'Domain koracarenepal.com expires', sub: 'auto-renew is on — check the card', g: '🟢', kind: 'reg' });
  return out;
}
// Payday: day N of each Nepali month (0 = the last day). Empty setting = the last day.
export function paydays(from, to, st = {}) {
  const raw = String(st.payday ?? '').trim(); if (raw === 'off') return [];
  const n = raw === '' ? 0 : Number(raw); if (!Number.isFinite(n)) return [];
  const out = []; const a = B.adToBs(from), z = B.adToBs(to); if (!a || !z) return out;
  for (let k = a.y * 12 + a.m - 1; k <= z.y * 12 + z.m - 1; k++) {
    const y = Math.floor(k / 12), m = (k % 12) + 1; const d = n <= 0 ? bsEnd(y, m) : bsDay(y, m, n);
    if (d >= from && d <= to) out.push({ d, ic: '💸', t: `Payday · ${B.bsLabel(y, m)}`, sub: raw === '' ? 'last day of the Nepali month (change in Settings)' : `day ${n} of the Nepali month`, kind: 'pay' });
  }
  return out;
}
// Own events (collection "events"), with repeats.
export function ownEvents(events, from, to) {
  const out = [];
  for (const e of events || []) {
    if (!R.isDate(e.date) || e.status === 'Cancelled') continue;
    const len = R.isDate(e.endDate) && e.endDate > e.date ? R.daysBetween(e.date, e.endDate) : 0;
    const hit = (d) => { for (let i = 0; i <= len; i++) { const x = R.addDays(d, i); if (x >= from && x <= to) out.push({ d: x, ev: e, first: i === 0 }); } };
    if (e.repeat === 'Every month') { for (let k = 0; k < 240; k++) { const d = R.addMonths(e.date, k); if (d > to) break; if (R.addDays(d, len) >= from) hit(d); } }
    else if (e.repeat === 'Every Nepali month') { const b = B.adToBs(e.date); if (!b) continue; for (let k = 0; k < 240; k++) { const q = B.addBsMonths(b.y, b.m, k); if (!B.inRange(q.y)) break; const d = bsDay(q.y, q.m, b.d); if (!d || d > to) break; if (R.addDays(d, len) >= from) hit(d); } }
    else if (e.repeat === 'Every year') { for (let k = 0; k < 30; k++) { const d = R.addMonths(e.date, 12 * k); if (d > to) break; if (R.addDays(d, len) >= from) hit(d); } }
    else hit(e.date);
  }
  return out;
}

// ---------- customer days ----------
// m = app model(). Returns { 'YYYY-MM-DD': [item] } for from..to. Past days show what happened (cash in, visits done).
export function customerDays(m, from, to) {
  const out = {}; const add = (d, x) => { if (d && d >= from && d <= to) (out[d] = out[d] || []).push(x); };
  const t = m.t;
  for (const x of m.cust.values()) {
    const c = x.c; if (x.status !== 'Active' || !R.isDate(c.installDate)) continue;
    // bills: the ledger knows the past ones; future ones follow the install day (G-1 §1-3)
    const BDc = R.billDays(c); /* v0.10: paused months are skipped */
    for (let k = 1; k <= 72; k++) {
      const due = BDc.dues[k - 1]; if (due > to) break; if (due < from) continue;
      const b = x.led.bills[k - 1] || { k, due, ...R.billAmount(k), paid: 0, status: due > t ? 'future' : 'due' };
      const left = b.status === 'paid' ? 0 : b.amount - (b.paid || 0);
      add(due, { kind: 'bill', ic: '💵', cid: c.id, t: c.name, sub: `bill ${k} · ${Math.round(b.status === 'paid' ? b.amount : left).toLocaleString('en-IN')}${b.status !== 'paid' && b.paid ? ' left' : ''}`, amt: b.amount, left, status: b.status, tole: toleName(c) });
    }
    if (x.nv && x.nv.date) add(x.nv.date < t ? t : x.nv.date, { kind: 'visit', ic: '🔧', cid: c.id, t: c.name, sub: `routine visit${x.nv.date < t ? ' · late since ' + x.nv.date : ''}`, late: x.nv.date < t, tole: toleName(c) });
    const fByDay = {}; for (const f of x.fd) if (f.status !== 'none' && f.due) { const d = f.due < t ? t : f.due; (fByDay[d] = fByDay[d] || []).push(f.type); }
    for (const [d, ts] of Object.entries(fByDay)) add(d, { kind: 'filter', ic: '🧪', cid: c.id, t: c.name, sub: `${ts.map((y) => (y === 'Sanitise' ? 'sanitise' : y)).join(', ')} due`, tole: toleName(c) });
    for (const o of x.ob) if (o.due && o.status !== 'done') add(o.due < t ? t : o.due, { kind: 'call', ic: '📞', cid: c.id, t: c.name, sub: o.label, late: o.due < t });
  }
  for (const l of m.D.leads) if (R.isDate(l.followUpDate) && !['Signed', 'Rejected'].includes(l.outcome)) add(l.followUpDate < t ? t : l.followUpDate, { kind: 'lead', ic: '🧲', edit: 'lead', id: l.id, t: l.name || l.phone || 'Lead', sub: l.outcome || 'follow up', late: l.followUpDate < t });
  for (const l of m.D.leads) if (R.isDate(l.demoDate) && l.outcome === 'Demo booked') add(l.demoDate, { kind: 'lead', ic: '🎬', edit: 'lead', id: l.id, t: l.name || l.phone || 'Lead', sub: 'demo' });
  for (const r of m.D.relocations) if (R.isDate(r.moveDate) && r.status !== 'Cancelled') { const c = m.cust.get(r.customerId); add(r.moveDate, { kind: 'move', ic: '🚚', edit: 'relocation', id: r.id, t: c ? c.c.name : '?', sub: `moves to ${r.newTole === 'Other' ? r.newToleOther : r.newTole || '?'} · ${r.status}` }); }
  const recv = {}; for (const e of m.D.deviceEvents) if (e.event === 'Received into stock' && R.isDate(e.date)) { const k = e.date + '|' + (e.batch || ''); recv[k] = (recv[k] || 0) + 1; }
  for (const [k, n] of Object.entries(recv)) { const [d, batch] = k.split('|'); add(d, { kind: 'arrive', ic: '📦', t: `${n} device${n > 1 ? 's' : ''} received`, sub: batch || 'into stock', report: 'devices' }); }
  const chk = {}; for (const dv of m.devices) if (dv.checkDue) chk[dv.checkDue] = (chk[dv.checkDue] || 0) + 1;
  for (const [d, n] of Object.entries(chk)) add(d, { kind: 'check', ic: '🔍', t: `Arrival check deadline · ${n} device${n > 1 ? 's' : ''}`, sub: 'PI: inspect within 14 days', report: 'devices', late: d < t });
  // what happened (past and today)
  const cash = {}; for (const p of m.D.payments) if (p.type !== 'Referral credit' && R.isDate(p.date) && p.date >= from && p.date <= to) { const q = cash[p.date] = cash[p.date] || { n: 0, s: 0 }; q.n++; q.s += Number(p.amount) || 0; }
  for (const [d, q] of Object.entries(cash)) add(d, { kind: 'paid', ic: '💰', t: `Cash in · ${Math.round(q.s).toLocaleString('en-IN')}`, sub: `${q.n} payment${q.n > 1 ? 's' : ''}`, amt: q.s, done: 1 });
  const vd = {}; for (const v of m.D.visits) if (String(v.status || '').includes('Completed') && R.isDate(v.date) && v.date >= from && v.date <= to) vd[v.date] = (vd[v.date] || 0) + 1;
  for (const [d, n] of Object.entries(vd)) add(d, { kind: 'done', ic: '✅', t: `${n} visit${n > 1 ? 's' : ''} done`, done: 1 });
  return out;
}
const toleName = (c) => (c.tole === 'Other' ? c.toleOther : c.tole) || '';
// Month grid: Sunday-first weeks covering from..to.
export function gridDays(from, to) {
  const start = R.addDays(from, -new Date(from + 'T00:00:00').getDay());
  const end = R.addDays(to, 6 - new Date(to + 'T00:00:00').getDay());
  const out = []; for (let d = start; d <= end; d = R.addDays(d, 1)) out.push(d);
  return out;
}
