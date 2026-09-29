// KORA Field — what-if calculator: move the sliders, see households, monthly cash, the cash bridge and the FCL order month.
// A calculator on assumptions, not a forecast. Defaults and grades come from plans/2026-09-27_재무발주_자체앱_계획.md (§2–§3).
import * as R from './logic.js';

// [key, label, min, max, step, grade · source]
export const KNOBS = [
  ['growth', 'Growth', [
    ['installsPerWeek', 'Installs per week', 0, 12, 0.5, '🔴 Tara pace · app shows the real 4-week average'],
    ['churnPct', 'Homes leaving per month (%)', 0, 8, 0.1, '🔴 plan §3 red list: 2 %'],
    ['paidPct', 'Share of bills paid (%)', 60, 100, 1, '🔴 plan §3: bad debt 3 % → 97 %'],
  ]],
  ['price', 'Price', [
    ['price', 'Monthly price (NPR, VAT incl.)', 800, 1600, 50, '🟢 contract 9/3: 1,100'],
    ['installFee', 'Day-1 payment (NPR, incl. 1st month)', 2000, 7000, 100, '🟢 contract 9/3: 4,900'],
  ]],
  ['people', 'People', [
    ['techs', 'Technicians', 1, 6, 1, 'Tara counts as 1 until someone is hired'],
    ['techSalary', 'Salary per technician (NPR / month)', 0, 40000, 1000, '🔴 plan §3: 66,000 for 3 staff ≈ 22,000'],
    ['jobsPerDay', 'Homes one technician can do a day', 2, 10, 1, '🟡 plan: 4–8 a day, 6 days a week'],
  ]],
  ['devices', 'Devices', [
    ['stockNow', 'Devices in stock now', 0, 400, 1, '🟢 from the app (stock page)'],
    ['leadWeeks', 'Order → arrival (weeks)', 4, 20, 1, '🔴 plan §2: 13 weeks (9 if prepared)'],
    ['orderQty', 'Devices per order', 50, 750, 50, 'plan §2: FCL#1 = 350'],
    ['unitCost', 'Cost per device (NPR)', 8000, 22000, 100, '🔴 plan §3: FCL 12,062 · pilot landed 17,636'],
    ['recoveryPct', 'Devices recovered from leavers (%)', 0, 100, 5, '🔴 plan §3 red list: 90 %'],
  ]],
  ['costs', 'Running costs', [
    ['consumables', 'Filters & parts per home (NPR / month)', 100, 400, 1, '🟢 PI prices · 🟡 cycles: 242'],
    ['fixed', 'Fixed costs (NPR / month)', 0, 40000, 500, 'plan §3: 13,690 (rent · CA · phone · SaaS)'],
    ['fuel', 'Fuel per technician (NPR / month)', 0, 6000, 100, '🟡 plan §3: 2,167'],
  ]],
];
export const BASE = { months: 36, installsPerWeek: 2, churnPct: 2, paidPct: 97, price: 1100, installFee: 4900, techs: 1, techSalary: 22000, jobsPerDay: 6, stockNow: 50, leadWeeks: 13, orderQty: 350, unitCost: 12062, recoveryPct: 90, consumables: 242, fixed: 13690, fuel: 2167, refurb: 800, deposit: 300, depositMonths: 12, daysPerMonth: 26 };
export const PRESETS = {
  low: { label: 'Worse', v: { installsPerWeek: 1, churnPct: 3.5, paidPct: 90 } },
  mid: { label: 'Middle', v: {} },
  high: { label: 'Better', v: { installsPerWeek: 4, churnPct: 1, paidPct: 98 } },
};
const VAT = 1.13;
// cohorts: homes by age in months (for visit load: monthly for the first 6 months, then every 3 months — R.VISIT_RULE)
export function simulate(p0, start = {}) {
  const p = { ...BASE, ...p0 };
  const out = []; let stock = p.stockNow; let cum = 0; let order = null; const cohorts = [];
  // start: real homes by install age ({ cohorts: [{ age, n }] }) — or a count, treated as past the monthly-visit months
  if (Array.isArray(start.cohorts)) { for (const c of start.cohorts) if (c && c.n > 0) cohorts.push({ age: Math.max(0, Number(c.age) || 0), n: Number(c.n) }); }
  else if (start.homes) cohorts.push({ age: 7, n: start.homes });
  const wkPerMonth = 52 / 12; const leadM = Math.max(1, Math.round(p.leadWeeks / wkPerMonth));
  const cap = p.techs * p.jobsPerDay * p.daysPerMonth;
  for (let m = 0; m < p.months; m++) {
    let arrived = 0; if (order && order.at === m) { stock += order.qty; arrived = order.qty; order = null; }
    const homes0 = cohorts.reduce((s, c) => s + c.n, 0);
    const visits = cohorts.reduce((s, c) => s + c.n * (c.age < R.VISIT_RULE.monthlyUntilMonth ? 1 : 1 / R.VISIT_RULE.laterEveryMonths), 0);
    const want = p.installsPerWeek * wkPerMonth;
    const freeJobs = Math.max(0, cap - visits); // an install takes about two visit slots (🔴)
    let installs = Math.min(want, freeJobs / 2, stock); const limit = installs < want - 1e-9 ? (stock <= installs + 1e-9 && stock < want ? 'stock' : 'people') : '';
    installs = Math.max(0, installs); stock -= installs;
    // leavers (before the new ones join) — recovered devices come back to stock
    const leave = homes0 * p.churnPct / 100; const back = leave * p.recoveryPct / 100;
    for (const c of cohorts) c.n *= 1 - p.churnPct / 100;
    stock += back;
    cohorts.forEach((c) => { c.age++; });
    cohorts.push({ age: 0, n: installs });
    const homes = cohorts.reduce((s, c) => s + c.n, 0);
    // money (VAT-inclusive cash in → VAT-free for the result)
    const subs = (homes - installs) * p.price * p.paidPct / 100; const inst = installs * p.installFee;
    const depositIn = cohorts.filter((c) => c.age >= 1 && c.age <= p.depositMonths).reduce((s, c) => s + c.n, 0) * p.deposit * p.paidPct / 100;
    const revenue = (subs + inst) / VAT;
    const costs = homes * p.consumables + p.fixed + p.techs * (p.techSalary + p.fuel) + back * p.refurb;
    const opCash = revenue - costs;
    // reorder rule (plan §2): stock + on order ≤ weekly installs × lead time → order now, pay now
    let ordered = 0; const avgWk = installs / wkPerMonth;
    if (!order && stock <= Math.max(avgWk, p.installsPerWeek * 0.5) * p.leadWeeks && p.installsPerWeek > 0) { order = { at: m + leadM, qty: p.orderQty }; ordered = p.orderQty; }
    const buy = ordered * p.unitCost;
    cum += opCash - buy;
    out.push({ m, homes, installs, leave, visits, cap, limit, opCash, buy, cum, stock, ordered, arrived, depositIn, revenue, costs });
  }
  const firstPositive = out.findIndex((r) => r.opCash > 0);
  const low = out.reduce((a, r) => (r.cum < a.cum ? r : a), out[0]);
  return { p, rows: out, firstPositive, low, orders: out.filter((r) => r.ordered).map((r) => r.m), stockouts: out.filter((r) => r.limit === 'stock').length, busy: out.filter((r) => r.limit === 'people').length };
}
