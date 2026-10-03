// KORA Field — business rules. Pure functions only (no Firebase, no DOM) so they can be tested with fixed inputs.
// Every constant names its source. Dates are local 'YYYY-MM-DD' strings (Nepal has no DST).

// ---------- sources ----------
// Contract 2026-09-03 (memory kora-customer-contract-track): day 1 = 4,900 (install fee incl. first month) ·
// months 2–13 = 1,400 (1,100 + deposit 300) · months 14–36 = 1,100 · deposit 3,600 · early customers stay at 1,100 on renewal.
export const PRICES = { installFee: 4900, monthly: 1100, depositMonthly: 300, depositMonths: 12, depositTotal: 3600, contractMonths: 36 };
export const VAT_RATE = 0.13; // Nepal VAT; prices are VAT-inclusive (1,100 → 973 net)
// Visits: plan §4 #6 "first 6 months monthly → quarterly"; G-1 §3-2 quarterly happy call; E-2 sanitisation every 3 months.
export const VISIT_RULE = { monthlyUntilMonth: 6, laterEveryMonths: 3 };
// Filter booking intervals in months — E-2 v2.0: booking values, not replacement verdicts (verdict = field observation).
// PP 4 (3 in monsoon Jun–Sep) · CTO 8 · UV 12 · UF 24 (band 12–24) · Spin-down: no interval (backwash, observe).
export const FILTER_TYPES = ['Spin-down', 'PP', 'CTO', 'UF', 'UV']; // 5-stage (memory kora-prototype-bom-plan)
export const FILTER_MONTHS = { 'Spin-down': null, PP: 4, CTO: 8, UF: 24, UV: 12 };
export const PP_MONSOON_MONTHS = 3;
export const SANITIZE_MONTHS = 3;
// FCL#1 (memory kora-custom-app-plan): order when stock ≤ 4-week avg weekly installs × lead time (weeks);
// "25 units" came from 8/month × 13 weeks → default lead time 13 weeks. Second condition: 30+ bills issued,
// collection not in the 50% disaster zone, no repeated defect.
export const FCL = { leadTimeWeeks: 13, minBills: 30, minCollection: 0.6 };
// Direction gate (memory kora-direction-gate): churn > 3.5%/month · 90-day retention < 85% · collection < 50%.
// Sample needs: churn 600 household-months; collection ~220 household-months (10σ between 90% and 50%).
export const GATE = { churnMonthly: 0.035, retention90: 0.85, collection: 0.5, churnExposure: 600, collectionExposure: 220, retentionMinCohort: 30 };
// Calls: one call 7 days after the install (G-1 §3-1). Jun 2026-09-30: no day-30/60/90 check-ins, no quarterly call, no random call — visits cover those months.
export const ONBOARD = [
  { k: 'D7', days: 7, label: 'Day-7 call' },
];

// ---------- dates ----------
const pad = (n) => String(n).padStart(2, '0');
export const fmtD = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export function parseD(s) { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }
export const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s);
export function addDays(s, n) { const d = parseD(s); d.setDate(d.getDate() + n); return fmtD(d); }
// Same day next month(s); clamps to month end (Jan 31 + 1 → Feb 28/29).
export function addMonths(s, n) {
  const d = parseD(s); const day = d.getDate();
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  t.setDate(Math.min(day, last)); return fmtD(t);
}
export const daysBetween = (a, b) => Math.round((parseD(b) - parseD(a)) / 864e5); // b − a
export function monthsBetween(a, b) { const x = parseD(a), y = parseD(b); let m = (y.getFullYear() - x.getFullYear()) * 12 + y.getMonth() - x.getMonth(); if (y.getDate() < x.getDate()) m--; return m; }
export const monthKey = (s) => String(s).slice(0, 7);

// ---------- billing ----------
// Bill k: k=1 on the install day, k≥2 on the same day each following month (G-1 §1-3 · E-1 step 7).
export function billAmount(k, p = PRICES) {
  if (k === 1) return { amount: p.installFee, install: p.installFee, subscription: 0, deposit: 0 };
  if (k <= 1 + p.depositMonths) return { amount: p.monthly + p.depositMonthly, install: 0, subscription: p.monthly, deposit: p.depositMonthly };
  return { amount: p.monthly, install: 0, subscription: p.monthly, deposit: 0 };
}
export function billDue(installDate, k) { return k === 1 ? installDate : addMonths(installDate, k - 1); }
// ---------- v0.10 pauses in the ledger (Jun 2026-09-29 · rules = repo docs/research/2026-09-29_딥조사B_정지정책.md 「✅ Jun 결정」) ----------
// A pause skips one bill: the first bill day on/after the pause start. The amount follows the bill number (k) — the deposit
// instalments and the 36 months just move one month later. Back within 15 days of the skipped bill day → no skip: that bill is
// charged, due on the restart day. Either way the pause counts as the year's one pause.
export const PAUSE = { minMonths: 6, perMonths: 12, noticeDays: 7, earlyDays: 15, reason: 'Away / house empty' };
export function pauseSkips(c) {
  const inst = c && isDate(c.installDate) ? c.installDate : null; if (!inst) return [];
  const log = Array.isArray(c.pauseLog) ? c.pauseLog.filter((p) => p && (isDate(p.from) || isDate(p.skipDue))) : [];
  const cur = c.status === 'Paused' && !log.some((p) => !isDate(p.resumed)) && isDate(c.pausedFrom) ? [{ from: c.pausedFrom, resumed: '' }] : [];
  const out = [];
  for (const p of [...log, ...cur]) {
    let due = isDate(p.skipDue) ? p.skipDue : null;
    if (!due) for (let j = 2; j <= 84; j++) { const d = addMonths(inst, j - 1); if (d >= p.from) { due = d; break; } }
    if (!due) continue;
    const back = isDate(p.resumed) ? p.resumed : '';
    const early = !!back && daysBetween(due, back) <= PAUSE.earlyDays;
    out.push({ due, from: p.from || '', resumed: back, early, skip: !early, open: !back });
  }
  return out.sort((a, b) => a.due.localeCompare(b.due));
}
// the bill days k = 1..n for this home (skipped months left out · an early-return month is due on the restart day)
export function billDays(c, n = 84) {
  const inst = c.installDate; const sk = pauseSkips(c);
  const skip = new Set(sk.filter((s) => s.skip).map((s) => s.due)); const late = new Map(sk.filter((s) => s.early && s.resumed > s.due).map((s) => [s.due, s.resumed]));
  const dues = [inst]; let j = 1;
  while (dues.length < n && j < n + skip.size + 2) { j++; const d = addMonths(inst, j - 1); if (skip.has(d)) continue; dues.push(late.get(d) || d); }
  return { dues, skipped: [...skip].sort() };
}
// the next bill day a pause asked for on `asked` can skip: at least 7 days away (earlier than that → the one after)
export function pauseStartDay(c, asked, wanted) {
  if (!c || !isDate(c.installDate)) return null; const from = isDate(wanted) && wanted > asked ? wanted : asked;
  for (let j = 2; j <= 84; j++) { const d = addMonths(c.installDate, j - 1); if (d >= from && daysBetween(asked, d) >= PAUSE.noticeDays) return d; }
  return null;
}
// Can this home pause? Reasons it cannot (shown, not enforced — a person decides, like screening).
export function pauseEligibility(c, led, asked, v = {}) {
  const why = []; if (!c || !isDate(c.installDate)) return { ok: false, why: ['No install date'], skipDue: null, until: '' };
  const skipDue = pauseStartDay(c, asked, v.from); const start = skipDue || asked;
  const six = addMonths(c.installDate, PAUSE.minMonths); if (start < six) why.push(`Pauses start 6 months after the install — from ${six}.`);
  const prev = (Array.isArray(c.pauseLog) ? c.pauseLog : []).filter((p) => p && isDate(p.from) && isDate(p.resumed)).map((p) => p.from).sort();
  const last = prev[prev.length - 1]; if (last && start < addMonths(last, PAUSE.perMonths)) why.push(`One pause in 12 months — the last one started ${last} (next from ${addMonths(last, PAUSE.perMonths)}).`);
  if (v.reason && v.reason !== PAUSE.reason) why.push(v.reason === 'Money trouble' ? 'Money trouble is not a pause — it goes to collections (§2.7).' : v.reason === 'Waiting for repair' ? 'Waiting for our repair is not a pause — the repair-delay credit covers it.' : 'Only "away / house empty" is a pause.');
  if (led && led.overdue > 0.5) why.push(`NPR ${Math.round(led.overdue).toLocaleString('en-IN')} overdue — it must be 0 before the pause starts (it can be paid at the cartridge pickup).`);
  const until = skipDue ? addDays(addMonths(skipDue, 1), -1) : '';
  if (v.until && until && v.until > until) why.push(`A pause is at most 1 month — until ${until}.`);
  return { ok: !why.length, why, skipDue, until };
}

// money actions that need an OK (v0.8 #12): a discount or a deposit refund waiting for approval (or rejected) does not count yet
export const moneyEffective = (x) => !x || (x.approval !== 'Pending' && x.approval !== 'Rejected');
const discOf = (x) => (moneyEffective(x) ? Number(x.discount) || 0 : 0);
const CREDIT_TYPES = new Set(['Installation fee (4,900)', 'Monthly subscription', 'Referral credit', 'Service credit']);
export const PAYMENT_TYPES = ['Installation fee (4,900)', 'Monthly subscription', 'Repair / other', 'Penalty', 'Referral credit', 'Service credit'];
// v0.10: credits that are not cash — a referral free month and the repair-delay credit (Jun 2026-09-29). They pay the subscription of bill 2 onward, never the first-day 4,900.
export const NONCASH = new Set(['Referral credit', 'Service credit']);
export const isNonCash = (p) => !!p && NONCASH.has(p.type);
// Same-day order must not depend on random document ids: install fee first, then credits, then by entry time.
const TYPE_RANK = { 'Installation fee (4,900)': 0, 'Referral credit': 1, 'Service credit': 1, 'Monthly subscription': 2 };
const entryMs = (p) => (p.createdAt && p.createdAt.toMillis ? p.createdAt.toMillis() : Number(p._localT) || Number(p.createdAtMs) || 0);
const cmpPay = (a, b) => String(a.date).localeCompare(String(b.date)) || (TYPE_RANK[a.type] ?? 3) - (TYPE_RANK[b.type] ?? 3) || entryMs(a) - entryMs(b) || String(a.id || '').localeCompare(String(b.id || ''));

// Ledger for one customer: allocates payments in date order to bills (inside a bill: install → subscription → deposit).
// Returns bill statuses, what is overdue, deposit collected, and how each payment splits (for VAT and receipts).
export function ledger(customer, payments, today, p = PRICES) {
  const out = { bills: [], overdue: 0, overdueSince: null, daysOverdue: 0, nextBill: null, paidThrough: 0,
    depositCollected: 0, credit: 0, splits: {}, billsDue: 0, billsPaidOnTime: 0, billsPaid: 0, extraTaxable: 0 };
  if (!customer || !isDate(customer.installDate)) return out;
  const pays = (payments || []).filter((x) => x.customerId === customer.id && Number(x.amount) > 0).slice().sort(cmpPay);
  const pool = pays.filter((x) => CREDIT_TYPES.has(x.type));
  const totalCredit = pool.reduce((s, x) => s + Number(x.amount) + discOf(x), 0);
  const nonCashTotal = pool.filter(isNonCash).reduce((s, x) => s + Number(x.amount), 0); let subs2 = 0;
  // enough bills to cover everything due by today and anything prepaid (cap 60 months)
  const bills = [];
  let covered = 0;
  // a home that left gets no unpaid bills after its leaving day; bills it had already paid ahead stay as they were
  // (their VAT / deposit split does not change afterwards) and are money to pay back (prepaidAfterLeave)
  const stopAt = customer.status === 'Churned' && isDate(customer.churnDate) ? customer.churnDate : null;
  const BD = billDays(customer); out.skipped = BD.skipped;
  for (let k = 1; k <= 60; k++) {
    const due = BD.dues[k - 1];
    if (stopAt && due > stopAt && covered + billAmount(k, p).amount > totalCredit + 1e-9) break;
    if (due > today && covered >= totalCredit && subs2 >= nonCashTotal - 0.0001) break;
    const b = { k, due, ...billAmount(k, p), paid: 0, paidOn: null, parts: { install: 0, subscription: 0, deposit: 0 } };
    bills.push(b); covered += b.amount; if (k >= 2) subs2 += b.subscription;
  }
  // v0.10: non-cash credits first, into the subscription of bill 2 onward (the first-day 4,900 is never reduced)
  for (const pay of pool.filter(isNonCash)) {
    let left = Number(pay.amount); const split = { install: 0, subscription: 0, deposit: 0, unallocated: 0, cashShare: 0 };
    for (const b of bills) { if (left <= 0.0001) break; if (b.k < 2) continue; const need = b.subscription - b.parts.subscription; if (need <= 0) continue; const take = Math.min(need, left); b.parts.subscription += take; b.paid += take; left -= take; split.subscription += take; if (b.paid >= b.amount - 0.0001 && !b.paidOn) b.paidOn = pay.date; }
    if (left > 0.0001) split.unallocated += left; out.splits[pay.id] = split;
  }
  // allocate cash
  let bi = 0;
  for (const pay of pool.filter((x) => !isNonCash(x))) {
    let left = Number(pay.amount) + discOf(pay);
    const cash = Number(pay.amount);
    const cashShare = left > 0 ? cash / left : 0;
    const split = { install: 0, subscription: 0, deposit: 0, unallocated: 0, cashShare };
    while (left > 0.0001 && bi < bills.length) {
      const b = bills[bi];
      for (const part of ['install', 'subscription', 'deposit']) {
        const need = b[part] - b.parts[part];
        if (need <= 0 || left <= 0) continue;
        const take = Math.min(need, left);
        b.parts[part] += take; b.paid += take; left -= take; split[part] += take;
      }
      if (b.paid >= b.amount - 0.0001) { if (!b.paidOn) b.paidOn = pay.date; bi++; }
    }
    if (left > 0.0001) split.unallocated += left;
    out.splits[pay.id] = split;
  }
  for (const pay of pays) if (!CREDIT_TYPES.has(pay.type)) out.splits[pay.id] = { extra: Number(pay.amount), type: pay.type, cashShare: 1 };
  out.credit = pays.filter((x) => CREDIT_TYPES.has(x.type)).length ? Object.values(out.splits).reduce((s, x) => s + (x.unallocated || 0), 0) : 0;
  // statuses
  for (const b of bills) {
    const full = b.paid >= b.amount - 0.0001;
    b.status = full ? 'paid' : b.due > today ? 'future' : b.paid > 0 ? 'partial' : 'due';
    if (b.due <= today) { out.billsDue++; if (full) { out.billsPaid++; if (b.paidOn && daysBetween(b.due, b.paidOn) <= 7) out.billsPaidOnTime++; } }
    if (full) out.paidThrough = b.k;
    if (!full && b.due <= today) { out.overdue += b.amount - b.paid; if (!out.overdueSince) out.overdueSince = b.due; }
    if (!full && !out.nextBill) out.nextBill = b;
  }
  if (!out.nextBill && stopAt) out.nextBill = null; else if (!out.nextBill) { const k = bills.length + 1; out.nextBill = { k, due: BD.dues[k - 1], ...billAmount(k, p), paid: 0, status: 'future' }; }
  out.depositCollected = bills.reduce((s, b) => s + b.parts.deposit, 0);
  out.prepaidAfterLeave = stopAt ? bills.filter((b) => b.due > stopAt).reduce((s, b) => s + b.paid, 0) + out.credit : 0;
  out.daysOverdue = out.overdueSince ? daysBetween(out.overdueSince, today) : 0;
  out.contractEnded = monthsBetween(customer.installDate, today) - BD.skipped.filter((d) => d <= today).length >= p.contractMonths;
  out.bills = bills;
  return out;
}

// G-1 §1-3 collection steps: 3 days before → reminder · due day → afternoon re-reminder · +3 → Tara calls · +7 → home visit (E-3 §2.7).
// Suspension/termination days are not decided yet (G-1: 🔴) → the app never suspends on its own.
export const DUNNING = [
  { stage: 'reminder', label: 'Reminder (due in ≤3 days)', short: 'Remind', color: 'blue' },
  { stage: 'due', label: 'Due today — afternoon re-reminder', short: 'Due today', color: 'yellow' },
  { stage: 'late', label: 'Late 1–2 days — re-remind', short: 'Late', color: 'yellow' },
  { stage: 'call', label: 'Late 3–6 days — Tara calls', short: 'Call', color: 'orange' },
  { stage: 'visit', label: 'Late 7+ days — home visit', short: 'Visit', color: 'red' },
];
export function dunning(led, today) {
  const b = led.bills.find((x) => x.status !== 'paid' && x.due <= addDays(today, 3)) || (led.nextBill && led.nextBill.due <= addDays(today, 3) ? led.nextBill : null);
  if (!b) return null;
  const d = daysBetween(b.due, today);
  const stage = d < 0 ? 'reminder' : d === 0 ? 'due' : d < 3 ? 'late' : d < 7 ? 'call' : 'visit';
  return { ...DUNNING.find((x) => x.stage === stage), days: d, bill: b, owed: d < 0 ? b.amount - b.paid : led.overdue };
}

