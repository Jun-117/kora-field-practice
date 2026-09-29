// KORA Field — "CA pack": one click → the IRD sales book (बिक्री खाता) for a Nepali (BS) month, in the IRD layout,
// plus a summary, the detail with AD dates, the deposit movement and an empty purchase book (purchases are not in this app).
// Format source: IRD sales register (FY 2078/79 format) as published by Baker Tilly Nepal (🟡 2nd-hand copy of the IRD file).
import * as R from './logic.js';
import * as B from './bs.js';
import { S, model, esc } from './app.js';

const IRD_TITLE = 'बिक्री खाता';
const IRD_RULE = '(नियम २३ को उपनियम (१) को खण्ड (ज) संग सम्बन्धित)';
// 15 columns, exactly as the IRD sheet (A–O)
export const IRD_COLS = [
  ['मिति', 'Date (BS)'], ['बीजक नम्बर', 'Bill no.'], ['खरिदकर्ताको नाम', 'Buyer'], ['खरिदकर्ताको स्थायी लेखा नम्बर', 'Buyer PAN'],
  ['वस्तु वा सेवाको नाम', 'Goods / service'], ['वस्तु वा सेवाको परिमाण', 'Qty'], ['वस्तु वा सेवाको परिमाण मापन गर्ने इकाइ', 'Unit'],
  ['जम्मा बिक्री / निकासी (रु)', 'Total sales (excl. VAT)'], ['स्थानीय कर छुटको बिक्री मूल्य (रु)', 'Exempt sales'],
  ['मूल्य (रु)', 'Taxable value'], ['कर (रु)', 'VAT 13%'],
  ['निकासी गरेको वस्तु वा सेवाको मूल्य (रु)', 'Export value'], ['निकासी गरेको देश', 'Export country'], ['निकासी प्रज्ञापनपत्र नम्बर', 'Customs decl. no.'], ['निकासी प्रज्ञापनपत्र मिति', 'Customs decl. date'],
];
const UNIT_NE = { month: 'महिना', job: 'पटक' };
const n2 = (x) => (Math.round((Number(x) || 0) * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---------- period ----------
export function defaultPeriod(t) {
  const b = B.adToBs(t); if (!b) return null;
  const prev = B.addBsMonths(b.y, b.m, -1); return { y: prev.y, m: prev.m, n: 1 }; // VAT return is prepared for the month that just ended
}
export function periodOf(p) {
  const y = Number(p.y), m = Number(p.m), n = Math.max(1, Math.min(12, Number(p.n) || 1));
  const last = B.addBsMonths(y, m, n - 1);
  const from = B.bsToAd(y, m, 1), to = B.bsMonthRange(last.y, last.m).to;
  const label = n === 1 ? B.bsLabel(y, m) : `${B.bsLabel(y, m)} – ${B.bsLabel(last.y, last.m)}`;
  const labelNe = n === 1 ? `${B.BS_MONTHS_NE[m - 1]} ${y}` : `${B.BS_MONTHS_NE[m - 1]} ${y} – ${B.BS_MONTHS_NE[last.m - 1]} ${last.y}`;
  return { y, m, n, from, to, label, labelNe, fy: B.fiscalYear(y, m), provisional: B.isProvisional(y) || B.isProvisional(last.y) };
}
export function buildPack(p) {
  const m = model(); B.setOverrides(S.settings.bsOverride || '');
  const P = periodOf(p); if (!P.from || !P.to) return null;
  const book = R.salesBook(m.D.payments, m.ledgers, S.D.customers, m.D.recoveries, P.from, P.to);
  const buy = R.purchaseBook(m.D.expenses, P.from, P.to);
  const dep = { received: book.totals.deposit, refunded: 0, forfeited: 0 };
  for (const rc of m.D.recoveries) { const d = rc.closedDate || rc.startedDate; if (R.isDate(d) && d >= P.from && d <= P.to) { dep.refunded += R.moneyEffective(rc) ? Number(rc.depositRefunded) || 0 : 0; /* a refund waiting for an OK has not left */ dep.forfeited += Number(rc.depositForfeited) || 0; } }
  const co = { name: S.settings.coName || '', pan: S.settings.coPan || '', address: S.settings.coAddress || '' };
  const warn = [];
  if (!co.pan || !co.name) warn.push('Company name / PAN missing — Settings');
  if (book.missingBill) warn.push(`${book.missingBill} row(s) without a VAT bill number`);
  if (book.duplicateBills.length) warn.push(`Same bill number used twice: ${book.duplicateBills.slice(0, 5).join(', ')}`);
  if (P.provisional) warn.push('Nepali calendar for this year is provisional — check the month dates with the CA');
  if (book.penalties.length) warn.push(`${book.penalties.length} penalty payment(s) left out — ask the CA how to treat them`);
  if (buy.missingBill) warn.push(`${buy.missingBill} VAT purchase(s) without the supplier bill number`);
  const vatNet = Math.round((book.totals.vat - buy.totals.vat) * 100) / 100;
  return { P, book, buy, vatNet, dep, co, warn, heldEnd: m.deposits.total.held };
}

// ---------- screen ----------
export function capackHtml(p) {
  const m = model(); B.setOverrides(S.settings.bsOverride || '');
  const dp = defaultPeriod(m.t); if (!dp) return '<div class="card">Nepali calendar not available for this date.</div>';
  const q = { y: p.y || dp.y, m: p.m || dp.m, n: p.n || 1 };
  const X = buildPack(q); if (!X) return '<div class="card">Could not build this period.</div>';
  const { P, book, dep, co, warn, buy, vatNet } = X;
  const tb = B.adToBs(m.t); const chips = []; for (let i = 0; i < 12; i++) { const a = B.addBsMonths(tb.y, tb.m, -i); chips.push(a); }
  const rows = book.rows;
  return `<div class="capack">
    <div class="muted">IRD sales book (बिक्री खाता · rule 23(1)(ज)) for a Nepali month — the file to hand to the CA. Prices include VAT → value = amount ÷ 1.13. Cash basis by payment date. Deposit is not a sale until forfeited.</div>
    <div class="bs-chips">${chips.map((a) => `<button data-capack="${a.y}|${a.m}|1" class="${a.y === P.y && a.m === P.m && P.n === 1 ? 'on' : ''}">${esc(B.bsLabel(a.y, a.m))}${a.y === tb.y && a.m === tb.m ? ' ·' : ''}</button>`).join('')}
      <button data-capack="${P.y}|${P.m}|${P.n === 4 ? 1 : 4}" class="${P.n === 4 ? 'on' : ''}" title="4 months from the chosen month">4 months</button></div>
    <div class="card"><div class="kv">
      <div class="k">Period</div><div class="v"><b>${esc(P.label)}</b> <span class="muted" data-noi18n>${esc(P.labelNe)}</span> · FY ${esc(P.fy)}</div>
      <div class="k">AD dates</div><div class="v mono">${esc(P.from)} → ${esc(P.to)}</div>
      <div class="k">Company</div><div class="v">${co.name ? esc(co.name) : '<span style="color:var(--bad)">not set</span>'} · PAN <span class="mono">${co.pan ? esc(co.pan) : '<span style="color:var(--bad)">not set</span>'}</span>${S.isAdmin ? ' · <a href="#" data-report="settings">Settings</a>' : ''}</div>
      <div class="k">Return due</div><div class="v">usually within 25 days after the period ends — confirm with the CA</div></div></div>
    ${warn.length ? `<div class="card" style="border-color:var(--warn)">${warn.map((w) => `<div class="warn">⚠️ ${esc(w)}</div>`).join('')}</div>` : '<div class="card" style="border-color:var(--ok)"><div class="status">✅ Ready for the CA — every row has a bill number</div></div>'}
    <div class="sumgrid">
      <div><span>Taxable sales (value)</span><b class="num">${n2(book.totals.taxable)}</b></div>
      <div><span>VAT on sales 13%</span><b class="num">${n2(book.totals.vat)}</b></div>
      <div><span>Exempt · export</span><b class="num">0.00</b></div>
      <div><span>Rows (bills)</span><b class="num">${rows.length}</b></div>
      <div><span>Cash received</span><b class="num">${n2(book.totals.cash + book.penalties.reduce((s, x) => s + x.amount, 0))}</b></div>
      <div><span>Deposit received (liability)</span><b class="num">${n2(dep.received)}</b></div>
      <div><span>Deposit refunded · forfeited</span><b class="num">${n2(dep.refunded)} · ${n2(dep.forfeited)}</b></div>
      <div><span>Deposit held now</span><b class="num">${n2(X.heldEnd)}</b></div>
      <div><span>Purchases with VAT bill (value)</span><b class="num">${n2(buy.totals.local + buy.totals.import + buy.totals.capital)}</b></div>
      <div><span>Input VAT (purchases)</span><b class="num">${n2(buy.totals.vat)}</b></div>
      <div class="hl"><span>VAT to pay = sales VAT − input VAT</span><b class="num">${n2(vatNet)}</b></div>
    </div>
    <div class="muted">Input VAT comes from expenses entered with a VAT bill (${buy.rows.filter((r) => r.kind !== 'exempt').length} bills this period). Whether each one can be claimed is the CA's call.</div>
    <div class="row wrap"><button class="btn" data-act="capackXlsx">⬇️ Excel — IRD format</button><button class="btn ghost" data-act="capackCsv">⬇️ CSV</button><button class="btn ghost" data-act="capackPrint">🖨️ Print / PDF</button><button class="btn ghost" data-act="capackMsg">✉️ Message for the CA</button></div>
    <div id="capackMsgBox"></div>
    <div class="card scroll-x" data-noi18n><div class="ird-head"><b>${IRD_TITLE}</b> <span class="muted">${IRD_RULE}</span><br><span class="muted">करदाता दर्ता नं (PAN): ${esc(co.pan || '—')} · करदाताको नाम: ${esc(co.name || '—')} · साल: ${P.y} · कर अवधि: ${esc(P.labelNe)}</span></div>
      <table class="tbl ird"><tr><th colspan="7">बीजक</th><th rowspan="2">${IRD_COLS[7][0]}<small>${IRD_COLS[7][1]}</small></th><th rowspan="2">${IRD_COLS[8][0]}<small>${IRD_COLS[8][1]}</small></th><th colspan="2">करयोग्य बिक्री</th><th colspan="4">निकासी</th></tr>
      <tr>${IRD_COLS.map((c, i) => (i === 7 || i === 8 ? '' : `<th>${c[0]}<small>${c[1]}</small></th>`)).join('')}</tr>
      ${rows.slice(0, 300).map((r) => `<tr class="${r.billNo ? '' : 'nobill'}"><td class="mono nw">${esc(B.fmtBs(B.adToBs(r.date)))}</td><td class="mono">${r.billNo ? esc(r.billNo) : '<span style="color:var(--bad)">—</span>'}</td><td>${esc(r.buyer)}</td><td class="mono">${esc(r.buyerPan)}</td><td>${esc(r.item)}</td><td class="n">${r.qty}</td><td>${esc(UNIT_NE[r.unit] || r.unit)}</td><td class="n">${n2(r.total)}</td><td class="n">0.00</td><td class="n">${n2(r.taxable)}</td><td class="n">${n2(r.vat)}</td><td></td><td></td><td></td><td></td></tr>`).join('') || '<tr><td colspan="15" class="muted">No sales in this period</td></tr>'}
      ${rows.length ? `<tr class="tot"><td colspan="7"><b>जम्मा</b></td><td class="n"><b>${n2(book.totals.total)}</b></td><td class="n">0.00</td><td class="n"><b>${n2(book.totals.taxable)}</b></td><td class="n"><b>${n2(book.totals.vat)}</b></td><td colspan="4"></td></tr>` : ''}</table>
      ${rows.length > 300 ? `<div class="muted">+${rows.length - 300} more rows in the Excel file</div>` : ''}</div>
    ${book.penalties.length || book.skipped.length ? `<div class="card"><div class="status" style="font-size:14px">Left out of the sales book</div>${book.penalties.map((x) => `<div class="muted">⚖️ ${esc(x.p.date)} · ${esc(x.c.name || '')} · penalty ${n2(x.amount)} — ask the CA</div>`).join('')}${book.skipped.slice(0, 30).map((x) => `<div class="muted">· ${esc(x.p.date)} · ${esc(x.c.name || '')} · ${n2(x.p.amount)} — ${esc(x.why)}</div>`).join('')}</div>` : ''}
    <div class="muted">🚨 This app does not issue tax invoices. Type the number of the VAT bill you actually gave (bill book or approved billing software) in each payment — that is the “Bill no.” column.</div>
  </div>`;
}

// ---------- files ----------
function rowsAoa(X) {
  const { P, book, co } = X;
  const head = [[IRD_TITLE], [IRD_RULE], [], [`करदाता दर्ता नं (PAN) : ${co.pan || '…'}        करदाताको नाम: ${co.name || '…'}         साल    ${P.y}      कर अवधि: ${P.labelNe}`],
    ['बीजक', '', '', '', '', '', '', IRD_COLS[7][0], IRD_COLS[8][0], 'करयोग्य बिक्री', '', 'निकासी', '', '', ''],
    IRD_COLS.map((c, i) => (i === 7 || i === 8 ? '' : c[0]))];
  const body = book.rows.map((r) => [B.fmtBs(B.adToBs(r.date)), r.billNo, r.buyer, r.buyerPan, r.item, r.qty, UNIT_NE[r.unit] || r.unit, r.total, 0, r.taxable, r.vat, '', '', '', '']);
  const tot = ['जम्मा', '', '', '', '', '', '', book.totals.total, 0, book.totals.taxable, book.totals.vat, '', '', '', ''];
  return { aoa: [...head, ...body, tot], bodyStart: head.length };
}
function loadXlsx() { return window.XLSX ? Promise.resolve(window.XLSX) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = './vendor/xlsx.full.min.js'; s.onload = () => res(window.XLSX); s.onerror = rej; document.head.appendChild(s); }); }
export const fileBase = (X) => `KORA-sales-book-${X.P.y}-${String(X.P.m).padStart(2, '0')}${X.P.n > 1 ? '-x' + X.P.n : ''}`;
export async function packXlsx(X, write = true) {
  const XL = await loadXlsx(); const wb = XL.utils.book_new();
  const { aoa } = rowsAoa(X);
  const ws = XL.utils.aoa_to_sheet(R.sheetSafe(aoa));
  ws['!merges'] = ['A1:O1', 'A2:O2', 'A3:O3', 'A4:O4', 'A5:G5', 'H5:H6', 'I5:I6', 'J5:K5', 'L5:O5'].map((r) => XL.utils.decode_range(r));
  ws['!cols'] = [12, 12, 26, 14, 34, 8, 8, 16, 14, 14, 12, 14, 12, 14, 14].map((w) => ({ wch: w }));
  XL.utils.book_append_sheet(wb, ws, 'बिक्री खाता');
  const { P, book, dep, co, warn } = X;
  const sum = [['KORA CARE — CA pack'], [], ['Company', co.name], ['PAN', co.pan], ['Address', co.address], ['Period (BS)', P.label, P.labelNe], ['AD dates', P.from, P.to], ['Fiscal year', P.fy], [],
    ['Taxable sales — value (excl. VAT)', book.totals.taxable], ['VAT on sales 13%', book.totals.vat], ['Exempt sales', 0], ['Export', 0], ['Rows', book.rows.length], [],
    ['Cash received (all payments in the period)', book.totals.cash + book.penalties.reduce((s, x) => s + x.amount, 0)], ['  of which deposit (refundable — not a sale)', dep.received], ['  of which penalties (left out — ask)', book.penalties.reduce((s, x) => s + x.amount, 0)],
    ['Deposit refunded in the period', dep.refunded], ['Deposit forfeited in the period (in the sales book)', dep.forfeited], ['Deposit held (today)', X.heldEnd], [],
    ['Purchases — value with VAT bill', X.buy.totals.local + X.buy.totals.import + X.buy.totals.capital], ['Input VAT', X.buy.totals.vat], ['Purchases without VAT bill', X.buy.totals.exempt], ['VAT to pay (sales VAT − input VAT)', X.vatNet], [],
    ['Checks'], ...(warn.length ? warn.map((w) => ['⚠️ ' + w]) : [['✅ every row has a bill number']]), [],
    ['How the numbers are made'], ['Prices include VAT: value = amount ÷ 1.13, VAT = amount − value.'], ['Cash basis by payment date (same as the app\'s VAT report) — confirm the basis.'],
    ['Deposit (300 × 12 = 3,600) is a refundable liability; it becomes a sale only when forfeited (lawyer R3 D2(c)).'], ['“Total sales” column is without VAT — confirm.'], ['Purchase book = expenses entered in the app; purchases without a VAT bill sit in the exempt column — confirm.'], ['Generated ' + new Date().toISOString()]];
  const ws2 = XL.utils.aoa_to_sheet(R.sheetSafe(sum)); ws2['!cols'] = [{ wch: 52 }, { wch: 22 }, { wch: 22 }]; XL.utils.book_append_sheet(wb, ws2, 'Summary');
  const det = [['AD date', 'BS date', 'Bill no.', 'Customer code', 'Customer', 'Buyer PAN', 'Item', 'Qty', 'Unit', 'Cash received', 'Sales value', 'VAT', 'Deposit part', 'Paid by', 'Transaction ID', 'Record id'],
    ...book.rows.map((r) => [r.date, B.fmtBs(B.adToBs(r.date)), r.billNo, r.code, r.buyer, r.buyerPan, r.item, r.qty, r.unit, r.cash, r.taxable, r.vat, Math.round(r.deposit * 100) / 100, r.method, r.ref, r.id]),
    ...book.penalties.map((x) => [x.p.date, B.fmtBs(B.adToBs(x.p.date)), x.p.billNo || '', x.c.code || '', x.c.name || '', '', 'PENALTY (not in the sales book)', 1, '', x.amount, '', '', '', x.p.method || '', x.p.ref || '', x.p.id])];
  const ws3 = XL.utils.aoa_to_sheet(R.sheetSafe(det)); ws3['!cols'] = det[0].map((h) => ({ wch: Math.max(10, h.length + 2) })); XL.utils.book_append_sheet(wb, ws3, 'Detail (AD)');
  const m = model(); const depRows = [['Customer code', 'Customer', 'Collected to date', 'Refunded', 'Forfeited', 'Held'], ...m.deposits.rows.filter((r) => r.collected || r.refunded || r.forfeited).map((r) => [r.c.code, r.c.name, r.collected, r.refunded, r.forfeited, r.held]), ['Total', '', m.deposits.total.collected, m.deposits.total.refunded, m.deposits.total.forfeited, m.deposits.total.held]];
  XL.utils.book_append_sheet(wb, XL.utils.aoa_to_sheet(R.sheetSafe(depRows)), 'Deposits');
  const pb = [['खरिद खाता'], ['(नियम २३ को उपनियम (१) को खण्ड (छ) संग सम्बन्धित)'], [], [`करदाता दर्ता नं (PAN) : ${co.pan || '…'}        करदाताको नाम: ${co.name || '…'}         साल    ${P.y}      कर अवधि: ${P.labelNe}`],
    ['बीजक / प्रज्ञापनपत्र नम्बर', '', '', '', '', '', '', '', 'जम्मा खरिद मूल्य (रु)', 'कर छुट हुने वस्तु वा सेवाको खरिद / पैठारी मूल्य (रु)', 'करयोग्य खरिद (पूंजीगत बाहेक)', '', 'करयोग्य पैठारी (पूंजीगत बाहेक)', '', 'पूंजीगत करयोग्य खरिद / पैठारी', ''],
    ['मिति', 'बीजक नं.', 'प्रज्ञापनपत्र नं.', 'आपूर्तिकर्ताको नाम', 'आपूर्तिकर्ताको स्थायी लेखा नम्बर', 'खरिद/पैठारी गरिएका वस्तु वा सेवाको विवरण', 'खरिद/पैठारी गरिएका वस्तु वा सेवाको परिमाण', 'खरिद/पैठारी गरिएका वस्तु वा सेवा मापन गर्ने इकाइ', '', '', 'मूल्य (रु)', 'कर (रु)', 'मूल्य (रु)', 'कर (रु)', 'मूल्य (रु)', 'कर (रु)'],
    ...X.buy.rows.map((r) => [B.fmtBs(B.adToBs(r.date)), r.billNo, r.customsNo, r.supplier, r.supplierPan, r.item, r.qty, r.unit, r.total,
      r.kind === 'exempt' ? r.value : '', r.kind === 'local' ? r.value : '', r.kind === 'local' ? r.vat : '', r.kind === 'import' ? r.value : '', r.kind === 'import' ? r.vat : '', r.kind === 'capital' ? r.value : '', r.kind === 'capital' ? r.vat : '']),
    ['जम्मा', '', '', '', '', '', '', '', X.buy.totals.total, X.buy.totals.exempt, X.buy.totals.local, X.buy.totals.localVat, X.buy.totals.import, X.buy.totals.importVat, X.buy.totals.capital, X.buy.totals.capitalVat],
    [], ['(From the expenses entered in KORA Field. Purchases without a VAT bill are in the exempt column — confirm with the CA.)']];
  const ws5 = XL.utils.aoa_to_sheet(R.sheetSafe(pb)); ws5['!merges'] = ['A1:P1', 'A2:P2', 'A3:P3', 'A4:P4', 'A5:H5', 'I5:I6', 'J5:J6', 'K5:L5', 'M5:N5', 'O5:P5'].map((r) => XL.utils.decode_range(r));
  XL.utils.book_append_sheet(wb, ws5, 'खरिद खाता');
  if (write) XL.writeFile(wb, fileBase(X) + '.xlsx');
  return wb;
}
export function packCsv(X) {
  const cols = IRD_COLS.map((c, i) => ({ label: `${c[0]} / ${c[1]}`, get: (r) => r[i] }));
  const body = X.book.rows.map((r) => [B.fmtBs(B.adToBs(r.date)), r.billNo, r.buyer, r.buyerPan, r.item, r.qty, UNIT_NE[r.unit] || r.unit, r.total.toFixed(2), '0.00', r.taxable.toFixed(2), r.vat.toFixed(2), '', '', '', '']);
  return '﻿' + R.toCSV(body, cols);
}
export function packPrint(X) {
  const { P, book, co } = X; const w = window.open('', '_blank'); if (!w) return false;
  const th = `<tr><th colspan="7">बीजक</th><th rowspan="2">${IRD_COLS[7][0]}</th><th rowspan="2">${IRD_COLS[8][0]}</th><th colspan="2">करयोग्य बिक्री</th><th colspan="4">निकासी</th></tr><tr>${IRD_COLS.map((c, i) => (i === 7 || i === 8 ? '' : `<th>${c[0]}</th>`)).join('')}</tr>`;
  w.document.write(`<!doctype html><html lang="ne"><head><meta charset="utf-8"><title>${esc(fileBase(X))}</title><style>@page{size:A4 landscape;margin:10mm}body{font:11px/1.35 system-ui,sans-serif;color:#000}h1{font-size:18px;text-align:center;margin:0}p{text-align:center;margin:2px 0 8px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #444;padding:3px 4px;vertical-align:top}th{background:#eee;font-weight:600}td.n{text-align:right;white-space:nowrap}tr.tot td{font-weight:700;background:#f6f6f6}.foot{margin-top:8px;font-size:10px;color:#444}</style></head><body>
    <h1>${IRD_TITLE}</h1><p>${IRD_RULE}</p><p>करदाता दर्ता नं (PAN): <b>${esc(co.pan || '…')}</b> &nbsp; करदाताको नाम: <b>${esc(co.name || '…')}</b> &nbsp; साल: <b>${P.y}</b> &nbsp; कर अवधि: <b>${esc(P.labelNe)}</b></p>
    <table>${th}${book.rows.map((r) => `<tr><td>${esc(B.fmtBs(B.adToBs(r.date)))}</td><td>${esc(r.billNo)}</td><td>${esc(r.buyer)}</td><td>${esc(r.buyerPan)}</td><td>${esc(r.item)}</td><td class="n">${r.qty}</td><td>${esc(UNIT_NE[r.unit] || r.unit)}</td><td class="n">${n2(r.total)}</td><td class="n">0.00</td><td class="n">${n2(r.taxable)}</td><td class="n">${n2(r.vat)}</td><td></td><td></td><td></td><td></td></tr>`).join('')}
    <tr class="tot"><td colspan="7">जम्मा</td><td class="n">${n2(book.totals.total)}</td><td class="n">0.00</td><td class="n">${n2(book.totals.taxable)}</td><td class="n">${n2(book.totals.vat)}</td><td colspan="4"></td></tr></table>
    <div class="foot">AD ${esc(P.from)} → ${esc(P.to)} · KORA Field · ${esc(new Date().toISOString().slice(0, 16).replace('T', ' '))}</div><script>setTimeout(()=>print(),300)<\/script></body></html>`);
  w.document.close(); return true;
}
export function packMessage(X) {
  const { P, book, dep } = X;
  return `Namaste,\n\nPlease find the sales book (बिक्री खाता) and purchase book (खरिद खाता) for ${P.label} (${P.labelNe}, AD ${P.from} to ${P.to}) attached.\n\nTaxable sales (value): NPR ${n2(book.totals.taxable)}\nVAT on sales 13%: NPR ${n2(book.totals.vat)}\nBills: ${book.rows.length}\nRefundable deposit received (not a sale): NPR ${n2(dep.received)}${book.penalties.length ? `\nPenalty payments left out (please advise): ${book.penalties.length}` : ''}\nPurchases with VAT bill: NPR ${n2(X.buy.totals.local + X.buy.totals.import + X.buy.totals.capital)} · input VAT NPR ${n2(X.buy.totals.vat)}\nVAT to pay (our calculation): NPR ${n2(X.vatNet)}\n\nThe bills are attached as photos / PDFs. Please check which input VAT can be claimed.\n\nThank you,\nKORA CARE`;
}
