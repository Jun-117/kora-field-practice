// DEMO DATA ONLY — loaded only on localhost with ?demo. Fake households so the screens can be judged before real data exists.
import * as R from './logic.js';

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// Approximate tole centres (demo only)
const TOLES = { Lakeside: [28.2096, 83.957], Baidam: [28.205, 83.961], Simalchaur: [28.2298, 83.9795], Matepani: [28.2275, 84.005], Begnas: [28.1745, 84.093], Chipledhunga: [28.219, 83.988], Rambazar: [28.199, 84.021], Newroad: [28.216, 83.986], Miyapatan: [28.193, 83.976], Mahendrapul: [28.223, 83.9905], Prithvi: [28.204, 83.983], Sabhagriha: [28.2265, 83.987] };
const FIRST = ['Sita', 'Ram', 'Hari', 'Gita', 'Bikash', 'Anita', 'Sunil', 'Kamala', 'Deepak', 'Sarita', 'Prakash', 'Laxmi', 'Rajesh', 'Maya', 'Suresh', 'Nirmala', 'Binod', 'Sabina', 'Krishna', 'Puja', 'Dinesh', 'Rekha', 'Ganesh', 'Sunita', 'Mohan', 'Asha', 'Bishnu', 'Kalpana', 'Arjun', 'Samjhana'];
const LAST = ['Gurung', 'Thapa', 'Poudel', 'Adhikari', 'Shrestha', 'Tamang', 'Magar', 'Sharma', 'Karki', 'Bhandari', 'KC', 'Pun', 'Rai', 'Subedi', 'Baral', 'Lamichhane'];
const CH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// v0.15: a fake staff photo (an initial on navy) so the visit note / installed card show the round photo in practice
function demoAvatar(ch) { try { const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d'); g.fillStyle = '#0d2d5e'; g.fillRect(0, 0, 96, 96); g.fillStyle = '#fff'; g.font = '800 48px -apple-system, Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 48, 52); return c.toDataURL('image/jpeg', 0.8); } catch (e) { return ''; } }
// v0.16: a fake QR (random modules + finder squares) so the bill card shows the layout in practice — the real one is uploaded in Settings
function demoQr() { try { const n = 29, px = 10, c = document.createElement('canvas'); c.width = c.height = n * px; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#0d2d5e'; let s = 7;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (rnd() < 0.45) g.fillRect(x * px, y * px, px, px);
  const fin = (x0, y0) => { g.fillStyle = '#fff'; g.fillRect(x0 * px, y0 * px, 8 * px, 8 * px); g.fillStyle = '#0d2d5e'; g.fillRect(x0 * px, y0 * px, 7 * px, 7 * px); g.fillStyle = '#fff'; g.fillRect((x0 + 1) * px, (y0 + 1) * px, 5 * px, 5 * px); g.fillStyle = '#0d2d5e'; g.fillRect((x0 + 2) * px, (y0 + 2) * px, 3 * px, 3 * px); };
  fin(0, 0); fin(n - 7, 0); fin(0, n - 7); return c.toDataURL('image/png'); } catch (e) { return ''; } }
export function loadDemo(S, today) {
  const r = rng(20260928); const pick = (a) => a[Math.floor(r() * a.length)]; const int = (a, b) => a + Math.floor(r() * (b - a + 1));
  let n = 0; const id = (p) => `${p}_demo_${(++n).toString(36)}`;
  let billN = 0; S.settings = { ...S.settings, coName: 'KORA CARE DEMO Pvt. Ltd. (fake)', coPan: '999999999', coAddress: 'Pokhara (demo)', coPhone: '+977 970-0000000 (fake)' };
  const put = (col, x) => { x.id = x.id || id(col); x.createdBy = 'demo-uid'; S.D[col].set(x.id, x); return x; };
  const tolesW = Object.keys(TOLES).flatMap((k) => Array(['Lakeside', 'Chipledhunga', 'Newroad', 'Prithvi', 'Baidam'].includes(k) ? 3 : 1).fill(k));
  const custs = [];
  // installs: ramp over ~10 months (4/month early → 6/month later) → about 50 homes = the PoC size (v0.12.2 Jun: realistic numbers)
  const start = R.addDays(today, -300);
  let d = start; let sameDay = 0;
  while (d < R.addDays(today, -2)) {
    const monthsIn = R.monthsBetween(start, d);
    const perMonth = (monthsIn < 6 ? 4 : 6) * (typeof location !== 'undefined' && location.search.includes('big') ? 9.5 : 1);
    sameDay = (sameDay || 0) + 1; const gap = Math.round((30 / perMonth) * (0.6 + r() * 0.8)); if (gap >= 1 || sameDay > 4) { d = R.addDays(d, Math.max(1, gap)); sameDay = 0; }
    if (d >= today) break;
    const inst = d; const tole = pick(tolesW); const [la, lo] = TOLES[tole];
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const code = 'KC-' + Array.from({ length: 4 }, () => CH[Math.floor(r() * CH.length)]).join('');
    const ref = custs.length > 5 && r() < 0.35 ? pick(custs) : null;
    const src = r() < 0.86 ? 'Municipal tap' : 'Well / borehole';
    const c = put('customers', {
      code, name, phone: '+97798' + String(int(10000000, 99999999)), zone: pick(['Zone_A', 'Zone_B', 'Zone_C']), ward: String(int(1, 33)), tole,
      houseDetail: pick(['blue gate near the temple', 'above the grocery', 'second lane after the school', 'opposite the bank', 'behind the chowk tea shop']),
      householdSize: int(2, 7), prevWater: pick(['Jar (20L delivery)', 'Jar (20L delivery)', 'Boiled tap', 'Bottled', 'Untreated']),
      referral: ref ? 'Word of mouth' : pick(['Tara_Direct', 'Community_event', 'Pop-up Booth', 'Facebook', 'TikTok']), referrerId: ref ? ref.id : '',
      waterSource: src, pressurePsi: int(18, 70), rawTds: src === 'Municipal tap' ? int(60, 190) : int(260, 420), purifiedTds: int(20, 120),
      flow: Math.round((0.9 + r() * 0.45) * 10) / 10, deviceSerial: 'TQ26' + String(int(10000, 99999)), installDate: d, signUpDate: R.addDays(d, -int(0, 5)),
      plan: r() < 0.9 ? 'Standard' : 'Standard + Backup Power', checks: [], agent: 'Tara', status: 'Active',
      gps: { lat: la + (r() - 0.5) * 0.012, lng: lo + (r() - 0.5) * 0.014, acc: int(5, 25) }, notes: r() < 0.15 ? pick(['dog in the yard', 'landlord must be present', 'hard water', 'call before coming', 'prefers WhatsApp']) : '',
      updatedAt: { toMillis: () => R.parseD(inst).getTime() + 10 * 3600e3 },
    });
    custs.push(c);
  }
  // behaviour: 88% on time, 8% late, 4% stopped paying (v0.12.2)
  for (const c of custs) {
    const kind = r(); const stopAt = kind > 0.96 ? int(3, 8) : 99;
    for (let k = 1; k <= 60; k++) {
      const due = R.billDue(c.installDate, k); if (due > today) break;
      if (k >= stopAt) break;
      const delay = k === 1 ? 0 : kind < 0.88 ? int(-2, 4) : kind < 0.96 ? int(4, 18) : int(0, 6);
      const date = R.addDays(due, delay); if (date > today) continue;
      const b = R.billAmount(k);
      put('payments', { customerId: c.id, date, type: k === 1 ? 'Installation fee (4,900)' : 'Monthly subscription', amount: b.amount, method: pick(['Khalti', 'eSewa', 'Fonepay QR', 'Fonepay QR', k === 1 ? 'Khalti' : 'Cash']), ref: 'TXN' + int(100000, 999999), billNo: r() < 0.05 ? '' : String(1000 + (++billN)), point: pick(['Field visit', 'Digital', 'Digital']), by: 'Tara', updatedAt: { toMillis: () => R.parseD(date).getTime() + 14 * 3600e3 } });
    }
  }
  // visits: monthly for 6 months, then quarterly; filters by E-2 booking; some visits missed
  for (const c of custs) {
    let last = c.installDate; let lastPP = c.installDate, lastCTO = c.installDate, lastUV = c.installDate;
    for (let i = 0; i < 20; i++) {
      const step = R.monthsBetween(c.installDate, last) < 6 ? 1 : 3;
      const planned = R.addMonths(last, step);
      if (planned > R.addDays(today, -1) || r() < 0.004) break; /* v0.12.2: fewer homes with a visit left hanging */
      let date = R.addDays(planned, int(-3, 4)); if (date > R.addDays(today, -1)) date = R.addDays(today, -1);
      const filters = [];
      const ppCol = R.monthsBetween(lastPP, date) >= 4 ? pick(['Brown', 'Brown', 'Black']) : R.monthsBetween(lastPP, date) >= 2 ? pick(['White', 'Brown']) : 'White';
      if (R.monthsBetween(lastPP, date) >= 3 || (ppCol !== 'White' && R.monthsBetween(lastPP, date) >= 2)) { filters.push('PP'); lastPP = date; }
      if (R.monthsBetween(lastCTO, date) >= 8) { filters.push('CTO'); lastCTO = date; }
      if (R.monthsBetween(lastUV, date) >= 12) { filters.push('UV'); lastUV = date; }
      const next = R.suggestNextVisit(c.installDate, date);
      put('visits', { customerId: c.id, customerCode: c.code, customerName: c.name, date, sanitised: R.monthsBetween(c.installDate, date) % 3 === 2 || R.monthsBetween(c.installDate, date) >= 6 ? 'Yes' : 'No', visitType: filters.length ? 'Filter change' : pick(['Routine check', 'Routine check', 'Sanitisation']), status: '✅ Completed', filters, ppColor: ppCol,
        tdsBefore: int(40, 160), tdsAfter: int(20, 110), flow: Math.round((0.9 + r() * 0.4) * 10) / 10, oldCollected: filters.length ? true : null, oldCount: filters.length || null, nextVisitDate: next, technician: 'Tara', durationMin: int(15, 45), updatedAt: { toMillis: () => R.parseD(date).getTime() + 13 * 3600e3 } });
      last = date;
    }
  }
  // 🚪 nobody-home trips + 🛵 "on my way" stamps (v0.8 #7) — own random stream so the rest of the demo stays the same
  { const q = rng(7072026); const since = R.addDays(today, -120);
    const done = [...S.D.visits.values()].filter((v) => v.date >= since && String(v.status).includes('Completed'));
    const why = ['Nobody home', 'Nobody home', 'Nobody home', 'Gate locked / no access', 'Asked to come another day', 'Could not find the house'];
    for (const v of done) {
      if (q() < 0.5) v.omwAt = new Date(R.parseD(v.date).getTime() + 10 * 3600e3).toISOString();
      if (q() < 0.16) { const d = R.addDays(v.date, -1 - Math.floor(q() * 3)); const sent = q() < 0.25;
        put('visits', { customerId: v.customerId, customerCode: v.customerCode, customerName: v.customerName, date: d, visitType: v.visitType, status: '🚪 Nobody home', noShowReason: why[Math.floor(q() * why.length)], waitedMin: 5 + Math.floor(q() * 15), retryDate: v.date, technician: v.technician, filters: [], ...(sent ? { omwAt: new Date(R.parseD(d).getTime() + 10 * 3600e3).toISOString() } : {}), updatedAt: { toMillis: () => R.parseD(d).getTime() + 11 * 3600e3 } }); }
    }
  }
  // check-ins
  for (const c of custs) for (const o of R.ONBOARD) {
    const due = R.addDays(c.installDate, o.days); if (due > today) continue;
    const pr = { D7: 0.97 }[o.k]; if (r() > pr) continue;
    put('checkins', { customerId: c.id, kind: o.k, date: R.addDays(due, int(0, 3)), by: 'Tara', result: r() < 0.9 ? 'OK' : 'Issue found', satisfaction: String(int(3, 5)) });
  }
  // two customers left → recovery cases; two paused
  const leavers = custs.slice(2, 4);
  leavers.forEach((c, i) => {
    const cd = R.addDays(today, -int(20, 60)); c.status = 'Churned'; c.churnDate = cd;
    put('recoveries', { customerId: c.id, churnDate: cd, reasonCode: i ? 'Moved away (outside our area)' : 'Went back to jar / other water', reason: i ? 'moved to Kathmandu' : 'said jar water is cheaper', startedDate: R.addDays(cd, 1), attempts: i ? 4 : 2, outcome: i ? 'Failed – no contact' : 'Recovered', closedDate: R.addDays(cd, i ? 21 : 5), daysToClose: i ? 20 : 4, failReason: i ? 'phone switched off; family moved, landlord did not know where' : '', deviceSerial: c.deviceSerial, refurbishable: i ? 'Unknown' : 'Yes', costNpr: i ? 900 : 300, depositRefunded: i ? 0 : 1200, depositForfeited: i ? 600 : 0 });
  });
  custs.slice(6, 8).forEach((c) => { c.status = 'Paused'; c.pausedUntil = R.addDays(today, 20); });
  // service requests
  const reqT = ['Breakdown', 'Water quality', 'Leak', 'Claim', 'Other'];
  for (let i = 0; i < 8; i++) {
    const c = pick(custs.filter((x) => x.status === 'Active')); const open = i < 2; /* v0.12.2: 2 open requests, not 3 */
    const ms = open ? Date.now() - [1.5, 20, 60][i] * 3600e3 : R.parseD(R.addDays(today, -int(5, 200))).getTime() + int(9, 18) * 3600e3;
    const dt = new Date(ms);
    put('requests', { customerId: c.id, type: pick(reqT), priority: i === 0 ? 'Urgent' : pick(['Normal', 'Normal', 'Low']), status: open ? (i === 1 ? 'In progress' : 'Received') : 'Done', receivedAt: `${R.fmtD(dt)}T${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`, receivedAtMs: ms, receivedDate: R.fmtD(dt), description: pick(['water flow slow since yesterday', 'small leak under the tap', 'water tastes different', 'UV light blinking', 'wants a second tap']), agent: 'Tara', resolution: open ? '' : 'fixed on site', doneDate: open ? '' : R.fmtD(dt), updatedAt: { toMillis: () => ms } });
  }
  // leads
  const stages = ['New', 'New', 'Thinking', 'Thinking', 'Thinking', 'Demo booked', 'Signed', 'Rejected'];
  for (let i = 0; i < 12; i++) { const st = pick(stages); /* v0.12.2: 12 open-ish leads, not 22 */ put('leads', { name: `${pick(FIRST)} ${pick(LAST)}`, phone: '+97798' + int(10000000, 99999999), tole: pick(Object.keys(TOLES)), ward: String(int(1, 33)), channel: pick(['Word of mouth', 'Tara_Direct', 'Pop-up Booth', 'Facebook']), outcome: st, followUpDate: st === 'Signed' || st === 'Rejected' ? '' : R.addDays(today, int(-1, 6)), rejectReason: st === 'Rejected' ? pick(['price', 'landlord said no', 'already has RO']) : '', updatedAt: { toMillis: () => Date.now() - int(1, 400) * 3600e3 } }); }
  // stock
  put('stockMoves', { item: 'Device', type: 'In', qty: 50, date: R.addDays(start, -10), ref: 'TQ-PI-20260808 (50 units)' });
  put('stockMoves', { item: 'Device', type: 'In', qty: 60, date: R.addDays(today, -120), ref: 'second batch (demo)' });
  for (const [it, q] of [['PP', 160], ['CTO', 60], ['UF', 30], ['UV', 30], ['Spin-down', 15]]) put('stockMoves', { item: it, type: 'In', qty: q, date: R.addDays(start, -10), ref: 'with devices' });
  put('trainings', { person: 'Tara', date: R.addDays(start, -20), topic: ['Install SOP (E-1)', 'A/S SOP (E-2)'], trainer: 'Jun', durationMin: 180 });
  put('trainings', { person: 'Sister', date: R.addDays(today, -60), topic: ['App use'], trainer: 'Tara', durationMin: 45 });
  // v0.5 demo: staff accounts, who entered what, expenses, device events, relocations
  // v0.8 demo: phones reporting their sync state (heartbeat) — Tara fine, Laxmi with 3 waiting for 2 days on an old version, a Safari tab
  const agoMs = (h) => Date.now() - h * 3600e3;
  S.demoDevices = [
    { id: 'dv_demo_tara', uid: 'demo-tara', name: 'Tara', email: 'tara@example.com', appVersion: 'kf-v0.8.0 (2026-09-29)', ua: 'iOS 26.6 · Safari', desk: false, pending: 0, rejected: 0, oldestPendingAt: null, lastServerAt: agoMs(0.3), online: true, storageOk: true, persisted: true, standalone: true, seenAt: { toMillis: () => agoMs(0.3) } },
    { id: 'dv_demo_ram', uid: 'demo-ram', name: 'Laxmi', email: 'laxmi@example.com', appVersion: 'kf-v0.6.0 (2026-09-28)', ua: 'Android · Chrome', desk: false, pending: 3, rejected: 0, oldestPendingAt: agoMs(50), lastServerAt: agoMs(52), online: false, storageOk: true, persisted: false, standalone: true, seenAt: { toMillis: () => agoMs(6) } },
    { id: 'dv_demo_tara2', uid: 'demo-tara', name: 'Tara', email: 'tara@example.com', appVersion: 'kf-v0.5.0 (2026-09-28)', ua: 'iOS 26.6 · Safari', desk: false, pending: 0, rejected: 1, oldestPendingAt: null, lastServerAt: agoMs(24 * 5), online: true, storageOk: true, persisted: true, standalone: false, seenAt: { toMillis: () => agoMs(24 * 5) } },
  ];
  S.demoUsers = [
    { uid: 'demo-tara', email: 'tara@example.com', name: 'Tara', fullName: 'Tara Sherpa', photo: demoAvatar('T'), role: 'staff', preset: 'office', perms: { seeAll: 1, install: 1, visit: 1, pay: 1, cash: 1, editCust: 1, money: 1, expense: 1, stock: 1, export: 0 }, toles: [], lastSeenAt: { toMillis: () => Date.now() - 35 * 60e3 } },
    { uid: 'demo-ram', email: 'laxmi@example.com', name: 'Laxmi', fullName: 'Laxmi Sherpa', photo: demoAvatar('L'), role: 'staff', preset: 'technician', perms: { seeAll: 0, install: 1, visit: 1, pay: 1, cash: 0, editCust: 0, money: 0, expense: 0, stock: 0, export: 0 }, toles: ['Lakeside', 'Baidam'], lastSeenAt: { toMillis: () => Date.now() - 5 * 3600e3 } },
    { uid: 'demo-staffa', email: 'staffa@example.com', name: 'Staff A', fullName: 'Staff A', photo: '', role: 'staff', preset: 'technician', perms: { seeAll: 0, install: 1, visit: 1, pay: 1, cash: 0, editCust: 0, money: 0, expense: 0, stock: 0, export: 0 }, toles: ['Begnas'], lastSeenAt: { toMillis: () => Date.now() - 26 * 3600e3 } },
    { uid: 'demo-new', email: 'sita.new@example.com', name: '', role: 'pending' },
  ];
  // v0.16 #3 (Jun 10/3 "나도 카드 만들어야지"): the admin's own card in practice — full name + a fake photo
  if (S.isAdmin) S.profile = { ...(S.profile || {}), fullName: 'Jun', photo: demoAvatar('J') };
  for (const col of ['visits', 'payments', 'customers', 'requests']) for (const x of S.D[col].values()) x.createdBy = r() < 0.6 ? 'demo-tara' : r() < 0.6 ? 'demo-ram' : 'demo-uid';
  const exp = (x) => put('expenses', { vatBill: 'No', paidFrom: 'Company bank', method: 'Bank transfer', import: 'No', capital: 'No', ...x, createdBy: 'demo-tara' });
  let bn = 7000;
  for (let k = 11; k >= 0; k--) {
    const d0 = R.addMonths(today.slice(0, 7) + '-05', -k); if (d0 > today) continue;
    exp({ date: d0, category: 'Rent', description: 'office & store room', amount: 5000, supplier: 'Landlord' });
    exp({ date: R.addDays(d0, 2), category: 'Phone & internet', description: 'Ncell + WorldLink', amount: 1560, supplier: 'WorldLink', vatBill: 'Yes', supplierPan: '300000001', billNo: String(++bn) });
    exp({ date: R.addDays(d0, 3), category: 'Software & subscriptions', description: 'Google Workspace', amount: 3100, supplier: 'Google', paidFrom: 'Jun personal — reimburse', method: 'Card', reimbursed: k > 1 ? 'Yes' : 'No' });
    for (let w = 0; w < 4; w++) exp({ date: R.addDays(d0, 5 + w * 7), category: 'Fuel & transport', description: 'petrol (2 bikes)', amount: int(1400, 2200), supplier: 'NOC pump Lakeside', vatBill: r() < 0.7 ? 'Yes' : 'No', supplierPan: '300000002', billNo: String(++bn), paidFrom: 'Petty cash (Tara)', method: 'Cash' });
    if (k % 3 === 0) exp({ date: R.addDays(d0, 10), category: 'Filters & spare parts', description: 'O-rings, fittings, tubing', amount: int(2500, 6000), supplier: 'Pokhara hardware', vatBill: 'Yes', supplierPan: '300000003', billNo: r() < 0.8 ? String(++bn) : '' });
  }
  exp({ date: R.addDays(start, -12), category: 'Devices & import', description: '50 purifiers (PI TQ-PI-20260808)', amount: 482000, supplier: 'Frank (supplier)', vatBill: 'Yes', import: 'Yes', customsNo: 'BRT-2026-00123', capital: 'Yes', billNo: 'CUS-8841', vat: 55450 });
  exp({ date: R.addDays(start, -11), category: 'Customs, freight & clearing', description: 'freight + CFS + clearing agent', amount: 212000, supplier: 'Highland (forwarder)', vatBill: 'Yes', supplierPan: '300000004', billNo: 'HL-221' });
  const dev = (x) => put('deviceEvents', { ...x, serial: R.normSerial(x.serial), createdBy: 'demo-tara' });
  const serials = custs.map((c) => c.deviceSerial);
  for (let i = 0; i < 12; i++) serials.push('TQ26' + String(90000 + i));
  for (const sn of serials) dev({ serial: sn, event: 'Received into stock', date: R.addDays(start, -8), batch: 'TQ-PI-20260808', cost: 13900 });
  serials.forEach((sn, i) => { if (i < serials.length - 4) dev({ serial: sn, event: i === 7 ? 'Arrival check — defect' : 'Arrival check OK', date: R.addDays(start, -5), defect: i === 7 ? 'UV lamp does not light' : '' }); });
  const rec = [...S.D.recoveries.values()].find((x) => x.outcome === 'Recovered');
  if (rec) { const c = S.D.customers.get(rec.customerId); if (c) { rec.deviceSerial = c.deviceSerial; dev({ serial: c.deviceSerial, event: 'Sent to refurbish', date: R.addDays(rec.closedDate || rec.startedDate, 2) }); } }
  const movers = custs.filter((c) => c.status === 'Active').slice(3, 5);
  movers.forEach((c, i) => {
    const d1 = i === 0 ? R.addDays(today, -20) : R.addDays(today, 4);
    put('relocations', { customerId: c.id, status: i === 0 ? 'Done' : 'Scheduled', moveDate: d1, oldTole: c.tole, oldWard: c.ward, oldZone: c.zone, oldHouseDetail: c.houseDetail || '', oldGps: c.gps, oldSerial: c.deviceSerial,
      newTole: i === 0 ? c.tole : 'Chipledhunga', newWard: String(int(1, 33)), newZone: c.zone, newHouseDetail: 'new flat, 3rd floor', newGps: c.gps, sameDevice: 'Yes', newSerial: '', technician: 'Tara', fee: 0, createdBy: 'demo-tara' });
  });
  S.privCache = { [custs[0].id]: 'Dog in the yard — call before entering.' };
  // v0.6 demo: dispatch (who goes where) + own calendar events
  S.settings = { ...S.settings, techNames: 'Laxmi, Staff A', coQr: demoQr(), coBankLine: 'Demo Bank · KORA CARE DEMO · 0000 0000 0000 (fake)' };
  custs.forEach((c, i) => { if (i % 9 === 8) return; c.assignee = ['Lakeside', 'Baidam'].includes(c.tole) ? 'Laxmi' : 'Tara'; });
  const rc = custs.find((c) => c.assignee === 'Laxmi' && c.status === 'Active'); if (rc) rc.cover = { to: 'Tara', until: today, from: 'Laxmi', at: today };
  const ev = (x) => put('events', { status: 'Planned', repeat: 'Once', createdBy: 'demo-uid', by: 'Jun', ...x });
  ev({ lane: 'Company', kind: 'Meeting', kindCo: 'Meeting', title: 'CA meeting — first VAT return', date: R.addDays(today, 6), time: '11:00' });
  ev({ lane: 'Company', kind: 'Office closed', kindCo: 'Office closed', title: 'Tara day off', date: R.addDays(today, 3) });
  ev({ lane: 'Customers', kind: 'Stock arrival', kindCu: 'Stock arrival', title: '100 devices arrive (demo)', date: R.addDays(today, 12) });
  ev({ lane: 'Customers', kind: 'Demo / event', kindCu: 'Demo / event', title: 'Lakeside pop-up booth', date: R.addDays(today, 9), endDate: R.addDays(today, 10) });
  ev({ lane: 'Company', kind: 'Campaign', kindCo: 'Campaign', title: 'Facebook campaign (demo)', date: R.addDays(today, -75), endDate: R.addDays(today, -45), status: 'Done' }); // v0.8 #11 chart notes
  // v0.7 demo: today's work for the field-live board (records saved with a spot, times relative to now)
  const nowMs = Date.now(); const near = (c, k) => ({ lat: c.gps.lat + 0.0004 * k, lng: c.gps.lng - 0.0003 * k, acc: 12 });
  const mk = (who, list, minsAgo) => list.forEach((c, i) => { const ms = Math.max(nowMs - minsAgo[i] * 60000, R.parseD(today).getTime() + 300000); const at = { ...near(c, i), t: ms }; /* v0.11: never before today 00:05 — after midnight the board dropped 'yesterday' records (2 flaky desk tests) */
    put('visits', { customerId: c.id, customerCode: c.code, customerName: c.name, date: today, visitType: 'Routine check', status: '✅ Completed', filters: [], technician: who, savedAt: at, createdBy: who === 'Tara' ? 'demo-tara' : 'demo-ram', updatedAt: { toMillis: () => ms } });
    if (i % 2 === 0) put('payments', { customerId: c.id, date: today, type: 'Monthly subscription', amount: 1400, method: who === 'Laxmi' && i === 0 ? 'Cash' : 'Fonepay QR', by: who, savedAt: { ...at, t: ms + 90000 }, createdBy: who === 'Tara' ? 'demo-tara' : 'demo-ram', updatedAt: { toMillis: () => ms + 90000 } }); });
  const withGps = (who) => custs.filter((c) => c.status === 'Active' && c.assignee === who && c.gps && Number.isFinite(c.gps.lat));
  mk('Tara', withGps('Tara').slice(0, 4), [230, 170, 95, 20]);
  // v0.8 demo: two callbacks (a leak 6 and 12 days after a completed visit) — done, so open requests stay the same
  const recentV = [...S.D.visits.values()].filter((v) => String(v.status).includes('Completed') && v.date >= R.addDays(today, -60) && v.date <= R.addDays(today, -14)).slice(0, 2);
  recentV.forEach((v, i) => { const d = R.addDays(v.date, i ? 12 : 6); put('requests', { customerId: v.customerId, type: i ? 'Water quality' : 'Leak', priority: 'Normal', status: 'Done', receivedAt: d + 'T10:15', receivedAtMs: R.parseD(d).getTime() + 10 * 3600e3, receivedDate: d, description: i ? 'water tastes of plastic since the visit' : 'dripping under the filter housing after the change', agent: 'Tara', resolution: 'fitting re-tightened', doneDate: R.addDays(d, 1) }); });
  // v0.8 demo: why payments were late (two kinds that need different fixes)
  const lateLog = ['Money not come in yet', 'Money not come in yet', 'No money this month', 'Forgot', 'Money not come in yet'];
  [...S.D.checkins.values()].filter((q) => q.kind === 'D7').slice(0, lateLog.length).forEach((q, i) => { q.lateReason = lateLog[i]; });
  mk('Laxmi', withGps('Laxmi').slice(0, 2), [300, 150]);
  // v0.8 #8 demo: 3 pilot homes from 13–15 months ago (their month-14 step shows in the billing moves) + 1 home that came back after leaving
  { const q = rng(8082026); const qi = (a2, b2) => a2 + Math.floor(q() * (b2 - a2 + 1));
    const paidUp = (c, from = 1) => { for (let k = from; k <= 60; k++) { const due = R.billDue(c.installDate, k); if (due > today) break; const b = R.billAmount(k); put('payments', { customerId: c.id, date: due, type: k === 1 ? 'Installation fee (4,900)' : 'Monthly subscription', amount: b.amount, method: 'Fonepay QR', ref: 'TXN' + qi(100000, 999999), billNo: String(9000 + qi(1, 999)), updatedAt: { toMillis: () => R.parseD(due).getTime() + 12 * 3600e3 } }); } };
    const home = (inst, tole, phone) => { const [la, lo] = TOLES[tole]; const c = put('customers', { code: 'KC-P' + qi(100, 999), name: `${FIRST[qi(0, FIRST.length - 1)]} ${LAST[qi(0, LAST.length - 1)]}`, phone: phone || '+97798' + qi(10000000, 99999999), zone: 'Zone_A', ward: String(qi(1, 33)), tole, houseDetail: 'pilot home', householdSize: qi(3, 6), prevWater: 'Jar (20L delivery)', referral: 'Tara_Direct', waterSource: 'Municipal tap', pressurePsi: qi(30, 60), rawTds: qi(60, 180), purifiedTds: qi(20, 90), flow: 1.1, deviceSerial: 'TQ25' + qi(10000, 99999), installDate: inst, signUpDate: inst, plan: 'Standard', checks: [], agent: 'Tara', status: 'Active', gps: { lat: la + (q() - 0.5) * 0.01, lng: lo + (q() - 0.5) * 0.012, acc: 10 }, notes: '', updatedAt: { toMillis: () => R.parseD(inst).getTime() } });
      let vd = R.addDays(today, -qi(10, 25)); if (vd <= inst) vd = R.addDays(inst, 1); if (vd >= today) vd = null;
      if (vd) put('visits', { customerId: c.id, customerCode: c.code, customerName: c.name, date: vd, visitType: 'Filter change', status: '✅ Completed', filters: ['PP', 'CTO', 'UV'], ppColor: 'Brown', tdsBefore: 90, tdsAfter: 40, flow: 1.1, oldCollected: true, oldCount: 3, sanitised: 'Yes', nextVisitDate: R.addMonths(vd, 3), technician: 'Tara', durationMin: 30, updatedAt: { toMillis: () => R.parseD(vd).getTime() + 12 * 3600e3 } });
      for (const o of R.ONBOARD) { const d2 = R.addDays(inst, o.days); if (d2 <= today) put('checkins', { customerId: c.id, kind: o.k, date: d2, by: 'Tara', result: 'OK', satisfaction: '5' }); }
      return c; };
    for (const back of [15, 14, 13]) paidUp(home(R.addDays(R.addMonths(today, -back), -qi(2, 12)), ['Lakeside', 'Newroad', 'Baidam'][back - 13]));
    const gone = [...S.D.customers.values()].find((c) => c.status === 'Churned' && c.churnDate && c.churnDate < R.addDays(today, -25));
    if (gone) paidUp(home(R.addDays(gone.churnDate, 18), gone.tole, gone.phone));
  }
  // v0.8 #9 demo: where homes came from — a lead for ~70 % of installs (same phone, stage dates before sign-up) + stage dates on the open leads
  { const q = rng(9092026); const qi = (a2, b2) => a2 + Math.floor(q() * (b2 - a2 + 1));
    for (const c of [...S.D.customers.values()].filter((x) => R.isDate(x.installDate))) {
      if (q() > 0.7) continue; const sign = c.signUpDate || c.installDate; const lead = R.addDays(sign, -qi(2, 30)); const demo = R.addDays(lead, qi(0, Math.max(0, R.daysBetween(lead, sign))));
      put('leads', { name: c.name, phone: c.phone, tole: c.tole, ward: c.ward, channel: c.referral === 'Word of mouth' ? 'Word of mouth' : c.referral, outcome: 'Signed', demoDate: demo, stageDates: { New: lead, 'Demo booked': R.addDays(demo, -qi(0, 2)) < lead ? lead : R.addDays(demo, -qi(0, 2)), Signed: sign }, customerId: c.id, followUpDate: '', notes: '', createdAt: { toMillis: () => R.parseD(lead).getTime() + 9 * 3600e3 }, updatedAt: { toMillis: () => R.parseD(sign).getTime() + 9 * 3600e3 } });
    }
    // v0.8 #10: the 0–10 recommend question on some calls (NPS)
    const q10 = rng(10102026); for (const ck of [...S.D.checkins.values()].filter((x) => x.kind === 'D7')) if (q10() < 0.6) { const r10 = q10(); ck.nps = String(r10 < 0.62 ? 9 + Math.floor(q10() * 2) : r10 < 0.87 ? 7 + Math.floor(q10() * 2) : Math.floor(q10() * 7)); }
    // v0.8 #12: money actions waiting for an OK (a discount by Laxmi, a deposit refund) + one decided
    { const act = [...S.D.customers.values()].filter((c) => c.status === 'Active' && R.isDate(c.installDate)); const c1 = act[3], c2 = act[8];
      if (c1) put('payments', { customerId: c1.id, date: R.addDays(today, -1), type: 'Monthly subscription', amount: 900, discount: 500, discountReason: 'Promotion', method: 'Cash', by: 'Laxmi', approval: 'Pending' }).createdBy = 'demo-ram';
      if (c2) put('payments', { customerId: c2.id, date: R.addDays(today, -20), type: 'Monthly subscription', amount: 1100, discount: 300, discountReason: 'Claim compensation', method: 'Fonepay QR', by: 'Tara', approval: 'Approved', approvedBy: 'Jun', approvedAt: new Date(R.parseD(R.addDays(today, -19)).getTime() + 9 * 3600e3).toISOString() });
      const rc = [...S.D.recoveries.values()].find((r) => ['Recovered', 'Partial'].includes(r.outcome)); if (rc) { rc.depositRefunded = rc.depositRefunded || 1200; rc.approval = 'Pending'; } }
    // v0.8 security: a few change-log entries (edits of saved records)
    { const au = (x) => { const r = put('audit', { at: new Date(Date.now() - x.h * 3600e3).toISOString(), ...x }); r.createdBy = x.by === 'Laxmi' ? 'demo-ram' : x.by === 'Tara' ? 'demo-tara' : 'demo-uid'; return r; }; const cs2 = [...S.D.customers.values()].filter((c) => c.status === 'Active');
      const pay = [...S.D.payments.values()].find((q) => q.type === 'Monthly subscription' && q.customerId === (cs2[5] || {}).id);
      if (pay) au({ h: 30, col: 'payments', docId: pay.id, customerId: pay.customerId, fields: ['amount', 'discount'], before: { amount: '1,400', discount: '' }, after: { amount: '1100', discount: '300' }, by: 'Laxmi' });
      if (cs2[2]) au({ h: 52, col: 'customers', docId: cs2[2].id, customerId: cs2[2].id, fields: ['phone', 'houseDetail'], before: { phone: '+9779801112233', houseDetail: 'blue gate' }, after: { phone: cs2[2].phone, houseDetail: cs2[2].houseDetail }, by: 'Tara' });
      const vis = [...S.D.visits.values()].find((v) => String(v.status).includes('Completed')); if (vis) au({ h: 75, col: 'visits', docId: vis.id, customerId: vis.customerId, fields: ['tdsAfter'], before: { tdsAfter: '410' }, after: { tdsAfter: String(vis.tdsAfter) }, by: 'Tara' });
      au({ h: 100, col: 'settings', docId: 'app', customerId: '', fields: ['techNames'], before: { techNames: '' }, after: { techNames: 'Laxmi' }, by: 'Jun' }); }
    for (const l of [...S.D.leads.values()].filter((x) => !x.stageDates)) { const st = l.outcome || 'New'; const nw = R.addDays(today, -qi(3, 40)); l.stageDates = { New: nw }; if (st !== 'New') l.stageDates[st] = R.addDays(nw, qi(0, Math.max(0, R.daysBetween(nw, today)))); if (st === 'Demo booked' && !l.demoDate) l.demoDate = R.addDays(l.stageDates[st], qi(1, 5)); }
  }
  // v0.9 #1 demo: payment chases on late homes — promises broken / waiting, no answers — plus one kept and one paid-late promise on paid-up homes
  { const q = rng(9292026); const pays = [...S.D.payments.values()];
    const ledOf = (c) => R.ledger(c, pays.filter((p) => p.customerId === c.id), today);
    const act = [...S.D.customers.values()].filter((c) => c.status === 'Active' && R.isDate(c.installDate));
    const lateOf = () => act.map((c) => ({ c, led: ledOf(c) })).filter((x) => x.led.daysOverdue >= 3).sort((a, b) => b.led.daysOverdue - a.led.daysOverdue);
    let late = lateOf();
    // v0.12.2: the small world (≈50 homes · 8 % late) can leave fewer than 5 late homes — the chase stories below need 5, so a few paid-up homes lose their last payment(s)
    for (const c of act) { if (late.length >= 5) break; if (late.some((x) => x.c.id === c.id)) continue; const all = pays.filter((p) => p.customerId === c.id); if (all.some((p) => p.approval || p.savedAt || p.discount || p.date >= R.addDays(today, -7))) continue; /* keep the homes that carry the approval / field-live stories */ const mine = all.filter((p) => p.type === 'Monthly subscription').sort((a, b) => b.date.localeCompare(a.date)); if (mine.length < 3) continue; for (const p of mine.slice(0, 1 + (late.length % 2))) { S.D.payments.delete(p.id); pays.splice(pays.indexOf(p), 1); } late = lateOf(); }
    const chase = (c, x) => put('checkins', { customerId: c.id, kind: R.CHASE_KIND, by: q() < 0.7 ? 'Tara' : 'Laxmi', channel: 'Phone', ...x });
    late.forEach((x, i) => {
      const since = x.led.overdueSince; const owe = Math.round(x.led.overdue); const y = R.addDays(today, -1);
      if (i % 4 === 0 && x.led.daysOverdue >= 8) { chase(x.c, { date: R.addDays(since, 3), reached: 'Talked', promiseDate: R.addDays(since, 5), promiseAmount: owe }); }
      else if (i % 4 === 1) { chase(x.c, { date: R.addDays(since, 2) < y ? R.addDays(since, 2) : y, reached: 'No answer' }); chase(x.c, { date: y, reached: 'Talked', promiseDate: R.addDays(today, 1 + (i % 3)), promiseAmount: owe }); }
      else if (i % 4 === 2) { chase(x.c, { date: R.addDays(since, 3) < y ? R.addDays(since, 3) : y, reached: 'No answer' }); if (x.led.daysOverdue >= 6) chase(x.c, { date: R.addDays(since, 5), reached: 'Phone off' }); }
      else chase(x.c, { date: R.addDays(since, 3) < y ? R.addDays(since, 3) : y, channel: 'WhatsApp', reached: 'Message sent' });
    });
    const paidUp = act.filter((c) => ledOf(c).overdue === 0);
    const recentPay = (c) => pays.filter((p) => p.customerId === c.id && p.type === 'Monthly subscription' && p.date >= R.addDays(today, -60) && p.date <= R.addDays(today, -10)).sort((a, b) => b.date.localeCompare(a.date))[0];
    const withPay = paidUp.map((c) => ({ c, p: recentPay(c) })).filter((x) => x.p).slice(0, 2);
    if (withPay[0]) { const { c, p } = withPay[0]; chase(c, { date: R.addDays(p.date, -2), reached: 'Talked', promiseDate: R.addDays(p.date, 1), promiseAmount: Number(p.amount) }); }
    if (withPay[1]) { const { c, p } = withPay[1]; chase(c, { date: R.addDays(p.date, -5), reached: 'Talked', promiseDate: R.addDays(p.date, -3), promiseAmount: Number(p.amount) }); }
  }
  // v0.9 #2 demo: pause history — the paused homes get their line · 3 homes paused and restarted before · 1 paused and then left
  { const q = rng(9292027); const qi = (a2, b2) => a2 + Math.floor(q() * (b2 - a2 + 1));
    // v0.10 (Jun 2026-09-29): only "away" is a pause · it skips one bill day · at most 1 month · the first home restarts within a week
    const lastAnniv = (c, d) => { let a = c.installDate; for (let j = 1; j <= 84; j++) { const n2 = R.addMonths(c.installDate, j); if (n2 > d) break; a = n2; } return a; };
    [...S.D.customers.values()].filter((x) => x.status === 'Paused' && R.isDate(x.installDate)).forEach((c, i) => { const skipDue = lastAnniv(c, R.addDays(today, i ? -3 : 0)); const from = R.addDays(skipDue, -qi(2, 5)); const full = R.addDays(R.addMonths(skipDue, 1), -1);
      c.pausedFrom = from; c.pauseReason = R.PAUSE.reason; c.pausedUntil = i ? full : (full < R.addDays(today, 5) ? full : R.addDays(today, 5)); c.pauseLog = [{ from, until: c.pausedUntil, reason: c.pauseReason, skipDue, resumed: '', by: 'Tara', at: from + 'T10:00:00.000Z' }]; });
    [...S.D.customers.values()].filter((x) => x.status === 'Active' && R.isDate(x.installDate) && x.installDate < R.addDays(today, -150)).slice(0, 3).forEach((c, i) => {
      const from = R.addDays(today, -qi(60, 140)); c.pauseLog = [{ from, until: R.addDays(from, 30), reason: R.PAUSE.reason, resumed: R.addDays(from, qi(7, 40)), endedAs: 'Active', by: 'Tara', at: from + 'T09:00:00.000Z' }]; });
    const gone = [...S.D.customers.values()].find((x) => x.status === 'Churned' && R.isDate(x.churnDate) && x.churnDate > R.addDays(today, -300) && x.churnDate < R.addDays(today, -20));
    if (gone) { const from = R.addDays(gone.churnDate, -qi(15, 40)); gone.pauseLog = [{ from, until: '', reason: R.PAUSE.reason, resumed: gone.churnDate, endedAs: 'Churned', by: 'Tara', at: from + 'T09:00:00.000Z' }]; }
  }
  // v0.9 #3 demo: a notice to end (early, 5 days out, no recovery yet) · an older transfer · a lost device not settled
  { const act = [...S.D.customers.values()].filter((x) => x.status === 'Active' && R.isDate(x.installDate) && x.installDate < R.addDays(today, -60));
    const cN = act[act.length - 2], cT = act[act.length - 4], cL = act[act.length - 6];
    if (cN) put('contractEvents', { customerId: cN.id, kind: 'Notice to end', date: R.addDays(today, -3), channel: 'WhatsApp', endDate: R.addDays(today, 5), reasonCode: 'Moved away (outside our area)', early: true, removeBy: R.addDays(today, 12), depositPaid: 900, by: 'Tara' });
    if (cT) put('contractEvents', { customerId: cT.id, kind: 'Transfer to a new holder', date: R.addDays(today, -40), channel: 'In person', oldName: 'Hari ' + String(cT.name || '').split(' ').pop(), oldPhone: '+9779801234567', newName: cT.name, newPhone: cT.phone, relation: 'son', transferReason: 'Within the family', depositHandling: 'Carried over to the new holder', newSigned: 'Yes', by: 'Tara' });
    if (cL) put('contractEvents', { customerId: cL.id, kind: 'Lost or stolen', date: R.addDays(today, -6), channel: 'Phone', lostDate: R.addDays(today, -15), fault: 'Not known yet', by: 'Tara' });
  }
  // v0.10 demo: late repairs (Jun 2026-09-29 — over 7 days from the report → a credit from the report day) · one ours not given · one not our fault · one still open · one already given
  { const act = [...S.D.customers.values()].filter((x) => x.status === 'Active' && R.isDate(x.installDate) && x.installDate < R.addDays(today, -90));
    const late = (c, type, got, done, fault, desc) => put('requests', { customerId: c.id, type, priority: 'Normal', status: done === null ? 'In progress' : 'Done', receivedAt: R.addDays(today, -got) + 'T11:20', receivedAtMs: R.parseD(R.addDays(today, -got)).getTime() + 11 * 3600e3, receivedDate: R.addDays(today, -got), description: desc, agent: 'Laxmi', resolution: done === null ? '' : 'pump replaced (part waited)', doneDate: done === null ? '' : R.addDays(today, -done), ...(done === null ? {} : { ourFault: fault }) });
    const c1 = act[3], c2 = act[9], c3 = act[15], c4 = act[21];
    if (c1) late(c1, 'Breakdown', 20, 8, 'Our unit / our work', 'no water coming out — pump not running');
    if (c2) late(c2, 'Leak', 15, 6, 'No — power, water supply or the customer', 'leak under the sink — their own pipe');
    if (c3) late(c3, 'Water quality', 9, null, '', 'water smells since the rain');
    if (c4) { const r4 = late(c4, 'Breakdown', 40, 30, 'Our unit / our work', 'UV light off'); const cr = R.repairCredit(r4, today); if (cr) put('payments', { id: 'svc_' + r4.id, customerId: c4.id, date: R.addDays(today, -29), type: 'Service credit', amount: cr.amount, method: '', notes: `Repair late ${cr.days} days`, by: 'Jun' }); }
  }
  // v0.9 #4 demo: sign-up screenings — most open leads, and half of the customers who came from a lead (so the outcome table has rows)
  { const q = rng(9292029); const q2 = rng(9292031); const pick = (a2) => a2[Math.floor(q() * a2.length)];
    const one = (x, date, leadId) => { const s = { name: x.name, phone: x.phone || '', tole: x.tole || '', date, housing: q() < 0.7 ? 'Own house' : 'Renting', yearsHere: Math.round(q() * 12 * 2) / 2, stay36: q() < 0.8 ? 'Yes' : q() < 0.5 ? 'Not sure' : 'No', householdSize: 3 + Math.floor(q() * 4), prevWater: pick(['Jar (20L delivery)', 'Boiled tap', 'Bottled']), waterSpend: 300 + Math.floor(q() * 8) * 50, income: pick(R.SCREEN_INCOME), phone2: q() < 0.75 ? '+97798' + (10000000 + Math.floor(q() * 89999999)) : '', idSeen: q() < 0.9 ? 'Yes' : 'No', power: q() < 0.95 ? 'Yes' : 'No', tap: 'Yes', waterSource: q() < 0.85 ? 'Municipal tap' : 'Well / borehole', leadId: leadId || '', by: 'Tara' };
      if (s.housing === 'Renting') s.landlordOk = q() < 0.8 ? 'Yes' : 'No';
      s.by = q2() < 0.7 ? 'Laxmi' : 'Tara'; s.cashDay1 = q2() < 0.93 ? 'Yes' : 'No'; s.consentSigned = q2() < 0.85 ? 'Yes' : 'No'; if (q2() < 0.8 && s.by !== 'Tara') { s.verifyBy = 'Tara'; s.verifyDate = R.addDays(date, 1); }
      if (s.housing === 'Renting') { s.mount = q2() < 0.35 ? 'Wall' : 'Stand'; if (s.mount !== 'Wall') delete s.landlordOk; if (q2() < 0.8) { s.landlordName = 'Landlord ' + x.name.split(' ').pop(); s.landlordPhone = '+97798' + (10000000 + Math.floor(q2() * 89999999)); } }
      if (!s.phone2 && q2() < 0.6) s.referee = 'Hari · neighbour · 98' + (10000000 + Math.floor(q2() * 89999999));
      if (s.income === 'Money from abroad') s.remitMonths = q2() < 0.5 ? 'Baisakh, Kartik' : 'every 2–3 months';
      const V = R.screenVerdict(s); s.verdict = V.verdict; s.verdictWhy = [...V.hold, ...V.check]; s.decision = V.verdict === 'Hold' ? 'Wait' : 'Go ahead'; put('screenings', s); };
    for (const l of [...S.D.leads.values()].filter((x) => !['Signed', 'Rejected'].includes(x.outcome))) if (q() < 0.6) one(l, R.addDays(today, -Math.floor(q() * 10)), l.id);
    for (const c of [...S.D.customers.values()].filter((x) => R.isDate(x.signUpDate || x.installDate))) if (q() < 0.5) one(c, R.addDays(c.signUpDate || c.installDate, -2), c.leadId || '');
  }
  // v0.9 #5 demo: most finished visits and installs of the last 30 days were signed; some say why not; a few say nothing
  { const q = rng(9292030); const from = R.addDays(today, -30);
    const mark = (x, who) => { const r = q(); if (r < 0.72) { x.signed = true; x.signName = String(who || '').split(' ')[0]; } else if (r < 0.9) { x.signed = false; x.noSign = R.NO_SIGN[Math.floor(q() * 3)]; } else x.signed = false; };
    for (const v of [...S.D.visits.values()]) if (String(v.status || '').includes('Completed') && v.date >= from) mark(v, v.customerName);
    for (const c of [...S.D.customers.values()]) if (R.isDate(c.installDate) && c.installDate >= from) mark(c, c.name);
  }
  // v0.9 #6 demo: supplier claims — a UV lamp broken on arrival (sent, waiting) · a leaking unit after install (credited, not used yet) · one not sent near its deadline
  { const dv = [...S.D.customers.values()].filter((x) => x.deviceSerial && R.isDate(x.installDate)).slice(-3);
    put('claims', { supplier: 'Frank', piNo: 'TQ-PI-20260808', what: 'Part', part: 'UV lamp', qty: 1, problem: 'Broken in transit', foundDate: R.addDays(today, -20), basis: R.CLAIM_BASIS[0], arrivalDate: R.addDays(today, -23), sentDate: R.addDays(today, -19), result: 'Waiting', deadline: R.addDays(today, -9), by: 'Tara' });
    if (dv[0]) put('claims', { supplier: 'Frank', piNo: 'TQ-PI-20260808', what: 'Device', serial: R.normSerial(dv[0].deviceSerial), qty: 1, problem: 'Leak', foundDate: R.addDays(dv[0].installDate, 6), basis: R.CLAIM_BASIS[1], installDate: dv[0].installDate, sentDate: R.addDays(dv[0].installDate, 7), result: 'Credited', creditUsd: 59, usedInOrder: 'No', closedDate: R.addDays(dv[0].installDate, 15), deadline: R.addDays(dv[0].installDate, 30), by: 'Tara' });
    if (dv[1]) put('claims', { supplier: 'Frank', piNo: 'TQ-PI-20260808', what: 'Device', serial: R.normSerial(dv[1].deviceSerial), qty: 1, problem: 'Does not work', foundDate: R.addDays(today, -1), basis: R.CLAIM_BASIS[0], arrivalDate: R.addDays(today, -12), result: 'Waiting', deadline: R.addDays(today, 2), by: 'Tara' });
  }
  // v0.9 #7 demo: parts in stock, morning issue / evening return (signed), parts used on visits, three tools
  { const q = rng(9292031); const P = R.PARTS_DEFAULT; const d0 = R.addDays(today, -40);
    [[0, 8], [1, 10], [2, 6], [3, 4], [4, 40], [5, 20], [6, 12], [7, 10], [8, 15], [9, 30]].forEach(([i, n]) => put('stockMoves', { item: 'Part: ' + P[i], type: 'In', qty: n, date: d0, ref: 'TQ-PI-20260808 spares', by: 'Tara' }));
    for (let k = 1; k <= 3; k++) { const d = R.addDays(today, -k); put('stockMoves', { item: 'Part: ' + P[4], type: 'Issue', qty: 6, date: d, person: 'Laxmi', signed: true, signName: 'Laxmi', by: 'Tara' }); put('stockMoves', { item: 'Part: ' + P[4], type: 'Return', qty: 4, date: d, person: 'Laxmi', signed: true, signName: 'Laxmi', by: 'Tara' }); }
    put('stockMoves', { item: 'Part: ' + P[8], type: 'Issue', qty: 3, date: today, person: 'Tara', signed: true, signName: 'Tara', by: 'Tara' });
    for (const v of [...S.D.visits.values()].filter((x) => String(x.status || '').includes('Completed') && x.date >= R.addDays(today, -20)).slice(0, 12)) if (q() < 0.5) { v.parts = [P[q() < 0.6 ? 4 : 8]]; v.issuedFrom = v.technician === 'Laxmi' && v.parts[0] === P[4] ? 'my bag' : 'shelf'; }
    put('tools', { name: 'TDS meter', serial: 'TDS-01', holder: 'Tara', status: 'OK', calibrated: R.addDays(today, -12), cost: 1500, log: [{ date: d0, holder: 'Tara', status: 'OK', by: 'Jun' }], by: 'Jun' });
    put('tools', { name: 'Cordless drill', serial: 'DR-1', holder: 'Laxmi', status: 'OK', cost: 9000, log: [{ date: d0, holder: 'Laxmi', status: 'OK', by: 'Jun' }], by: 'Jun' });
    put('tools', { name: 'Pipe cutter', holder: 'Office', status: 'Broken', fault: R.TOOL_FAULT[1], repairCost: 800, staffShare: 400, log: [{ date: d0, holder: 'Laxmi', status: 'OK', by: 'Jun' }, { date: R.addDays(today, -5), holder: 'Office', status: 'Broken', by: 'Tara' }], by: 'Tara' });
  }
  // v0.9 #9 demo: two fictional staff pay records (payroll stays off until Settings says Yes)
  { put('payroll', { kind: 'person', name: 'Laxmi', job: 'Field technician', basic: 18000, allowance: 1000, ssf: 'Yes', startDate: R.addDays(today, -200), active: 'Yes', by: 'Jun' });
    put('payroll', { kind: 'person', name: 'Sita', job: 'Office', basic: 22000, allowance: 0, ssf: 'Yes', startDate: R.addDays(today, -400), active: 'Yes', by: 'Jun' });
  }
  // v0.15 demo: two milestone boards with generic names — the real items live in the company's own data (imported JSON), never in this public demo
  { const b1 = 'Company & licences', b2 = '1st shipment'; let o = 0;
    const ms = (board, title, who, state, since, due, grade, src, note) => put('milestones', { board, title, who, state, since, due, grade, src, note, order: (o += 10), doneDate: state === 'Done' ? since : '', by: 'Jun' });
    ms(b1, 'Company registration', 'Us', 'Done', R.addDays(today, -26), '', '🟢 measured', 'registration certificate (demo)', '');
    ms(b1, 'Tax registration (PAN / VAT)', 'Us', 'Done', R.addDays(today, -20), '', '🟢 measured', 'tax office (demo)', '');
    ms(b1, 'Commerce department appearance', 'Ministry', 'Waiting', R.addDays(today, -3), '', '🟡 second-hand', 'lawyer: they set the date', 'in person');
    ms(b1, 'Import licence (EXIM code)', 'Us', 'Blocked', R.addDays(today, -3), '', '🟡 second-hand', 'only after the commerce registration', '');
    ms(b1, 'Work permit — written confirmation', 'Lawyer', 'Waiting', R.addDays(today, -33), '', '🟡 second-hand', 'lawyer letter', '');
    ms(b1, 'Residence visa decision', 'Immigration', 'Waiting', R.addDays(today, -10), R.addDays(today, 6), '🟢 measured', 'immigration slip', 'both of us present');
    o = 0;
    ms(b2, 'Freight rate for this month', 'Forwarder', 'Waiting', R.addDays(today, -19), '', '🟡 second-hand', 'forwarder email', 'the old rate was for August shipping');
    ms(b2, 'Final PI from the supplier', 'Supplier', 'Done', R.addDays(today, -50), '', '🟢 measured', 'PI pdf', '');
    ms(b2, 'Certificate of origin (original)', 'Supplier', 'Todo', '', R.addDays(today, 9), '🟡 second-hand', 'customs document list', 'ask with the order');
    ms(b2, 'Insurance certificate', 'Us', 'Todo', '', R.addDays(today, 9), '🟢 measured', 'customs document list', '');
    ms(b2, 'Ship from the factory', 'Supplier', 'Todo', '', R.addDays(today, 9), '🔴 guess', 'forwarder: "2nd week"', 'production starts when the licence is filed');
    ms(b2, 'Port handling (Kolkata)', 'Forwarder', 'Todo', '', R.addDays(today, 30), '🔴 guess', '', '');
    ms(b2, 'Border customs', 'Forwarder', 'Todo', '', R.addDays(today, 40), '🔴 guess', '', 'festival: customs keeps working');
    ms(b2, 'Arrival in Pokhara', 'Us', 'Todo', '', R.addDays(today, 48), '🔴 guess', 'forwarder estimate', 'worst case + 2 weeks');
  }
  // v0.9 #10 demo: 14 vials — read and unread, blue on municipal water for one recent install (an ENPHO candidate)
  { const q = rng(9292032); const cs = [...S.D.customers.values()].filter((c) => c.status === 'Active' && R.isDate(c.installDate));
    const recent = cs.filter((c) => c.installDate >= R.addDays(today, -25)).sort((a, b) => b.installDate.localeCompare(a.installDate)); const older = cs.filter((c) => c.installDate < R.addDays(today, -25));
    const vial = (c, result, readAfter) => put('waterTests', { customerId: c.id, sampledDate: c.installDate, readDate: result ? R.addDays(c.installDate, readAfter || 2) : '', result, by: 'Tara' });
    if (recent[0]) { recent[0].waterSource = 'Municipal tap'; vial(recent[0], R.VIAL_RESULTS[0]); }
    if (recent[1]) vial(recent[1], '');
    older.slice(0, 12).forEach((c, i) => vial(c, i % 4 === 0 ? R.VIAL_RESULTS[0] : i === 10 ? R.VIAL_RESULTS[2] : R.VIAL_RESULTS[1], 1 + Math.floor(q() * 2)));
  }
}

// PRACTICE (v0.10.1 · Jun 2026-09-29 "살아있는것처럼"): the fake world keeps living after the day it was made.
// Customers pay by their habit (on time · late · stopped — the same habit every day), new repair requests come in, neighbours of
// customers ask about the unit (leads linked to the customer who told them), and a promise you logged on a chase call is kept on
// its day most of the time. Only the customers act — the staff work (visits, calls, installs, recording cash) stays yours.
// The same day always gives the same events (ids sim_…), so a reload never doubles anything; events later than `nowMs` wait.
// Returns the records it added this time.
export function liveWorld(S, anchor, nowMs) {
  const today = R.fmtD(new Date(nowMs)); if (!R.isDate(anchor) || today <= anchor) return [];
  const seen = S.simSeen || (S.simSeen = new Set()); const added = [];
  const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const stream = (key) => { const q = rng(hash(key)); return { q, int: (a, b) => a + Math.floor(q() * (b - a + 1)), pick: (a) => a[Math.floor(q() * a.length)] }; };
  const msOf = (d, h, m) => R.parseD(d).getTime() + (h * 60 + m) * 60e3;
  const put = (col, x, ms) => {
    if (ms > nowMs || seen.has(x.id)) return; seen.add(x.id);
    const cur = S.D[col].get(x.id); // a practice edit of this record was replayed first → keep the edit on top
    S.D[col].set(x.id, { ...x, createdBy: x.createdBy || 'demo-tara', updatedAt: { toMillis: () => ms }, ...(cur || {}) }); added.push({ col, x: S.D[col].get(x.id) });
  };
  const days = []; for (let d = R.addDays(anchor, 1); d <= today; d = R.addDays(d, 1)) days.push(d);
  const active = [...S.D.customers.values()].filter((c) => c.status === 'Active' && R.isDate(c.installDate)).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const paysOf = (id) => [...S.D.payments.values()].filter((p) => p.customerId === id);
  const chases = [...S.D.checkins.values()].filter((q) => q.kind === R.CHASE_KIND && R.isDate(q.promiseDate) && q.promiseDate > anchor && q.promiseDate <= today);
  const pay = (c, date, amount, key, extra) => {
    if (!(amount > 0.5)) return; const s = stream('m|' + key); const h = s.int(8, 20), mi = s.int(0, 59);
    put('payments', { id: 'sim_pay_' + key, customerId: c.id, date, type: 'Monthly subscription', amount: Math.round(amount), method: s.pick(['Khalti', 'eSewa', 'Fonepay QR', 'Fonepay QR']), ref: 'TXN' + s.int(100000, 999999), billNo: '', point: 'Digital', by: 'Tara', ...extra }, msOf(date, h, mi));
  };
  // 1 · bills: each home pays by its habit (from how it stood on the day the world was made)
  for (const c of active) {
    const led0 = R.ledger(c, paysOf(c.id), anchor); const s = stream('habit|' + c.id);
    const habit = led0.daysOverdue > 30 ? 'stopped' : led0.daysOverdue > 0 || s.q() > 0.82 ? 'late' : 'ontime';
    if (habit === 'stopped') continue; // only a promise on a chase call brings money now
    const promised = chases.some((q) => q.customerId === c.id);
    const dues = R.billDays(c).dues;
    for (let k = 2; k <= dues.length; k++) {
      const due = dues[k - 1]; if (due > today) break; if (due < R.addDays(anchor, -40)) continue;
      const w = stream(`bill|${c.id}|${k}`); let date = R.addDays(due, habit === 'ontime' ? w.int(-2, 3) : w.int(4, 18));
      if (due <= anchor) { if (promised) continue; if (date <= anchor) date = R.addDays(anchor, w.int(1, 6)); } // late at the start: pays in the first days
      if (date <= anchor || date > today) continue;
      const b = R.ledger(c, paysOf(c.id), date < due ? due : date).bills[k - 1]; if (!b || b.status === 'paid') continue; // already paid (also by you) → nothing
      pay(c, date, b.amount - b.paid, `${c.id}_${k}`, {});
    }
  }
  // 2 · promises you logged on a chase call: kept on the day (or the day after) most of the time
  for (const q of chases) {
    const c = S.D.customers.get(q.customerId); if (!c || c.status === 'Churned') continue;
    const w = stream('promise|' + q.id); if (w.q() > 0.75) continue; const date = w.q() < 0.7 ? q.promiseDate : R.addDays(q.promiseDate, 1); if (date > today) continue;
    const led = R.ledger(c, paysOf(c.id), date); if (led.overdue < 0.5) continue; // paid some other way already
    pay(c, date, Number(q.promiseAmount) || led.overdue, 'p_' + q.id, { notes: 'kept the promise from the chase call' });
  }
  // 3 · each day: repair requests (about one every two days) · people asking about the unit (often a customer's neighbour)
  const reqT = [['Water quality', 'water tastes different since yesterday'], ['Leak', 'small leak under the tap'], ['Breakdown', 'no water coming out'], ['Water quality', 'water smells since the rain'], ['Other', 'wants to move the unit to the other wall'], ['Breakdown', 'UV light blinking'], ['Leak', 'drip from the filter housing']];
  for (const d of days) {
    const s = stream('day|' + d); const nReq = (s.q() < 0.5 ? 1 : 0) + (s.q() < 0.12 ? 1 : 0);
    for (let i = 0; i < nReq && active.length; i++) {
      const c = s.pick(active); const [type, desc] = s.pick(reqT); const h = s.int(7, 19), mi = s.int(0, 59); const ms = msOf(d, h, mi);
      put('requests', { id: `sim_req_${d}_${i}`, customerId: c.id, type, priority: type === 'Breakdown' ? 'Urgent' : 'Normal', status: 'Received', receivedAt: `${d}T${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`, receivedAtMs: ms, receivedDate: d, description: desc, agent: R.assigneeOf(c, d), resolution: '', doneDate: '' }, ms);
    }
    if (s.q() < 0.55 && active.length) {
      const ref = s.q() < 0.6 ? s.pick(active) : null; const h = s.int(9, 20), mi = s.int(0, 59);
      put('leads', { id: `sim_lead_${d}`, name: `${s.pick(FIRST)} ${s.pick(LAST)}`, phone: '+97798' + s.int(10000000, 99999999), tole: ref ? ref.tole : s.pick(Object.keys(TOLES)), ward: ref ? ref.ward : String(s.int(1, 33)),
        channel: ref ? 'Word of mouth' : s.pick(['Facebook', 'Pop-up Booth', 'Tara_Direct']), referrerId: ref ? ref.id : '', outcome: 'New', followUpDate: R.addDays(d, 1),
        notes: ref ? `neighbour of ${ref.name} (customer ${ref.code}) — saw the unit there` : '' }, msOf(d, h, mi));
    }
  }
  return added;
}