// ---------- payment chase: who was reached, and the day they promised to pay (v0.9 #1) ----------
// A "Payment chase" call (checkins) records how we tried, whether a person answered and — when they give one —
// the day and amount they will pay. Until that day the home waits in "Promised"; after it, the promise is judged:
// kept = cash from the call day up to the promise day reaches the amount (no amount given → any payment) ·
// paid late = covered only after the day · broken = still not covered. Referral credits are not cash.
export const CHASE_KIND = 'Payment chase';
export const CHASE_CHANNELS = ['Phone', 'WhatsApp', 'Home visit', 'In person'];
export const REACHED = ['Talked', 'No answer', 'Phone off', 'Wrong number', 'Message sent'];
export const PROMISE = { maxDays: 14 }; // 🔴 first guess: a promise further out than this gets a warning (Settings)
const chaseMs = (q) => msOfTs(q.createdAt) || q._localT || 0;
export function chaseLog(checkins, cid) {
  return (checkins || []).filter((q) => q.kind === CHASE_KIND && (!cid || q.customerId === cid) && isDate(q.date))
    .sort((a, b) => b.date.localeCompare(a.date) || chaseMs(b) - chaseMs(a));
}
export function promiseOf(chases, payments, today) {
  const q = (chases || []).find((x) => isDate(x.promiseDate));
  if (!q) return null;
  const amount = Number(q.promiseAmount) > 0 ? Number(q.promiseAmount) : 0;
  const cash = (payments || []).filter((x) => x.customerId === q.customerId && !isNonCash(x) && isDate(x.date) && x.date >= q.date);
  const sum = (xs) => xs.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const paid = sum(cash.filter((x) => x.date <= q.promiseDate)); const paidAll = sum(cash);
  const enough = (n) => (amount ? n >= amount - 0.5 : n > 0);
  const status = enough(paid) ? 'kept' : q.promiseDate >= today ? 'waiting' : enough(paidAll) ? 'late' : 'broken';
  return { q, date: q.promiseDate, amount, madeOn: q.date, by: q.by || '', paid, status, daysLeft: daysBetween(today, q.promiseDate) };
}
// Chasing in a period: tries, how often a person answered, and every promise judged on its own.
// ---------- pauses: when a home stopped and restarted (v0.9 #2) ----------
// customers.pauseLog = [{ from, until, reason, resumed, endedAs, by, at }] — one line per pause, written by the customer edit form.
// Billing does not change while paused (🔴 no policy yet — Jun decides); the pauses are only shown next to the bills.
export const PAUSE_REASONS = ['Away / house empty', 'Money trouble', 'Waiting for repair', 'Moving soon', 'Other'];
export function pauseSpans(c, today) {
  const log = Array.isArray(c && c.pauseLog) ? c.pauseLog.filter((p) => p && (isDate(p.from) || isDate(p.resumed))) : [];
  const out = log.map((p) => ({ from: isDate(p.from) ? p.from : '', to: isDate(p.resumed) ? p.resumed : '', until: isDate(p.until) ? p.until : '', reason: p.reason || '', by: p.by || '', endedAs: p.endedAs || (isDate(p.resumed) ? 'Active' : ''), open: !isDate(p.resumed) }));
  // a home paused before v0.9 has no line yet: show its current pause (start unknown unless the form had it)
  if (c && c.status === 'Paused' && !out.some((p) => p.open)) out.push({ from: isDate(c.pausedFrom) ? c.pausedFrom : '', to: '', until: isDate(c.pausedUntil) ? c.pausedUntil : '', reason: c.pauseReason || '', by: '', endedAs: '', open: true, legacy: !isDate(c.pausedFrom) });
  for (const p of out) { p.days = p.from ? Math.max(0, daysBetween(p.from, p.to || today)) : null; p.late = p.open && !!p.until && p.until < today; }
  return out.sort((a, b) => String(a.from || a.to).localeCompare(String(b.from || b.to)));
}
// close the open pause line (restart or leaving) — used by the customer edit and by the recovery form (a paused home that leaves)
export function closePauseLog(c, endDate, endedAs, by) {
  const log = Array.isArray(c && c.pauseLog) ? c.pauseLog.map((p) => ({ ...p })) : []; const open = log.length && !isDate(log[log.length - 1].resumed) ? log[log.length - 1] : null;
  if (open) Object.assign(open, { resumed: endDate, endedAs });
  else if (c && c.status === 'Paused') log.push({ from: isDate(c.pausedFrom) ? c.pausedFrom : '', until: c.pausedUntil || '', reason: c.pauseReason || '', resumed: endDate, endedAs, by: by || '', at: new Date().toISOString() });
  return log;
}
// A: the Dashain bonus belongs to the Nepali month that holds the FIRST Dashain holiday (the holidays run across two months)
export function dashainStartsIn(hm, from, to) {
  const days = Object.entries(hm || {}).filter(([d, hs]) => d >= addDays(from, -45) && d <= addDays(to, 45) && (hs || []).some((h) => /Dashain|Dasain|Vijaya/i.test(h.n || ''))).map(([d]) => d).sort();
  return !!days.length && days[0] >= from && days[0] <= to;
}
export const inPause = (spans, date) => (spans || []).some((p) => p.from && date >= p.from && date <= (p.to || '9999-12-31'));
// Pauses across all homes: paused now (and past their restart day), finished pauses since `from`, days, reasons, how many ended in leaving.
export function pauseStats(customers, today, from) {
  const all = []; for (const c of customers || []) for (const p of pauseSpans(c, today)) all.push({ ...p, c });
  const now = all.filter((p) => p.open && p.c.status === 'Paused');
  const closed = all.filter((p) => !p.open && (!from || p.to >= from)).sort((a, b) => b.to.localeCompare(a.to));
  const days = closed.map((p) => p.days).filter((d) => d !== null && d !== undefined);
  const byReason = {}; for (const p of [...now, ...closed]) { const k = p.reason || 'Not given'; byReason[k] = (byReason[k] || 0) + 1; }
  return { now, late: now.filter((p) => p.late), closed, avgDays: days.length ? days.reduce((s, d) => s + d, 0) / days.length : null, medianDays: medianOf(days), toLeft: closed.length ? closed.filter((p) => p.endedAs === 'Churned').length / closed.length : null, byReason };
}
// ---------- contract events: notice to end · transfer to a new holder · lost or stolen (v0.9 #3) ----------
// Follows the customer agreement WORKING DRAFT of 2026-09-03 (still with the lawyer — wording and [TBC] items may change):
// §2.2 minimum 36 months — ending earlier: the deposit paid so far is forfeited, the unit is taken back within 7 days, the install fee and the months
// served are not refunded; after 36 months either side gives 30 days' notice and the deposit comes back with the unit in working order ·
// §2.5(b) lost or stolen: the customer tells KORA within 7 days; negligence → replacement cost; police report and not their fault → a reasonable settlement ·
// §2.11 transfer / succession = [TBC] (recorded only) · §2.14 WhatsApp, SMS or a phone call count as notice.
export const CONTRACT_KINDS = ['Notice to end', 'Transfer to a new holder', 'Lost or stolen'];
// earlyPct: Jun 2026-09-29 「남은 구독료의 조기해지는 30퍼로 하자」 — 30% of the subscription still to come · 🔴 the lawyer still checks it (draft §2.2 [TBC])
export const CONTRACT = { noticeDays: 30, removeDays: 7, lostNotifyDays: 7, earlyPct: 0.3, abroadCut: 0.5 }; // abroadCut: Jun 2026-09-29 「해외 이주(증빙) 시 위약금 감면」 — half of the 30% (🔴 our number · proof wording = the lawyer)
// 🟢 landed cost without VAT (memory kora-business-spec.md:30) — the value of a unit for lost / not-returned settlements
export const DEVICE_VALUE = 15607;
export const TRANSFER_REASONS = ['House sold', 'Tenant changed', 'Death in the family', 'Within the family', 'Other'];
export const LOST_FAULT = ['Customer negligence', 'Not the customer — police report', 'Not known yet'];
export function noticeTerms(customer, noticeDate, endDate, p = PRICES, o = {}) {
  const inst = customer && isDate(customer.installDate) ? customer.installDate : null;
  const skips = inst ? billDays(customer).skipped : []; /* v0.10: each paused month moves the 36 months one month later */
  const minEnd = inst ? addMonths(inst, p.contractMonths + skips.length) : null;
  const end = isDate(endDate) ? endDate : isDate(noticeDate) ? noticeDate : null;
  const early = !!(minEnd && end && end < minEnd);
  const earliestEnd = !early && isDate(noticeDate) ? addDays(noticeDate, CONTRACT.noticeDays) : null;
  const served = inst && end ? Math.min(p.contractMonths, Math.max(1, monthsBetween(inst, end) + 1 - skips.filter((d) => d <= end).length)) : null; /* months billed up to the end */
  const earlyFee = early && served ? Math.round(p.monthly * (p.contractMonths - served) * CONTRACT.earlyPct * (o.abroad ? CONTRACT.abroadCut : 1)) : 0;
  return { served, remaining: served ? p.contractMonths - served : null, earlyFee, monthN: inst && isDate(noticeDate) ? Math.max(1, monthsBetween(inst, noticeDate) + 1) : null, minEnd, early, earliestEnd, shortNotice: !!(earliestEnd && isDate(endDate) && endDate < earliestEnd), removeBy: isDate(endDate) ? addDays(endDate, CONTRACT.removeDays) : null };
}
// v0.10 (Jun 2026-09-29): lost / stolen / not returned = the early-ending charge + what the unit is still worth (straight over 36 months) − deposit paid
export function lostSettlement(c, led, date, p = PRICES) {
  const T = noticeTerms(c, date, date, p); const served = T.served || 1;
  const residual = Math.round(DEVICE_VALUE * Math.max(0, p.contractMonths - served) / p.contractMonths);
  const deposit = led ? Math.round(led.depositCollected || 0) : 0;
  return { fee: T.earlyFee, residual, deposit, total: T.earlyFee + residual - deposit, served };
}
// v0.10 (Jun 2026-09-29): our repair late — billing goes on; not fixed within 7 days of the report → every day from the report to the fix comes off the next bill
export const REPAIR = { freeDays: 7, types: ['Breakdown', 'Leak', 'Water quality'] };
export function repairCredit(r, today, p = PRICES) {
  if (!r || !REPAIR.types.includes(r.type) || String(r.ourFault || '').startsWith('No')) return null;
  const from = isDate(r.receivedDate) ? r.receivedDate : String(r.receivedAt || '').slice(0, 10); if (!isDate(from)) return null;
  const done = r.status === 'Done' && isDate(r.doneDate); const to = done ? r.doneDate : today;
  const days = daysBetween(from, to); if (days <= REPAIR.freeDays) return null;
  return { from, to, days, amount: Math.round(p.monthly / 30 * days), done };
}
export function repairCredits(requests, payments, today) {
  const paid = new Set((payments || []).filter((x) => x.type === 'Service credit').map((x) => x.id));
  return (requests || []).map((r) => ({ r, c: repairCredit(r, today) })).filter((x) => x.c).map((x) => ({ ...x, id: 'svc_' + x.r.id, given: paid.has('svc_' + x.r.id) }));
}
// Reminders about pauses: restart in ≤7 days (tell the family, book the refit visit) · pause asked but a bill is still overdue.
export function pauseReminders(customers, ledgers, today) {
  const out = [];
  for (const c of customers || []) {
    if (c.status !== 'Paused' || !isDate(c.pausedUntil)) continue; const d = daysBetween(today, c.pausedUntil);
    if (d >= 0 && d <= 7) out.push({ c, kind: 'restart', days: d });
  }
  return out;
}
// What still needs a person: a notice with no recovery case since it came in · a lost / stolen device not settled yet.
export function contractOpen(events, recoveries, today) {
  const out = [];
  for (const e of events || []) {
    if (e.kind === 'Notice to end' && e.status !== 'Withdrawn' && e.noticeStatus !== 'Withdrawn') {
      const rec = (recoveries || []).some((r) => r.customerId === e.customerId && String(r.startedDate || r.churnDate || '') >= String(e.date || ''));
      if (!rec) out.push({ kind: 'notice', e, due: e.endDate || e.date, soon: isDate(e.endDate) && daysBetween(today, e.endDate) <= CONTRACT.removeDays, overdue: isDate(e.endDate) && e.endDate < today });
    }
    if (e.kind === 'Lost or stolen' && !isDate(e.settledDate)) out.push({ kind: 'lost', e, due: e.date, lateNotice: isDate(e.lostDate) && isDate(e.date) && daysBetween(e.lostDate, e.date) > CONTRACT.lostNotifyDays });
  }
  return out.sort((a, b) => String(a.due).localeCompare(String(b.due)));
}
// ---------- sign-up screening (v0.9 #4) ----------
// Why: in PAYGo businesses the biggest cause of lost collections was loosened customer screening (memory kora-industry-benchmarks).
// G-1 has no sign-up rule yet → every rule here is a 🔴 first guess; the verdict only advises — a person decides.
export const SCREEN_INCOME = ['Salary', 'Business / shop', 'Money from abroad', 'Farming', 'Daily work', 'Other'];
export function screenVerdict(s) {
  const hold = [], check = []; s = s || {};
  // v0.10 (Jun 2026-09-29): hold only on 5 objective conditions (Consumer Protection Act §12 — sell without discrimination) · everything else is a check
  if (s.cashDay1 === 'No') hold.push('cannot pay the first-day 4,900 in cash');
  if (s.housing === 'Renting' && s.mount === 'Wall' && s.landlordOk !== 'Yes') hold.push('renting + wall mounting — no written landlord consent');
  if (s.housing === 'Renting' && s.mount !== 'Wall' && !String(s.landlordPhone || '').trim()) check.push('renting — write the landlord name and phone + moving plans');
  if (s.power === 'No') hold.push('no power point near the tap');
  if (s.tap === 'No') hold.push('no tap for the unit');
  if (s.stay36 === 'No') hold.push('will not stay 36 months'); else if (s.stay36 === 'Not sure') check.push('not sure they will stay 36 months');
  if (!String(s.phone2 || '').trim() && !String(s.referee || '').trim()) check.push('only one phone number — add a family number or a referee');
  if (s.idSeen !== 'Yes') check.push('ID not seen — it must be seen by the install day (or no install)');
  if (s.housing === 'Renting' && s.yearsHere !== null && s.yearsHere !== undefined && s.yearsHere !== '' && Number(s.yearsHere) < 1 && !String(s.referee || '').trim()) check.push('renting here less than a year — add a referee');
  if (!String(s.verifyBy || '').trim() || (s.by && String(s.verifyBy).trim() === String(s.by).trim())) check.push('no check call yet by someone other than the seller');
  if (s.waterSource === 'Well / borehole') check.push('well / borehole water — hardness and arsenic can be high');
  return { verdict: hold.length ? 'Hold' : check.length ? 'Check' : 'Pass', hold, check };
}
// the latest screening for a lead or a phone number
export function findScreening(screenings, leadId, phone) {
  return (screenings || []).filter((s) => (leadId && s.leadId === leadId) || (phone && s.phone === phone)).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0] || null;
}
// Did screening help? For each verdict: people screened, how many became customers, how many of those were ever 7+ days late, how many left.
export function screenOutcomes(screenings, customers, ledgers) {
  const rows = { Pass: { v: 'Pass', screened: 0, customers: 0, late7: 0, left: 0 }, Check: { v: 'Check', screened: 0, customers: 0, late7: 0, left: 0 }, Hold: { v: 'Hold', screened: 0, customers: 0, late7: 0, left: 0 } };
  const byLead = new Map(); const byPhone = new Map(); for (const c of customers || []) { if (c.leadId) byLead.set(c.leadId, c); if (c.phone) byPhone.set(c.phone, c); }
  for (const s of screenings || []) {
    const r = rows[s.verdict]; if (!r) continue; r.screened++;
    const c = (s.leadId && byLead.get(s.leadId)) || (s.phone && byPhone.get(s.phone)); if (!c) continue; r.customers++;
    const led = ledgers && ledgers.get(c.id);
    if (led && (led.daysOverdue >= 7 || led.bills.some((b) => b.paidOn && daysBetween(b.due, b.paidOn) >= 7))) r.late7++;
    if (c.status === 'Churned') r.left++;
  }
  return Object.values(rows);
}
// ---------- proof of visit (v0.9 #5) ----------
// A finished visit or install counts as proven when the customer signed (saved like a photo) — the saved spot (v0.7) is shown next to it.
export const NO_SIGN = ['Customer not at home (someone else there)', 'Refused', 'No time', 'Phone problem', 'Other'];
export function proofStats(D, from, to) {
  const inR = (d) => isDate(d) && d.slice(0, 10) >= from && d.slice(0, 10) <= to;
  const jobs = [];
  for (const v of D.visits || []) if (inR(v.date) && String(v.status || '').includes('Completed')) jobs.push({ kind: 'visit', x: v, date: v.date, who: v.technician || '—', cid: v.customerId });
  for (const c of D.customers || []) if (inR(c.installDate)) jobs.push({ kind: 'install', x: c, date: c.installDate, who: c.agent || '—', cid: c.id });
  const by = {}; const reasons = {};
  for (const j of jobs) {
    j.signed = !!j.x.signed; j.spot = !!(j.x.savedAt && Number.isFinite(j.x.savedAt.lat));
    const p = (by[j.who] = by[j.who] || { who: j.who, jobs: 0, signed: 0 }); p.jobs++; if (j.signed) p.signed++;
    if (!j.signed && j.x.noSign) reasons[j.x.noSign] = (reasons[j.x.noSign] || 0) + 1;
  }
  const n = jobs.length; const signed = jobs.filter((j) => j.signed).length;
  return { jobs: jobs.sort((a, b) => String(b.date).localeCompare(String(a.date))), n, signed, rate: n ? signed / n : null, spotRate: n ? jobs.filter((j) => j.spot).length / n : null, noReason: jobs.filter((j) => !j.signed && !j.x.noSign).length, reasons, people: Object.values(by).sort((a, b) => b.jobs - a.jobs) };
}
// ---------- supplier claims (v0.9 #6) ----------
// PI TQ-PI-20260808 (memory kora-bom-supplier-conversations.md:31 · kora-preorder-review-2026-09-17.md:87):
// condition 7 "Buyer inspection within 14 days after goods receipt" · condition 4 "Defective DOA goods or faulty parts within 30 days after
// installation will be replaced or credited under this order." → the claim deadline follows the one that applies.
export const CLAIM = { inspectDays: 14, doaDays: 30 };
export const CLAIM_BASIS = ['On arrival (PI 7 · 14 days)', 'After install (PI 4 · 30 days)'];
export const CLAIM_PROBLEMS = ['Broken in transit', 'Does not work', 'Leak', 'Missing part', 'Other'];
export const CLAIM_RESULTS = ['Waiting', 'Replaced', 'Credited', 'Refused'];
export function claimDeadline(c) {
  if (c.basis === CLAIM_BASIS[1] && isDate(c.installDate)) return addDays(c.installDate, CLAIM.doaDays);
  if (c.basis === CLAIM_BASIS[0] && isDate(c.arrivalDate)) return addDays(c.arrivalDate, CLAIM.inspectDays);
  return null;
}
// open claims (with their deadline), credits not yet taken off an order, results
export function claimStats(claims, today) {
  const all = (claims || []).map((c) => { const by = claimDeadline(c); const open = !isDate(c.closedDate) && (!c.result || c.result === 'Waiting');
    return { c, by, open, found: c.foundDate || '', inTime: by ? String(c.foundDate || c.sentDate || '') <= by : null, notSentLate: open && !isDate(c.sentDate) && !!by && by < today, dueSoon: open && !isDate(c.sentDate) && !!by && by >= today && daysBetween(today, by) <= 3 }; });
  const byResult = {}; for (const x of all) { const k = x.c.result || 'Waiting'; byResult[k] = (byResult[k] || 0) + 1; }
  const creditOpen = all.filter((x) => x.c.result === 'Credited' && x.c.usedInOrder !== 'Yes').reduce((s, x) => s + (Number(x.c.creditUsd) || 0), 0);
  return { all: all.sort((a, b) => String(a.by || '9').localeCompare(String(b.by || '9'))), open: all.filter((x) => x.open), byResult, creditOpen };
}
// ---------- parts & tools (v0.9 #7) ----------
// G-1 §5-3: in the morning a person takes the parts for the day (signed receipt), in the evening returns what is left (signed);
// a lost part must be reported; a tool broken in normal use is on the company, broken by carelessness = the person pays half.
// Part names default to the PI spare lines (🟡 TQ-PI-20260808 · memory kora-preorder-review-2026-09-17) — edit them in Settings.
export const PARTS_DEFAULT = ['UV lamp 6W', 'UV quartz sleeve', 'UV ballast 6W', 'Pump', '1/4" quick fitting', '3/8" fitting / adapter', '1/4" inline ball valve', 'Angle valve', 'O-ring set', 'Tubing 1/4" (m)'];
export const PARTS_MIN = 3; // 🔴 first guess: shelf below this = order more (Settings)
export const TOOL_STATUS = ['OK', 'Needs repair', 'Broken', 'Lost'];
export const TOOL_FAULT = ['Normal use (company pays)', 'Carelessness (person pays half · G-1 §5-3)'];
// parts each person holds = issued − returned − used on their finished visits (from the bag)
export function partsWithPeople(stockMoves, visits) {
  const out = {}; const add = (who, part, n) => { if (!who || !part) return; const w = (out[who] = out[who] || {}); w[part] = (w[part] || 0) + n; };
  for (const s of stockMoves || []) { if (!String(s.item || '').startsWith('Part: ')) continue; const part = s.item.slice(6); const q = Number(s.qty) || 0; if (s.type === 'Issue') add(s.person, part, q); if (s.type === 'Return') add(s.person, part, -q); }
  for (const v of visits || []) if (String(v.status || '').includes('Completed') && v.issuedFrom !== 'shelf') for (const p of v.parts || []) add(v.technician, p, -1);
  return out;
}
export function toolShare(t) { return t && t.fault === TOOL_FAULT[1] && Number(t.repairCost) > 0 ? Math.round(Number(t.repairCost) / 2) : 0; }
// ---------- payroll (v0.9 #9) ----------
// 🟡 SSF: employee 11% + employer 20% of basic salary (Embassy FDI seminar slides 21–22 · memory nepal-fdi-seminar-2026.md:21)
// 🟡 minimum wage NPR 19,550 a month (same file :31) · 🟡 Dashain bonus = one month (:30)
// G-1 §5-2 field staff NPR 15,000–20,000 — [conflict] its low end is below that minimum wage (Jun decides)
// 🔴 income tax (TDS) = the table the CA gives, typed into Settings — the app never guesses tax brackets. No salaries before the work permit.
export const PAY = { ssfEmployee: 0.11, ssfEmployer: 0.2, minWage: 19550, g1Low: 15000, g1High: 20000 };
export function parseTaxTable(text) {
  const rows = [];
  for (const ln of String(text || '').split('\n')) { const m = ln.trim().match(/^(\d[\d,]*|rest)[\s,:]+(\d+(?:\.\d+)?)\s*%?$/i); if (m) rows.push({ upTo: /rest/i.test(m[1]) ? Infinity : Number(m[1].replace(/,/g, '')), rate: Number(m[2]) / 100 }); }
  return rows.sort((a, b) => a.upTo - b.upTo);
}
// 🟢 Inland Revenue Department — tax rates for natural persons FY 2083/84 (single = couple): https://ird.gov.np/content/13609/tax-rate-for-natural-persons-for-the/
// The 1% band is the social security tax: not charged to SSF contributors (same notice). Settings → the CA's table replaces it.
export const TAX_DEFAULT = '1000000, 1\n1500000, 10\n2500000, 20\n4000000, 27\nrest, 29';
export function annualTax(income, table) { let tax = 0, prev = 0; for (const r of table || []) { if (income <= prev) break; tax += (Math.min(income, r.upTo) - prev) * r.rate; prev = r.upTo; } return tax; }
export function payslip(person, o = {}) {
  const basic = Number(person.basic) || 0, allow = Number(person.allowance) || 0, bonus = Number(o.bonus) || 0, extra = Number(o.extra) || 0;
  const gross = basic + allow + bonus + extra; const ssf = person.ssf === 'Yes';
  const ssfE = ssf ? Math.round(basic * PAY.ssfEmployee) : 0, ssfR = ssf ? Math.round(basic * PAY.ssfEmployer) : 0;
  const own = String(o.taxTable || '').trim(); const table0 = parseTaxTable(own || TAX_DEFAULT);
  const sstFree = ssf && table0.length > 0 && table0[0].rate === 0.01; /* SSF members pay no 1% social security tax band */
  const table = sstFree ? [{ ...table0[0], rate: 0 }, ...table0.slice(1)] : table0; const reg = (basic + allow - ssfE) * 12; /* 🔴 regular pay × 12; a one-off bonus is added once on top — the CA checks the year */
  const tds = table.length ? Math.round(annualTax(reg, table) / 12 + (annualTax(reg + bonus + extra, table) - annualTax(reg, table))) : null;
  return { basic, allow, bonus, extra, gross, ssfE, ssfR, tds, net: gross - ssfE - (tds || 0), cost: gross + ssfR, belowMin: basic + allow < PAY.minWage, taxMissing: !table.length, taxDefault: !own, sstFree, noRest: table.length > 0 && table[table.length - 1].upTo !== Infinity };
}
// Dashain bonus suggestion: one month's basic, pro-rated by months worked in the last 12 (🔴 the pro-rating is a guess — ask the CA)
export function dashainBonus(person, onDate) {
  const b = Number(person.basic) || 0; if (!isDate(person.startDate)) return b;
  return Math.round(b * Math.min(12, Math.max(0, monthsBetween(person.startDate, onDate))) / 12);
}
// ---------- raw-water E. coli vials (v0.9 #10) ----------
// Jun 2026-09-29 "ㅇㅇ": in the PoC every second install (~25 homes), spread over water sources — a cheap vial on the kitchen tap before the unit goes on.
// 🚨 Our own check only (memory kora-uv-disinfection-decision.md:137): never tell a customer the water is safe or unsafe from it — only a lab result is said out loud.
// ENPHO before/after test needs raw water with E. coli (:75–76) · municipal water (the UV module works below hardness 120 mg/L — kora-uv-6w-verdict-2026-09-22.md:32;
// bore wells in central Pokhara measured 300–320 — kora-pokhara-water-sources-2026-09-25.md) · within 30 days of the install (PI condition 4 — kora-uv-disinfection-decision.md:78).
export const VIAL_RESULTS = ['Black — faecal contamination', 'No change', 'Spoiled — redo']; // P/A (H2S) vial from ENPHO (ECC discontinued, 2026-09-30) · black after ~48 h at room temperature
export const VIAL = { target: 25, enphoDays: 30, readAfterDays: 2 };
// 95% range for a share (Wilson) — honest about small samples
export function wilson(k, n, z = 1.96) {
  if (!n) return null; const p = k / n; const d = 1 + (z * z) / n; const c = (p + (z * z) / (2 * n)) / d; const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}
export function vialStats(tests, customers, today) {
  const byC = new Map((customers || []).map((c) => [c.id, c])); const all = tests || [];
  const read = all.filter((t) => t.result && t.result !== VIAL_RESULTS[2]); const pos = read.filter((t) => t.result === VIAL_RESULTS[0]);
  const group = (keyOf) => { const g = {}; for (const t of read) { const k = keyOf(byC.get(t.customerId) || {}) || 'Unknown'; const r = (g[k] = g[k] || { n: 0, pos: 0 }); r.n++; if (t.result === VIAL_RESULTS[0]) r.pos++; } return g; };
  const enpho = pos.map((t) => ({ t, c: byC.get(t.customerId) })).filter((x) => x.c && x.c.status === 'Active' && x.c.waterSource === 'Municipal tap' && isDate(x.c.installDate) && daysBetween(x.c.installDate, today) <= VIAL.enphoDays)
    .map((x) => ({ ...x, until: addDays(x.c.installDate, VIAL.enphoDays) }));
  return { started: all.length, n: read.length, pos: pos.length, rate: read.length ? pos.length / read.length : null, ci: wilson(pos.length, read.length),
    waiting: all.filter((t) => !t.result), toRead: all.filter((t) => !t.result && isDate(t.sampledDate) && daysBetween(t.sampledDate, today) >= VIAL.readAfterDays), bySource: group((c) => c.waterSource), byTole: group((c) => c.tole === 'Other' ? c.toleOther : c.tole), enpho };
}
export function chaseStats(checkins, payments, from, today) {
  const log = chaseLog(checkins).filter((q) => !from || q.date >= from);
  const talked = log.filter((q) => q.reached === 'Talked').length;
  const proms = log.filter((q) => isDate(q.promiseDate)).map((q) => promiseOf([q], payments, today));
  const n = (s) => proms.filter((p) => p.status === s).length;
  const judged = proms.length - n('waiting');
  return { tries: log.length, talked, reachRate: log.length ? talked / log.length : null, promises: proms.length, waiting: n('waiting'), kept: n('kept'), late: n('late'), broken: n('broken'), keptRate: judged ? n('kept') / judged : null };
}

// ---------- visits & filters ----------
const completed = (v) => String(v.status || '').includes('Completed');
// a trip where nobody was home (or no access) — the visit is still owed; "try again on" moves the next visit
export const isNoShow = (v) => String((v && v.status) || '').includes('Nobody home');
export function customerVisits(visits, cid) { return (visits || []).filter((v) => v.customerId === cid).sort((a, b) => String(a.date).localeCompare(String(b.date))); }

// Next routine visit: what the technician entered at the last completed visit (G-1 §2-3) — else the rule
// (monthly for the first 6 months after install, quarterly after).
export function nextVisit(customer, cVisits) {
  if (!customer || !isDate(customer.installDate)) return null;
  const done = cVisits.filter(completed);
  const last = done[done.length - 1];
  const miss = cVisits.filter((v) => isNoShow(v) && isDate(v.retryDate) && (!last || String(v.date).slice(0, 10) > String(last.date).slice(0, 10))).pop(); // same day: the completed visit wins
  if (miss) return { date: miss.retryDate, source: `trying again — nobody home on ${String(miss.date).slice(0, 10)}`, noShow: miss };
  if (last && isDate(last.nextVisitDate)) return { date: last.nextVisitDate, source: 'entered at last visit' };
  const base = last ? last.date : customer.installDate;
  const step = monthsBetween(customer.installDate, base) < VISIT_RULE.monthlyUntilMonth ? 1 : VISIT_RULE.laterEveryMonths;
  return { date: addMonths(base, step), source: step === 1 ? 'monthly (first 6 months)' : 'quarterly' };
}
export function suggestNextVisit(installDate, visitDate) {
  if (!isDate(installDate) || !isDate(visitDate)) return '';
  return addMonths(visitDate, monthsBetween(installDate, visitDate) < VISIT_RULE.monthlyUntilMonth ? 1 : VISIT_RULE.laterEveryMonths);
}
// PP interval: 3 months if the 3-month mark lands in the monsoon (Jun–Sep), else 4 (E-2).
export function ppMonths(lastChange) { const m = parseD(addMonths(lastChange, PP_MONSOON_MONTHS)).getMonth() + 1; return m >= 6 && m <= 9 ? PP_MONSOON_MONTHS : FILTER_MONTHS.PP; }

// v0.14 (Jun 10/3 #3): once a filter type has 5+ observed changes across all homes, its booking interval becomes the observed average (rounded to a month, 1..36)
export const LEARN_MIN = 5;
export function learnedMonths(customers, visits, on = true) {
  const out = { ...FILTER_MONTHS }; if (!on) return out;
  for (const r of filterLearning(customers, visits)) { if (r.n >= LEARN_MIN && r.avgMonths && FILTER_MONTHS[r.type]) out[r.type] = Math.max(1, Math.min(36, Math.round(r.avgMonths))); }
  return out;
}
// v0.15 filters-together (Jun 10/3 "모든 필터 한번에 해야지 pp 따로 cto 따로 이건 아닌듯"): one filter visit, not one per filter.
// The next change = the earliest due filter; every filter that would fall due before the change after that goes in on the same visit.
export function filterBatch(fd, months = FILTER_MONTHS) {
  const real = (fd || []).filter((f) => f.due && f.type !== 'Sanitise' && (months[f.type] || FILTER_MONTHS[f.type]));
  if (!real.length) return null;
  const first = real.slice().sort((a, b) => String(a.due).localeCompare(String(b.due)))[0];
  const horizon = addMonths(first.due, months[first.type] || FILTER_MONTHS[first.type]);
  const types = FILTER_TYPES.filter((t) => real.some((f) => f.type === t && f.due < horizon));
  return { date: first.due, types, horizon, status: first.status, lead: first.type };
}
export function filterDues(customer, cVisits, today, months = FILTER_MONTHS) {
  const res = [];
  if (!customer || !isDate(customer.installDate)) return res;
  const done = cVisits.filter(completed);
  for (const type of FILTER_TYPES) {
    const changes = done.filter((v) => (v.filters || []).includes(type)).map((v) => v.date);
    const last = changes.length ? changes[changes.length - 1] : customer.installDate;
    const m = type === 'PP' ? ppMonths(last) : months[type];
    let due = m ? addMonths(last, m) : null, why = m ? `${m} months after ${changes.length ? 'last change' : 'install'}` : 'no booking interval — observe';
    if (type === 'PP') {
      const seen = cVisits.filter((v) => v.date >= last && ['Brown', 'Black'].includes(v.ppColor) && !(v.filters || []).includes('PP'));
      if (seen.length) { due = seen[seen.length - 1].date; why = `PP looked ${seen[seen.length - 1].ppColor.toLowerCase()} on ${due} — replace now (E-2)`; }
    }
    const status = !due ? 'none' : due < today ? 'overdue' : due <= addDays(today, 14) ? 'soon' : 'ok';
    res.push({ type, last, lastIsInstall: !changes.length, due, status, why, changes: changes.length });
  }
  const san = done.filter((v) => v.visitType === 'Sanitisation' || v.sanitised === 'Yes').map((v) => v.date);
  const sLast = san.length ? san[san.length - 1] : customer.installDate;
  const sDue = addMonths(sLast, SANITIZE_MONTHS);
  res.push({ type: 'Sanitise', last: sLast, lastIsInstall: !san.length, due: sDue, status: sDue < today ? 'overdue' : sDue <= addDays(today, 14) ? 'soon' : 'ok', why: 'every 3 months (E-2)', changes: san.length });
  return res;
}
// #9 learning: observed days between consecutive changes, per filter type, across all households.
export function filterLearning(customers, visits) {
  const acc = {};
  for (const c of customers) {
    const done = customerVisits(visits, c.id).filter(completed);
    for (const type of FILTER_TYPES) {
      const dates = [c.installDate, ...done.filter((v) => (v.filters || []).includes(type)).map((v) => v.date)].filter(isDate);
      for (let i = 1; i < dates.length; i++) { (acc[type] = acc[type] || []).push(daysBetween(dates[i - 1], dates[i])); }
    }
  }
  return FILTER_TYPES.map((type) => {
    const xs = acc[type] || []; const n = xs.length;
    const avg = n ? xs.reduce((s, x) => s + x, 0) / n : null;
    return { type, n, avgDays: avg, avgMonths: avg ? avg / 30.44 : null, bookingMonths: FILTER_MONTHS[type] };
  });
}

// ---------- onboarding & calls ----------
export function onboarding(customer, checkins, today) {
  if (!customer || !isDate(customer.installDate)) return [];
  const mine = (checkins || []).filter((x) => x.customerId === customer.id);
  const rows = ONBOARD.map((o) => {
    const due = addDays(customer.installDate, o.days);
    const done = mine.find((x) => x.kind === o.k);
    return { ...o, due, done: done || null, status: done ? 'done' : due > today ? 'future' : daysBetween(due, today) > 3 ? 'overdue' : 'due' };
  });
  return rows;
}

// ---------- service requests: G-1 §2-4 response/visit deadlines ----------
// Weekday 09–17 → reply in 2h, visit same/next day · weekday after 17 → reply same day, visit next day ·
// holiday (Saturday) → reply next morning, visit next day or the day after. Before 09 is treated as 09 (our reading).
export function requestSla(receivedMs, isHoliday = (d) => d.getDay() === 6) {
  const t = new Date(receivedMs); const h = t.getHours() + t.getMinutes() / 60;
  const endOf = (d, plus) => { const x = new Date(d); x.setDate(x.getDate() + plus); x.setHours(23, 59, 0, 0); return x.getTime(); };
  const at = (d, plus, hh) => { const x = new Date(d); x.setDate(x.getDate() + plus); x.setHours(hh, 0, 0, 0); return x.getTime(); };
  if (isHoliday(t)) return { replyBy: at(t, 1, 12), visitBy: endOf(t, 2), rule: 'holiday' };
  if (h >= 17) return { replyBy: endOf(t, 0), visitBy: endOf(t, 1), rule: 'after 17:00' };
  if (h < 9) return { replyBy: at(t, 0, 11), visitBy: endOf(t, 1), rule: 'before 09:00' };
  return { replyBy: receivedMs + 2 * 3600e3, visitBy: endOf(t, 1), rule: 'office hours' };
}

// ---------- referrals: G-1 §4 ----------
// v0.15 (Jun 10/3): only during a campaign, only the referrer — half a month off a bill, 3 months after the new home signed up,
// and only once that home is installed and its install fee is paid (§4-2). The new home gets nothing (G-1 §4 to update).
export const REFERRAL_SHARE = 0.5; /* v0.15: the referrer gets half a month off (Tara 10/3 "한 달 무료는 너무 퍼주는거" → Jun "50% 추천인 쿠폰") */
export const referralAmount = () => Math.round(PRICES.monthly * REFERRAL_SHARE);
// on = Settings "Referral campaign" — off (the default) means no rewards, no card, no page: the campaign is switched on only when installs slow down (Jun 10/3)
export function referralRewards(customers, payments, ledgers, today, on = true) {
  const out = []; if (!on) return out;
  const byId = new Map(customers.map((c) => [c.id, c]));
  const credited = (cid, forId) => payments.some((p) => p.type === 'Referral credit' && p.customerId === cid && p.referralFor === forId);
  for (const c of customers) {
    if (!c.referrerId || !byId.has(c.referrerId)) continue;
    const r = byId.get(c.referrerId); const led = ledgers.get(c.id);
    const feePaid = !!(led && led.paidThrough >= 1);
    /* v0.15: only the referrer is rewarded (50% of a month); the new customer's own free month is gone */
    const due = addMonths(c.signUpDate || c.installDate, 3);
    out.push({ who: r, forId: c.id, role: 'referrer', due, amount: referralAmount(), ready: feePaid && due <= today, waiting: !feePaid ? 'install fee not paid yet' : due > today ? `from ${due}` : '', done: credited(r.id, c.id) });
  }
  return out;
}

// ---------- deposits (#4) ----------
export function depositBook(customers, ledgers, recoveries) {
  const rows = customers.map((c) => {
    const led = ledgers.get(c.id); const collected = led ? led.depositCollected : 0;
    const rec = (recoveries || []).filter((r) => r.customerId === c.id);
    const refunded = rec.reduce((s, r) => s + (moneyEffective(r) ? Number(r.depositRefunded) || 0 : 0), 0);
    const forfeited = rec.reduce((s, r) => s + (Number(r.depositForfeited) || 0), 0);
    return { c, collected, refunded, forfeited, held: collected - refunded - forfeited };
  });
  const t = rows.reduce((s, r) => ({ collected: s.collected + r.collected, refunded: s.refunded + r.refunded, forfeited: s.forfeited + r.forfeited, held: s.held + r.held }), { collected: 0, refunded: 0, forfeited: 0, held: 0 });
  return { rows, total: t };
}

// ---------- VAT (#11) ----------
// Taxable = install + subscription + repair (cash part only). Deposit is not revenue until forfeited
// (lawyer R3 D2(c) in G-1 §1-2) → forfeited deposits are added as taxable in the month they are recorded.
// Penalty kept separate (treatment not confirmed — ask the CA).
export function vatByMonth(payments, ledgers, recoveries) {
  const m = {};
  const row = (k) => (m[k] = m[k] || { month: k, cash: 0, taxable: 0, deposit: 0, penalty: 0, forfeits: 0, credits: 0 });
  for (const p of payments) {
    const led = ledgers.get(p.customerId); const sp = led && led.splits[p.id]; if (!sp) continue;
    const r = row(monthKey(p.date));
    if (p.type === 'Referral credit') { r.credits += Number(p.amount); continue; }
    r.cash += Number(p.amount);
    if (sp.extra !== undefined) { if (p.type === 'Penalty') r.penalty += sp.extra; else r.taxable += sp.extra; continue; }
    const s = sp.cashShare;
    r.taxable += (sp.install + sp.subscription + sp.unallocated) * s;
    r.deposit += sp.deposit * s;
  }
  for (const rc of recoveries || []) if (Number(rc.depositForfeited) > 0 && isDate(rc.closedDate || rc.startedDate)) { const r = row(monthKey(rc.closedDate || rc.startedDate)); r.forfeits += Number(rc.depositForfeited); }
  return Object.values(m).sort((a, b) => b.month.localeCompare(a.month)).map((r) => {
    const base = r.taxable + r.forfeits; const vat = base * VAT_RATE / (1 + VAT_RATE);
    return { ...r, vat, net: base - vat };
  });
}

// ---------- dashboard metrics (#10) ----------
export function metrics(D, ledgers, today, settings = {}) {
  const customers = D.customers; const lead = Number(settings.leadTimeWeeks) || FCL.leadTimeWeeks;
  const installed = customers.filter((c) => isDate(c.installDate) && c.installDate <= today);
  const active = installed.filter((c) => (c.status || 'Active') === 'Active');
  const paused = installed.filter((c) => c.status === 'Paused');
  const churned = installed.filter((c) => c.status === 'Churned');
  // installs per week, last 12 weeks (week 0 = the 7 days ending today)
  const weeks = Array.from({ length: 12 }, (_, i) => ({ i, from: addDays(today, -7 * (i + 1) + 1), to: addDays(today, -7 * i), n: 0 })).reverse();
  for (const c of installed) for (const w of weeks) if (c.installDate >= w.from && c.installDate <= w.to) w.n++;
  const avg4w = weeks.slice(-4).reduce((s, w) => s + w.n, 0) / 4;
  // exposure (household-months) and churn
  let exposure = 0;
  for (const c of installed) { const end = c.status === 'Churned' && isDate(c.churnDate) ? c.churnDate : today; exposure += Math.max(0, daysBetween(c.installDate, end)) / 30.44; }
  const churnEvents = churned.length;
  const churnRate = exposure > 0 ? churnEvents / exposure : null;
  // 90-day retention
  const cohort = installed.filter((c) => c.installDate <= addDays(today, -90));
  const kept = cohort.filter((c) => !(c.status === 'Churned' && isDate(c.churnDate) && daysBetween(c.installDate, c.churnDate) < 90));
  const retention = cohort.length ? kept.length / cohort.length : null;
  // collection (bill count based, due bills only)
  let billsDue = 0, billsPaid = 0, onTime = 0, overdueAmt = 0, overdueHH = 0, due7 = 0;
  for (const c of installed) { const l = ledgers.get(c.id); if (!l) continue; billsDue += l.billsDue; billsPaid += l.billsPaid; onTime += l.billsPaidOnTime; overdueAmt += l.overdue; if (l.overdue > 0) overdueHH++; if (l.daysOverdue >= 7) due7++; }
  const collection = billsDue ? billsPaid / billsDue : null;
  // money this month
  const mk = monthKey(today);
  const cashThisMonth = D.payments.filter((p) => monthKey(p.date) === mk && !isNonCash(p)).reduce((s, p) => s + Number(p.amount || 0), 0);
  let mrr = 0; for (const c of active) { const l = ledgers.get(c.id); if (l && l.nextBill) mrr += l.nextBill.k === 1 ? PRICES.monthly : l.nextBill.amount; }
  // stock: devices = stock moves − installs · filters = moves − used in completed visits
  const stock = {};
  for (const s of D.stockMoves) { const q = Number(s.qty) || 0; const sign = ['Out', 'Disposal', 'Issue'].includes(s.type) ? -1 : 1; stock[s.item] = (stock[s.item] || 0) + sign * q; }
  stock.Device = (stock.Device || 0) - installed.length;
  for (const v of D.visits) if (completed(v)) for (const f of v.filters || []) stock[f] = (stock[f] || 0) - 1;
  for (const v of D.visits) if (completed(v)) for (const p of v.parts || []) stock['Part: ' + p] = (stock['Part: ' + p] || 0) - (v.issuedFrom === 'shelf' ? 1 : 0); /* v0.9 #7: parts taken from a person's bag were already issued */
  const fclThreshold = avg4w * lead;
  const repeat = repeatedDefects(D.requests, today);
  const fcl = {
    stockDevices: stock.Device, threshold: fclThreshold, avg4w, leadTimeWeeks: lead,
    stockSignal: avg4w > 0 && stock.Device <= fclThreshold,
    billsOk: billsDue >= FCL.minBills, collectionOk: collection !== null && collection >= FCL.minCollection, defectsOk: !repeat.length, repeat,
  };
  fcl.ready = fcl.stockSignal && fcl.billsOk && fcl.collectionOk && fcl.defectsOk;
  const gate = {
    churn: { value: churnRate, trigger: GATE.churnMonthly, bad: churnRate !== null && churnRate > GATE.churnMonthly, exposure, need: GATE.churnExposure, judgeable: exposure >= GATE.churnExposure },
    retention: { value: retention, trigger: GATE.retention90, bad: retention !== null && retention < GATE.retention90, n: cohort.length, need: GATE.retentionMinCohort, judgeable: cohort.length >= GATE.retentionMinCohort },
    collection: { value: collection, trigger: GATE.collection, bad: collection !== null && collection < GATE.collection, exposure: billsDue, need: GATE.collectionExposure, judgeable: billsDue >= GATE.collectionExposure },
  };
  return { installed: installed.length, active: active.length, paused: paused.length, churned: churned.length, weeks, avg4w, exposure, churnRate, retention, cohort: cohort.length,
    billsDue, billsPaid, onTime, collection, overdueAmt, overdueHH, due7, cashThisMonth, mrr, stock, fcl, gate };
}
// "Same defect repeating" — our reading: 3+ requests of the same type in the last 90 days (breakdown / water quality / leak).
export function repeatedDefects(requests, today) {
  const since = addDays(today, -90); const n = {};
  for (const r of requests || []) if (['Breakdown', 'Water quality', 'Leak'].includes(r.type) && String(r.receivedDate || '') >= since) n[r.type] = (n[r.type] || 0) + 1;
  return Object.entries(n).filter(([, k]) => k >= 3).map(([type, k]) => ({ type, n: k }));
}

// ---------- CSV ----------
// CSV: a text cell starting with = + - @ (or a tab / return) is prefixed with ' so Excel / Sheets show it and never run it as a formula
// (names and notes are typed by staff) — plain numbers like -300 stay numbers.
export const csvSafe = (s) => (/^[=+\-@\t\r]/.test(s) && !/^[+-]?\d[\d,]*(\.\d+)?%?$/.test(s) ? "'" + s : s);
// Excel sheets: numbers stay numbers; everything else becomes plain text (objects never turn into formula cells) and is csvSafe'd
export const sheetSafe = (aoa) => aoa.map((row) => (Array.isArray(row) ? row : [row]).map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : v === null || v === undefined ? '' : csvSafe(typeof v === 'object' ? JSON.stringify(v) : String(v)))));
export function toCSV(rows, cols) {
  const q = (v) => { const s = csvSafe(v === null || v === undefined ? '' : Array.isArray(v) ? v.join('; ') : typeof v === 'object' ? JSON.stringify(v) : String(v)); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return [cols.map((c) => q(c.label || c.key)).join(','), ...rows.map((r) => cols.map((c) => q(typeof c.get === 'function' ? c.get(r) : r[c.key])).join(','))].join('\n');
}
export function parseCSV(text) {
  const t = String(text).replace(/^﻿/, ''); const first = t.split(/\r?\n/)[0] || '';
  const delim = [',', ';', '\t'].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows = []; let row = [], cell = '', inQ = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inQ) { if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else inQ = false; } else cell += ch; continue; }
    if (ch === '"') inQ = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}
// #2 bank statement matching — finds the customer by KC code or phone digits in the description; else by a unique exact amount.
export function matchBankRows(rows, map, customers, ledgers, payments) {
  const num = (s) => Number(String(s).replace(/[^\d.-]/g, ''));
  const pays = payments || [];
  return rows.map((r, i) => {
    const desc = String(r[map.desc] ?? ''); const amount = num(r[map.amount]); const date = normBankDate(r[map.date]);
    let cand = null, how = '';
    const code = desc.toUpperCase().match(/KC-[2-9A-Z]{4}/);
    if (code) { cand = customers.find((c) => c.code === code[0]); how = cand ? 'KC code' : ''; }
    if (!cand) { const digits = desc.replace(/\D/g, ''); cand = customers.find((c) => c.phone && digits.includes(c.phone.slice(-10))); how = cand ? 'phone' : ''; }
    if (!cand && amount > 0) { const hits = customers.filter((c) => { const l = ledgers.get(c.id); return l && (l.overdue === amount || (l.nextBill && l.nextBill.amount - l.nextBill.paid === amount)); }); if (hits.length === 1) { cand = hits[0]; how = 'amount (unique)'; } }
    const dup = cand && date ? pays.some((p) => p.customerId === cand.id && Math.abs((Number(p.amount) || 0) - amount) < 0.5 && isDate(p.date) && Math.abs(daysBetween(p.date, date)) <= 3) : false; /* v0.11.1 (#15): same home · same amount · within 3 days = already in the book */
    return { i, date, amount, desc, customer: cand, how, dup };
  });
}
function normBankDate(s) {
  const t = String(s || '').trim(); let m;
  if ((m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  if ((m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/))) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`; // DD/MM/YYYY
  return '';
}

// ---------- IRD sales book (बिक्री खाता) ----------
// Columns follow the IRD format from FY 2078/79 (rule 23(1)(ज)) — copy of the IRD Excel via Baker Tilly Nepal (🟡 2nd-hand):
// मिति · बीजक नम्बर · खरिदकर्ताको नाम · खरिदकर्ताको स्थायी लेखा नम्बर · वस्तु वा सेवाको नाम · परिमाण · इकाइ ·
// जम्मा बिक्री/निकासी · स्थानीय कर छुटको बिक्री मूल्य · करयोग्य बिक्री (मूल्य · कर) · निकासी (मूल्य · देश · प्रज्ञापनपत्र नम्बर · मिति).
// "Total sales" is taken WITHOUT VAT (🟡 2nd-hand reading — confirm with the CA). Our prices include VAT → value = amount ÷ 1.13.
// Basis = payment date (cash basis, same as vatByMonth — confirm with the CA). Deposit is not a sale until forfeited.
// Penalty and referral credits are left out and listed apart. The app does not issue tax invoices: billNo is the number
// of the VAT bill actually given to the customer (bill book / approved billing software).
const r2 = (x) => Math.round(x * 100) / 100;
export function salesBook(payments, ledgers, custById, recoveries, from, to) {
  const rows = [], skipped = [], penalties = []; let depositOut = 0;
  const inR = (d) => isDate(d) && d.slice(0, 10) >= from && d.slice(0, 10) <= to;
  const push = (o) => { const value = r2(o.inc / (1 + VAT_RATE)); rows.push({ ...o, total: value, exempt: 0, taxable: value, vat: r2(o.inc - value) }); };
  for (const p of payments) {
    if (!inR(p.date)) continue;
    const c = custById.get(p.customerId) || {};
    if (isNonCash(p)) { skipped.push({ p, c, why: p.type === 'Referral credit' ? 'referral credit — no cash' : 'service credit — no cash' }); continue; }
    const led = ledgers.get(p.customerId); const sp = led && led.splits[p.id];
    if (!sp) { skipped.push({ p, c, why: 'customer not found' }); continue; }
    if (sp.extra !== undefined && p.type === 'Penalty') { penalties.push({ p, c, amount: sp.extra }); continue; }
    const base = { date: p.date, billNo: String(p.billNo || '').trim(), buyer: c.name || '', buyerPan: String(c.buyerPan || '').trim(), code: c.code || '', id: p.id, method: p.method || '', ref: p.ref || '', cash: Number(p.amount) || 0 };
    if (sp.extra !== undefined) { push({ ...base, inc: sp.extra, item: 'Water purifier repair / service', qty: 1, unit: 'job', deposit: 0 }); continue; }
    const s = sp.cashShare; const inst = sp.install * s, sub = (sp.subscription + sp.unallocated) * s, dep = sp.deposit * s;
    depositOut += dep;
    if (inst + sub < 0.005) { skipped.push({ p, c, why: 'deposit only — not a sale' }); continue; }
    const item = inst > 0.005 && sub > 0.005 ? 'Water purifier installation + subscription' : inst > 0.005 ? 'Water purifier installation (incl. first month)' : 'Water purifier subscription';
    const qty = inst > 0.005 && sub > 0.005 ? 1 : inst > 0.005 ? 1 : r2(sub / PRICES.monthly);
    push({ ...base, inc: inst + sub, item, qty, unit: inst > 0.005 && sub > 0.005 ? 'job' : inst > 0.005 ? 'job' : 'month', deposit: dep });
  }
  for (const rc of recoveries || []) {
    const d = rc.closedDate || rc.startedDate; const amt = Number(rc.depositForfeited) || 0;
    if (amt > 0 && inR(d)) { const c = custById.get(rc.customerId) || {}; push({ date: d, billNo: String(rc.billNo || '').trim(), buyer: c.name || '', buyerPan: String(c.buyerPan || '').trim(), code: c.code || '', id: rc.id, method: '', ref: 'forfeited deposit', cash: 0, inc: amt, item: 'Forfeited deposit (taxable when forfeited)', qty: 1, unit: 'job', deposit: 0 }); }
  }
  rows.sort((a, b) => a.date.localeCompare(b.date) || String(a.billNo).localeCompare(String(b.billNo), undefined, { numeric: true }));
  const sum = (k) => r2(rows.reduce((s, r) => s + (Number(r[k]) || 0), 0));
  const bills = rows.map((r) => r.billNo).filter(Boolean); const dup = bills.filter((b, i) => bills.indexOf(b) !== i);
  return { rows, totals: { total: sum('total'), exempt: 0, taxable: sum('taxable'), vat: sum('vat'), cash: sum('cash'), deposit: r2(depositOut) },
    missingBill: rows.filter((r) => !r.billNo).length, duplicateBills: [...new Set(dup)], penalties, skipped };
}

// ---------- history: the data as it stood at the end of a past day ----------
// Customers who left later count as active then. A customer paused today: when the pause started is not stored,
// so past months show them as active (said on screen).
const msOfTs = (x) => (x && x.toMillis ? x.toMillis() : Number(x) || 0);
export function snapshotAt(D, end) {
  const le = (s) => isDate(s) && s.slice(0, 10) <= end;
  const endMs = parseD(end).getTime() + 864e5 - 1;
  const customers = D.customers.filter((c) => le(c.installDate)).map((c) => {
    if (c.status === 'Churned' && !le(c.churnDate)) return { ...c, status: 'Active' };
    if (c.status === 'Paused') return { ...c, status: 'Active', _pauseUnknown: true };
    return c;
  });
  return {
    customers, payments: D.payments.filter((p) => le(p.date)), visits: D.visits.filter((v) => le(v.date)),
    requests: D.requests.filter((r) => le(r.receivedDate || String(r.receivedAt || ''))), checkins: D.checkins.filter((x) => le(x.date)),
    recoveries: D.recoveries.filter((r) => le(r.startedDate)), stockMoves: D.stockMoves.filter((s) => le(s.date)), trainings: (D.trainings || []).filter((t) => le(t.date)),
    leads: D.leads.filter((l) => { const t = msOfTs(l.createdAt) || Number(l._localT) || 0; return !t || t <= endMs; }),
  };
}
// What happened inside one period (activity, not state).
export function periodActivity(D, from, to) {
  const inR = (d) => isDate(d) && d.slice(0, 10) >= from && d.slice(0, 10) <= to;
  const pays = D.payments.filter((p) => inR(p.date));
  const byType = {}; for (const p of pays) byType[p.type] = (byType[p.type] || 0) + (Number(p.amount) || 0);
  const vis = D.visits.filter((v) => inR(v.date) && completed(v));
  const filt = {}; for (const v of vis) for (const f of v.filters || []) filt[f] = (filt[f] || 0) + 1;
  const vType = {}; for (const v of vis) vType[v.visitType || 'Visit'] = (vType[v.visitType || 'Visit'] || 0) + 1;
  const reqIn = D.requests.filter((r) => inR(r.receivedDate || String(r.receivedAt || '')));
  return {
    installs: D.customers.filter((c) => inR(c.installDate)), churns: D.customers.filter((c) => c.status === 'Churned' && inR(c.churnDate)),
    payments: pays, cash: pays.filter((p) => !isNonCash(p)).reduce((s, p) => s + (Number(p.amount) || 0), 0), byType,
    visits: vis, visitTypes: vType, filters: filt, sanitised: vis.filter((v) => v.visitType === 'Sanitisation' || v.sanitised === 'Yes').length,
    requestsIn: reqIn, requestsDone: D.requests.filter((r) => r.status === 'Done' && inR(r.doneDate)),
    checkins: D.checkins.filter((x) => inR(x.date)), recoveries: D.recoveries.filter((r) => inR(r.startedDate)),
  };
}

// ---------- money: aging & 30-day outlook ----------
export const AGING = [[0, 0, 'Due today'], [1, 7, '1–7 days'], [8, 30, '8–30 days'], [31, 60, '31–60 days'], [61, 90, '61–90 days'], [91, 1e9, '90+ days']];
export function agingBuckets(ledgers, activeIds, today) {
  const out = AGING.map(([a, b, label]) => ({ from: a, to: b, label, amount: 0, bills: 0, homes: new Set() }));
  for (const id of activeIds) {
    const l = ledgers.get(id); if (!l) continue;
    for (const b of l.bills) {
      if (b.status === 'paid' || b.due > today) continue;
      const age = daysBetween(b.due, today); const k = out.find((x) => age >= x.from && age <= x.to); if (!k) continue;
      k.amount += b.amount - b.paid; k.bills++; k.homes.add(id);
    }
  }
  return out.map((x) => ({ ...x, homes: x.homes.size }));
}
// Bills falling due in the next `days` days (after what is already paid), per week.
export function cashOutlook(customers, ledgers, today, days = 28) {
  const weeks = Array.from({ length: Math.ceil(days / 7) }, (_, i) => ({ i, from: addDays(today, 7 * i + 1), to: addDays(today, 7 * (i + 1)), amount: 0, bills: 0 }));
  for (const c of customers) {
    if ((c.status || 'Active') !== 'Active' || !isDate(c.installDate)) continue;
    const l = ledgers.get(c.id); if (!l || !l.nextBill) continue;
    const BD = billDays(c);
    for (let k = l.nextBill.k; k < l.nextBill.k + 3; k++) {
      const due = BD.dues[k - 1]; if (due <= today) continue; if (due > addDays(today, days)) break;
      const b = k === l.nextBill.k ? { amount: l.nextBill.amount - (l.nextBill.paid || 0) } : billAmount(k);
      const w = weeks.find((x) => due >= x.from && due <= x.to); if (w && b.amount > 0.01) { w.amount += b.amount; w.bills++; }
    }
  }
  return weeks;
}

// ---------- cohorts: share of each install month still with us N months later ----------
export function cohortRetention(customers, today, maxMonths = 12) {
  const by = {};
  for (const c of customers) if (isDate(c.installDate) && c.installDate <= today) (by[monthKey(c.installDate)] = by[monthKey(c.installDate)] || []).push(c);
  return Object.keys(by).sort().map((mk) => {
    const cs = by[mk]; const cells = [];
    for (let k = 0; k <= maxMonths; k++) {
      const elig = cs.filter((c) => addMonths(c.installDate, k) <= today); if (!elig.length) break;
      const kept = elig.filter((c) => !(c.status === 'Churned' && isDate(c.churnDate) && c.churnDate <= addMonths(c.installDate, k)));
      cells.push({ k, n: elig.length, kept: kept.length, v: kept.length / elig.length });
    }
    return { month: mk, n: cs.length, cells };
  });
}

// ---------- field: who did what · what filters are coming ----------
export function techBoard(D, from, to) {
  const inR = (d) => isDate(d) && d.slice(0, 10) >= from && d.slice(0, 10) <= to; const t = {};
  const row = (n) => (t[n || '—'] = t[n || '—'] || { name: n || '—', visits: 0, filters: 0, repairs: 0, installs: 0, requests: 0, minutes: 0, timed: 0, days: new Set(), noShows: 0 });
  for (const v of D.visits) if (inR(v.date) && isNoShow(v)) { const r = row(v.technician); r.noShows++; r.days.add(v.date.slice(0, 10)); } // a wasted trip is still a day out
  for (const v of D.visits) if (inR(v.date) && completed(v)) { const r = row(v.technician); r.visits++; r.filters += (v.filters || []).length; if (v.visitType === 'Repair') r.repairs++; if (Number(v.durationMin) > 0) { r.minutes += Number(v.durationMin); r.timed++; } r.days.add(v.date); }
  for (const c of D.customers) if (inR(c.installDate)) { const r = row(c.agent); r.installs++; r.days.add(c.installDate); }
  for (const q of D.requests) if (q.status === 'Done' && inR(q.doneDate)) row(q.agent).requests++;
  return Object.values(t).map((r) => ({ ...r, days: r.days.size, avgMin: r.timed ? r.minutes / r.timed : null, perDay: r.days.size ? (r.visits + r.installs) / r.days.size : 0 })).sort((a, b) => (b.visits + b.installs) - (a.visits + a.installs));
}
// Filter dues inside the next `days` days (overdue included), per type and per month — for ordering stock.
export function filterDemand(dues, today, days = 90) {
  const end = addDays(today, days); const types = {}; const months = {};
  for (const f of dues) {
    if (!f.due || f.type === 'Sanitise' || f.due > end) continue;
    types[f.type] = (types[f.type] || 0) + 1;
    const mk = f.due < today ? 'overdue' : monthKey(f.due); months[mk] = months[mk] || {}; months[mk][f.type] = (months[mk][f.type] || 0) + 1;
  }
  return { types, months };
}

// ---------- filter order dates: when stock runs out → order-by date (lead time + safety) and how many ----------
// Demand = every active home's next due per filter, then every booking interval after it (E-2: PP 4 / monsoon 3 · CTO 8 · UF 24 · UV 12 months),
// plus new homes at the current 4-week install pace (their first change one interval after install).
// Lead time, safety weeks and cover months are settings (🔴 guesses until a real filter order has come in: filters may come from China or India — memory kora-prototype-bom-plan:53).
export const FILTER_ORDER = { leadWeeks: 13, safetyWeeks: 4, coverMonths: 6, horizonMonths: 18 };
const nextDue = (type, d) => (type === 'PP' ? addMonths(d, ppMonths(d)) : addMonths(d, FILTER_MONTHS[type]));
export function filterOrderPlan(cust, stock, today, opts = {}) {
  const o = { ...FILTER_ORDER, ...Object.fromEntries(Object.entries(opts).filter(([, v]) => Number.isFinite(v) && v >= 0)) };
  const end = addMonths(today, o.horizonMonths); const types = FILTER_TYPES.filter((f) => FILTER_MONTHS[f]);
  // demand is counted past the horizon: an order placed near its end still has to cover "arrival + cover months"
  const dEnd = addMonths(today, o.horizonMonths + o.coverMonths + Math.ceil(7 * o.leadWeeks / 30) + 1);
  const need = Object.fromEntries(types.map((f) => [f, {}])); const addNeed = (f, d, n = 1) => { const k = d < today ? today : d; need[f][k] = (need[f][k] || 0) + n; };
  for (const x of cust.values()) {
    if (x.status !== 'Active') continue;
    for (const f of x.fd) { if (!types.includes(f.type) || !f.due) continue; let d = f.due; let guard = 0; while (d <= dEnd && guard++ < 80) { addNeed(f.type, d); d = nextDue(f.type, d < today ? today : d); } }
  }
  const perWeek = Math.max(0, Number(opts.installsPerWeek) || 0);
  if (perWeek) for (let w = 1; addDays(today, w * 7) <= dEnd; w++) { const inst = addDays(today, w * 7); for (const f of types) { let d = nextDue(f, inst); let guard = 0; while (d <= dEnd && guard++ < 80) { addNeed(f, d, perWeek); d = nextDue(f, d); } } }
  const out = [];
  for (const f of types) {
    const all = Object.keys(need[f]).sort(); const days = all.filter((d) => d <= end); const have = Math.max(0, Number(stock[f]) || 0); let cum = 0; let runOut = null;
    const byMonth = {}; for (const d of days) { const n = need[f][d]; byMonth[monthKey(d)] = (byMonth[monthKey(d)] || 0) + n; if (runOut === null && cum + n > have + 1e-9) runOut = d; cum += n; }
    const upTo = (d) => all.filter((x) => x <= d).reduce((s, x) => s + need[f][x], 0);
    const orderBy = runOut ? addDays(runOut, -7 * (o.leadWeeks + o.safetyWeeks)) : null;
    const arrive = orderBy ? addDays(orderBy < today ? today : orderBy, 7 * o.leadWeeks) : null;
    const coverEnd = arrive ? addMonths(arrive, o.coverMonths) : null;
    const qty = arrive ? Math.ceil(Math.max(0, upTo(coverEnd) - have) / 10) * 10 : 0; // everything needed from today to "arrival + cover months", minus what is on the shelf
    const status = !orderBy ? 'ok' : orderBy <= today ? 'late' : daysBetween(today, orderBy) <= 30 ? 'soon' : 'ok';
    out.push({ type: f, have, need90: upTo(addDays(today, 90)), need365: upTo(addDays(today, 365)), runOut, orderBy, arrive, qty, status, byMonth, cum: days.map((d) => [d, need[f][d]]) });
  }
  return { opts: o, rows: out };
}

// ---------- devices by serial (#5 "해지 기기 추적" · Devices table) ----------
// History = installs (customer serial) + recoveries + relocation swaps + manual events. Status = the latest event.
// Arrival check: PI terms = inspect within 14 days of arrival; DOA claim = 30 days after install (memory kora-bom-supplier-conversations).
export const DEVICE_EVENTS = ['Received into stock', 'Arrival check OK', 'Arrival check — defect', 'Installed', 'Recovered', 'Sent to refurbish', 'Refurbished — ready', 'Swapped out', 'Scrapped', 'Lost / stolen'];
const DEV_STATUS = { 'Received into stock': 'In stock', 'Arrival check OK': 'In stock', 'Arrival check — defect': 'Defect — claim', Installed: 'At a customer', Recovered: 'Back — check it', 'Sent to refurbish': 'At refurbish', 'Refurbished — ready': 'In stock', 'Swapped out': 'Back — check it', Scrapped: 'Scrapped', 'Lost / stolen': 'Lost' };
export const DEVICE_STATES = ['In stock', 'At a customer', 'Back — check it', 'At refurbish', 'Defect — claim', 'Scrapped', 'Lost'];
export const normSerial = (s) => String(s || '').trim().toUpperCase().replace(/\s+/g, '');
export function deviceRegistry(customers, recoveries, events, relocations, today) {
  const by = new Map();
  const add = (serial, ev) => { const k = normSerial(serial); if (!k) return; if (!by.has(k)) by.set(k, { serial: k, events: [] }); by.get(k).events.push(ev); };
  for (const c of customers) if (c.deviceSerial && isDate(c.installDate)) add(c.deviceSerial, { date: c.installDate, event: 'Installed', customerId: c.id, src: 'install' });
  for (const r of recoveries || []) if (r.deviceSerial && ['Recovered', 'Partial'].includes(r.outcome)) add(r.deviceSerial, { date: r.closedDate || r.startedDate, event: 'Recovered', customerId: r.customerId, src: 'recovery', id: r.id });
  for (const rl of relocations || []) if (rl.status === 'Done' && rl.newSerial && normSerial(rl.newSerial) !== normSerial(rl.oldSerial)) {
    if (rl.oldSerial) add(rl.oldSerial, { date: rl.moveDate, event: 'Swapped out', customerId: rl.customerId, src: 'relocation', id: rl.id });
    add(rl.newSerial, { date: rl.moveDate, event: 'Installed', customerId: rl.customerId, src: 'relocation', id: rl.id });
  }
  for (const e of events || []) add(e.serial, { date: e.date, event: e.event, customerId: e.customerId || '', src: 'manual', id: e.id, notes: e.notes, batch: e.batch, cost: e.cost });
  const out = [...by.values()].map((d) => {
    d.events.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const last = d.events[d.events.length - 1]; const status = DEV_STATUS[last.event] || 'In stock';
    const inst = d.events.filter((e) => e.event === 'Installed'); const firstIn = d.events.find((e) => e.event === 'Received into stock');
    const checked = d.events.some((e) => e.event === 'Arrival check OK' || e.event === 'Arrival check — defect');
    const lastInst = inst[inst.length - 1];
    return { ...d, status, last, customerId: status === 'At a customer' ? last.customerId : '', installs: inst.length,
      batch: (d.events.find((e) => e.batch) || {}).batch || '', cost: (d.events.find((e) => Number(e.cost) > 0) || {}).cost || null,
      checkDue: firstIn && !checked ? addDays(firstIn.date, 14) : null, doaUntil: inst.length === 1 && lastInst ? addDays(lastInst.date, 30) : null };
  });
  return out.sort((a, b) => a.serial.localeCompare(b.serial));
}

// ---------- expenses & the IRD purchase book (खरिद खाता) ----------
// Amount = what was paid, VAT included. With a VAT bill the input VAT is the bill's VAT (default = amount × 13/113).
// Columns follow the IRD purchase register (rule 23(1)(छ)): local taxable purchase · taxable import · capital purchase/import,
// plus purchases without VAT (kept in the exempt column — which column the CA wants for non-VAT bills: ask).
export const expVat = (x) => (x.vatBill === 'Yes' ? (Number.isFinite(Number(x.vat)) && x.vat !== '' && x.vat !== null ? Number(x.vat) : r2((Number(x.amount) || 0) * VAT_RATE / (1 + VAT_RATE))) : 0);
export function purchaseBook(expenses, from, to) {
  const rows = [];
  for (const x of expenses || []) {
    if (!isDate(x.date) || x.date < from || x.date > to) continue;
    const amt = Number(x.amount) || 0; const vat = expVat(x); const value = r2(amt - vat);
    const kind = x.vatBill !== 'Yes' ? 'exempt' : x.capital === 'Yes' ? 'capital' : x.import === 'Yes' ? 'import' : 'local';
    rows.push({ id: x.id, date: x.date, billNo: String(x.billNo || '').trim(), customsNo: String(x.customsNo || '').trim(), supplier: x.supplier || '', supplierPan: String(x.supplierPan || '').trim(),
      item: [x.category, x.description].filter(Boolean).join(' — '), qty: x.qty || '', unit: x.unit || '', total: r2(amt - vat), kind, value, vat: r2(vat), category: x.category, amount: amt, paidFrom: x.paidFrom || '' });
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));
  const sum = (f) => r2(rows.filter(f).reduce((s, r) => s + r.value, 0)); const sumV = (f) => r2(rows.filter(f).reduce((s, r) => s + r.vat, 0));
  return { rows, totals: { total: r2(rows.reduce((s, r) => s + r.total, 0)), exempt: sum((r) => r.kind === 'exempt'), local: sum((r) => r.kind === 'local'), localVat: sumV((r) => r.kind === 'local'),
    import: sum((r) => r.kind === 'import'), importVat: sumV((r) => r.kind === 'import'), capital: sum((r) => r.kind === 'capital'), capitalVat: sumV((r) => r.kind === 'capital'), vat: sumV(() => true), paid: r2(rows.reduce((s, r) => s + r.amount, 0)) },
    missingBill: rows.filter((r) => r.kind !== 'exempt' && !r.billNo).length };
}
export function expensesByMonth(expenses) {
  const m = {};
  for (const x of expenses || []) { if (!isDate(x.date)) continue; const k = monthKey(x.date); const r = (m[k] = m[k] || { month: k, paid: 0, vat: 0, net: 0, byCat: {} }); const a = Number(x.amount) || 0, v = expVat(x); r.paid += a; r.vat += v; r.net += a - v; r.byCat[x.category || 'Other'] = (r.byCat[x.category || 'Other'] || 0) + a - v; }
  return m;
}

// ---------- misc ----------
// ---------- watch list: homes to look after this week (points, not a churn forecast) ----------
// Weights are Claude's (🔴). Two sourced reasons shape them (memory kora-industry-benchmarks):
//  · 30–40 % of PAYGo customers "skip" a payment in the first 3 months and it is normal → one late bill weighs little (:16)
//  · the first 90 days carry 30–50 % of all churn → a new home gets a point (:91)
// PoC rule: no verdict on churn before 600 household-months (kora-poc-pricing-design:89) — this list only orders who to call first.
export const WATCH = { lateDays: 7, longLateDays: 30, recentBills: 3, newDays: 90, window: 60, tdsRise: 30, visitLateDays: 14, high: 5, watch: 3 };
// sign → [points, name] (the list shows the detail; the counts group by sign)
export const WATCH_SIGNS = {
  late30: [4, '30+ days late'], late7: [3, '7–29 days late'], late: [1, '1–6 days late'], trend: [1, 'Late on 2 of the last 3 bills'],
  req: [2, 'Open request'], probs: [2, '2+ problems in 60 days'], issue: [2, 'Last call: issue found'], unhappy: [2, 'Last call: ★★ or less'], meh: [1, 'Last call: ★★★'],
  tds: [1, 'Purified TDS up 30+'], missed: [1, 'Visit cancelled or on hold'], vlate: [1, 'Visit 14+ days late'], filter: [1, 'Filter overdue'],
  noshow: [1, 'Nobody home at a visit'], new: [1, 'First 90 days'], ob: [1, 'Onboarding call overdue'], move: [1, 'Moving house'], contract: [2, 'Contract ended'], pauseEnd: [2, 'Pause ended'], paused: [1, 'Paused'], promise: [2, 'Broke a payment promise'],
};
const QUALITY_TYPES = ['Breakdown', 'Water quality', 'Leak'];
export function watchScore(x, ctx, today) {
  const c = x.c; const led = x.led; const why = []; const add = (k, cat, ic, t, act) => why.push({ k, w: WATCH_SIGNS[k][0], cat, ic, t, act });
  if (x.status === 'Churned') return null;
  const since = addDays(today, -WATCH.window);
  // money
  const owe = `NPR ${Math.round(led.overdue).toLocaleString('en-IN')}`;
  if (led.daysOverdue >= WATCH.longLateDays) add('late30', 'money', '💰', `${led.daysOverdue} days late · ${owe}`, 'pay');
  else if (led.daysOverdue >= WATCH.lateDays) add('late7', 'money', '💰', `${led.daysOverdue} days late · ${owe}`, 'pay');
  else if (led.overdue > 0 && led.daysOverdue >= 1) add('late', 'money', '💰', `${led.daysOverdue || 0} days late · ${owe}`, 'call');
  const past = led.bills.filter((b) => b.due < today).slice(-WATCH.recentBills);
  const lateN = past.filter((b) => b.status !== 'paid' || (b.paidOn && daysBetween(b.due, b.paidOn) > WATCH.lateDays)).length;
  if (past.length >= 2 && lateN >= 2) add('trend', 'money', '📉', `late on ${lateN} of the last ${past.length} bills`, 'call');
  const pr = led.overdue > 0 ? promiseOf(chaseLog(ctx.chk.get(c.id)), ctx.pay ? ctx.pay.get(c.id) : [], today) : null;
  if (pr && pr.status === 'broken') add('promise', 'money', '🤝', `promised to pay by ${pr.date} — not paid`, 'call');
  // service & water
  const reqs = ctx.req.get(c.id) || [];
  const open = reqs.filter((r) => r.status !== 'Done');
  if (open.length) { const oldest = open.map((r) => r.receivedDate || String(r.receivedAt || '').slice(0, 10)).filter(isDate).sort()[0]; add('req', 'service', '📋', `open request${open.length > 1 ? 's' : ''}: ${open.map((r) => r.type).join(', ')}${oldest && daysBetween(oldest, today) >= 2 ? ` · waiting ${daysBetween(oldest, today)} days` : ''}`, 'request'); }
  const probs = reqs.filter((r) => QUALITY_TYPES.includes(r.type) && String(r.receivedDate || String(r.receivedAt || '').slice(0, 10)) >= since);
  if (probs.length >= 2) add('probs', 'service', '🔁', `${probs.length} problems in ${WATCH.window} days`, 'visit');
  const chks = (ctx.chk.get(c.id) || []).filter((q) => isDate(q.date) && q.kind !== CHASE_KIND).sort((a, b) => a.date.localeCompare(b.date) || (msOfTs(a.createdAt) || a._localT || 0) - (msOfTs(b.createdAt) || b._localT || 0)); // same day → the one saved last
  const lastChk = chks[chks.length - 1];
  if (lastChk && lastChk.date >= since) {
    if (lastChk.result === 'Issue found') add('issue', 'service', '📞', `last call: issue found (${lastChk.date})`, 'call');
    const st = Number(lastChk.satisfaction);
    if (st >= 1 && st <= 2) add('unhappy', 'service', '☹️', `last call: ${'★'.repeat(st)} unhappy`, 'call'); else if (st === 3) add('meh', 'service', '😐', 'last call: ★★★', 'call');
  }
  const done = x.vs.filter(completed).filter((v) => Number.isFinite(Number(v.tdsAfter)) && v.tdsAfter !== null && v.tdsAfter !== '');
  if (done.length >= 2) { const a = Number(done[done.length - 2].tdsAfter), b = Number(done[done.length - 1].tdsAfter); if (b - a >= WATCH.tdsRise) add('tds', 'service', '💧', `purified TDS up ${a} → ${b}`, 'visit'); }
  const missed = x.vs.filter((v) => String(v.date || '') >= since && /Cancelled|On hold/.test(String(v.status || ''))).length;
  if (missed) add('missed', 'service', '🚪', `${missed} visit${missed > 1 ? 's' : ''} cancelled or on hold`, 'call');
  const nobody = x.vs.filter((v) => String(v.date || '') >= since && isNoShow(v)).length;
  if (nobody) add('noshow', 'service', '🚪', `nobody home ${nobody} time${nobody > 1 ? 's' : ''} in ${WATCH.window} days`, 'call');
  if (x.nv && x.nv.date && daysBetween(x.nv.date, today) >= WATCH.visitLateDays) add('vlate', 'service', '🔧', `visit ${daysBetween(x.nv.date, today)} days late`, 'visit');
  const fo = x.fd.filter((f) => f.status === 'overdue' && f.type !== 'Sanitise'); if (fo.length) add('filter', 'service', '🧪', `filter overdue: ${fo.map((f) => f.type).join(', ')}`, 'visit');
  // life stage
  if (isDate(c.installDate) && daysBetween(c.installDate, today) <= WATCH.newDays) add('new', 'stage', '🌱', `first 90 days (day ${daysBetween(c.installDate, today)})`, 'call');
  const obLate = x.ob.filter((o) => o.status === 'overdue'); if (obLate.length) add('ob', 'stage', '📞', 'day-7 call overdue', 'call');
  const mv = (ctx.rel.get(c.id) || []).find((r) => ['Requested', 'Scheduled'].includes(r.status)); if (mv) add('move', 'stage', '🚚', `moving ${mv.moveDate || ''}`.trim(), 'relocation');
  if (led.contractEnded) add('contract', 'stage', '📝', 'contract ended — renew', 'call');
  if (x.status === 'Paused') add(isDate(c.pausedUntil) && c.pausedUntil < today ? 'pauseEnd' : 'paused', 'stage', '⏸️', isDate(c.pausedUntil) && c.pausedUntil < today ? `pause ended ${c.pausedUntil} — restart?` : 'paused', 'call');
  if (!why.length) return null;
  why.sort((p, q) => q.w - p.w);
  const score = why.reduce((s2, r) => s2 + r.w, 0);
  // a call button should close the onboarding step that is late (D7/D30/…), not log a generic call
  const callKind = why[0].cat === 'money' ? CHASE_KIND : obLate.length ? obLate[0].k : 'Follow-up call'; /* money first → log it as a payment chase */
  return { x, score, lvl: score >= WATCH.high ? 'high' : score >= WATCH.watch ? 'watch' : 'low', why, act: why[0].act, callKind };
}
export function watchList(cust, D, today) {
  const by = (list) => { const m = new Map(); for (const r of list || []) { if (!m.has(r.customerId)) m.set(r.customerId, []); m.get(r.customerId).push(r); } return m; };
  const ctx = { req: by(D.requests), chk: by(D.checkins), rel: by(D.relocations), pay: by(D.payments) };
  const out = []; for (const x of cust.values()) { const w = watchScore(x, ctx, today); if (w) out.push(w); }
  return out.sort((a, b) => b.score - a.score || (b.x.led.daysOverdue || 0) - (a.x.led.daysOverdue || 0));
}

// ---------- leavers: why homes left and what it cost (reason codes on the recovery case) ----------
// Lost monthly = the subscription price (VAT incl.) · lost contract = months left of the 36-month contract × price.
export const LEAVE_REASONS = ['Moved away (outside our area)', 'Money — cannot pay', 'Went back to jar / other water', 'Water taste or quality', 'Breakdowns / slow service', 'Landlord said no', 'Bought own purifier', 'Household closed / death', 'Other'];
// median: even count → the mean of the two middle values
export const medianOf = (list) => { const a = list.filter(Number.isFinite).slice().sort((x, y) => x - y); const n = a.length; return n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : null; };
export const LATE_REASONS = ['Money not come in yet', 'No money this month', 'Forgot', 'Unhappy — held back', 'Other'];
export const TENURE_BUCKETS = [[0, 2, '0–3 months'], [3, 5, '3–6 months'], [6, 11, '6–12 months'], [12, 23, '12–24 months'], [24, 1e9, '24+ months']];
// v0.16 (outside-view #20 → Jun 10/3 ㄱㄱ): what getting the devices back costs — the cost field on the recovery case was asked and never shown
export function recoveryCost(recoveries) {
  const rs = (recoveries || []).filter((r) => Number(r.costNpr) > 0); const total = rs.reduce((s, r) => s + Number(r.costNpr), 0);
  const back = (recoveries || []).filter((r) => r.outcome === 'Recovered' || r.outcome === 'Partial').length;
  return { cases: (recoveries || []).length, withCost: rs.length, total: Math.round(total), perCase: rs.length ? Math.round(total / rs.length) : null, back };
}
export function leaverStats(customers, recoveries, today, p = PRICES) {
  const rec = new Map(); for (const r of recoveries || []) { const o = rec.get(r.customerId); if (!o || String(r.startedDate || '') > String(o.startedDate || '')) rec.set(r.customerId, r); }
  const rows = customers.filter((c) => c.status === 'Churned' && isDate(c.installDate)).map((c) => {
    const r = rec.get(c.id) || null; const end = isDate(c.churnDate) ? c.churnDate : (r && isDate(r.churnDate) ? r.churnDate : today);
    const tenure = Math.max(0, monthsBetween(c.installDate, end));
    return { c, r, end, tenure, reason: (r && r.reasonCode) || 'Not recorded', detail: (r && r.reason) || '', lostMonthly: p.monthly, lostContract: Math.max(0, p.contractMonths - tenure - 1) * p.monthly, outcome: r ? r.outcome : '' };
  }).sort((a, b) => b.end.localeCompare(a.end));
  const byReason = {}; for (const x of rows) { const o = byReason[x.reason] = byReason[x.reason] || { n: 0, lostMonthly: 0, lostContract: 0, tenure: 0 }; o.n++; o.lostMonthly += x.lostMonthly; o.lostContract += x.lostContract; o.tenure += x.tenure; }
  const byTenure = TENURE_BUCKETS.map(([a, b, l]) => ({ l, n: rows.filter((x) => x.tenure >= a && x.tenure <= b).length }));
  const byMonth = {}; for (const x of rows) { const mk = monthKey(x.end); (byMonth[mk] = byMonth[mk] || {})[x.reason] = (byMonth[mk][x.reason] || 0) + 1; }
  const median = medianOf(rows.map((x) => x.tenure));
  return { rows, byReason, byTenure, byMonth, median, recorded: rows.filter((x) => x.reason !== 'Not recorded').length,
    lostMonthly: rows.reduce((s, x) => s + x.lostMonthly, 0), lostContract: rows.reduce((s, x) => s + x.lostContract, 0) };
}
// Why payments were late — from payments (paid late) and follow-up calls. Two kinds matter most:
// "money not come in yet" (fix: move the bill day to when money arrives) vs "no money this month" (memory kora-industry-benchmarks:221).
export function lateReasonStats(payments, checkins, from) {
  const n = {}; const add = (k, src) => { if (!k) return; (n[k] = n[k] || { total: 0, pay: 0, call: 0 }); n[k].total++; n[k][src]++; };
  for (const p of payments || []) if (!from || String(p.date || '') >= from) add(p.lateReason, 'pay');
  for (const q of checkins || []) if (!from || String(q.date || '') >= from) add(q.lateReason, 'call');
  return n;
}

// ---------- field capacity: next 8 weeks of jobs vs hands (and when to hire) ----------
// Jobs = homes with a routine visit or a filter/sanitise change that week (one trip per home per week) + open requests (week 1)
// + repairs at the last 8 weeks' rate + installs at the pace (one install ≈ 2 visit slots 🔴) + the first monthly visit of homes installed 4 weeks earlier.
// Slots = people × homes a day × working days (Saturdays and closed days off). 6 a day: memory kora-industry-benchmarks:47 (🔴 derived; 4 is the careful case).
export const CAPACITY = { jobsPerDay: 6, installSlots: 2, weeks: 8, hireLeadWeeks: 6, busy: 0.9 };
export function capacityPlan(cust, D, today, opts = {}) {
  const o = { ...CAPACITY, ...Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined && v !== null && v !== '' && !Number.isNaN(v))) };
  const isOff = o.isOff || ((d) => parseD(d).getDay() === 6);
  const weeks = Array.from({ length: o.weeks }, (_, i) => { const from = addDays(today, 7 * i), to = addDays(from, 6); let work = 0; for (let d = from; d <= to; d = addDays(d, 1)) if (!isOff(d)) work++; return { i, from, to, work, visits: 0, installs: 0, repairs: 0, homes: new Set(), off: 7 - work }; });
  const wk = (d) => { const k = Math.floor(daysBetween(today, d < today ? today : d) / 7); return k >= 0 && k < o.weeks ? weeks[k] : null; };
  const end = addDays(today, 7 * o.weeks - 1);
  for (const x of cust.values()) {
    if (x.status !== 'Active' || !isDate(x.c.installDate)) continue;
    const touch = (d) => { const w = wk(d); if (w && !w.homes.has(x.c.id)) { w.homes.add(x.c.id); w.visits++; } };
    if (x.nv && isDate(x.nv.date)) { let d = x.nv.date < today ? today : x.nv.date; let g = 0; while (d <= end && g++ < 12) { touch(d); d = addMonths(d, monthsBetween(x.c.installDate, d) < VISIT_RULE.monthlyUntilMonth ? 1 : VISIT_RULE.laterEveryMonths); } }
    for (const f of x.fd) if (f.due && f.due <= end && f.status !== 'none') touch(f.due);
  }
  const since = addDays(today, -56); const reqs = (D.requests || []).filter((r) => r.type !== 'Install request');
  const rate = reqs.filter((r) => String(r.receivedDate || String(r.receivedAt || '').slice(0, 10)) >= since).length / 8;
  const openNow = reqs.filter((r) => r.status !== 'Done').length;
  const perWeek = Math.max(0, Number(o.installsPerWeek) || 0); const people = Math.max(0, Number(o.people) || 0);
  // work not done in a week (holidays, too little time) rolls into the next one — nothing disappears
  let carry = 0;
  // installs follow working days (people do them); repairs arrive by the calendar week — a holiday does not stop a leak
  for (const w of weeks) { w.installs = perWeek * (w.work / 6); w.repairs = rate + (w.i === 0 ? openNow : 0); }
  // a new home gets its first monthly visit about 4 weeks after the install (VISIT_RULE: monthly for the first months)
  for (const w of weeks) w.newVisits = w.i >= 4 ? weeks[w.i - 4].installs : 0;
  for (const w of weeks) {
    w.need = w.visits + w.newVisits + w.installs * o.installSlots + w.repairs; w.cap = people * o.jobsPerDay * w.work;
    w.carryIn = carry; w.demand = w.need + carry; w.done = Math.min(w.demand, w.cap); carry = w.demand - w.done; w.carryOut = carry;
    w.closed = w.work === 0; w.load = w.cap ? w.demand / w.cap : w.closed ? null : (w.demand ? Infinity : 0);
    w.ids = [...w.homes]; w.homes = w.ids.length;
  }
  const open = weeks.filter((w) => !w.closed); const over = open.filter((w) => w.load > 1); const busy = open.filter((w) => w.load > o.busy);
  return { opts: o, people, weeks, over, busy, rate, openNow, backlog: carry, peak: open.reduce((a, w) => (!a || w.load > a.load ? w : a), null) || weeks[0] };
}

// ---------- callbacks: a problem at the same home soon after a job goes back to whoever did the job ----------
// A callback = a Breakdown / Leak / Water quality request received within N days (30 🔴) AFTER a completed visit or an install
// at that home (the latest job before the request). Counted against the job's person and the job's date.
export const CALLBACK = { days: 30, types: ['Breakdown', 'Leak', 'Water quality'] };
export function callbackStats(D, from, to, days = CALLBACK.days) {
  const reqDate = (r) => String(r.receivedDate || String(r.receivedAt || '').slice(0, 10));
  const jobs = [];
  for (const v of D.visits || []) if (completed(v) && isDate(v.date)) jobs.push({ kind: 'visit', cid: v.customerId, date: v.date.slice(0, 10), who: v.technician || '—', what: v.visitType || 'Visit', id: v.id });
  for (const c of D.customers || []) if (isDate(c.installDate)) jobs.push({ kind: 'install', cid: c.id, date: c.installDate, who: c.agent || '—', what: 'Install', id: c.id });
  for (const rl of D.relocations || []) if (rl.status === 'Done' && isDate(rl.moveDate)) jobs.push({ kind: 'relocation', cid: rl.customerId, date: rl.moveDate.slice(0, 10), who: rl.technician || '—', what: 'Relocation', id: rl.id });
  const byCust = new Map(); for (const j of jobs) { if (!byCust.has(j.cid)) byCust.set(j.cid, []); byCust.get(j.cid).push(j); }
  for (const l of byCust.values()) l.sort((a, b) => a.date.localeCompare(b.date));
  const cbs = [];
  for (const r of D.requests || []) {
    if (!CALLBACK.types.includes(r.type)) continue; const d = reqDate(r); if (!isDate(d)) continue;
    const l = byCust.get(r.customerId) || []; let job = null; for (const j of l) { if (j.date < d) job = j; else break; }
    if (job && daysBetween(job.date, d) <= days) cbs.push({ r, job, who: job.who, days: daysBetween(job.date, d) });
  }
  const inR = (d) => d >= from && d <= to;
  const per = {}; const row = (n) => (per[n] = per[n] || { name: n, jobs: 0, visits: 0, installs: 0, relocations: 0, callbacks: 0, requests: 0 });
  for (const j of jobs) if (inR(j.date)) { const p = row(j.who); p.jobs++; p[j.kind === 'visit' ? 'visits' : j.kind === 'install' ? 'installs' : 'relocations']++; }
  // a job counts once however many problem requests followed it (the rate is "jobs that came back", never over 100 %)
  const inWin = cbs.filter((x) => inR(x.job.date)); const jobKey = (x) => x.job.kind + ':' + x.job.id; const seenJobs = new Set();
  for (const x of inWin) { const p = row(x.who); p.requests++; if (!seenJobs.has(jobKey(x))) { seenJobs.add(jobKey(x)); p.callbacks++; } }
  const people = Object.values(per).map((p) => ({ ...p, rate: p.jobs ? p.callbacks / p.jobs : null })).sort((a, b) => b.jobs - a.jobs);
  const jobsN = people.reduce((s, p) => s + p.jobs, 0);
  const dd = inWin.map((x) => x.days);
  return { days, people, callbacks: inWin.sort((a, b) => reqDate(b.r).localeCompare(reqDate(a.r))), all: cbs, jobs: jobsN, jobsBack: seenJobs.size, rate: jobsN ? seenJobs.size / jobsN : null, medianDays: medianOf(dd) };
}

// ---------- wasted trips: nobody home (v0.8 #7) ----------
// A trip = a completed visit or a "nobody home" visit. Wasted-trip rate = nobody home ÷ trips.
// "On my way" = the technician sent the WhatsApp before leaving (stamped on the visit as omwAt) — the page compares the two rates.
export const NO_SHOW_REASONS = ['Nobody home', 'Gate locked / no access', 'Asked to come another day', 'Could not find the house', 'Refused the visit', 'Other'];
export function noShowStats(D, from, to) {
  const inR = (v) => isDate(v.date) && v.date.slice(0, 10) >= from && v.date.slice(0, 10) <= to;
  const trips = (D.visits || []).filter((v) => inR(v) && (completed(v) || isNoShow(v)));
  const ns = trips.filter(isNoShow);
  const cust = new Map((D.customers || []).map((c) => [c.id, c]));
  const count = (list, key) => { const o = {}; for (const v of list) { const k = key(v) || '—'; const r = (o[k] = o[k] || { trips: 0, ns: 0 }); r.trips++; if (isNoShow(v)) r.ns++; } return o; };
  const byReason = {}; for (const v of ns) { const k = v.noShowReason || 'Not recorded'; byReason[k] = (byReason[k] || 0) + 1; }
  const byWho = count(trips, (v) => v.technician); const byTole = count(trips, (v) => { const c = cust.get(v.customerId); return c ? (c.tole === 'Other' ? c.toleOther : c.tole) : ''; });
  const byMonth = count(trips, (v) => monthKey(v.date));
  const withMsg = trips.filter((v) => v.omwAt); const noMsg = trips.filter((v) => !v.omwAt);
  const rateOf = (l) => (l.length ? l.filter(isNoShow).length / l.length : null);
  const per = new Map(); for (const v of ns) { if (!per.has(v.customerId)) per.set(v.customerId, []); per.get(v.customerId).push(v); }
  const repeat = [...per.entries()].filter(([, l]) => l.length >= 2).map(([id, l]) => ({ id, c: cust.get(id) || null, n: l.length, last: l.map((v) => v.date).sort().pop() })).sort((a, b) => b.n - a.n || b.last.localeCompare(a.last));
  return { trips: trips.length, noShows: ns.length, rate: rateOf(trips), byReason, byWho, byTole, byMonth, withMsg: { trips: withMsg.length, rate: rateOf(withMsg) }, noMsg: { trips: noMsg.length, rate: rateOf(noMsg) },
    waited: ns.reduce((s, v) => s + (Number(v.waitedMin) || 0), 0), repeat, list: ns.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))) };
}

// ---------- monthly billing moves (v0.8 #8): where this month's recurring billing came from ----------
// Rate of a home in a month = the bill it is on that month (G-1 §1): the install month = 1,100 (the 4,900 day-1 payment includes month 1),
// bills 2–13 = 1,400 (1,100 + 300 deposit = 12 × 300 = 3,600), from bill 14 = 1,100. A home that left is 0 from its leaving month.
// Moves month to month: new · came back (same phone as a home that left before) · deposit starts (+300 in month 2) · left · month-14 step (−300: the deposit part ends).
// Paused homes keep their rate: the ledger keeps billing them and pause start dates are not recorded (🔴 pause billing policy is open).
// "subscription" view = without the deposit part (the deposit is not revenue — it is held and paid back).
const mDiff = (a, b) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));
const phoneKey = (p) => String(p || '').replace(/\D/g, '').slice(-10);
export function billingRate(c, mk, leftOn, p = PRICES, part = 'amount') {
  if (!c || !isDate(c.installDate)) return 0;
  const im = monthKey(c.installDate); if (mk < im) return 0;
  if (leftOn && monthKey(leftOn) <= mk) return 0;
  const k = mDiff(im, mk) + 1; if (k === 1) return p.monthly; // month 1: the subscription inside the 4,900 (no deposit part)
  const b = billAmount(k, p); return part === 'subscription' ? b.subscription : b.amount;
}
export function billingMoves(customers, recoveries, months, today, opts = {}) {
  const p = opts.prices || PRICES; const part = opts.part === 'subscription' ? 'subscription' : 'amount';
  const rec = new Map(); for (const r of recoveries || []) { const o = rec.get(r.customerId); if (!o || String(r.startedDate || '') > String(o.startedDate || '')) rec.set(r.customerId, r); }
  const cs = (customers || []).filter((c) => isDate(c.installDate));
  const left = new Map(cs.filter((c) => c.status === 'Churned').map((c) => { const r = rec.get(c.id); return [c.id, isDate(c.churnDate) ? c.churnDate : r && isDate(r.churnDate) ? r.churnDate : r && isDate(r.startedDate) ? r.startedDate : today]; }));
  // came back = installed after an earlier home with the same phone had left
  const gone = new Map(); for (const c of cs) if (left.has(c.id) && phoneKey(c.phone)) { const k = phoneKey(c.phone); const d = left.get(c.id); if (!gone.has(k) || gone.get(k) > d) gone.set(k, d); }
  const back = new Set(cs.filter((c) => { const k = phoneKey(c.phone); const d = gone.get(k); return k && d && d <= c.installDate && left.get(c.id) !== d; }).map((c) => c.id));
  const rate = (c, mk) => billingRate(c, mk, left.get(c.id), p, part);
  const rows = months.map((mk) => {
    const prev = monthKey(addMonths(mk + '-01', -1));
    const r = { month: mk, start: 0, newN: 0, newAmt: 0, backN: 0, backAmt: 0, leftN: 0, leftAmt: 0, stepN: 0, stepAmt: 0, upN: 0, upAmt: 0, end: 0, homes: 0 };
    for (const c of cs) {
      const a = rate(c, prev), b = rate(c, mk); r.start += a; r.end += b; if (b > 0) r.homes++;
      if (!a && b) { if (back.has(c.id)) { r.backN++; r.backAmt += b; } else { r.newN++; r.newAmt += b; } }
      else if (a && !b) { r.leftN++; r.leftAmt += a; }
      else if (b < a) { r.stepN++; r.stepAmt += a - b; }
      else if (b > a) { r.upN++; r.upAmt += b - a; }
    }
    r.net = r.end - r.start; r.netPct = r.start ? r.net / r.start : null; return r;
  });
  // the month-14 step is known in advance: homes reaching their 14th bill in each coming month
  const ahead = Array.from({ length: opts.ahead || 6 }, (_, i) => { const mk = monthKey(addMonths(today.slice(0, 7) + '-01', i + 1)); const xs = cs.filter((c) => !left.has(c.id) && mDiff(monthKey(c.installDate), mk) + 1 === 2 + p.depositMonths); return { month: mk, n: xs.length, amt: part === 'subscription' ? 0 : xs.length * p.depositMonthly }; });
  return { rows, ahead, part, back: [...back] };
}

// ---------- sales stage days (v0.8 #9): lead → demo → signed → installed → first payment ----------
// Stage dates: the lead keeps the first day it entered each stage (stageDates, from v0.8); older leads fall back to createdAt / demoDate.
// A customer is matched to its lead by leadId (set when a lead is converted) or else by the same phone number.
// Targets are Claude's first guesses (🔴, shown as such on the page) — replace them once real numbers exist.
export const FUNNEL = { steps: [['lead', 'demo', 'Lead → demo'], ['demo', 'signed', 'Demo → signed'], ['signed', 'installed', 'Signed → installed'], ['installed', 'paid', 'Installed → first payment']], target: { lead: 7, demo: 7, signed: 5, installed: 0 }, stuckDays: 14 };
const tsDay = (x) => { const ms = msOfTs(x); return ms ? fmtD(new Date(ms)) : null; };
export function leadDates(l) {
  const sd = (l && l.stageDates) || {};
  return { lead: sd.New || tsDay(l && l.createdAt) || tsDay(l && l._localT) || null, demo: (isDate(l && l.demoDate) && l.demoDate) || sd['Demo booked'] || null, signed: sd.Signed || null };
}
export function funnelDays(leads, customers, payments, from, to, today) {
  // same phone: the latest lead that started on/before the sign-up and is not another customer's (a home that came back has an old lead too)
  const phoneLeads = new Map(); for (const l of leads || []) { const k = phoneKey(l.phone); if (!k) continue; if (!phoneLeads.has(k)) phoneLeads.set(k, []); phoneLeads.get(k).push(l); }
  const takenBy = new Map(); for (const c of customers || []) if (c.leadId) takenBy.set(c.leadId, c.id); // leads another home was converted from
  const leadFor = (c) => { const xs = phoneLeads.get(phoneKey(c.phone)) || []; const cut = (isDate(c.signUpDate) && c.signUpDate) || c.installDate || '9999';
    return xs.filter((l) => (!l.customerId || l.customerId === c.id) && (!takenBy.has(l.id) || takenBy.get(l.id) === c.id) && String(leadDates(l).lead || '') <= cut).sort((a, b) => String(leadDates(b).lead || '').localeCompare(String(leadDates(a).lead || '')))[0] || null; };
  const byId = new Map((leads || []).map((l) => [l.id, l]));
  const firstPay = new Map(); for (const p of payments || []) { if (isNonCash(p) || !(Number(p.amount) > 0) || !isDate(p.date)) continue; const o = firstPay.get(p.customerId); if (!o || p.date < o) firstPay.set(p.customerId, p.date.slice(0, 10)); }
  const journeys = (customers || []).filter((c) => isDate(c.installDate) && c.installDate >= from && c.installDate <= to).map((c) => {
    const l = (c.leadId && byId.get(c.leadId)) || leadFor(c) || null; const ld = l ? leadDates(l) : { lead: null, demo: null, signed: null };
    const d = { lead: ld.lead, demo: ld.demo, signed: (isDate(c.signUpDate) && c.signUpDate) || ld.signed, installed: c.installDate, paid: firstPay.get(c.id) || null };
    const days = {}; for (const [a, b] of FUNNEL.steps) days[a] = d[a] && d[b] && d[b] >= d[a] ? daysBetween(d[a], d[b]) : null;
    const total = d.lead && d.paid && d.paid >= d.lead ? daysBetween(d.lead, d.paid) : null;
    return { c, l, d, days, total };
  });
  const steps = FUNNEL.steps.map(([a, b, label]) => { const xs = journeys.map((j) => j.days[a]).filter((v) => v !== null);
    const buckets = [[0, 0, 'same day'], [1, 3, '1–3 days'], [4, 7, '4–7 days'], [8, 14, '8–14 days'], [15, 1e9, '15+ days']].map(([lo, hi, l2]) => ({ l: l2, n: xs.filter((v) => v >= lo && v <= hi).length }));
    return { key: a, to: b, label, n: xs.length, median: medianOf(xs), max: xs.length ? Math.max(...xs) : null, slow: journeys.filter((j) => j.days[a] !== null && j.days[a] > FUNNEL.target[a]).length, target: FUNNEL.target[a], buckets };
  });
  // open leads: days in the stage they are in now (a lead that already became a customer is not open)
  const linked = new Map(); for (const c of customers || []) { if (c.leadId) linked.set(c.leadId, c.id); const l = isDate(c.installDate) ? leadFor(c) : null; if (l && !linked.has(l.id)) linked.set(l.id, c.id); }
  const open = (leads || []).filter((l) => !['Signed', 'Rejected'].includes(l.outcome || 'New') && !linked.has(l.id)).map((l) => { const st = l.outcome || 'New'; const sd = (l.stageDates || {})[st] || (st === 'New' ? leadDates(l).lead : null) || tsDay(l.updatedAt) || leadDates(l).lead;
    return { l, stage: st, since: sd, days: sd ? daysBetween(sd, today) : null }; }).sort((a, b) => (b.days ?? -1) - (a.days ?? -1));
  return { journeys, steps, totalMedian: medianOf(journeys.map((j) => j.total).filter((v) => v !== null)), matched: journeys.filter((j) => j.l).length,
    paidOnInstall: journeys.filter((j) => j.d.paid && j.d.paid === j.d.installed).length, open, linked, stuck: open.filter((o) => o.days !== null && o.days >= FUNNEL.stuckDays) };
}

// ---------- PAYGo PERFORM KPIs for grant reports (v0.8 #10) ----------
// Definitions: CGAP · GOGLA · IFC "PAYGo PERFORM KPIs: Definitions at a Glance" (🟢 cgap.org/sites/default/files/research_documents/PayGo_Definititions_at_a_Glance.pdf).
// KORA is a rental (the device stays ours), so each KPI says how we read it (how) and a grade:
//   🟢 = straight from our records with the CGAP formula · 🟡 = CGAP formula on a KORA reading · 🔴 = approximation · n/a = does not apply to a rental.
// Receivables = the payments still due under the 36-month contract (unpaid bills + bills not yet due). "Deposit" in CGAP = the upfront payment = our day-1 4,900;
// follow-on payments = bills 2–36 (including the 300 refundable deposit part of bills 2–13).
export const PERFORM_COSTS = { // 🔴 our expense categories → CGAP cost lines (first mapping — the CA may place some differently)
  cogs: ['Devices & import', 'Customs, freight & clearing'], sales: ['Marketing & printing'], service: ['Filters & spare parts', 'Fuel & transport', 'Motorbike upkeep'], variable: ['Bank & payment fees'], financial: [],
};
export function contractLeft(c, led, p = PRICES) { // unpaid bills so far + bills still to come until the end of the contract
  if (!led || !isDate(c.installDate)) return 0; const n = led.bills.length; let left = 0;
  for (const b of led.bills) if (b.k <= p.contractMonths) left += Math.max(0, b.amount - b.paid);
  for (let k = n + 1; k <= p.contractMonths; k++) left += billAmount(k, p).amount;
  return left;
}
export function performKpis(D, ledgersIn, from, to, today, opts = {}) {
  const p = opts.prices || PRICES; const inR = (d) => isDate(d) && d.slice(0, 10) >= from && d.slice(0, 10) <= to;
  const custs = (D.customers || []).filter((c) => isDate(c.installDate) && c.installDate <= to);
  const ledgers = ledgersIn || new Map(custs.map((c) => [c.id, ledger(c, D.payments, today, p)]));
  const payById = new Map((D.payments || []).map((q) => [q.id, q]));
  // cash
  const cashPays = (D.payments || []).filter((q) => inR(q.date) && !isNonCash(q) && Number(q.amount) > 0);
  const cash = cashPays.reduce((s2, q) => s2 + Number(q.amount), 0);
  let followCash = 0, dayOneCash = 0, dueFollow = 0, refFollow = 0; const crC = []; let outAll = 0; const rar = { 30: 0, 90: 0, 180: 0, cr70: 0, cr50: 0 };
  for (const c of custs) {
    const led = ledgers.get(c.id); if (!led) continue;
    for (const [pid, sp] of Object.entries(led.splits)) { const q = payById.get(pid); if (!q || !inR(q.date) || sp.extra !== undefined) continue;
      if (isNonCash(q)) { refFollow += (sp.subscription || 0) + (sp.deposit || 0); continue; } /* a free month: not cash, and not due as cash either */ const cs = sp.cashShare ?? 1; followCash += ((sp.subscription || 0) + (sp.deposit || 0) + (sp.unallocated || 0)) * cs; dayOneCash += (sp.install || 0) * cs; }
    for (const b of led.bills) if (b.k >= 2 && inR(b.due)) dueFollow += b.amount;
    if (c.status === 'Churned') continue;
    const out = contractLeft(c, led, p); outAll += out;
    const dueSince = led.bills.filter((b) => b.k >= 2 && b.due <= today); const due = dueSince.reduce((s2, b) => s2 + b.amount, 0); const paid = dueSince.reduce((s2, b) => s2 + b.paid, 0);
    const cr = due ? paid / due : null; crC.push(cr);
    for (const x of [30, 90, 180]) if (led.daysOverdue > x) rar[x] += out;
    if (cr !== null && cr < 0.7) rar.cr70 += out; if (cr !== null && cr < 0.5) rar.cr50 += out;
  }
  // leavers in the period: device back = repossession · no device back = write-off (contract left at leaving, as leaverStats counts it)
  const rec = new Map(); for (const r of D.recoveries || []) { const o = rec.get(r.customerId); if (!o || String(r.startedDate || '') > String(o.startedDate || '')) rec.set(r.customerId, r); }
  let repo = 0, wo = 0, repoN = 0, woN = 0;
  for (const c of custs) if (c.status === 'Churned' && inR(c.churnDate)) { const led = ledgers.get(c.id); const left = contractLeft(c, led, p); /* unpaid + the rest of the 36 months, as the denominator counts it */ const r = rec.get(c.id); if (r && ['Recovered', 'Partial'].includes(r.outcome)) { repo += left; repoN++; } else { wo += left; woN++; } }
  // costs (cash basis, as paid)
  const exps = (D.expenses || []).filter((x) => inR(x.date)); const costOf = (cats) => exps.filter((x) => cats.includes(x.category)).reduce((s2, x) => s2 + (Number(x.amount) || 0), 0);
  const cogs = costOf(PERFORM_COSTS.cogs), sales = costOf(PERFORM_COSTS.sales), service = costOf(PERFORM_COSTS.service), variable = costOf(PERFORM_COSTS.variable), financial = costOf(PERFORM_COSTS.financial);
  const allCost = exps.reduce((s2, x) => s2 + (Number(x.amount) || 0), 0); const fixed = allCost - cogs - sales - service - variable - financial;
  const ratio = (v) => (cash ? v / cash : null);
  // units
  const sold = custs.filter((c) => inR(c.installDate)); const back = new Set((opts.back || []));
  const followPerUnit = Array.from({ length: p.contractMonths - 1 }, (_, i) => billAmount(i + 2, p).amount).reduce((a2, b2) => a2 + b2, 0);
  const dayOne = sold.reduce((s2, c) => s2 + ((ledgers.get(c.id) || { bills: [] }).bills.find((b) => b.k === 1) || { paid: 0 }).paid, 0);
  const byChannel = {}; for (const c of sold) { const k = c.referral || 'Not recorded'; byChannel[k] = (byChannel[k] || 0) + 1; }
  const b2b = sold.filter((c) => String(c.buyerPan || '').trim()).length;
  const npsR = (D.checkins || []).filter((q) => inR(q.date) && q.nps !== '' && q.nps !== null && q.nps !== undefined && Number.isFinite(Number(q.nps))).map((q) => Number(q.nps));
  const nps = npsR.length ? Math.round((npsR.filter((v) => v >= 9).length - npsR.filter((v) => v <= 6).length) / npsR.length * 100) : null;
  const K = (group, key, name, value, fmt, how, grade) => ({ group, key, name, value, fmt, how, grade });
  const pr = (v, d) => (d ? v / d : null);
  const rows = [
    K('Portfolio quality', 'outstanding', 'Outstanding receivables', outAll, 'npr', 'Active homes: unpaid bills + bills still to come until month 36 (VAT incl.). As of today.', '🟡'),
    K('Portfolio quality', 'collection', 'Collection rate', pr(followCash, dueFollow - refFollow), 'pct', `Cash for bills 2–36 received in the period ÷ bills 2–36 due in the period (day-1 4,900 left out, as CGAP leaves out deposits; free referral months left out of both). ${fmtN0(followCash)} ÷ ${fmtN0(dueFollow - refFollow)}.`, '🟢'),
    K('Portfolio quality', 'rar30', 'Receivables at risk · >30 days unpaid', pr(rar[30], outAll), 'pct', 'Outstanding receivables of homes whose oldest unpaid bill is over 30 days old ÷ all outstanding receivables. As of today.', '🟢'),
    K('Portfolio quality', 'rar90', 'Receivables at risk · >90 days unpaid', pr(rar[90], outAll), 'pct', 'Same with 90 days.', '🟢'),
    K('Portfolio quality', 'rar180', 'Receivables at risk · >180 days unpaid', pr(rar[180], outAll), 'pct', 'Same with 180 days.', '🟢'),
    K('Portfolio quality', 'rarcr70', 'Receivables at risk · collection rate <70 % since install', pr(rar.cr70, outAll), 'pct', 'Homes that paid under 70 % of their bills 2+ so far.', '🟢'),
    K('Portfolio quality', 'rarcr50', 'Receivables at risk · collection rate <50 % since install', pr(rar.cr50, outAll), 'pct', 'Homes that paid under 50 % of their bills 2+ so far.', '🟢'),
    K('Portfolio quality', 'writeoff', 'Write-off ratio', pr(wo, outAll), 'pct', `Homes that left in the period without the device coming back (${woN}): unpaid + contract left at leaving ÷ outstanding receivables today (🔴 CGAP uses the period average).`, '🔴'),
    K('Portfolio quality', 'repossession', 'Repossession ratio', pr(repo, outAll), 'pct', `Homes that left in the period with the device back (${repoN}): unpaid + contract left at leaving ÷ outstanding receivables today (🔴 period average in CGAP).`, '🔴'),
    K('Portfolio quality', 'contractPeriod', 'Contractual credit period', Math.round(p.contractMonths * 30.44), 'days', `Every contract is ${p.contractMonths} months.`, '🟢'),
    K('Portfolio quality', 'effectivePeriod', 'Effective credit period', null, 'na', 'Does not apply: a rental is never "paid off" — the device stays KORA\'s.', 'n/a'),
    K('Financial', 'cash', 'Total cash receipts from customers', cash, 'npr', `All payments received in the period (day-1 ${fmtN0(dayOneCash)} + follow-on ${fmtN0(followCash)} + other), VAT incl.; referral credits are not cash.`, '🟢'),
    K('Financial', 'cogs', 'Cost of goods sold ratio', ratio(cogs), 'pct', `Expenses "${PERFORM_COSTS.cogs.join('", "')}" paid in the period ÷ cash receipts. Cash basis: a device order lands in one month.`, '🟡'),
    K('Financial', 'salesMaint', 'Sales and maintenance cost ratio', ratio(sales + service + variable), 'pct', `Sales ("${PERFORM_COSTS.sales.join('", "')}") + servicing ("${PERFORM_COSTS.service.join('", "')}") + other variable ("${PERFORM_COSTS.variable.join('", "')}") ÷ cash receipts.`, '🟡'),
    K('Financial', 'contribution', 'Total contribution margin', ratio(cash - cogs - sales - service - variable), 'pct', '(Cash receipts − goods − sales − servicing − other variable costs) ÷ cash receipts.', '🟡'),
    K('Financial', 'financial', 'Financial expense ratio', ratio(financial), 'pct', 'No loans → 0 (bank fees are counted as a variable cost).', '🟡'),
    K('Financial', 'fixed', 'Fixed cost ratio', ratio(fixed + financial), 'pct', 'Every other expense (salaries, rent, phone, software, fees, …) ÷ cash receipts.', '🟡'),
    K('Financial', 'ebt', 'Total EBT margin', ratio(cash - allCost), 'pct', '(Cash receipts − all expenses paid) ÷ cash receipts. Cash basis, before tax.', '🔴'),
    K('Unit', 'unitDeposit', 'Unit customer deposit', p.installFee, 'npr', 'Day-1 payment in the contract (includes month 1).', '🟢'),
    K('Unit', 'unitFollow', 'Unit follow-on payments', followPerUnit, 'npr', `Bills 2–${p.contractMonths} in the contract: 12 × ${fmtN0(p.monthly + p.depositMonthly)} + ${p.contractMonths - 13} × ${fmtN0(p.monthly)} (includes the ${fmtN0(p.depositTotal)} refundable deposit).`, '🟢'),
    K('Unit', 'asp', 'Average selling price (contract value)', p.installFee + followPerUnit, 'npr', 'Day-1 payment + follow-on payments of one contract.', '🟢'),
    K('Unit', 'unitCogs', 'Unit device cost', pr(cogs, sold.length), 'npr', `Goods expenses in the period ÷ homes installed in the period (${sold.length}). Lumpy: devices are bought in batches.`, '🔴'),
    K('Company', 'netSales', 'Total net sales (units)', sold.length - repoN, 'int', `Homes installed in the period (${sold.length}) − devices taken back from leavers in the period (${repoN}).`, '🟢'),
    K('Company', 'repeat', 'Repeat sales', pr(sold.filter((c) => back.has(c.id)).length, sold.length), 'pct', 'Share of installs that are former customers coming back (same phone). Every home has the same price, so units = revenue share.', '🟡'),
    K('Company', 'b2b', 'Sales distribution · B2B', pr(b2b, sold.length), 'pct', 'Installs with a buyer PAN (businesses) ÷ all installs; the rest is B2C.', '🟡'),
    K('Company', 'model', 'Sales model · subscription (PAYGo-like)', sold.length ? 1 : null, 'pct', 'Every home is on the monthly contract — no cash sales.', '🟢'),
    K('Company', 'country', 'Country sales · Nepal', sold.length ? 1 : null, 'pct', 'Pokhara only.', '🟢'),
    K('Operational', 'nps', 'Net Promoter Score', nps, 'nps', npsR.length ? `% 9–10 − % 0–6 from ${npsR.length} answers to the 0–10 question on calls in the period.` : 'No 0–10 answers yet — ask it on the check-in call ("How likely to recommend KORA to family or friends?").', npsR.length >= 30 ? '🟢' : npsR.length ? '🔴' : 'n/a'),
    K('Operational', 'salesPoints', 'Sales points rate', null, 'na', 'Does not apply: no agent or shop network.', 'n/a'),
    K('Operational', 'liquidity', 'Liquidity', null, 'na', 'Needs the bank balance — not in the app.', 'n/a'),
  ];
  return { from, to, rows, byChannel, sold: sold.length, npsN: npsR.length, cash, cost: { cogs, sales, service, variable, financial, fixed, all: allCost }, crC };
}
const fmtN0 = (v) => Math.round(Number(v) || 0).toLocaleString('en-IN');

// ---------- money approvals (v0.8 #12) ----------
// Rules (settings, 🔴 first guesses): a discount above N NPR and a deposit refund above N NPR need an OK; who may give it.
export const APPROVAL = { discountOver: 0, refundOver: 0, who: 'Admin only' };
export function approvalRule(settings = {}) {
  const n = (v, d) => (v === '' || v === undefined || v === null || !Number.isFinite(Number(v)) ? d : Math.max(0, Number(v)));
  return { discountOver: n(settings.apprDiscountOver, APPROVAL.discountOver), refundOver: n(settings.apprRefundOver, APPROVAL.refundOver), who: settings.apprWho || APPROVAL.who };
}
// what a record asks for: [] = nothing to approve
export function approvalNeeds(col, x, rule) {
  const out = [];
  if (col === 'payments' && (Number(x.discount) || 0) > rule.discountOver) out.push({ kind: 'discount', amount: Number(x.discount) });
  if (col === 'recoveries' && (Number(x.depositRefunded) || 0) > rule.refundOver) out.push({ kind: 'refund', amount: Number(x.depositRefunded) });
  return out;
}
export function approvalQueue(D) {
  const rows = [];
  for (const [col, list] of [['payments', D.payments], ['recoveries', D.recoveries]]) for (const x of list || []) if (x.approval) rows.push({ col, x, kind: col === 'payments' ? 'discount' : 'refund', amount: col === 'payments' ? Number(x.discount) || 0 : Number(x.depositRefunded) || 0, state: x.approval });
  const ts = (r) => String(r.x.approvedAt || r.x.date || r.x.closedDate || r.x.startedDate || '');
  return { pending: rows.filter((r) => r.state === 'Pending').sort((a, b) => ts(a).localeCompare(ts(b))), done: rows.filter((r) => r.state !== 'Pending').sort((a, b) => ts(b).localeCompare(ts(a))) };
}

// ---------- dispatch ----------
// Who goes to a home: a cover (another person until a date, e.g. someone is sick) beats the regular assignee.
export const assigneeOf = (c, today) => (c && c.cover && c.cover.to && c.cover.until >= today ? c.cover.to : (c && c.assignee) || '');
export function pickRandom(list, n) { /* kept for tests · the random happy call was dropped (Jun 2026-09-30) */
  const a = list.slice(); const r = new Uint32Array(a.length); (globalThis.crypto || { getRandomValues: (x) => x.map(() => Math.random() * 2 ** 32) }).getRandomValues(r);
  for (let i = a.length - 1; i > 0; i--) { const j = r[i] % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}
export const npr = (n) => (n === null || n === undefined || !Number.isFinite(Number(n))) ? '–' : 'NPR ' + Math.round(Number(n)).toLocaleString('en-IN');
export const pct = (x, d = 0) => x === null || x === undefined ? '–' : (x * 100).toFixed(d) + '%';
