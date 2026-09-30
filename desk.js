// KORA Field — command centre for wide screens (Jun's MacBook). Everything on one screen; details slide in from the right.
// Data changes update the page in place (no rebuild of the shell, no replay of the entrance animations, the map stays).
import * as R from './logic.js';
import * as B from './bs.js';
import { langSegHtml, fmtDate, fmtTime, getLang, setLang } from './i18n.js';
import { loadLeaflet, MAP_OPTS, TILE, POKHARA, addLocate, hereIfAllowed, drawMe, hereNow } from './geo.js';
import { isBoss, fetchDevices, deviceIssues, heartbeat, deviceId, performPeriod, userName, ensureUsers, S, model, esc, custLabel, toleOf, screenHtml, afterRender, dunItem, collectionGroups, chaseStatsLine, reqItem, gateCards, fclCard, syncState, cItem, APP_VERSION, waLink, dunText, arr, DEMO, custListHtml, routeLink, alertsHtml, liveAlerts, go, nav, render, toast, dataQuality, can, locHelp, refreshLocBtn, peek, closePeek, openDrawer, techNames, save, OPT, today, watchItem } from './app.js';
import * as CA from './capack.js';
import * as CAL from './cal.js';
import * as SIM from './sim.js';
export { loadLeaflet };

const NPT = 'Asia/Kathmandu';
const fmtN = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN');
const fmtK = (v) => (Math.abs(v) >= 100000 ? (v / 100000).toFixed(1) + 'L' : Math.abs(v) >= 1000 ? Math.round(v / 1000) + 'k' : fmtN(v));
const HEX = { g: '#2ee59d', y: '#ffcc4d', o: '#ff9a3d', r: '#ff5c5c', k: '#5d7085', b: '#6aa8ff' };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monLabel = (mk) => `${MON[Number(mk.slice(5, 7)) - 1]} ${mk.slice(0, 4)}`;
const monthEnd = (mk) => R.addDays(R.addMonths(mk + '-01', 1), -1);

// ---------- shell ----------
// [key, icon, label, right, group] — grouped so the sidebar reads like the company: the day · customers · money · company
const SIDE = [
  ['command', '◎', 'Command', '', 'Run the day'], ['calendar', '🗓️', 'Calendar', '', 'Run the day'], ['live', '📡', 'Field live', 'admin', 'Run the day'], ['dispatch', '🧭', 'Dispatch', 'admin', 'Run the day'], ['capacity', '👷', 'Capacity', '', 'Run the day'], ['field', '🔧', 'Field work', '', 'Run the day'], ['map', '🗺️', 'Map', '', 'Run the day'],
  ['customers', '👥', 'Customers', '', 'Customers & growth'], ['watch', '⚠️', 'Watch list', '', 'Customers & growth'], ['leavers', '🚪', 'Leavers', '', 'Customers & growth'], ['network', '🕸️', 'Referrals', '', 'Customers & growth'],
  ['money', '💰', 'Money', 'money', 'Money & plans'], ['history', '📅', 'History', 'money', 'Money & plans'], ['whatif', '🎛️', 'What-if', 'money', 'Money & plans'],
  ['devices', '📦', 'Devices', '', 'Company'], ['staff', '🪪', 'Staff', 'admin', 'Company'], ['phones', '📱', 'Phones', 'admin', 'Company'], ['changes', '🕵️', 'Change log', 'admin', 'Company'], ['reports', '📑', 'Reports', '', 'Company'], ['backup', '💾', 'Backup', 'admin', 'Company'], ['status', '⚙️', 'Sync & settings', '', 'Company'],
];
export const DESK_PAGES = [...SIDE.map((x) => x[0]), 'report'];
const sideOk = (x) => !x[3] || (x[3] === 'admin' ? isBoss() : can(x[3]));
let last = { side: '', tick: '', bell: '' };
export function renderDesk(root, fresh) {
  const m = model(); const scr = S.route.screen; NOTES = chartNotes(m);
  let shell = root.querySelector('.shell');
  const rebuild = !shell || shell.dataset.shellLang !== getLang();
  const keepMap = map && mapEl && mapEl.isConnected ? mapEl : null;
  if (keepMap) keepMap.remove(); // detach — the Leaflet map lives on and is put back below
  if (rebuild) {
    root.innerHTML = `<div class="aurora"><i></i><i></i><i></i></div><div class="shell" data-shell-lang="${getLang()}">
      <aside class="side" id="deskSide"></aside>
      <section class="deskmain">
        <div class="topbar">
          <div class="ttl" id="deskTtl"></div>
          <div style="position:relative"><input id="deskSearch" class="search" placeholder="Search customers · code · phone · tole" autocomplete="off"><div id="deskSearchRes" class="card hidden" style="position:absolute;top:36px;left:0;width:360px;z-index:30;max-height:60vh;overflow:auto;padding:4px 12px"></div></div>
          <button class="kbtn" data-act="palette" title="Search & actions">⌘K</button>
          <button class="locbtn" data-act="locAsk" data-locstate="unknown" title="Allow location">📍</button>
          <div class="sp"></div>
          <div style="position:relative" id="bellWrap"></div>
          <button class="story-btn" data-act="story">▶ Story</button>
          <button class="kbtn" data-act="tv" title="TV mode — pages rotate every 20 s">📺</button>
          <div class="lang-top" title="Language">🌐 ${langSegHtml()}</div>
          <div class="sync"><span class="dot live" data-sync-dot></span><span data-sync-text></span></div>
          <div class="clock" id="clock"></div>
        </div>
        <div class="ticker"><div class="tr" id="deskTick"></div></div>
        <div class="deskpage" id="deskPage"></div>
      </section></div>`;
    shell = root.querySelector('.shell'); last = { side: '', tick: '', bell: '' };
  }
  // sidebar (only rewritten when it changes, so its animation does not restart on every data change)
  const badges = { money: m.collections.filter((x) => ['call', 'visit'].includes(x.dn.stage) && !(x.pr && x.pr.status === 'waiting')).length, field: m.visitsDue.length + m.openReq.filter((o) => Date.now() > o.sla.replyBy).length };
  const side = `<div class="brand"><div class="logo"></div><div><b>KORA</b><small>FIELD · COMMAND</small></div></div>
      ${SIDE.filter(sideOk).map(([k, i, l, , g], n, arr) => `${n === 0 || arr[n - 1][4] !== g ? `<div class="side-grp">${esc(g)}</div>` : ''}<button data-side="${k}" class="${scr === k || (scr === 'report' && k === 'reports') ? 'on' : ''}"><span class="i">${i}</span>${l}${badges[k] ? `<span class="badge">${badges[k]}</span>` : ''}</button>`).join('')}
      <div class="grow"></div>
      <div class="side-lang"><div class="lbl">🌐 Language</div>${langSegHtml()}</div>
      ${can('install') ? '<button data-go-form="install"><span class="i">＋</span>New install</button>' : ''}
      ${can('pay') ? '<button data-go-form="payment"><span class="i">＋</span>Payment</button>' : ''}
      ${can('expense') ? '<button data-go-form="expense"><span class="i">＋</span>Expense</button>' : ''}
      <button data-act="deskOff"><span class="i">📱</span>Phone view</button>
      <div class="foot">${esc(APP_VERSION)}${DEMO ? '<br><span style="color:var(--warn)">DEMO DATA</span>' : ''}<br>${esc(S.user.email)}<br><span class="muted">⌘K · Esc · ‹ Back</span></div>`;
  if (side !== last.side) { root.querySelector('#deskSide').innerHTML = side; last.side = side; }
  root.querySelector('#deskTtl').innerHTML = `KORA <b>${esc(scr === 'report' ? 'Reports' : (SIDE.find((x) => x[0] === scr) || SIDE[0])[2])}</b> · Pokhara`;
  const nAl = liveAlerts(m).length;
  const bell = `<button class="bell" data-act="bell" title="Alerts">🔔${nAl ? `<span class="badge">${nAl}</span>` : ''}</button><div id="bellBox" class="card bellbox hidden">${alertsHtml(m)}</div>`;
  if (bell !== last.bell) { const open = document.getElementById('bellBox') && !document.getElementById('bellBox').classList.contains('hidden'); root.querySelector('#bellWrap').innerHTML = bell; if (open) document.getElementById('bellBox').classList.remove('hidden'); last.bell = bell; }
  const s = syncState(); root.querySelectorAll('[data-sync-dot]').forEach((el) => { el.className = 'dot live ' + s.c; }); root.querySelectorAll('[data-sync-text]').forEach((el) => { el.textContent = s.t; });
  const tick = activity(m, 14).map((e) => `<span>${e.ic} ${e.txt} · <span class="mono">${agoS(e.t)}</span></span>`).join('');
  if (tick !== last.tick) { root.querySelector('#deskTick').innerHTML = tick; last.tick = tick; }
  // page
  const pg = root.querySelector('#deskPage');
  pg.className = `deskpage ${['status'].includes(scr) ? 'narrow' : ''} ${fresh ? 'page-in' : 'calm'}`;
  if (fresh) { void pg.offsetWidth; }
  pg.innerHTML = page(scr, m);
  tickClock(); ensureClock();
  animateCounts(root);
  const box = pg.querySelector('#mapBox');
  if (box && keepMap) { const lc = [...keepMap.classList].filter((c) => c.startsWith('leaflet')); keepMap.className = [box.className, ...lc].join(' '); keepMap.style.height = box.style.height; box.replaceWith(keepMap); try { map.invalidateSize({ animate: false }); drawMarkers(); } catch (e) { dropMap(); mountMap(keepMap); } }
  else if (box) mountMap(box);
  else dropMap();
  if (scr === 'status') afterRender(pg, { screen: 'status', params: {} });
  if (scr === 'staff') afterRender(pg, { screen: 'report', params: { r: 'users' } });
  if (scr === 'report') afterRender(pg, { screen: 'report', params: S.route.params || {} });
  if (scr === 'backup') afterRender(pg, { screen: 'report', params: { r: 'backup' } });
  if (isBoss() && (!S.fleetAt || Date.now() - S.fleetAt > (scr === 'phones' ? 60e3 : 600e3))) loadFleet(scr === 'phones'); // phones page: once a minute · elsewhere every 10 min (the 📱 alerts use it) — a load re-renders
  refreshLocBtn();
}
const noBack = (h) => h.replace(/<button class="back" data-back>[^<]*<\/button>/, '');
function page(scr, m) {
  const def = SIDE.find((x) => x[0] === scr); if (def && !sideOk(def)) return pageCommand(m); // never hint at pages beyond the account's rights
  if (scr === 'report') return reportPage(m, S.route.params || {});
  if (scr === 'calendar') return pageCalendar(m);
  if (scr === 'whatif') return pageWhatIf(m);
  if (scr === 'watch') return pageWatch(m);
  if (scr === 'phones') return pagePhones(m);
  if (scr === 'changes') return pageChanges(m);
  if (scr === 'network') return pageNetwork(m);
  if (scr === 'live') return pageLive(m);
  if (scr === 'dispatch') return pageDispatch(m);
  if (scr === 'backup') return reportPage(m, { r: 'backup' }, true);
  if (scr === 'leavers') return reportPage(m, { r: 'leavers' }, true);
  if (scr === 'capacity') return reportPage(m, { r: 'capacity' }, true);
  if (scr === 'devices') return `<div class="panel" style="--i:0">${noBack(screenHtml({ screen: 'report', params: { ...S.route.params, r: 'devices' } }))}</div>`;
  if (scr === 'staff') return `<div class="panel" style="--i:0">${noBack(screenHtml({ screen: 'report', params: { r: 'users' } }))}</div>`;
  if (scr === 'customers') return pageCustomers(m);
  if (scr === 'money') return pageMoney(m);
  if (scr === 'field') return pageField(m);
  if (scr === 'map') return `<div class="panel" style="--i:0"><div class="ph"><span class="t"><b>Map</b> · every household</span><span class="sp"></span>${legend()}<button class="btn small" data-act="replay" style="margin:0 0 0 10px">▶ Replay growth</button></div><div id="mapBox" class="mapbox tall"></div><div class="muted" style="margin-top:6px">📍 = your location (needs location allowed for this site) · scroll gently to zoom</div></div>`;
  if (scr === 'history') return pageHistory(m);
  if (scr === 'reports') return pageReports();
  if (scr === 'status') return screenHtml({ screen: 'status', params: {} });
  return pageCommand(m);
}
let clockT = 0;
let clockN = 0;
function ensureClock() { if (!clockT) clockT = setInterval(() => { if (!S.desk) { clearInterval(clockT); clockT = 0; return; } tickClock(); if (++clockN % 60 === 0 && S.route.screen === 'live' && !S.drawer && !document.getElementById('peek')) reDesk(); }, 1000); } // field live: refresh the "min ago" once a minute
const KO_BS = ['바이사크', '제스타', '아사르', '스라완', '바드라', '아스윈', '카르틱', '망시르', '푸스', '마그', '팔군', '차이트라'];
const KO_WD = ['일', '월', '화', '수', '목', '금', '토'];
const EN_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const NE_DIG = (n) => String(n).replace(/\d/g, (x) => '०१२३४५६७८९'[x]);
// AD and Nepali (BS) dates written the same way, so the two calendars line up at a glance.
export function dualDate(iso, wd) {
  const [y, mo, dd] = iso.split('-').map(Number); const bs = B.adToBs(iso); const lang = getLang();
  if (lang === 'ko') return `${y}년 ${mo}월 ${dd}일${wd !== undefined ? ` (${KO_WD[wd]})` : ''}${bs ? ` · 네팔력 ${bs.y}년 ${KO_BS[bs.m - 1]} ${bs.d}일` : ''}`;
  if (lang === 'ne') return `${bs ? `${NE_DIG(bs.y)} ${B.BS_MONTHS_NE[bs.m - 1]} ${NE_DIG(bs.d)} · ` : ''}${dd} ${EN_MON[mo - 1]} ${y}`;
  return `${wd !== undefined ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][wd] + ' ' : ''}${dd} ${EN_MON[mo - 1]} ${y}${bs ? ` · ${bs.d} ${B.BS_MONTHS[bs.m - 1]} ${bs.y} BS` : ''}`;
}
function tickClock() {
  const el = document.getElementById('clock'); if (!el) return;
  const d = new Date(); const np = new Date(d.toLocaleString('en-US', { timeZone: NPT }));
  el.innerHTML = `<b>${fmtTime(d, { timeZone: NPT, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</b> NPT · <span data-noi18n>${esc(dualDate(R.fmtD(np), np.getDay()))}</span>`;
}

// ---------- counters: animate from the last shown value to the new one ----------
const shown = {};
function counter(key, value, fmt = 'int') { return `<span data-count="${esc(key)}" data-to="${Number(value) || 0}" data-fmt="${fmt}">${fmtVal(shown[key] ?? 0, fmt)}</span>`; }
function fmtVal(v, fmt) { return fmt === 'pct' ? (v * 100).toFixed(0) + '%' : fmt === 'pct1' ? (v * 100).toFixed(1) + '%' : fmt === 'dec' ? v.toFixed(2) : fmtN(v); }
function animateCounts(root) {
  const els = root.querySelectorAll('[data-count]'); const t0 = performance.now(); const dur = 1100;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = [...els].map((el) => ({ el, from: shown[el.dataset.count] ?? 0, to: Number(el.dataset.to), fmt: el.dataset.fmt, key: el.dataset.count }));
  items.forEach((i) => { if (i.from && i.from !== i.to) { const v = i.el.closest('.v'); if (v) { v.classList.remove('bump'); void v.offsetWidth; v.classList.add('bump'); } } shown[i.key] = i.to; });
  if (reduce || items.every((i) => i.from === i.to)) { items.forEach((i) => { i.el.textContent = fmtVal(i.to, i.fmt); }); return; }
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur); const e = 1 - Math.pow(1 - k, 3);
    for (const i of items) i.el.textContent = fmtVal(i.from + (i.to - i.from) * e, i.fmt);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const delta = (now, before, fmt = fmtN, goodUp = true) => { if (before === null || before === undefined) return ''; const d = now - before; if (Math.abs(d) < 1e-9) return '<span class="delta flat">±0</span>'; const up = d > 0; return `<span class="delta ${up === goodUp ? 'up' : 'down'}">${up ? '▲' : '▼'} ${fmt(Math.abs(d))}</span>`; };

// ---------- tiny SVG charts ----------
function spark(vals, color = 'var(--brand)', w = 220, h = 34) {
  if (!vals.length) return '';
  const max = Math.max(1, ...vals); const dx = w / Math.max(1, vals.length - 1);
  const pts = vals.map((v, i) => [i * dx, h - 2 - (v / max) * (h - 6)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const id = 'g' + Math.random().toString(36).slice(2, 7);
  return `<svg viewBox="0 0 ${w} ${h}" class="spark" preserveAspectRatio="none" style="width:100%;height:${h}px"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <path d="${d} L${w} ${h} L0 ${h} Z" fill="url(#${id})"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2" class="line sparkline"/></svg>`;
}
// "nice" axis: 1-2-5 steps so the labels never repeat (e.g. 0 · 1 · 2 · 3 instead of 1 · 2 · 2 · 3)
function niceAxis(maxV, intOnly) {
  const raw = Math.max(1, maxV) / 4; const p = Math.pow(10, Math.floor(Math.log10(raw))); const n = raw / p;
  // counts: no 0.5 ticks (they printed as a second "1")
  let step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; if (intOnly) step = Math.max(1, step); const top = Math.max(step, Math.ceil(maxV / step) * step);
  const ticks = []; for (let v = step; v <= top + 1e-9; v += step) ticks.push(v); return { top, ticks };
}
// bars(vals, labels, color, w, h, fmt, opts) — opts.hi = index to highlight, opts.data = attribute per bar (click target)
// ---------- chart notes (v0.8 #11): holidays · price changes · events marked on time charts ----------
// Holidays: closed spans of 3+ days on month charts (every closed day on day charts). Events: the kinds below, or any event marked "on the charts".
export const PRICE_HISTORY = [{ d: '2026-09-03', t: 'Prices set by the contract: day 1 4,900 · bills 2–13 1,400 · then 1,100' }];
export const NOTE_KINDS = ['Price change', 'Campaign', 'Demo / event', 'Stock arrival'];
let NOTES = [];
export function chartNotes(m) {
  const out = [];
  for (const hs of Object.values(m.hm || {})) for (const h of hs) if (h.kind === 'all' && h.first && !h.own) out.push({ d: h.from, until: h.until, t: h.n, ic: '🎉', kind: 'holiday', len: R.daysBetween(h.from, h.until) + 1 });
  for (const e of m.D.events || []) if (R.isDate(e.date) && e.status !== 'Cancelled' && (e.chart === 'Yes' || (e.chart !== 'No' && NOTE_KINDS.includes(e.kind)))) out.push({ d: e.date, until: R.isDate(e.endDate) && e.endDate > e.date ? e.endDate : e.date, t: e.title || e.kind, ic: e.kind === 'Price change' ? '💲' : e.kind === 'Campaign' ? '📣' : EV_IC[e.kind] || '📌', kind: 'event' });
  for (const q of PRICE_HISTORY) out.push({ d: q.d, until: q.d, t: q.t, ic: '💲', kind: 'price' });
  return out.sort((a, b) => a.d.localeCompare(b.d));
}
// keys: 'YYYY-MM' (month bars) · 'YYYY-MM-DD' (day bars) · [from, to] (week bars) → the notes of each bar
export function notesFor(keys, notes = NOTES) {
  return keys.map((k) => notes.filter((n) => (Array.isArray(k) ? n.d <= k[1] && n.until >= k[0] && (n.kind !== 'holiday' || n.len >= 2)
    : k.length === 7 ? n.d <= k + '-31' && n.until >= k + '-01' && (n.kind !== 'holiday' || n.len >= 3) : n.d <= k && n.until >= k))); // month bars: any overlap
}
function noteMarks(keys, x, top, bottom, iconY = top + 9) {
  const nts = notesFor(keys); const seen = new Map();
  const marks = nts.map((ns, i) => { if (!ns.length) return ''; for (const n of ns) if (!seen.has(n.t + n.d)) seen.set(n.t + n.d, n);
    return `<g class="cnote"><line x1="${x(i).toFixed(1)}" x2="${x(i).toFixed(1)}" y1="${top}" y2="${bottom}" stroke="var(--muted)" stroke-dasharray="2 3" opacity=".6"/><text x="${x(i).toFixed(1)}" y="${iconY}" text-anchor="middle" style="font-size:12px">${ns.map((n) => n.ic).filter((v, j, a) => a.indexOf(v) === j).join('')}</text><title>${esc(ns.map((n) => n.t).join(' · '))}</title></g>`; }).join('');
  const list = [...seen.values()];
  return { marks, legend: list.length ? `<div class="cnotes">${list.slice(0, 6).map((n) => `<span title="${esc(n.d)}">${n.ic} ${esc(n.t)} <i>${esc(n.d.slice(2, 7))}</i></span>`).join('')}${list.length > 6 ? `<span>+${list.length - 6}</span>` : ''}</div>` : '' };
}
function bars(vals, labels, color = 'var(--brand)', w = 560, h = 180, fmt = fmtN, opts = {}) {
  const { top: max, ticks } = niceAxis(Math.max(0, ...vals), vals.every((v) => Number.isInteger(v))); const pad = 34; const bw = (w - pad) / Math.max(1, vals.length);
  const grid = ticks.map((v) => { const y = (h - 20) * (1 - v / max) + 4; return `<line class="grid" x1="${pad}" x2="${w}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/><text class="ax" x="0" y="${(y + 3).toFixed(1)}">${fmt(v)}</text>`; }).join('');
  const bs = vals.map((v, i) => { const bh = (v / max) * (h - 24); const x = pad + i * bw + bw * 0.18; const hi = opts.hi === i; return `<rect class="barr${hi ? ' hi' : ''}" x="${x.toFixed(1)}" y="${(h - 20 - bh).toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${Math.max(0, bh).toFixed(1)}" rx="4" fill="${hi ? 'var(--warn)' : color}" style="animation-delay:${i * 40}ms" ${opts.data ? opts.data(i) : ''}><title>${esc(labels[i])}: ${fmt(v)}</title></rect>`; }).join('');
  const every = Math.ceil(labels.length / 9);
  const ls = labels.map((l, i) => (i % every === 0 || opts.hi === i ? `<text class="ax${opts.hi === i ? ' hi' : ''}" x="${(pad + i * bw + bw / 2).toFixed(1)}" y="${h - 4}" text-anchor="middle">${esc(l)}</text>` : '')).join('');
  const nm = opts.keys ? noteMarks(opts.keys, (i) => pad + i * bw + bw / 2, 2, h - 20) : { marks: '', legend: '' };
  return `<div class="chart"><svg viewBox="0 0 ${w} ${h}">${grid}${bs}${nm.marks}${ls}</svg></div>${nm.legend}`;
}
function gauge(value, trigger, label, meta, good = 'high', judgeable = true) {
  const r = 58, cx = 80, cy = 80, a0 = Math.PI * 0.8, a1 = Math.PI * 2.2; const L = r * (a1 - a0);
  const v = value === null || value === undefined ? 0 : Math.max(0, Math.min(1, value));
  const bad = value !== null && value !== undefined && (good === 'high' ? value < trigger : value > trigger);
  const color = !judgeable ? 'var(--warn)' : bad ? 'var(--bad)' : 'var(--ok)';
  const arc = (from, to) => { const p = (a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]; const [x0, y0] = p(from), [x1, y1] = p(to); return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${to - from > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
  const tA = a0 + (a1 - a0) * Math.max(0, Math.min(1, trigger)); const tx = cx + (r + 9) * Math.cos(tA), ty = cy + (r + 9) * Math.sin(tA), tx2 = cx + (r - 9) * Math.cos(tA), ty2 = cy + (r - 9) * Math.sin(tA);
  const id = 'gg' + Math.random().toString(36).slice(2, 7);
  setTimeout(() => { const el = document.getElementById(id); if (el) el.style.strokeDashoffset = String(L * (1 - v)); }, 60);
  return `<div class="gauge"><svg viewBox="0 0 160 130"><path d="${arc(a0, a1)}" class="arc-bg" stroke-width="12" fill="none" stroke-linecap="round"/>
    <path id="${id}" d="${arc(a0, a1)}" class="arc-fg" stroke="${color}" style="color:${color};stroke-dasharray:${L.toFixed(1)};stroke-dashoffset:${L.toFixed(1)}" stroke-width="12" fill="none" stroke-linecap="round"/>
    <line x1="${tx.toFixed(1)}" y1="${ty.toFixed(1)}" x2="${tx2.toFixed(1)}" y2="${ty2.toFixed(1)}" stroke="var(--ink)" stroke-width="2" opacity=".6"/>
    <text x="80" y="84" text-anchor="middle" style="font:800 24px var(--mono);fill:var(--ink)">${value === null || value === undefined ? '—' : (value * 100).toFixed(value < 0.1 ? 1 : 0) + '%'}</text>
    <text x="80" y="102" text-anchor="middle" style="font:600 10px var(--mono);fill:var(--muted)">trigger ${(trigger * 100).toFixed(1).replace('.0', '')}%</text></svg>
    <div class="lbl">${esc(label)}</div><div class="meta">${esc(meta)}</div><div class="meta" style="color:${!judgeable ? 'var(--warn)' : bad ? 'var(--bad)' : 'var(--ok)'}">${!judgeable ? 'not judgeable yet' : bad ? 'TRIGGERED' : 'inside the line'}</div></div>`;
}
function donut(parts, size = 150, label = 'filter slots') {
  const total = parts.reduce((s, p) => s + p.v, 0) || 1; const r = 54, c = 2 * Math.PI * r; let off = 0;
  const segs = parts.map((p, i) => { const len = (p.v / total) * c; const s = `<circle r="${r}" cx="75" cy="75" fill="none" stroke="${p.color}" stroke-width="16" stroke-dasharray="${len.toFixed(1)} ${(c - len).toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}" transform="rotate(-90 75 75)" style="transition:stroke-dasharray 1s;animation:fadeIn .6s ${i * 120}ms both"><title>${esc(p.l)}: ${p.v}</title></circle>`; off += len; return s; }).join('');
  return `<svg viewBox="0 0 150 150" style="width:${size}px;height:${size}px"><circle r="${r}" cx="75" cy="75" fill="none" stroke="var(--line2)" stroke-width="16"/>${segs}
    <text x="75" y="72" text-anchor="middle" style="font:800 22px var(--mono);fill:var(--ink)">${parts.reduce((s, p) => s + p.v, 0)}</text><text x="75" y="90" text-anchor="middle" style="font:600 10px var(--sans);fill:var(--muted)">${esc(label)}</text></svg>`;
}
const fmtDays = (d) => (d === null || d === undefined ? '—' : `${Math.round(d * 10) / 10} day${Math.round(d * 10) / 10 === 1 ? '' : 's'}`);
// waterfall: totals stand on zero, moves float from the running level (v0.8 #8)
function waterfall(steps, w = 900, h = 260) {
  let run = 0; const pts = steps.map((q) => { if (q.kind === 'total') { run = q.v; return { ...q, a: Math.min(0, q.v), b: Math.max(0, q.v), lvl: q.v }; } const a = run; run += q.kind === 'down' ? -q.v : q.v; return { ...q, a: Math.min(a, run), b: Math.max(a, run), lvl: run }; });
  const max = Math.max(1, ...pts.map((q) => q.b)); const min = Math.min(0, ...pts.map((q) => q.a)); const pad = 8, bw = (w - pad * 2) / pts.length;
  const y = (v) => 22 + (max - v) / (max - min || 1) * (h - 70);
  const body = pts.map((q, i) => { const x = pad + i * bw + bw * 0.16, ww = bw * 0.68; const hh = Math.max(q.v ? 2 : 0, y(q.a) - y(q.b));
    const val = q.kind === 'total' || !q.v ? fmtK(q.v) : (q.kind === 'down' ? '−' : '+') + fmtK(q.v);
    const link = i < pts.length - 1 ? `<line x1="${(x + ww).toFixed(1)}" x2="${(pad + (i + 1) * bw + bw * 0.16).toFixed(1)}" y1="${y(q.lvl).toFixed(1)}" y2="${y(q.lvl).toFixed(1)}" stroke="var(--muted)" stroke-dasharray="3 3" opacity=".6"/>` : '';
    return `<rect x="${x.toFixed(1)}" y="${y(q.b).toFixed(1)}" width="${ww.toFixed(1)}" height="${hh.toFixed(1)}" rx="4" fill="${q.color}" opacity="${q.v ? 0.9 : 0.25}" data-tip="${esc(q.l + ' ' + val)}"/>${link}
      <text class="ax" x="${(x + ww / 2).toFixed(1)}" y="${(y(q.b) - 6).toFixed(1)}" text-anchor="middle" style="fill:var(--ink);font-weight:700">${esc(val)}</text>
      <text class="ax" x="${(x + ww / 2).toFixed(1)}" y="${h - 26}" text-anchor="middle">${esc(q.l)}</text>${q.sub ? `<text class="ax" x="${(x + ww / 2).toFixed(1)}" y="${h - 12}" text-anchor="middle" style="opacity:.7">${esc(q.sub)}</text>` : ''}`; }).join('');
  return `<div class="chart"><svg viewBox="0 0 ${w} ${h}"><line class="grid" x1="0" x2="${w}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}"/>${body}</svg></div>`;
}
// moves per month: gains above the line, losses below; tap a month to open its waterfall
function moveBars(rows, sel, w = 900, h = 220) {
  const up = rows.map((r) => r.newAmt + r.backAmt + r.upAmt), dn = rows.map((r) => r.leftAmt + r.stepAmt);
  const top = Math.max(1, ...up), bot = Math.max(1, ...dn); const pad = 44, bw = (w - pad - 8) / rows.length; const mid = 16 + (h - 44) * top / (top + bot);
  const sc = (h - 44) / (top + bot); const cols = [['newAmt', 'var(--ok)'], ['backAmt', 'var(--info)'], ['upAmt', 'var(--brand)']]; const colsD = [['leftAmt', 'var(--bad)'], ['stepAmt', 'var(--orange)']];
  const body = rows.map((r, i) => { const x = pad + i * bw + bw * 0.2, ww = bw * 0.6; let a = mid; let out = '';
    for (const [k, c] of cols) if (r[k]) { const hh = r[k] * sc; out += `<rect x="${x.toFixed(1)}" y="${(a - hh).toFixed(1)}" width="${ww.toFixed(1)}" height="${hh.toFixed(1)}" fill="${c}"/>`; a -= hh; }
    a = mid; for (const [k, c] of colsD) if (r[k]) { const hh = r[k] * sc; out += `<rect x="${x.toFixed(1)}" y="${a.toFixed(1)}" width="${ww.toFixed(1)}" height="${hh.toFixed(1)}" fill="${c}"/>`; a += hh; }
    const ny = mid - r.net * sc; const on = r.month === sel;
    return `<g data-bm="${r.month}" style="cursor:pointer"><rect x="${(pad + i * bw).toFixed(1)}" y="0" width="${bw.toFixed(1)}" height="${h}" fill="${on ? 'var(--brand)' : 'transparent'}" opacity="${on ? 0.08 : 0}"/>${out}<line x1="${(x - 3).toFixed(1)}" x2="${(x + ww + 3).toFixed(1)}" y1="${ny.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="var(--ink)" stroke-width="2.5"/><text class="ax${on ? ' hi' : ''}" x="${(x + ww / 2).toFixed(1)}" y="${h - 6}" text-anchor="middle">${esc(r.month.slice(2))}</text></g>`; }).join('');
  const nm = noteMarks(rows.map((r) => r.month), (i) => pad + i * bw + bw / 2, 2, h - 20);
  return `<div class="chart"><svg viewBox="0 0 ${w} ${h}">${nm.marks}<line class="grid" x1="${pad}" x2="${w}" y1="${mid.toFixed(1)}" y2="${mid.toFixed(1)}"/><text class="ax" x="0" y="${(mid - top * sc + 8).toFixed(1)}">+${fmtK(top)}</text><text class="ax" x="0" y="${(mid + 3).toFixed(1)}">0</text><text class="ax" x="0" y="${(mid + bot * sc).toFixed(1)}">−${fmtK(bot)}</text>${body}</svg></div>
    ${nm.legend}<div class="legend"><span><i class="sw" style="background:var(--ok)"></i>new</span><span><i class="sw" style="background:var(--info)"></i>came back</span><span><i class="sw" style="background:var(--brand)"></i>deposit starts</span><span><i class="sw" style="background:var(--bad)"></i>left</span><span><i class="sw" style="background:var(--orange)"></i>month-14 step</span><span>▬ net</span></div>`;
}
// horizontal bars with a label and a value on each row
function hbars(rows, color = 'var(--brand)', fmt = fmtN) {
  const max = Math.max(1, ...rows.map((r) => r.v));
  return `<div class="funnel hb">${rows.map((r, i) => `<div class="st" ${r.attr || ''}><span>${esc(r.l)}</span><div class="b"><i style="width:${(r.v / max) * 100}%;background:${r.color || color};animation-delay:${i * 70}ms"></i></div><span class="n">${fmt(r.v)}${r.sub ? `<small> ${esc(r.sub)}</small>` : ''}</span></div>`).join('')}</div>`;
}
const panel = (cls, i, title, body, action) => `<div class="panel ${cls}" style="--i:${i}"><div class="ph"><span class="t">${title}</span><span class="sp"></span>${action || ''}</div>${body}</div>`;
const legend = () => `<div class="legend" style="margin:0"><span><i class="dot g"></i>OK</span><span><i class="dot y"></i>overdue</span><span><i class="dot r"></i>7+ days</span><span><i class="dot b"></i>paused</span><span><i class="dot k"></i>left</span></div>`;

// ---------- pages ----------
function monthsBack(t, n) { const out = []; for (let i = n - 1; i >= 0; i--) out.push(R.monthKey(R.addMonths(t.slice(0, 7) + '-01', -i))); return out; }
function activity(m, n = 12) {
  const ev = [];
  const ts = (x) => (x.updatedAt && x.updatedAt.toMillis ? x.updatedAt.toMillis() : x._localT || (x.date ? R.parseD(x.date).getTime() + 12 * 3600e3 : 0));
  const cn = (id) => { const c = S.D.customers.get(id); return c ? c.name : ''; };
  for (const c of m.D.customers) ev.push({ t: ts(c), ic: '🏠', txt: `Install · <b>${esc(c.name)}</b> · ${esc(toleOf(c))}`, id: c.id });
  for (const p of m.D.payments) ev.push({ t: ts(p), ic: '💵', txt: `${R.npr(p.amount)} · ${esc(p.type)} · <b>${esc(cn(p.customerId))}</b>`, id: p.customerId });
  for (const v of m.D.visits) ev.push({ t: ts(v), ic: '🔧', txt: `${esc(v.visitType || 'Visit')} · <b>${esc(cn(v.customerId))}</b>${(v.filters || []).length ? ' · ' + esc(v.filters.join(', ')) : ''}`, id: v.customerId });
  for (const r of m.D.requests) ev.push({ t: r.receivedAtMs || ts(r), ic: '📋', txt: `${esc(r.type)} · <b>${esc(cn(r.customerId))}</b> · ${esc(r.status)}`, id: r.customerId });
  for (const l of m.D.leads) ev.push({ t: ts(l), ic: '🧲', txt: `Lead · <b>${esc(l.name)}</b> · ${esc(l.outcome || 'New')}` });
  return ev.filter((e) => e.t).sort((a, b) => b.t - a.t).slice(0, n);
}
const agoS = (ms) => { const s = (Date.now() - ms) / 1000; if (s < 0) return 'today'; if (s < 3600) return Math.max(1, Math.round(s / 60)) + 'm'; if (s < 86400) return Math.round(s / 3600) + 'h'; return Math.round(s / 86400) + 'd'; };
const activeIds = (m) => [...m.cust.values()].filter((x) => x.status === 'Active').map((x) => x.c.id);

// ---------- "unusual" chips: this week vs the 4 weeks before (Datadog-style), plus long breaks coming ----------
export function anomalies(m) {
  const t = m.t; const out = [];
  const wk = R.periodActivity(m.D, R.addDays(t, -6), t); const base = R.periodActivity(m.D, R.addDays(t, -34), R.addDays(t, -7));
  const cmp = (now, before4, min) => { const avg = before4 / 4; if (avg < min) return null; return (now - avg) / avg; };
  const c = cmp(wk.cash, base.cash, 1000); if (c !== null && Math.abs(c) >= 0.3) out.push({ lvl: c < 0 ? 'bad' : 'ok', ic: '💰', t: `Cash in this week ${c > 0 ? '+' : '−'}${Math.round(Math.abs(c) * 100)}% vs the usual week`, go: 'money' });
  const rq = cmp(wk.requestsIn.length, base.requestsIn.length, 0.5); if (rq !== null && rq >= 1 && wk.requestsIn.length >= 3) out.push({ lvl: 'bad', ic: '📋', t: `Requests ${(rq + 1).toFixed(1)}× the usual week (${wk.requestsIn.length})`, list: 'requests' });
  const ins = cmp(wk.installs.length, base.installs.length, 0.5); if (ins !== null && Math.abs(ins) >= 0.5) out.push({ lvl: ins < 0 ? 'warn' : 'ok', ic: '🏠', t: `Installs this week ${wk.installs.length} vs ${(base.installs.length / 4).toFixed(1)} usual`, go: 'history' });
  if (wk.churns.length >= 2) out.push({ lvl: 'bad', ic: '⚫', t: `${wk.churns.length} homes left this week`, go: 'customers' });
  // a long break coming (3+ days off in a row in the next 3 weeks)
  let run = [], best = null;
  for (let i = 0; i <= 45; i++) { const d = R.addDays(t, i); if (CAL.isOff(m.hm, d)) run.push(d); else { if (run.length >= 3 && !best) best = run.slice(); run = []; } }
  if (!best && run.length >= 3) best = run;
  if (best && best[0] <= R.addDays(t, 21)) { const names = [...new Set(best.flatMap((d) => (m.hm[d] || []).filter((h) => h.kind === 'all').map((h) => h.n)))]; out.push({ lvl: 'info', ic: '🎉', t: `${names.join(' + ') || 'Days off'} in ${R.daysBetween(t, best[0])} days — ${best.length} days off (${best[0].slice(5)} → ${best[best.length - 1].slice(5)}). Collect & visit before.`, cal: best[0] }); }
  return out;
}
function anomalyChips(m) {
  const xs = anomalies(m); if (!xs.length) return '';
  return `<div class="s12 anom">${xs.map((x) => `<button class="anom-c lv-${x.lvl}" ${x.go ? `data-side="${x.go}"` : x.list ? `data-list="${x.list}"` : x.cal ? `data-cal="${x.cal}"` : ''}><span>${x.ic}</span>${esc(x.t)}</button>`).join('')}</div>`;
}
function pageCommand(m) {
  const M = m.metrics, t = m.t;
  const weeks = M.weeks.map((w) => w.n);
  const mk = monthsBack(t, 12);
  const cashBy = Object.fromEntries(mk.map((k) => [k, 0]));
  for (const p of m.D.payments) if (!R.isNonCash(p) && cashBy[R.monthKey(p.date)] !== undefined) cashBy[R.monthKey(p.date)] += Number(p.amount) || 0;
  const cashVals = mk.map((k) => cashBy[k]);
  const H = historyModel(m); const prevMk = mk[mk.length - 2]; const prev = H.byMonth[prevMk];
  const fStat = { overdue: 0, soon: 0, ok: 0 }; for (const f of m.filtersAll) fStat[f.status] = (fStat[f.status] || 0) + 1;
  const stages = R.DUNNING.map((d) => ({ d, n: m.collections.filter((x) => x.dn.stage === d.stage).length }));
  const maxSt = Math.max(1, ...stages.map((s) => s.n));
  const stColor = { reminder: 'var(--info)', due: 'var(--warn)', late: 'var(--warn)', call: 'var(--orange)', visit: 'var(--bad)' };
  const byTole = {}; for (const x of m.visitsDue) byTole[toleOf(x.c)] = (byTole[toleOf(x.c)] || 0) + 1;
  const leadSt = ['New', 'Thinking', 'Demo booked', 'Signed', 'Rejected'].map((o) => ({ o, n: m.D.leads.filter((l) => (l.outcome || 'New') === o).length }));
  const maxL = Math.max(1, ...leadSt.map((x) => x.n));
  const F = M.fcl; const G = M.gate;
  const vatNow = m.vat.find((r) => r.month === R.monthKey(t));
  const act = activity(m);
  const obDone = [...m.cust.values()].filter((x) => x.status === 'Active');
  const obPct = ['D7'].map((k) => { const elig = obDone.filter((x) => x.ob.find((o) => o.k === k && o.status !== 'future')); const done = elig.filter((x) => x.ob.find((o) => o.k === k && o.status === 'done')); return { k, n: elig.length, d: done.length }; });
  const ag = R.agingBuckets(m.ledgers, activeIds(m), t); const out = R.cashOutlook(m.D.customers, m.ledgers, t, 28);
  const dq = dataQuality(m);
  return `<div class="cc">
    ${anomalyChips(m)}
    <div class="locbanner hidden s12" id="locBanner"><span>📍 Allow location once to see yourself on the map and to start directions from where you are.</span><button class="btn small" data-act="locAsk">📍 Allow location</button></div>
    ${panel('s3 kpi', 0, '<b>Households</b> · active', `<div class="v">${counter('act', M.active)}<small>/ ${M.installed} installed</small></div><div class="sub"><span>⏸ ${M.paused} paused</span><span>⚫ ${M.churned} left</span><span>${M.avg4w.toFixed(1)}/wk installs</span>${prev ? `<span>vs ${esc(monLabel(prevMk))} end ${delta(M.active, prev.M.active)}</span>` : ''}</div>${spark(weeks, 'var(--brand)')}`)}
    ${panel('s3 kpi', 1, '<b>Monthly recurring</b> · NPR', `<div class="v">${counter('mrr', M.mrr)}</div><div class="sub"><span>cash this month <b class="num">${fmtN(M.cashThisMonth)}</b></span>${prev ? `<span>last month ${fmtN(prev.A.cash)}</span>` : ''}<span>VAT ${vatNow ? fmtN(vatNow.vat) : 0}</span></div>${spark(cashVals, 'var(--ok)')}`)}
    ${panel('s3 kpi', 2, '<b>Collection</b> · bills paid', `<div class="v" style="color:${M.collection === null ? 'inherit' : M.collection < 0.5 ? 'var(--bad)' : M.collection < 0.8 ? 'var(--warn)' : 'var(--ok)'}">${M.collection === null ? '—' : counter('col', M.collection, 'pct')}</div><div class="sub"><span>${M.billsPaid}/${M.billsDue} bills</span><span>on time ${M.billsDue ? Math.round((M.onTime / M.billsDue) * 100) : 0}%</span><span style="color:var(--bad)">overdue ${fmtN(M.overdueAmt)}</span></div><div class="bar" style="margin-top:14px"><i style="width:${(M.collection || 0) * 100}%;background:var(--ok)"></i></div>`)}
    ${panel('s3 kpi', 3, '<b>Deposit held</b> · not our money', `<div class="v">${counter('dep', m.deposits.total.held)}</div><div class="sub"><span>collected ${fmtN(m.deposits.total.collected)}</span><span>refunded ${fmtN(m.deposits.total.refunded)}</span><span>forfeited ${fmtN(m.deposits.total.forfeited)}</span></div><div class="sub" style="margin-top:12px"><span class="pill ${F.ready ? 'ok' : F.stockSignal ? 'warn' : 'grey'}">FCL ${F.ready ? 'ORDER NOW' : F.stockSignal ? 'stock low' : 'not yet'}</span><span>${esc(`stock ${F.stockDevices} devices`)}</span></div>`)}

    ${panel('s8 r2', 4, '<b>Pokhara</b> · every household', `<div id="mapBox" class="mapbox" style="height:500px"></div><div class="legend">${legend()}<span class="muted">📍 your location</span></div>`, `<button class="a" data-side="map">full map →</button>`)}
    ${panel('s4', 5, '<b>Direction gate</b> · Plan B triggers', `<div class="gauges">${gauge(G.collection.value, G.collection.trigger, 'Collection', `${Math.round(G.collection.exposure)}/${G.collection.need} bills`, 'high', G.collection.judgeable)}${gauge(G.retention.value, G.retention.trigger, '90-day retention', `${G.retention.n}/${G.retention.need} homes`, 'high', G.retention.judgeable)}${gauge(G.churn.value, G.churn.trigger, 'Churn / month', `${Math.round(G.churn.exposure)}/${G.churn.need} hh-mo`, 'low', G.churn.judgeable)}</div>`, `<button class="a" data-report="gate">details →</button>`)}
    ${panel('s4', 6, '<b>FCL#1</b> · order signal', fclCard(F).replace('<div class="card">', '<div>'), `<button class="a" data-report="stock">stock →</button>`)}

    ${panel('s4', 7, '<b>Collections</b> · G-1 §1-3 pipeline', `<div class="funnel">${stages.map((s, i) => `<div class="st"><span>${esc(s.d.short)}</span><div class="b"><i style="width:${(s.n / maxSt) * 100}%;background:${stColor[s.d.stage]};animation-delay:${i * 80}ms"></i></div><span class="n">${s.n}</span></div>`).join('')}</div><div class="sub muted" style="margin-top:8px">to chase: <b class="num">${fmtN(m.collections.reduce((s, x) => s + x.dn.owed, 0))}</b> NPR · 7+ days: ${M.due7} homes</div>`, `<button class="a" data-list="collections">list →</button>`)}
    ${panel('s4', 8, '<b>Field today</b> · visits due by tole', Object.keys(byTole).length ? `<div class="heat">${Object.entries(byTole).sort((a, b) => b[1] - a[1]).slice(0, 9).map(([k, n]) => `<div class="cell" data-list="visits"><div class="n">${n}</div><div class="l">📍 ${esc(k)}</div></div>`).join('')}</div>` : '<div class="empty">No visits due 🎉</div>', `<button class="a" data-list="visits">list →</button>`)}
    ${panel('s4', 9, '<b>Requests</b> · G-1 §2-4 clock', `<div class="mini-list">${m.openReq.slice(0, 5).map(reqItem).join('') || '<div class="empty">No open requests</div>'}</div>`, `<button class="a" data-list="requests">all →</button>`)}

    ${panel('s6', 10, '<b>Installs</b> · per week (12 weeks)', bars(weeks, M.weeks.map((w) => w.to.slice(5)), 'var(--brand)', 560, 180, fmtN, { keys: M.weeks.map((w) => [w.from || R.addDays(w.to, -6), w.to]) }))}
    ${panel('s6', 11, '<b>Cash in</b> · per month (NPR)', bars(cashVals, mk.map((k) => k.slice(2)), 'var(--ok)', 560, 180, fmtK, { data: (i) => `data-hist="${mk[i]}" style="cursor:pointer"`, keys: mk }), `<button class="a" data-side="history">history →</button>`)}

    ${panel('s4', 12, '<b>Overdue age</b> · how old the unpaid bills are', hbars(ag.map((b) => ({ l: b.label, v: b.amount, sub: b.homes ? b.homes + ' homes' : '', color: b.from > 30 ? 'var(--bad)' : b.from > 7 ? 'var(--orange)' : 'var(--warn)' })), 'var(--warn)', fmtK), `<button class="a" data-side="money">money →</button>`)}
    ${panel('s4', 13, '<b>Next 4 weeks</b> · bills falling due', hbars(out.map((w) => ({ l: `${w.from.slice(5)}–${w.to.slice(5)}`, v: w.amount, sub: w.bills + ' bills' })), 'var(--ok)', fmtK) + `<div class="sub muted" style="margin-top:8px">expected at today's collection ${M.collection === null ? '—' : R.pct(M.collection)}: <b class="num">${fmtN(out.reduce((s, w) => s + w.amount, 0) * (M.collection ?? 1))}</b> NPR</div>`)}
    ${panel('s4', 14, '<b>Data to fix</b> · trust the numbers', `<div class="mini-list">${dq.map((g) => `<div class="item" data-report="quality"><span class="dot ${g.xs.length ? 'y' : 'g'}"></span><div class="main"><div class="t">${g.ic} ${esc(g.t)}</div><div class="s">${esc(g.why)}</div></div><div class="r"><span class="pill ${g.xs.length ? 'warn' : 'ok'}">${g.xs.length}</span></div></div>`).join('')}</div>`, `<button class="a" data-report="quality">fix →</button>`)}

    ${panel('s4', 15, '<b>Filters</b> · E-2 booking status', `<div style="display:flex;align-items:center;gap:16px">${donut([{ l: 'overdue', v: fStat.overdue || 0, color: HEX.r }, { l: 'due in 14 days', v: fStat.soon || 0, color: HEX.y }, { l: 'ok', v: fStat.ok || 0, color: HEX.g }])}<div class="legend" style="flex-direction:column;gap:8px"><span><i class="dot r"></i>overdue <b class="num">${fStat.overdue || 0}</b></span><span><i class="dot y"></i>due ≤14 d <b class="num">${fStat.soon || 0}</b></span><span><i class="dot g"></i>ok <b class="num">${fStat.ok || 0}</b></span></div></div>`, `<button class="a" data-list="filters">list →</button>`)}
    ${panel('s4', 16, '<b>Leads</b> · pipeline', `<div class="funnel">${leadSt.map((s, i) => `<div class="st"><span>${esc(s.o)}</span><div class="b"><i style="width:${(s.n / maxL) * 100}%;background:${s.o === 'Signed' ? 'var(--ok)' : s.o === 'Rejected' ? 'var(--grey)' : 'var(--brand)'};animation-delay:${i * 80}ms"></i></div><span class="n">${s.n}</span></div>`).join('')}</div><div class="sub muted" style="margin-top:8px">${m.leadsDue.length} follow-ups due</div>`, `<button class="a" data-list="leads">list →</button>`)}
    ${panel('s4', 17, '<b>Live</b> · latest records', `<div class="feed">${act.map((e, i) => `<div class="ev" ${e.id ? `data-cust="${esc(e.id)}" style="cursor:pointer;animation-delay:${i * 40}ms"` : `style="animation-delay:${i * 40}ms"`}><span>${e.ic}</span><span>${e.txt}</span><span class="when">${agoS(e.t)}</span></div>`).join('') || '<div class="empty">Nothing yet</div>'}</div>`)}

    ${panel('s6', 18, '<b>Onboarding</b> · plan #7 (day 7 / 30 / 60 / 90)', `${obPct.map((o) => `<div class="funnel"><div class="st"><span>${o.k}</span><div class="b"><i style="width:${o.n ? (o.d / o.n) * 100 : 0}%;background:var(--ok)"></i></div><span class="n">${o.d}/${o.n}</span></div></div>`).join('')}<div class="sub muted" style="margin-top:8px">${m.calls.length} calls due now</div>`, `<button class="a" data-list="calls">calls →</button>`)}
    ${panel('s6', 19, '<b>Money book</b> · this month', `<div class="kv"><div class="k">Cash in</div><div class="v num">${fmtN(M.cashThisMonth)}</div><div class="k">Taxable (VAT incl.)</div><div class="v num">${vatNow ? fmtN(vatNow.taxable + vatNow.forfeits) : 0}</div><div class="k">VAT 13% to file</div><div class="v num">${vatNow ? vatNow.vat.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</div><div class="k">Deposit received</div><div class="v num">${vatNow ? fmtN(vatNow.deposit) : 0}</div><div class="k">Overdue now</div><div class="v num" style="color:var(--bad)">${fmtN(M.overdueAmt)}</div></div>`, `<button class="a" data-report="capack">🧾 CA pack →</button>`)}
  </div>`;
}
function toleTable(m) {
  const t = {};
  for (const x of m.cust.values()) {
    const k = toleOf(x.c); const r = (t[k] = t[k] || { k, hh: 0, act: 0, od: 0, odAmt: 0, due: 0, paid: 0, visits: 0, nogps: 0, tds: [] });
    if (x.status !== 'Churned') r.hh++; if (x.status === 'Active') r.act++;
    if (x.led.overdue > 0 && x.status === 'Active') { r.od++; r.odAmt += x.led.overdue; }
    r.due += x.led.billsDue; r.paid += x.led.billsPaid;
    if (x.status !== 'Churned' && !(x.c.gps && Number.isFinite(x.c.gps.lat))) r.nogps++;
    const lv = x.vs.filter((v) => Number.isFinite(v.tdsAfter)).slice(-1)[0]; if (lv) r.tds.push(lv.tdsAfter);
  }
  for (const x of m.visitsDue) { const r = t[toleOf(x.c)]; if (r) r.visits++; }
  return Object.values(t).sort((a, b) => b.hh - a.hh);
}
function pageCustomers(m) {
  const p = S.route.params; const f = p.f || 'all';
  let list = [...m.cust.values()];
  if (f === 'overdue') list = list.filter((x) => x.led.overdue > 0 && x.status === 'Active');
  else if (f === 'visit') list = list.filter((x) => x.nv && x.nv.date <= m.t);
  else if (f === 'paused') list = list.filter((x) => x.status === 'Paused');
  else if (f === 'churned') list = list.filter((x) => x.status === 'Churned');
  else list = list.filter((x) => x.status !== 'Churned');
  if (p.tole) list = list.filter((x) => toleOf(x.c) === p.tole);
  const sort = p.sort || 'overdue';
  const key = { overdue: (x) => -x.led.overdue, name: (x) => x.c.name, tole: (x) => toleOf(x.c), installed: (x) => x.c.installDate, next: (x) => (x.nv ? x.nv.date : '9') }[sort] || ((x) => x.c.name);
  list.sort((a, b) => { const A = key(a), B2 = key(b); return A < B2 ? -1 : A > B2 ? 1 : 0; });
  const segs = [['all', 'Active & paused'], ['overdue', 'Overdue'], ['visit', 'Visit due'], ['paused', 'Paused'], ['churned', 'Left']];
  const th = (k, l, cls = '') => `<th class="${cls}" data-sort="${k}" style="cursor:pointer">${l}${sort === k ? ' ▾' : ''}</th>`;
  const tt = toleTable(m);
  return `<div class="cc">
    ${panel('s12', 0, `<b>By tole</b> · ${tt.length} areas`, `<div class="scroll-x"><table class="tbl"><tr><th>Tole</th><th class="n">Homes</th><th class="n">Active</th><th class="n">Overdue homes</th><th class="n">Overdue NPR</th><th class="n">Collection</th><th class="n">Visits due</th><th class="n">Last TDS (avg)</th><th class="n">No GPS</th></tr>
      ${tt.map((r) => `<tr data-tole="${esc(r.k)}" style="cursor:pointer" class="${p.tole === r.k ? 'sel' : ''}"><td><b>📍 ${esc(r.k)}</b></td><td class="n">${r.hh}</td><td class="n">${r.act}</td><td class="n" style="color:${r.od ? 'var(--bad)' : 'inherit'}">${r.od}</td><td class="n">${r.odAmt ? fmtN(r.odAmt) : '—'}</td><td class="n">${r.due ? `<span class="pill ${r.paid / r.due < 0.5 ? 'bad' : r.paid / r.due < 0.8 ? 'warn' : 'ok'}">${Math.round((r.paid / r.due) * 100)}%</span>` : '—'}</td><td class="n">${r.visits || '—'}</td><td class="n">${r.tds.length ? Math.round(r.tds.reduce((s, v) => s + v, 0) / r.tds.length) : '—'}</td><td class="n" style="color:${r.nogps ? 'var(--warn)' : 'inherit'}">${r.nogps || '—'}</td></tr>`).join('')}</table></div>`, p.tole ? `<button class="a" data-tole="">clear tole ✕</button>` : '<span class="muted">tap a tole to filter</span>')}
    ${panel('s12', 1, `<b>Customers</b> · ${list.length}${p.tole ? ' · 📍 ' + esc(p.tole) : ''}`, `<div class="scroll-x"><table class="tbl"><tr><th></th>${th('name', 'Customer')}${th('tole', 'Tole')}<th>Phone</th>${th('installed', 'Installed')}<th class="n">Next bill</th>${th('overdue', 'Overdue', 'n')}<th>Stage</th>${th('next', 'Next visit')}<th>Filters</th></tr>
    ${list.slice(0, 400).map((x) => { const fo = x.fd.filter((q) => q.status === 'overdue').map((q) => q.type); return `<tr data-cust="${esc(x.c.id)}" style="cursor:pointer"><td><span class="dot ${x.dot}"></span></td><td><b>${esc(x.c.name)}</b> <span class="muted mono">${esc(x.c.code)}</span></td><td>${esc(toleOf(x.c))}</td><td class="mono">${esc(x.c.phone || '')}</td><td>${esc(x.c.installDate || '')}</td><td class="n">${x.led.nextBill ? fmtN(x.led.nextBill.amount - x.led.nextBill.paid) + ' · ' + esc(x.led.nextBill.due.slice(5)) : ''}</td><td class="n" style="color:${x.led.overdue ? 'var(--bad)' : 'inherit'}">${x.led.overdue ? fmtN(x.led.overdue) : '—'}</td><td>${x.dn ? `<span class="pill ${{ reminder: 'blue', due: 'warn', late: 'warn', call: 'orange', visit: 'bad' }[x.dn.stage]}">${esc(x.dn.short)}</span>` : ''}</td><td>${x.nv ? esc(x.nv.date) : ''}</td><td>${fo.length ? `<span class="pill bad">${esc(fo.join(', '))}</span>` : ''}</td></tr>`; }).join('')}</table></div>${list.length > 400 ? `<div class="empty">+${list.length - 400} more — use the search</div>` : ''}`, `<div class="seg" style="padding:0">${segs.map(([k, l]) => `<button data-dseg="${k}" class="${f === k ? 'on' : ''}">${l}</button>`).join('')}</div>`)}
  </div>`;
}
function caMonths(m, n = 6) {
  const now = B.adToBs(m.t); if (!now) return [];
  const out = [];
  for (let i = 0; i < n; i++) { const a = B.addBsMonths(now.y, now.m, -i); const X = CA.buildPack({ y: a.y, m: a.m, n: 1 }); if (X) out.push({ a, X, current: i === 0 }); }
  return out;
}
function pageMoney(m) {
  const M = m.metrics; const mk = monthsBack(m.t, 12);
  const cashBy = Object.fromEntries(mk.map((k) => [k, 0])); const depBy = Object.fromEntries(mk.map((k) => [k, 0]));
  for (const r of m.vat) { if (cashBy[r.month] !== undefined) { cashBy[r.month] = r.cash; depBy[r.month] = r.deposit; } }
  const groups = collectionGroups(m.collections); const cs = R.chaseStats(m.D.checkins, m.D.payments, R.addDays(m.t, -90), m.t);
  const ag = R.agingBuckets(m.ledgers, activeIds(m), m.t); const out = R.cashOutlook(m.D.customers, m.ledgers, m.t, 28);
  const cam = caMonths(m, 6);
  return `<div class="cc">
    ${panel('s3 kpi', 0, '<b>Cash in</b> · this month', `<div class="v">${counter('m_cash', M.cashThisMonth)}</div>`)}
    ${panel('s3 kpi', 1, '<b>Recurring</b> · per month', `<div class="v">${counter('m_mrr', M.mrr)}</div>`)}
    ${panel('s3 kpi', 2, '<b>Overdue</b> · all', `<div class="v" style="color:var(--bad)">${counter('m_od', M.overdueAmt)}</div><div class="sub"><span>${M.overdueHH} homes</span><span>7+ days ${M.due7}</span></div>`)}
    ${panel('s3 kpi', 3, '<b>Deposit held</b>', `<div class="v">${counter('m_dep', m.deposits.total.held)}</div><div class="sub"><span>refundable — a liability</span></div>`)}
    ${panel('s7', 4, '<b>🧾 CA pack</b> · IRD sales book by Nepali month', `<div class="scroll-x"><table class="tbl"><tr><th>Nepali month</th><th>AD dates</th><th class="n">Bills</th><th class="n">Taxable value</th><th class="n">VAT 13%</th><th class="n">Deposit in</th><th>Ready?</th><th></th></tr>
      ${cam.map(({ a, X, current }) => `<tr data-capack-open="${a.y}|${a.m}" style="cursor:pointer"><td><b>${esc(B.bsLabel(a.y, a.m))}</b>${current ? ' <span class="pill blue">now</span>' : ''}</td><td class="mono muted">${esc(X.P.from.slice(5))} → ${esc(X.P.to.slice(5))}</td><td class="n">${X.book.rows.length}</td><td class="n">${fmtN(X.book.totals.taxable)}</td><td class="n"><b>${X.book.totals.vat.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></td><td class="n">${fmtN(X.dep.received)}</td><td>${X.warn.length ? `<span class="pill warn" title="${esc(X.warn.join(' · '))}">${X.book.missingBill ? X.book.missingBill + ' no bill no.' : 'check'}</span>` : '<span class="pill ok">ready</span>'}</td><td>›</td></tr>`).join('')}</table></div>
      <div class="muted" style="margin-top:8px">Nepal files VAT by Nepali month. Tap a month → Excel in the IRD layout (बिक्री खाता) + summary + deposits.</div>`, `<button class="a" data-report="capack">details →</button>`)}
    ${panel('s5', 5, '<b>Overdue age</b>', hbars(ag.map((b) => ({ l: b.label, v: b.amount, sub: b.homes ? b.homes + ' homes' : '', color: b.from > 30 ? 'var(--bad)' : b.from > 7 ? 'var(--orange)' : 'var(--warn)' })), 'var(--warn)', fmtK) + `<div class="sub muted" style="margin-top:8px">older than 30 days: <b class="num">${fmtN(ag.filter((b) => b.from > 30).reduce((s, b) => s + b.amount, 0))}</b> NPR — hardest to collect</div>`)}
    ${panel('s7', 6, '<b>Cash in</b> · 12 months (NPR)', bars(mk.map((k) => cashBy[k]), mk.map((k) => k.slice(2)), 'var(--ok)', 640, 200, fmtK, { keys: mk, data: (i) => `data-hist="${mk[i]}" style="cursor:pointer"` }), `<button class="a" data-side="history">history →</button>`)}
    ${panel('s5', 7, '<b>Next 4 weeks</b> · bills falling due', hbars(out.map((w) => ({ l: `${w.from.slice(5)} – ${w.to.slice(5)}`, v: w.amount, sub: w.bills + ' bills' })), 'var(--ok)', fmtK) + `<div class="kv" style="margin-top:10px"><div class="k">Billed</div><div class="v num">${fmtN(out.reduce((s, w) => s + w.amount, 0))}</div><div class="k">Expected at ${M.collection === null ? '—' : R.pct(M.collection)}</div><div class="v num">${fmtN(out.reduce((s, w) => s + w.amount, 0) * (M.collection ?? 1))}</div><div class="k">Plus overdue now</div><div class="v num" style="color:var(--bad)">${fmtN(M.overdueAmt)}</div></div>`)}
    ${panel('s7', 8, '<b>Chase list</b> · G-1 §1-3', (groups.map((g) => `<h3>${esc(g.label)} <span class="pill">${g.xs.length}</span></h3><div class="mini-list">${g.xs.slice(0, 30).map((x) => dunItem(x)).join('')}</div>`).join('') || '<div class="empty">Nobody to chase 🎉</div>') + chaseStatsLine(cs))}
    ${can('expense') || can('money') ? panel('s5', 10, '<b>Expenses</b> · this month', expPanel(m), '<button class="a" data-report="expenses">all →</button>') : ''}
    ${panel('s7', 11, '<b>Profit & loss</b> · cash basis, before tax', pnlTable(m, mk))}
    ${(() => { const A = m.approvals; if (!A.pending.length && !A.done.length) return ''; return panel('s5', 12, `<b>Money approvals</b> · ${A.pending.length} waiting`, `<div class="mini-list">${A.pending.slice(0, 6).map((r) => `<div class="item" data-list="approvals"><span class="dot y"></span><div class="main"><div class="t">${r.kind === 'discount' ? '🏷️ Discount' : '🏦 Deposit refund'} ${fmtN(r.amount)} · ${esc((S.D.customers.get(r.x.customerId) || {}).name || '?')}</div><div class="s">${esc(String(r.x.date || r.x.closedDate || r.x.startedDate || '').slice(0, 10))}</div></div></div>`).join('') || '<div class="empty">Nothing waiting 🎉</div>'}</div>`, '<button class="a" data-list="approvals">open ›</button>'); })()}
    ${panel('s5', 9, '<b>Deposit received</b> · 12 months', bars(mk.map((k) => depBy[k]), mk.map((k) => k.slice(2)), 'var(--info)', 460, 200, fmtK) + `<div class="row wrap"><button class="btn ghost" data-report="deposits">🏦 Deposit book</button><button class="btn ghost" data-report="vat">🧾 VAT by AD month</button><button class="btn ghost" data-csv="payments">⬇️ Payments CSV</button></div>`)}
  </div>`;
}
function expPanel(m) {
  const mk = R.monthKey(m.t); const cur = m.expMonths[mk] || { paid: 0, vat: 0, net: 0, byCat: {} };
  const rows = Object.entries(cur.byCat).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([c, v]) => ({ l: c, v }));
  return `<div class="kv"><div class="k">Paid</div><div class="v num">${fmtN(cur.paid)}</div><div class="k">Input VAT</div><div class="v num">${cur.vat.toFixed(2)}</div><div class="k">Cost without VAT</div><div class="v num">${fmtN(cur.net)}</div></div>${rows.length ? hbars(rows, 'var(--orange)', fmtK) : '<div class="empty">No expenses this month</div>'}${can('expense') ? '<button class="btn ghost small" data-go-form="expense">🧾 New expense</button>' : ''}`;
}
function pnlTable(m, mk) {
  const vat = Object.fromEntries(m.vat.map((r) => [r.month, r]));
  const rows = mk.slice().reverse().map((k) => { const rev = vat[k] ? vat[k].net : 0; const ex = m.expMonths[k] ? m.expMonths[k].net : 0; return { k, rev, ex, res: rev - ex }; });
  return `<div class="scroll-x"><table class="tbl"><tr><th>Month</th><th class="n">Revenue (no VAT)</th><th class="n">Expenses (no VAT)</th><th class="n">Result</th></tr>${rows.map((r) => `<tr><td>${esc(r.k)}</td><td class="n">${fmtN(r.rev)}</td><td class="n">${fmtN(r.ex)}</td><td class="n" style="color:${r.res < 0 ? 'var(--bad)' : 'var(--ok)'}"><b>${fmtN(r.res)}</b></td></tr>`).join('')}</table></div><div class="muted" style="margin-top:6px">Deposit is not revenue (a liability). Device purchases count in the month paid — the CA spreads them as depreciation.</div>`;
}
function pageField(m) {
  const t = m.t; const byTole = {}; for (const x of m.visitsDue) (byTole[toleOf(x.c)] = byTole[toleOf(x.c)] || []).push(x);
  const recs = m.D.recoveries; const mk = R.monthKey(t);
  const tb = R.techBoard(m.D, mk + '-01', t); const tbPrev = R.techBoard(m.D, R.addMonths(mk + '-01', -1), R.addDays(mk + '-01', -1));
  const dem = R.filterDemand(m.filtersAll, t, 90); const st = m.metrics.stock;
  const dmonths = Object.keys(dem.months).sort((a, b) => (a === 'overdue' ? -1 : b === 'overdue' ? 1 : a.localeCompare(b)));
  return `<div class="cc">
    ${panel('s6', 0, `<b>Visits due</b> · ${m.visitsDue.length} by tole`, Object.entries(byTole).sort((a, b) => b[1].length - a[1].length).map(([k, xs]) => `<h3 style="display:flex;align-items:center;gap:8px">📍 ${esc(k)} <span class="pill">${xs.length}</span>${routeLink(xs)}</h3><div class="mini-list">${xs.map((x) => cItem(x, `<span class="pill ${x.due < t ? 'bad' : 'warn'}">${esc(x.filterOnly ? 'filter' : x.due)}</span>`)).join('')}</div>`).join('') || '<div class="empty">No visits due</div>', '<span class="muted">🧭 Route starts from your location</span>')}
    ${panel('s6', 1, `<b>Requests</b> · ${m.openReq.length} open`, `<div class="mini-list">${m.openReq.map(reqItem).join('') || '<div class="empty">No open requests</div>'}</div>`)}
    ${panel('s7', 2, `<b>Team</b> · this month (${esc(monLabel(mk))})`, `<div class="scroll-x"><table class="tbl"><tr><th>Who</th><th class="n">Installs</th><th class="n">Visits</th><th class="n">Filters</th><th class="n">Repairs</th><th class="n">Requests done</th><th class="n">Nobody home</th><th class="n">Days out</th><th class="n">Jobs / day</th><th class="n">Min / visit</th><th class="n">Last month</th></tr>
      ${tb.map((r) => { const pv = tbPrev.find((q) => q.name === r.name); return `<tr><td><b>${esc(r.name)}</b></td><td class="n">${r.installs}</td><td class="n">${r.visits}</td><td class="n">${r.filters}</td><td class="n">${r.repairs}</td><td class="n">${r.requests}</td><td class="n">${r.noShows || '·'}</td><td class="n">${r.days}</td><td class="n">${r.perDay.toFixed(1)}</td><td class="n">${r.avgMin ? Math.round(r.avgMin) : '—'}</td><td class="n muted">${pv ? pv.visits + pv.installs + ' jobs' : '—'}</td></tr>`; }).join('') || '<tr><td colspan="11" class="muted">No completed work this month yet</td></tr>'}</table></div><div class="muted" style="margin-top:6px">Jobs = installs + completed visits. Plan: 4–8 homes a day, 6 days a week.</div>`)}
    ${panel('s5', 3, '<b>Filters needed</b> · next 90 days vs stock', `<div class="scroll-x"><table class="tbl"><tr><th>Filter</th><th class="n">Needed</th><th class="n">In stock</th><th>Order by</th><th></th></tr>${R.FILTER_TYPES.filter((f) => f !== 'Spin-down').map((f) => { const need = dem.types[f] || 0, have = st[f] ?? 0; const op = m.filterPlan && m.filterPlan.rows.find((r) => r.type === f); return `<tr><td><b>${esc(f)}</b></td><td class="n">${need}</td><td class="n">${have}</td><td class="mono">${op && op.orderBy ? `<span class="pill ${op.status === 'late' ? 'bad' : op.status === 'soon' ? 'warn' : 'grey'}">${esc(op.orderBy)}</span>` : '—'}</td><td>${need > have ? `<span class="pill bad">short ${need - have}</span>` : '<span class="pill ok">ok</span>'}</td></tr>`; }).join('')}</table></div>
      <div class="scroll-x" style="margin-top:8px"><table class="tbl"><tr><th>When</th>${R.FILTER_TYPES.filter((f) => f !== 'Spin-down').map((f) => `<th class="n">${esc(f)}</th>`).join('')}</tr>${dmonths.map((k) => `<tr><td>${k === 'overdue' ? '<span class="pill bad">overdue</span>' : esc(monLabel(k))}</td>${R.FILTER_TYPES.filter((f) => f !== 'Spin-down').map((f) => `<td class="n">${dem.months[k][f] || '·'}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="5" class="muted">Nothing due in 90 days</td></tr>'}</table></div>`, `<button class="a" data-report="stock">stock →</button>`)}
    ${(() => { const C = R.callbackStats(m.D, R.addDays(t, -90), t, Number(S.settings.callbackDays) || R.CALLBACK.days); return panel('s4', 8, `<b>Callbacks</b> · 90 days · ${C.rate === null ? '—' : R.pct(C.rate, 1)}`, `<div class="mini-list">${C.people.filter((p) => p.jobs).map((p) => `<div class="item"><span class="dot ${(p.rate || 0) > 0.1 ? 'r' : (p.rate || 0) > 0.05 ? 'y' : 'g'}"></span><div class="main"><div class="t">${esc(p.name)} · ${p.rate === null ? '—' : R.pct(p.rate, 1)}</div><div class="s">${p.callbacks} of ${p.jobs} jobs</div></div></div>`).join('') || '<div class="empty">No jobs yet</div>'}</div>`, '<button class="a" data-report="callbacks">all →</button>'); })()}
    ${(() => { const N = R.noShowStats(m.D, R.addDays(t, -90), t); const pc = (x) => (x === null ? '—' : R.pct(x, 1)); return panel('s4', 9, `<b>Wasted trips</b> · nobody home · 90 days · ${pc(N.rate)}`, `<div class="kv"><div class="k">Nobody home</div><div class="v num">${N.noShows} of ${N.trips} trips</div><div class="k">🛵 message sent</div><div class="v num">${pc(N.withMsg.rate)} <span class="muted">(${N.withMsg.trips})</span></div><div class="k">no message</div><div class="v num">${pc(N.noMsg.rate)} <span class="muted">(${N.noMsg.trips})</span></div></div><div class="mini-list" style="margin-top:8px">${N.repeat.slice(0, 5).map((r) => r.c ? `<div class="item" data-cust="${esc(r.id)}"><span class="dot r"></span><div class="main"><div class="t">${esc(r.c.name)} · ${r.n}×</div><div class="s">last ${esc(r.last)}</div></div></div>` : '').join('')}</div>`, '<button class="a" data-report="noshows">open ›</button>'); })()}
    ${panel('s4', 4, `<b>Calls</b> · ${m.calls.length} due`, `<div class="mini-list">${m.calls.slice(0, 12).map((x) => `<div class="item" data-go-form="checkin" data-cid="${esc(x.c.id)}" data-kind="${esc(x.o.k === 'Q' ? 'Quarterly call' : x.o.k)}"><span class="dot ${x.o.status === 'overdue' ? 'r' : 'y'}"></span><div class="main"><div class="t">${esc(x.c.name)}</div><div class="s">${esc(x.o.label)} · ${esc(x.o.due)}</div></div></div>`).join('') || '<div class="empty">No calls due</div>'}</div>`, `<button class="a" data-list="calls">random pick →</button>`)}
    ${panel('s4', 5, '<b>Filters</b> · overdue & soon', `<div class="mini-list">${m.filtersAll.filter((f) => f.status !== 'ok').sort((a, b) => String(a.due).localeCompare(String(b.due))).slice(0, 12).map((f) => `<div class="item" data-cust="${esc(f.x.c.id)}"><span class="dot ${f.status === 'overdue' ? 'r' : 'y'}"></span><div class="main"><div class="t">${esc(f.type)} · ${esc(f.x.c.name)}</div><div class="s">${esc(f.due)}</div></div></div>`).join('') || '<div class="empty">All on schedule</div>'}</div>`, `<button class="a" data-list="filters">all →</button>`)}
    ${panel('s4', 7, `<b>Relocations</b> · ${m.relOpen.length} to do`, `<div class="mini-list">${m.D.relocations.slice().sort((a, b) => String(b.moveDate).localeCompare(String(a.moveDate))).slice(0, 8).map((r) => { const c = S.D.customers.get(r.customerId); return `<div class="item" data-edit="relocation" data-id="${esc(r.id)}"><span class="dot ${r.status === 'Done' ? 'g' : r.status === 'Cancelled' ? 'k' : 'y'}"></span><div class="main"><div class="t">${esc(c ? c.name : '?')}</div><div class="s">${esc(r.status)} · ${esc(r.moveDate || '')}</div></div></div>`; }).join('') || '<div class="empty">No relocations</div>'}</div>`, '<button class="a" data-list="relocations">all →</button>')}
    ${panel('s4', 6, `<b>Recoveries</b> · ${recs.length}`, `<div class="mini-list">${recs.map((r) => { const c = S.D.customers.get(r.customerId); return `<div class="item" data-edit="recovery" data-id="${esc(r.id)}"><span class="dot ${r.outcome === 'Recovered' ? 'g' : String(r.outcome).startsWith('Failed') ? 'r' : 'y'}"></span><div class="main"><div class="t">${esc(c ? c.name : '?')}</div><div class="s">${esc(r.outcome)}${r.daysToClose !== null && r.daysToClose !== undefined ? ' · ' + r.daysToClose + ' d' : ''}</div></div></div>`; }).join('') || '<div class="empty">No recovery cases</div>'}</div>`, `<button class="a" data-list="recoveries">all →</button>`)}
  </div>`;
}

// ---------- 📑 reports as full pages (hero · pictures · the table) ----------
const REP_IC = { payroll: '💼', handover: '🆘', perform: '📑', funnel: '⏳', billing: '🌊', noshows: '🚪', callbacks: '🔁', capacity: '👷', leavers: '🚪', capack: '🧾', expenses: '🧾', payments: '💵', vat: '🧾', deposits: '🏦', gate: '🧭', stock: '📦', learning: '🧪', referrals: '🎁', trainings: '🎓', quality: '🩺', devices: '📦', device: '📦', users: '🪪', bank: '🏧', settings: '⚙️', backup: '💾', export: '💾', help: '❓', diag: '🩻' };
function reportPage(m, p, top) {
  let html = screenHtml({ screen: 'report', params: p });
  html = html.replace(/<button class="back" data-back>[^<]*<\/button>/, '');
  let title = '', sub = '';
  html = html.replace(/<h1>([\s\S]*?)<\/h1>/, (x, a) => { title = a; return ''; });
  if (/^\s*<div class="muted">/.test(html)) html = html.replace(/^\s*<div class="muted">([\s\S]*?)<\/div>/, (x, a) => { sub = a; return ''; });
  const vis = repVisual(p.r, m, p);
  return `<div class="cc rep">
    <div class="panel s12 rep-hero" style="--i:0">${top ? '' : '<button class="back" data-back>‹ Back</button>'}<div class="ic">${REP_IC[p.r] || '📑'}</div><div class="main"><h1>${title.replace(/^\S+\s/, (e) => (/\p{Extended_Pictographic}/u.test(e) ? '' : e))}</h1>${sub ? `<div class="muted">${sub}</div>` : ''}</div></div>
    ${vis}
    <div class="panel s12 rep-body" style="--i:3">${html}</div></div>`;
}
const monthKeys = (t, n) => monthsBack(t, n);
function repVisual(k, m, p) {
  const t = m.t; const mk = monthKeys(t, 12); const vatBy = Object.fromEntries(m.vat.map((r) => [r.month, r]));
  const kpi = (i, label, v, sub, fmt = 'int', color) => panel('s3 kpi', i, label, `<div class="v"${color ? ` style="color:${color}"` : ''}>${counter('rp_' + k + i, v, fmt)}</div>${sub ? `<div class="sub"><span>${sub}</span></div>` : ''}`);
  if (k === 'perform') {
    const per = performPeriod(p.pp || 'q', t); const back = R.billingMoves(m.D.customers, m.D.recoveries, [], t).back;
    const P = R.performKpis(m.D, m.ledgers, per.from, per.to, t, { back }); const v = (key) => (P.rows.find((r) => r.key === key) || {}).value;
    // collection rate month by month (the grant headline) — each month on its own
    const crM = mk.map((k2) => { const f = k2 + '-01'; const to2 = R.addDays(R.addMonths(f, 1), -1); const Q = R.performKpis(m.D, m.ledgers, f, to2 > t ? t : to2, t, { back }); const r = Q.rows.find((x) => x.key === 'collection'); return r.value === null ? 0 : Math.round(r.value * 1000) / 10; });
    const rar = [['>30 days unpaid', v('rar30')], ['>90 days', v('rar90')], ['>180 days', v('rar180')], ['paid <70 % since install', v('rarcr70')], ['paid <50 %', v('rarcr50')]];
    const noData = (i, label, sub) => panel('s3 kpi', i, label, `<div class="v" style="color:var(--muted)">—</div><div class="sub"><span>${sub}</span></div>`);
    return (v('collection') === null ? noData(1, '<b>Collection rate</b> · period', 'no bills 2–36 due in this period') : kpi(1, '<b>Collection rate</b> · period', v('collection'), `bills 2–36 · ${esc(per.from)} → ${esc(per.to)}`, 'pct1', v('collection') < 0.9 ? 'var(--warn)' : 'var(--ok)'))
      + (v('rar30') === null ? noData(2, '<b>Receivables at risk</b> · >30 days', 'nothing outstanding') : kpi(2, '<b>Receivables at risk</b> · >30 days', v('rar30'), `of NPR ${fmtK(v('outstanding') || 0)} outstanding`, 'pct1', v('rar30') > 0.1 ? 'var(--bad)' : ''))
      + kpi(3, '<b>Cash receipts</b> · period', P.cash, `${P.sold} homes installed`)
      + (v('nps') === null ? noData(4, '<b>Net Promoter Score</b>', 'no 0–10 answers yet') : kpi(4, '<b>Net Promoter Score</b>', v('nps'), `${P.npsN} answers${P.npsN < 30 ? ' · 🔴 fewer than 30' : ''}`, 'int'))
      + panel('s7', 5, '<b>Collection rate</b> · each month · %', bars(crM, mk.map((k2) => k2.slice(2)), 'var(--ok)', 620, 190, (x) => x + '%', { keys: mk }) + '<div class="muted">empty bar = no bills due that month</div>')
      + panel('s5', 6, '<b>Receivables at risk</b> · share of outstanding', hbars(rar.map(([l, x]) => ({ l, v: x === null || x === undefined ? 0 : Math.round(x * 1000) / 10 })), 'var(--bad)', (x) => x + '%') + '<div class="muted" style="margin-top:6px">CGAP key thresholds: 30 days unpaid and under 50 % paid since activation. The two overlap — do not add them up.</div>');
  }
  if (k === 'funnel') {
    const F = R.funnelDays(m.D.leads, m.D.customers, m.D.payments, R.addDays(t, -365), t, t); const J = F.journeys.length;
    const cols = ['var(--info)', 'var(--brand)', 'var(--ok)', 'var(--orange)'];
    const sum = F.steps.reduce((a, q) => a + (q.median || 0), 0) || 1; let x0 = 0;
    const seg = F.steps.map((q, i) => { const w = q.median ? (q.median / sum) * 880 : 0; const out = w ? `<rect x="${(10 + x0).toFixed(1)}" y="8" width="${w.toFixed(1)}" height="34" rx="6" fill="${cols[i]}" opacity=".9"><title>${esc(q.label)}</title></rect>` : ''; x0 += w; return out; }).join('');
    const journey = `<div class="chart"><svg viewBox="0 0 900 50">${seg}</svg></div><div class="grid4" style="margin-top:6px">${F.steps.map((q, i) => `<div><span class="sw" style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${cols[i]}"></span> <b>${esc(q.label)}</b><div class="num" style="font-size:20px;margin-top:2px">${fmtDays(q.median)}</div></div>`).join('')}</div><div class="muted" style="margin-top:8px">Median days per step · ${F.matched} of ${J} homes installed in the last 12 months could be matched to a lead (by the convert link or the same phone).</div>`;
    const table = `<div class="scroll-x"><table class="tbl"><tr><th>Step</th><th class="n">Homes</th><th class="n">Median</th><th class="n">Slowest</th><th class="n">Over target</th><th class="n">Target 🔴</th></tr>${F.steps.map((q) => `<tr><td><b>${esc(q.label)}</b></td><td class="n">${q.n}</td><td class="n">${q.median === null ? '—' : fmtDays(q.median)}</td><td class="n">${q.max === null ? '—' : fmtDays(q.max)}</td><td class="n">${q.slow ? `<span class="pill warn">${q.slow}</span>` : '·'}</td><td class="n">${fmtDays(q.target)}</td></tr>`).join('')}</table></div>`;
    return kpi(1, '<b>Lead → first payment</b> · median days', F.totalMedian ?? 0, F.totalMedian === null ? 'no matched homes yet' : `${F.matched} homes with a lead`, 'int')
      + kpi(2, '<b>Signed → installed</b> · median days', F.steps[2].median ?? 0, `target ${R.FUNNEL.target.signed} 🔴`, 'int', (F.steps[2].median || 0) > R.FUNNEL.target.signed ? 'var(--warn)' : '')
      + kpi(3, '<b>Paid on install day</b>', J ? F.paidOnInstall / J : 0, `${F.paidOnInstall} of ${J} homes`, 'pct') + kpi(4, '<b>Leads stuck</b> · 14+ days in a stage', F.stuck.length, `${F.open.length} open leads`, 'int', F.stuck.length ? 'var(--warn)' : '')
      + panel('s12', 5, '<b>The journey</b> · median days per step', journey)
      + panel('s7', 6, '<b>Each step</b> · last 12 months', table + '<div class="muted" style="margin-top:6px">Over target = homes slower than the target (🔴 first guesses: lead → demo 7 days · demo → signed 7 · signed → installed 5 · installed → paid same day).</div>')
      + panel('s5', 7, `<b>Leads stuck</b> · ${F.stuck.length}`, `<div class="mini-list">${F.stuck.slice(0, 12).map((o) => `<div class="item" data-edit="lead" data-id="${esc(o.l.id)}"><span class="dot ${o.days > 30 ? 'r' : 'y'}"></span><div class="main"><div class="t">${esc(o.l.name || '?')} · ${esc(o.stage === 'New' ? 'New lead' : o.stage)}</div><div class="s">${fmtDays(o.days)} in this stage${o.l.followUpDate ? ' · follow up ' + esc(o.l.followUpDate) : ''}</div></div></div>`).join('') || '<div class="empty">No lead is stuck 🎉</div>'}</div>`)
      + panel('s12', 8, '<b>How long each step took</b> · homes', `<div class="grid4">${F.steps.map((q, i) => `<div><div class="muted" style="margin-bottom:6px"><b>${esc(q.label)}</b></div>${hbars(q.buckets.map((b) => ({ l: b.l, v: b.n })), cols[i])}</div>`).join('')}</div>`);
  }
  if (k === 'billing') {
    const hs = (n) => `${n} home${n === 1 ? '' : 's'}`;
    const part = p.bv === 'sub' ? 'subscription' : 'amount'; const BM = R.billingMoves(m.D.customers, m.D.recoveries, mk, t, { part });
    const sel = mk.includes(p.bm) ? p.bm : mk[mk.length - 1]; const r = BM.rows.find((q) => q.month === sel);
    const steps = [{ l: 'Start', v: r.start, kind: 'total', color: 'var(--grey)', sub: monLabel(R.monthKey(R.addMonths(sel + '-01', -1))) }, { l: 'New homes', v: r.newAmt, kind: 'up', color: 'var(--ok)', sub: hs(r.newN) }, { l: 'Came back', v: r.backAmt, kind: 'up', color: 'var(--info)', sub: hs(r.backN) }];
    steps.push({ l: 'Deposit starts', v: r.upAmt, kind: 'up', color: 'var(--brand)', sub: hs(r.upN) }); // month 2: 1,100 → 1,400
    steps.push({ l: 'Left', v: r.leftAmt, kind: 'down', color: 'var(--bad)', sub: hs(r.leftN) }, { l: 'Month 14', v: r.stepAmt, kind: 'down', color: 'var(--orange)', sub: hs(r.stepN) }, { l: 'End', v: r.end, kind: 'total', color: 'var(--brand)', sub: monLabel(sel) });
    const seg = `<div class="seg" style="margin:0">${[['', 'With deposit'], ['sub', 'Subscription only']].map(([v, l]) => `<button data-bv="${v}" class="${(p.bv || '') === v ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
    const ahead = BM.ahead.filter((a) => a.n);
    return kpi(1, `<b>Recurring billing</b> · ${esc(monLabel(sel))}`, r.end, `${hs(r.homes)} · VAT incl.`) + kpi(2, '<b>Change</b> · vs month before', r.net, r.netPct === null ? '—' : (r.net >= 0 ? '+' : '') + R.pct(r.netPct, 1), 'int', r.net < 0 ? 'var(--bad)' : 'var(--ok)')
      + kpi(3, '<b>Lost to leavers</b> · this month', r.leftAmt, hs(r.leftN), 'int', r.leftAmt ? 'var(--bad)' : '') + kpi(4, '<b>Month-14 step</b> · this month', r.stepAmt, part === 'subscription' ? 'none without the deposit' : `${hs(r.stepN)} · 1,400 → 1,100`)
      + panel('s7', 5, `<b>From ${esc(monLabel(R.monthKey(R.addMonths(sel + '-01', -1))))} to ${esc(monLabel(sel))}</b> · NPR a month`, waterfall(steps) + (part === 'amount' ? '<div class="muted" style="margin-top:6px">With deposit = what homes are billed: 1,100 in the install month (inside the 4,900), 1,400 for bills 2–13, then 1,100. The deposit part is held, not earned — "Subscription only" shows revenue. Paused homes still count (the ledger keeps billing them).</div>' : '<div class="muted" style="margin-top:6px">Subscription only = 1,100 a home (VAT incl.) — the month-14 step disappears because it is only the deposit ending.</div>'), seg)
      + panel('s5', 6, '<b>Month-14 steps coming</b> · known in advance', ahead.length ? hbars(ahead.map((a) => ({ l: monLabel(a.month), v: a.amt || a.n, sub: hs(a.n) })), 'var(--orange)', part === 'amount' ? (v) => '−' + fmtN(v) : fmtN) + '<div class="muted" style="margin-top:6px">Planned, not lost: the deposit part (300) ends after 12 months.</div>' : '<div class="empty">No home reaches month 14 in the next 6 months</div>')
      + panel('s12', 7, '<b>Moves per month</b> · 12 months · tap a month', moveBars(BM.rows, sel));
  }
  if (k === 'noshows') {
    const N = R.noShowStats(m.D, R.addDays(t, -90), t); const Y = R.noShowStats(m.D, R.addDays(t, -365), t);
    const pc = (x) => (x === null ? '—' : R.pct(x, 1));
    const perMonth = mk.map((k2) => (Y.byMonth[k2] ? Y.byMonth[k2].ns : 0)); const rateM = mk.map((k2) => (Y.byMonth[k2] && Y.byMonth[k2].trips ? Math.round(Y.byMonth[k2].ns / Y.byMonth[k2].trips * 1000) / 10 : 0));
    const cmp = [{ l: '🛵 message sent', v: N.withMsg.rate === null ? 0 : Math.round(N.withMsg.rate * 1000) / 10, sub: `${N.withMsg.trips} trips`, color: 'var(--ok)' }, { l: 'no message', v: N.noMsg.rate === null ? 0 : Math.round(N.noMsg.rate * 1000) / 10, sub: `${N.noMsg.trips} trips`, color: 'var(--warn)' }];
    const small = N.withMsg.trips < 30 || N.noMsg.trips < 30;
    return kpi(1, '<b>Nobody home</b> · 90 days', N.rate || 0, `${N.noShows} of ${N.trips} trips`, 'pct1', (N.rate || 0) > 0.1 ? 'var(--bad)' : '')
      + kpi(2, '<b>Trips wasted</b> · 90 days', N.noShows, `${N.waited} minutes waited`) + kpi(3, '<b>Homes missed 2+ times</b>', N.repeat.length, 'call before the next try')
      + kpi(4, '<b>With "on my way"</b> · rate', N.withMsg.rate || 0, `without: ${pc(N.noMsg.rate)}`, 'pct1', N.withMsg.rate !== null && N.noMsg.rate !== null && N.withMsg.rate < N.noMsg.rate ? 'var(--ok)' : '')
      + panel('s4', 5, '<b>Does the message help?</b> · % nobody home', hbars(cmp, 'var(--ok)', (v) => v + '%') + `<div class="muted" style="margin-top:6px">${small ? '🔴 Fewer than 30 trips on one side — too early to say.' : 'Same homes are not compared — busy homes may get the message more often.'}</div>`)
      + panel('s4', 6, '<b>What happened</b> · 90 days', Object.keys(N.byReason).length ? hbars(Object.entries(N.byReason).sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ l, v })), 'var(--warn)') : '<div class="empty">Nobody-home trips: none 🎉</div>')
      + panel('s4', 7, '<b>By tole</b> · % nobody home', !Object.values(N.byTole).some((r) => r.trips >= 3) ? '<div class="empty">Not enough trips yet (3+ per tole)</div>' : hbars(Object.entries(N.byTole).filter(([, r]) => r.trips >= 3).sort((a, b) => b[1].ns / b[1].trips - a[1].ns / a[1].trips).slice(0, 8).map(([l, r]) => ({ l, v: Math.round(r.ns / r.trips * 1000) / 10, sub: `${r.ns}/${r.trips}` })), 'var(--orange)', (v) => v + '%'))
      + panel('s6', 8, '<b>Nobody home per month</b> · 12 months', bars(perMonth, mk.map((k2) => k2.slice(2)), 'var(--warn)', 560, 170, fmtN, { keys: mk }))
      + panel('s6', 9, '<b>Rate per month</b> · %', bars(rateM, mk.map((k2) => k2.slice(2)), 'var(--orange)', 560, 170));
  }
  if (k === 'callbacks') {
    const days = Number(S.settings.callbackDays) || R.CALLBACK.days; const C = R.callbackStats(m.D, R.addDays(t, -90), t, days);
    const perMonth = mk.map((k2) => C.all.filter((x) => R.monthKey(x.job.date) === k2).length);
    return kpi(1, '<b>Callback rate</b> · 90 days', C.rate || 0, `${C.callbacks.length} of ${C.jobs} jobs`, 'pct1', (C.rate || 0) > 0.1 ? 'var(--bad)' : '')
      + kpi(2, '<b>Callbacks</b> · 90 days', C.callbacks.length, `within ${days} days of a job`) + kpi(3, '<b>Days after the job</b> · median', C.medianDays ?? 0, C.medianDays === null ? 'no callbacks yet' : 'short = the job itself')
      + kpi(4, '<b>People</b> · with jobs', C.people.filter((p) => p.jobs).length)
      + panel('s6', 5, '<b>Rate by person</b> · %', C.people.length ? hbars(C.people.map((p) => ({ l: p.name, v: Math.round((p.rate || 0) * 1000) / 10, sub: `${p.callbacks}/${p.jobs}`, color: (p.rate || 0) > 0.1 ? 'var(--bad)' : (p.rate || 0) > 0.05 ? 'var(--warn)' : 'var(--ok)' })), 'var(--ok)', (v) => v + '%') : '<div class="empty">No jobs</div>')
      + panel('s6', 6, '<b>Callbacks per month</b> · by job month', bars(perMonth, mk.map((k2) => k2.slice(2)), 'var(--orange)', 560, 180, fmtN, { keys: mk }));
  }
  if (k === 'capacity') {
    if (!m.capacity) return panel('s12', 1, '<b>Field capacity</b>', '<div class="empty">Only for people who see every customer.</div>');
    const C = m.capacity; const o = C.opts; const w0 = C.weeks[0];
    // 12-month outlook at the current pace (what-if engine): first month the work needs more than 90 % of the hands
    const base = { ...SIM.BASE, months: 12, installsPerWeek: m.metrics.avg4w || 0, jobsPerDay: o.jobsPerDay, stockNow: 99999 };
    const cohorts = homeCohorts(m);
    const firstBusy = (people) => { const S1 = SIM.simulate({ ...base, techs: people }, { cohorts }); return S1.rows.findIndex((r) => r.visits + base.installsPerWeek * 52 / 12 * o.installSlots + C.rate * 52 / 12 > r.cap * o.busy); }; // + repairs at the 8-week rate
    const b0 = firstBusy(C.people), b1 = firstBusy(C.people + 1);
    const monthOf = (i) => R.addMonths(t.slice(0, 7) + '-01', i);
    const hireBy = b0 < 0 ? null : R.addDays(monthOf(b0), -7 * o.hireLeadWeeks); const hireLate = !!hireBy && hireBy <= t;
    const cols = { carry: 'var(--grey)', visits: 'var(--brand)', repairs: 'var(--orange)', installs: 'var(--ok)' };
    const W = 900, H = 230, pad = 36; const maxV = Math.max(1, ...C.weeks.map((w) => Math.max(w.demand, w.cap))); const bw = (W - pad - 10) / C.weeks.length;
    const y = (v) => H - 24 - (v / maxV) * (H - 40);
    const stacks = C.weeks.map((w, i) => { let acc = 0; const x0 = pad + i * bw + bw * 0.18, ww = bw * 0.64; return [['carry', w.carryIn], ['visits', w.visits + w.newVisits], ['repairs', w.repairs], ['installs', w.installs * o.installSlots]].map(([k2, v]) => { const y1 = y(acc), y2 = y(acc + v); acc += v; return `<rect x="${x0.toFixed(1)}" y="${y2.toFixed(1)}" width="${ww.toFixed(1)}" height="${Math.max(0, y1 - y2).toFixed(1)}" fill="${cols[k2]}" opacity=".85" data-tip="${esc(`${w.from.slice(5)}: ${k2} ${v.toFixed(1)}`)}"/>`; }).join('') + `<line x1="${(x0 - 6).toFixed(1)}" x2="${(x0 + ww + 6).toFixed(1)}" y1="${y(w.cap).toFixed(1)}" y2="${y(w.cap).toFixed(1)}" stroke="${w.load > 1 ? 'var(--bad)' : 'var(--ink)'}" stroke-width="2.5"/><text class="ax" x="${(x0 + ww / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(w.from.slice(5))}</text>${w.closed ? `<text class="ax" x="${(x0 + ww / 2).toFixed(1)}" y="${(y(0) - 8).toFixed(1)}" text-anchor="middle" style="fill:var(--warn)">🎉 closed</text>` : w.off > 1 ? `<text class="ax" x="${(x0 + ww / 2).toFixed(1)}" y="${(y(w.cap) - 6).toFixed(1)}" text-anchor="middle" style="fill:var(--warn)">🎉 ${w.off - 1}</text>` : ''}`; }).join('');
    const chart = `<div class="chart"><svg viewBox="0 0 ${W} ${H}"><text class="ax" x="0" y="${(y(maxV) + 8).toFixed(1)}">${Math.round(maxV)}</text><text class="ax" x="0" y="${(y(0) + 3).toFixed(1)}">0</text>${stacks}</svg></div><div class="legend"><span><i class="sw" style="background:var(--grey)"></i>left from before</span><span><i class="sw" style="background:var(--brand)"></i>homes to visit</span><span><i class="sw" style="background:var(--orange)"></i>repairs</span><span><i class="sw" style="background:var(--ok)"></i>installs (× ${o.installSlots} slots)</span><span>▬ slots (red = over)</span><span>🎉 = holidays that week</span></div>`;
    return kpi(1, '<b>This week</b> · load', Math.min(9.99, w0.load || 0), `${Math.round(w0.demand)} jobs · ${w0.cap} slots`, 'pct', w0.load > 1 ? 'var(--bad)' : w0.load > o.busy ? 'var(--warn)' : 'var(--ok)')
      + kpi(2, '<b>Busiest week</b> · next 8', Math.min(9.99, C.peak.load || 0), `from ${C.peak.from}`, 'pct', C.peak.load > 1 ? 'var(--bad)' : '')
      + kpi(3, '<b>People in the field</b>', C.people, `${o.jobsPerDay} homes a day each`)
      + panel('s3 kpi', 4, '<b>Hire by</b> · at today’s pace', `<div class="v" style="font-size:26px${hireLate ? ';color:var(--bad)' : ''}">${hireLate ? 'Now' : hireBy ? esc(hireBy) : '—'}</div><div class="sub">${hireLate ? `<span style="color:var(--bad)">late since ${esc(hireBy)}</span>` : ''}<span>${b0 < 0 ? 'not needed in 12 months' : `busy from ${esc(monLabel(R.monthKey(monthOf(b0))))} · ${o.hireLeadWeeks} weeks to hire & train`}</span>${b0 >= 0 ? `<span>with one more: ${b1 < 0 ? 'fine for 12 months' : 'busy again ' + esc(monLabel(R.monthKey(monthOf(b1))))}</span>` : ''}${C.over.length && !hireLate ? `<span style="color:var(--warn)">the next 8 weeks are over in ${C.over.length} week${C.over.length > 1 ? 's' : ''} already — see the chart</span>` : ''}</div>`)
      + panel('s12', 5, `<b>Next ${o.weeks} weeks</b> · jobs vs slots`, chart);
  }
  if (k === 'leavers') {
    const L = R.leaverStats(m.D.customers, m.D.recoveries, t); const lateN = R.lateReasonStats(m.D.payments, m.D.checkins, R.addDays(t, -365));
    const thisM = L.rows.filter((x) => R.monthKey(x.end) === R.monthKey(t)).length;
    const reasons = Object.entries(L.byReason).sort((a, b) => b[1].n - a[1].n);
    const perMonth = mk.map((k2) => Object.values(L.byMonth[k2] || {}).reduce((s2, n) => s2 + n, 0));
    return kpi(1, '<b>Homes left</b> · all time', L.rows.length, `${thisM} this month`) + kpi(2, '<b>Monthly revenue lost</b> · VAT incl.', L.lostMonthly, 'if none of them had left') + kpi(3, '<b>Contract value lost</b>', L.lostContract, 'months left of 36 × price') + kpi(4, '<b>Months before leaving</b> · median', L.median ?? 0, `${L.recorded} of ${L.rows.length} with a reason`)
      + panel('s6', 5, '<b>Main reasons</b> · homes', reasons.length ? hbars(reasons.map(([l, o]) => ({ l, v: o.n, sub: `${Math.round(o.tenure / o.n)} mo avg`, color: l === 'Not recorded' ? 'var(--grey)' : 'var(--bad)' })), 'var(--bad)') : '<div class="empty">Nobody has left 🎉</div>')
      + panel('s6', 6, '<b>Contract value lost</b> · by reason (NPR)', reasons.length ? hbars(reasons.map(([l, o]) => ({ l, v: o.lostContract, color: l === 'Not recorded' ? 'var(--grey)' : 'var(--orange)' })), 'var(--orange)', fmtK) : '<div class="empty">—</div>')
      + panel('s4', 7, '<b>When they left</b> · months after install', hbars(L.byTenure.map((b) => ({ l: b.l, v: b.n })), 'var(--warn)'))
      + panel('s4', 8, '<b>Leavers per month</b> · 12 months', bars(perMonth, mk.map((k2) => k2.slice(2)), 'var(--bad)', 420, 170, fmtN, { keys: mk }))
      + panel('s4', 9, '<b>Why payments were late</b> · 12 months', Object.keys(lateN).length ? hbars(R.LATE_REASONS.filter((k2) => lateN[k2]).map((k2) => ({ l: k2, v: lateN[k2].total, color: k2 === 'Money not come in yet' ? 'var(--info)' : k2 === 'No money this month' ? 'var(--bad)' : 'var(--warn)' })), 'var(--warn)') + '<div class="muted" style="margin-top:6px">Blue = timing (move the bill day) · red = no money.</div>' : '<div class="empty">No late reasons recorded yet</div>');
  }
  if (k === 'deposits') {
    const D2 = m.deposits; const rows = D2.rows.filter((r) => r.held > 0);
    const buckets = [[1, 1200], [1201, 2400], [2401, 3599], [3600, 3600]].map(([a, b]) => ({ l: a === 3600 ? 'full 3,600' : `${fmtN(a)}–${fmtN(b)}`, v: rows.filter((r) => r.held >= a && r.held <= b).length }));
    return kpi(1, '<b>Held now</b> · not our money', D2.total.held, `${rows.length} homes`) + kpi(2, '<b>Collected</b> · all time', D2.total.collected) + kpi(3, '<b>Refunded</b>', D2.total.refunded) + kpi(4, '<b>Forfeited</b> · became revenue', D2.total.forfeited)
      + panel('s7', 5, '<b>Deposit received</b> · per month', bars(mk.map((x) => (vatBy[x] ? vatBy[x].deposit : 0)), mk.map((x) => x.slice(2)), 'var(--info)', 640, 200, fmtK))
      + panel('s5', 6, '<b>Homes by amount held</b>', hbars(buckets, 'var(--info)'));
  }
  if (k === 'payments') {
    const cur = R.monthKey(t); const ps = m.D.payments.filter((q) => !R.isNonCash(q));
    const thisM = ps.filter((q) => R.monthKey(q.date) === cur); const prevM = ps.filter((q) => R.monthKey(q.date) === R.monthKey(R.addMonths(cur + '-01', -1)));
    const byMethod = {}; for (const q of thisM) byMethod[q.method || '—'] = (byMethod[q.method || '—'] || 0) + (Number(q.amount) || 0);
    const days = Array.from({ length: 30 }, (_, i) => R.addDays(t, i - 29)); const byDay = Object.fromEntries(days.map((x) => [x, 0])); for (const q of ps) if (byDay[q.date] !== undefined) byDay[q.date] += Number(q.amount) || 0;
    const colors = ['#34c1ff', '#2ee59d', '#ffcc4d', '#ff9a3d', '#7c4dff', '#ff5c5c'];
    return kpi(1, '<b>This month</b> · cash in', thisM.reduce((s2, q) => s2 + (Number(q.amount) || 0), 0), `${thisM.length} payments`) + kpi(2, '<b>Last month</b>', prevM.reduce((s2, q) => s2 + (Number(q.amount) || 0), 0), `${prevM.length} payments`)
      + kpi(3, '<b>Average payment</b>', thisM.length ? thisM.reduce((s2, q) => s2 + (Number(q.amount) || 0), 0) / thisM.length : 0) + kpi(4, '<b>Overdue now</b>', m.metrics.overdueAmt, `${m.metrics.overdueHH} homes`, 'int', 'var(--bad)')
      + panel('s8', 5, '<b>Last 30 days</b> · per day', bars(days.map((x) => byDay[x]), days.map((x) => x.slice(8)), 'var(--ok)', 760, 200, fmtK, { keys: days }))
      + panel('s4', 6, '<b>How they paid</b> · this month', `<div style="display:flex;align-items:center;gap:16px">${donut(Object.entries(byMethod).map(([l, v], i) => ({ l, v: Math.round(v / 100) / 10, color: colors[i % colors.length] })), 150, 'k NPR')}<div class="legend" style="flex-direction:column;gap:8px">${Object.entries(byMethod).map(([l, v], i) => `<span><i class="dot" style="background:${colors[i % colors.length]}"></i>${esc(l)} <b class="num">${fmtN(v)}</b></span>`).join('')}</div></div>`);
  }
  if (k === 'vat') {
    const cur = vatBy[R.monthKey(t)] || { vat: 0, taxable: 0 }; const prev = vatBy[R.monthKey(R.addMonths(t.slice(0, 7) + '-01', -1))] || { vat: 0 };
    return kpi(1, '<b>VAT this month</b> · sales', cur.vat) + kpi(2, '<b>Last month</b>', prev.vat) + kpi(3, '<b>Taxable</b> · VAT incl.', cur.taxable) + kpi(4, '<b>Input VAT</b> · this month', (m.expMonths[R.monthKey(t)] || { vat: 0 }).vat)
      + panel('s12', 5, '<b>VAT on sales</b> · 12 months', bars(mk.map((x) => (vatBy[x] ? vatBy[x].vat : 0)), mk.map((x) => x.slice(2)), 'var(--brand)', 1100, 200, fmtK), `<button class="a" data-report="capack">🧾 CA pack →</button>`);
  }
  if (k === 'gate') { const G = m.metrics.gate; return panel('s12', 1, '<b>Direction gate</b> · Plan B triggers', `<div class="gauges big">${gauge(G.collection.value, G.collection.trigger, 'Collection', `${Math.round(G.collection.exposure)}/${G.collection.need} bills`, 'high', G.collection.judgeable)}${gauge(G.retention.value, G.retention.trigger, '90-day retention', `${G.retention.n}/${G.retention.need} homes`, 'high', G.retention.judgeable)}${gauge(G.churn.value, G.churn.trigger, 'Churn / month', `${Math.round(G.churn.exposure)}/${G.churn.need} hh-mo`, 'low', G.churn.judgeable)}</div>`); }
  if (k === 'stock') {
    const st = m.metrics.stock; const dem = R.filterDemand(m.filtersAll, t, 90); const F = m.metrics.fcl;
    const items = R.FILTER_TYPES.filter((f) => f !== 'Spin-down');
    const next = m.filterPlan && m.filterPlan.rows.filter((r) => r.orderBy).sort((a, b) => a.orderBy.localeCompare(b.orderBy))[0];
    return kpi(1, '<b>Devices in stock</b>', st.Device ?? 0, `order point ${F.threshold.toFixed(1)}`) + kpi(2, '<b>Installs / week</b> · 4 weeks', F.avg4w, '', 'dec') + kpi(3, '<b>Lead time</b> · weeks', F.leadTimeWeeks) + kpi(4, '<b>FCL#1</b>', F.ready ? 1 : 0, F.ready ? 'ORDER NOW' : 'not yet')
      + panel('s12', 5, `<b>Filters on the shelf</b> · next 9 months${next ? ` · next order: ${esc(next.type)} by ${esc(next.orderBy)}` : ''}`, m.filterPlan ? stockLines(m.filterPlan, t) : '<div class="empty">Only for people who see every customer.</div>')
      + panel('s6', 6, '<b>Filters in stock</b>', hbars(items.map((f) => ({ l: f, v: st[f] ?? 0 })), 'var(--ok)'))
      + panel('s6', 7, '<b>Filters needed</b> · next 90 days', hbars(items.map((f) => ({ l: f, v: dem.types[f] || 0, color: (dem.types[f] || 0) > (st[f] ?? 0) ? 'var(--bad)' : 'var(--warn)' })), 'var(--warn)'));
  }
  if (k === 'learning') return panel('s12', 1, '<b>Real change interval vs booking</b> · months', hbars(m.learning.filter((l) => l.bookingMonths).flatMap((l) => [{ l: `${l.type} booking`, v: l.bookingMonths, color: 'var(--grey)' }, { l: `${l.type} real`, v: l.avgMonths ? Math.round(l.avgMonths * 10) / 10 : 0, sub: `${l.n} samples`, color: 'var(--brand)' }]), 'var(--brand)', (v) => String(v)));
  if (k === 'referrals') { const rr = m.referrals; return kpi(1, '<b>Referral pairs</b>', rr.filter((r) => r.role === 'referrer').length) + kpi(2, '<b>Rewards ready</b>', rr.filter((r) => r.ready && !r.done).length) + kpi(3, '<b>Applied</b>', rr.filter((r) => r.done).length) + kpi(4, '<b>Value applied</b> · NPR', rr.filter((r) => r.done).reduce((s2, r) => s2 + r.amount, 0)); }
  if (k === 'quality') { const dq = dataQuality(m); return dq.map((g, i) => panel('s3 kpi', i + 1, `<b>${g.ic}</b> ${esc(g.t)}`, `<div class="v" style="color:${g.xs.length ? 'var(--warn)' : 'var(--ok)'}">${counter('dq' + i, g.xs.length)}</div><div class="sub"><span>${esc(g.why)}</span></div>`)).join(''); }
  if (k === 'trainings') { const by = {}; for (const q of m.D.trainings) by[q.person || '?'] = (by[q.person || '?'] || 0) + 1; return panel('s12', 1, '<b>Trainings</b> · per person', hbars(Object.entries(by).map(([l, v]) => ({ l, v })), 'var(--brand)')); }
  return '';
}

// ---------- 📅 History: any past month, as it stood at the end of that month ----------
let histCache = { ver: -1, day: '', H: null };
function historyModel(m) {
  if (histCache.ver === S.ver && histCache.day === m.t && histCache.H) return histCache.H;
  const firsts = [...m.D.customers.map((c) => c.installDate), ...m.D.payments.map((p) => p.date)].filter(R.isDate).sort();
  const start = firsts.length ? R.monthKey(firsts[0]) : R.monthKey(m.t);
  const months = []; for (let k = start; k <= R.monthKey(m.t); k = R.monthKey(R.addMonths(k + '-01', 1))) months.push(k);
  const payBy = new Map(); for (const p of m.D.payments) { if (!payBy.has(p.customerId)) payBy.set(p.customerId, []); payBy.get(p.customerId).push(p); }
  const byMonth = {};
  for (const mk of months) {
    const end = mk === R.monthKey(m.t) ? m.t : monthEnd(mk);
    let M, dep;
    if (end === m.t) { M = m.metrics; dep = m.deposits.total; }
    else {
      const snap = R.snapshotAt(m.D, end); const led = new Map(snap.customers.map((c) => [c.id, R.ledger(c, (payBy.get(c.id) || []).filter((p) => p.date <= end), end)]));
      M = R.metrics(snap, led, end, S.settings); dep = R.depositBook(snap.customers, led, snap.recoveries).total;
    }
    const A = R.periodActivity(m.D, mk + '-01', end); const vat = m.vat.find((r) => r.month === mk);
    byMonth[mk] = { mk, end, M, dep, A, vat };
  }
  const H = { months, byMonth, cohorts: R.cohortRetention(m.D.customers, m.t, 12) };
  histCache = { ver: S.ver, day: m.t, H };
  return H;
}
function pageHistory(m) {
  const H = historyModel(m); const p = S.route.params;
  const sel = p.m && H.byMonth[p.m] ? p.m : H.months[H.months.length - 1]; const X = H.byMonth[sel];
  const i = H.months.indexOf(sel); const P = i > 0 ? H.byMonth[H.months[i - 1]] : null;
  const bsA = B.adToBs(sel + '-01'), bsB = B.adToBs(X.end);
  const bsTxt = bsA && bsB ? (bsA.m === bsB.m ? B.bsLabel(bsA.y, bsA.m) : `${B.bsLabel(bsA.y, bsA.m)} – ${B.bsLabel(bsB.y, bsB.m)}`) : '';
  const A = X.A, M = X.M;
  const cashV = H.months.map((k) => H.byMonth[k].A.cash), actV = H.months.map((k) => H.byMonth[k].M.active);
  const lab = H.months.map((k) => k.slice(2));
  const payRows = Object.entries(A.byType).sort((a, b) => b[1] - a[1]);
  const heatCell = (c) => (c ? `<td class="hm" style="background:rgba(${c.v >= 0.95 ? '46,229,157' : c.v >= 0.85 ? '255,204,77' : '255,92,92'},${(0.18 + 0.5 * c.v).toFixed(2)})" title="${c.kept}/${c.n}">${Math.round(c.v * 100)}</td>` : '<td></td>');
  const maxK = Math.max(1, ...H.cohorts.map((r) => r.cells.length));
  const cn = (id) => { const c = S.D.customers.get(id); return c ? c.name : '?'; };
  return `<div class="cc">
    <div class="panel s12 monthbar" style="--i:0"><button class="nav" data-hist="${H.months[Math.max(0, i - 1)]}" ${i <= 0 ? 'disabled' : ''}>‹</button>
      <div class="chips">${H.months.map((k) => `<button data-hist="${k}" class="${k === sel ? 'on' : ''}">${esc(monLabel(k))}</button>`).join('')}</div>
      <button class="nav" data-hist="${H.months[Math.min(H.months.length - 1, i + 1)]}" ${i >= H.months.length - 1 ? 'disabled' : ''}>›</button>
      <div class="sel"><b>${esc(monLabel(sel))}</b><span>${esc(bsTxt)} · as of ${esc(X.end)}${X.end === m.t ? ' (today)' : ''}</span></div><button class="btn small" data-monthpeek="${sel}">🔍 Open this month</button></div>
    ${panel('s3 kpi', 1, '<b>Active</b> · at month end', `<div class="v">${counter('h_act', M.active)}</div><div class="sub"><span>${M.installed} installed</span>${P ? `<span>${delta(M.active, P.M.active)} vs ${esc(monLabel(P.mk))}</span>` : ''}</div>`)}
    ${panel('s3 kpi', 2, '<b>Cash in</b> · this month', `<div class="v">${counter('h_cash', A.cash)}</div><div class="sub"><span>VAT ${X.vat ? fmtN(X.vat.vat) : 0}</span><span>deposit ${X.vat ? fmtN(X.vat.deposit) : 0}</span>${P ? `<span>${delta(A.cash, P.A.cash, fmtK)}</span>` : ''}</div>`)}
    ${panel('s3 kpi', 3, '<b>Collection</b> · bills due by month end', `<div class="v">${M.collection === null ? '—' : counter('h_col', M.collection, 'pct')}</div><div class="sub"><span>${M.billsPaid}/${M.billsDue} bills</span><span style="color:var(--bad)">overdue ${fmtN(M.overdueAmt)}</span></div>`)}
    ${panel('s3 kpi', 4, '<b>In · out</b> · this month', `<div class="v">+${A.installs.length}<small> / −${A.churns.length}</small></div><div class="sub"><span>deposit held ${fmtN(X.dep.held)}</span><span>MRR ${fmtN(M.mrr)}</span></div>`)}
    ${panel('s6', 5, '<b>Households</b> · active at each month end', bars(actV, lab, 'var(--brand)', 560, 170, fmtN, { keys: H.months, hi: i, data: (k) => `data-hist="${H.months[k]}" style="cursor:pointer"` }))}
    ${panel('s6', 6, '<b>Cash in</b> · every month', bars(cashV, lab, 'var(--ok)', 560, 170, fmtK, { keys: H.months, hi: i, data: (k) => `data-hist="${H.months[k]}" style="cursor:pointer"` }))}
    ${panel('s4', 7, `<b>Money</b> · ${esc(monLabel(sel))}`, `${hbars(payRows.map(([k, v]) => ({ l: k, v })), 'var(--ok)', fmtK)}<div class="kv" style="margin-top:10px"><div class="k">Taxable (VAT incl.)</div><div class="v num">${X.vat ? fmtN(X.vat.taxable + X.vat.forfeits) : 0}</div><div class="k">VAT 13%</div><div class="v num">${X.vat ? X.vat.vat.toFixed(2) : '0.00'}</div><div class="k">Deposit received</div><div class="v num">${X.vat ? fmtN(X.vat.deposit) : 0}</div></div>`, `<button class="a" data-csv="hist:payments:${sel}">⬇️ CSV</button>`)}
    ${panel('s4', 8, `<b>Field</b> · ${esc(monLabel(sel))}`, `<div class="kv"><div class="k">Installs</div><div class="v num">${A.installs.length}</div><div class="k">Visits done</div><div class="v num">${A.visits.length}</div>${Object.entries(A.visitTypes).map(([k, v]) => `<div class="k">· ${esc(k)}</div><div class="v num">${v}</div>`).join('')}<div class="k">Filters changed</div><div class="v num">${Object.values(A.filters).reduce((s, v) => s + v, 0)} <span class="muted">${esc(Object.entries(A.filters).map(([k, v]) => `${k} ${v}`).join(' · '))}</span></div><div class="k">Sanitised</div><div class="v num">${A.sanitised}</div><div class="k">Requests in · done</div><div class="v num">${A.requestsIn.length} · ${A.requestsDone.length}</div><div class="k">Calls logged</div><div class="v num">${A.checkins.length}</div><div class="k">Recovery cases</div><div class="v num">${A.recoveries.length}</div></div>`, `<button class="a" data-csv="hist:visits:${sel}">⬇️ CSV</button>`)}
    ${panel('s4', 9, `<b>Installs & leavers</b> · ${esc(monLabel(sel))}`, `<div class="mini-list">${A.installs.map((c) => `<div class="item" data-cust="${esc(c.id)}"><span class="dot g"></span><div class="main"><div class="t">${esc(c.name)}</div><div class="s">${esc(c.installDate)} · ${esc(toleOf(c))} · ${esc(c.agent || '')}</div></div></div>`).join('')}${A.churns.map((c) => `<div class="item" data-cust="${esc(c.id)}"><span class="dot k"></span><div class="main"><div class="t">${esc(c.name)} · left</div><div class="s">${esc(c.churnDate)} · ${esc(toleOf(c))}</div></div></div>`).join('') || (A.installs.length ? '' : '<div class="empty">None this month</div>')}</div>`, `<button class="a" data-csv="hist:installs:${sel}">⬇️ CSV</button>`)}
    ${panel('s7', 10, '<b>Every month</b> · tap a row for the full month', `<div class="scroll-x"><table class="tbl"><tr><th>Month</th><th class="n">Installs</th><th class="n">Left</th><th class="n">Active (end)</th><th class="n">Cash in</th><th class="n">VAT</th><th class="n">Collection</th><th class="n">Overdue (end)</th><th class="n">Visits</th><th class="n">Requests</th></tr>
      ${H.months.slice().reverse().map((k) => { const r = H.byMonth[k]; return `<tr data-monthpeek="${k}" style="cursor:pointer" class="${k === sel ? 'sel' : ''}"><td><b>${esc(monLabel(k))}</b></td><td class="n">${r.A.installs.length}</td><td class="n">${r.A.churns.length || '—'}</td><td class="n">${r.M.active}</td><td class="n">${fmtN(r.A.cash)}</td><td class="n">${r.vat ? fmtN(r.vat.vat) : 0}</td><td class="n">${R.pct(r.M.collection)}</td><td class="n">${fmtN(r.M.overdueAmt)}</td><td class="n">${r.A.visits.length}</td><td class="n">${r.A.requestsIn.length}</td></tr>`; }).join('')}</table></div>`, `<button class="a" data-csv="hist:months:all">⬇️ CSV</button>`)}
    ${panel('s5', 11, '<b>Cohorts</b> · % of each install month still with us', `<div class="scroll-x"><table class="tbl heatmap"><tr><th>Installed</th><th class="n">Homes</th>${Array.from({ length: maxK }, (_, k) => `<th class="n">M${k}</th>`).join('')}</tr>${H.cohorts.slice(-12).reverse().map((r) => `<tr><td>${esc(monLabel(r.month))}</td><td class="n">${r.n}</td>${Array.from({ length: maxK }, (_, k) => heatCell(r.cells[k])).join('')}</tr>`).join('') || '<tr><td class="muted">No installs yet</td></tr>'}</table></div><div class="muted" style="margin-top:6px">M3 = 3 months after install. Green ≥ 95% · yellow ≥ 85% (the gate line) · red below.</div>`)}
    ${X.end !== m.t ? `<div class="muted" style="grid-column:span 12">Past months are rebuilt from the records: payments, visits and leavers up to that day. Paused customers count as active in past months (the pause start is not stored).</div>` : ''}
  </div>`;
}
// Centre window: everything about one month (money, work, people) on one screen.
export function monthPeekHtml(mk) {
  const m = model(); const H = historyModel(m); const X = H.byMonth[mk]; if (!X) return '<div class="empty">No data for this month</div>';
  const i = H.months.indexOf(mk); const P = i > 0 ? H.byMonth[H.months[i - 1]] : null; const A = X.A, M = X.M;
  const ex = m.expMonths[mk] || { paid: 0, vat: 0, net: 0, byCat: {} }; const rev = X.vat ? X.vat.net : 0; const result = rev - ex.net;
  const bsA = B.adToBs(mk + '-01'), bsB = B.adToBs(X.end);
  const days = []; for (let d = mk + '-01'; d <= X.end; d = R.addDays(d, 1)) days.push(d);
  const byDay = Object.fromEntries(days.map((d) => [d, 0])); for (const q of A.payments) if (!R.isNonCash(q) && byDay[q.date] !== undefined) byDay[q.date] += Number(q.amount) || 0;
  const cname = (id) => { const c = S.D.customers.get(id); return c ? c.name : '?'; };
  const tile = (l, v, sub, color) => `<div class="pk-tile"><span>${l}</span><b class="num"${color ? ` style="color:${color}"` : ''}>${v}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
  const exps = m.D.expenses.filter((x) => R.monthKey(x.date || '') === mk).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return `<div class="pk-head"><div><div class="eyebrow">${esc(bsA && bsB ? (bsA.m === bsB.m ? B.bsLabel(bsA.y, bsA.m) : B.bsLabel(bsA.y, bsA.m) + ' – ' + B.bsLabel(bsB.y, bsB.m)) : '')}</div><h2>${esc(monLabel(mk))}</h2><div class="muted">as of ${esc(X.end)}${X.end === m.t ? ' (today)' : ''}</div></div>
      <div class="pk-nav">${i > 0 ? `<button class="btn small ghost" data-monthpeek="${H.months[i - 1]}">‹ ${esc(monLabel(H.months[i - 1]))}</button>` : ''}${i < H.months.length - 1 ? `<button class="btn small ghost" data-monthpeek="${H.months[i + 1]}">${esc(monLabel(H.months[i + 1]))} ›</button>` : ''}</div></div>
    <div class="pk-grid">
      ${tile('Active at month end', fmtN(M.active), P ? delta(M.active, P.M.active) : '')}${tile('Installs · left', `+${A.installs.length} · −${A.churns.length}`)}${tile('Cash in', fmtN(A.cash), P ? delta(A.cash, P.A.cash, fmtK) : '')}${tile('Collection', R.pct(M.collection), `${M.billsPaid}/${M.billsDue} bills`)}
      ${tile('VAT on sales', X.vat ? X.vat.vat.toFixed(2) : '0.00')}${tile('Input VAT', ex.vat.toFixed(2))}${tile('Expenses (no VAT)', fmtN(ex.net))}${tile('Result (no VAT)', fmtN(result), 'revenue − expenses', result < 0 ? 'var(--bad)' : 'var(--ok)')}
      ${tile('Overdue at month end', fmtN(M.overdueAmt), `${M.overdueHH} homes`, M.overdueAmt ? 'var(--bad)' : '')}${tile('Deposit received', fmtN(X.vat ? X.vat.deposit : 0))}${tile('Deposit held', fmtN(X.dep.held))}${tile('Visits done', fmtN(A.visits.length), `${Object.values(A.filters).reduce((a, b) => a + b, 0)} filters`)}
    </div>
    <div class="pk-two"><div class="card"><div class="status">💵 Cash in · per day</div>${bars(days.map((d) => byDay[d]), days.map((d) => d.slice(8)), 'var(--ok)', 560, 170, fmtK)}</div>
      <div class="card"><div class="status">📊 Money by kind</div>${hbars(Object.entries(A.byType).sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ l, v })), 'var(--ok)', fmtK) || '<div class="empty">No payments</div>'}<div class="status" style="margin-top:10px">🧾 Expenses by category</div>${hbars(Object.entries(ex.byCat).sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ l, v, color: 'var(--orange)' })), 'var(--orange)', fmtK) || '<div class="empty">No expenses</div>'}</div></div>
    <div class="pk-two"><div class="card"><div class="status">💵 Payments (${A.payments.length})</div><div class="scroll-x pk-scroll"><table class="tbl"><tr><th>Date</th><th>Customer</th><th>What for</th><th class="n">NPR</th><th>Paid by</th><th>Bill</th></tr>${A.payments.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).map((q) => `<tr data-cust="${esc(q.customerId)}" style="cursor:pointer"><td class="mono">${esc(q.date.slice(5))}</td><td>${esc(cname(q.customerId))}</td><td>${esc(q.type)}</td><td class="n">${fmtN(q.amount)}</td><td>${esc(q.method || '')}</td><td class="mono">${esc(q.billNo || '')}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">None</td></tr>'}</table></div></div>
      <div class="card"><div class="status">🧾 Expenses (${exps.length})</div><div class="scroll-x pk-scroll"><table class="tbl"><tr><th>Date</th><th>Category</th><th>Supplier</th><th class="n">NPR</th><th class="n">VAT</th></tr>${exps.map((x) => `<tr data-edit="expense" data-id="${esc(x.id)}" style="cursor:pointer"><td class="mono">${esc(String(x.date).slice(5))}</td><td>${esc(x.category || '')}</td><td>${esc(x.supplier || '')}</td><td class="n">${fmtN(x.amount)}</td><td class="n">${R.expVat(x).toFixed(0)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">None</td></tr>'}</table></div></div></div>
    <div class="pk-two"><div class="card"><div class="status">🏠 Installs &amp; leavers</div><div class="mini-list">${A.installs.map((c) => `<div class="item" data-cust="${esc(c.id)}"><span class="dot g"></span><div class="main"><div class="t">${esc(c.name)}</div><div class="s">${esc(c.installDate)} · ${esc(toleOf(c))} · ${esc(c.agent || '')}</div></div></div>`).join('')}${A.churns.map((c) => `<div class="item" data-cust="${esc(c.id)}"><span class="dot k"></span><div class="main"><div class="t">${esc(c.name)} · left</div><div class="s">${esc(c.churnDate)}</div></div></div>`).join('') || (A.installs.length ? '' : '<div class="empty">None this month</div>')}</div></div>
      <div class="card"><div class="status">🔧 Field work</div><div class="kv">${Object.entries(A.visitTypes).map(([k2, v]) => `<div class="k">${esc(k2)}</div><div class="v num">${v}</div>`).join('')}<div class="k">Filters changed</div><div class="v num">${esc(Object.entries(A.filters).map(([k2, v]) => `${k2} ${v}`).join(' · ') || '0')}</div><div class="k">Requests in · done</div><div class="v num">${A.requestsIn.length} · ${A.requestsDone.length}</div><div class="k">Calls logged</div><div class="v num">${A.checkins.length}</div></div></div></div>
    <div class="row wrap"><button class="btn ghost" data-csv="hist:payments:${mk}">⬇️ Payments CSV</button><button class="btn ghost" data-csv="hist:visits:${mk}">⬇️ Visits CSV</button>${bsA ? `<button class="btn ghost" data-capack-open="${bsA.y}|${bsA.m}">🧾 CA pack · ${esc(B.bsLabel(bsA.y, bsA.m))}</button>` : ''}${bsB && bsA && bsB.m !== bsA.m ? `<button class="btn ghost" data-capack-open="${bsB.y}|${bsB.m}">🧾 CA pack · ${esc(B.bsLabel(bsB.y, bsB.m))}</button>` : ''}</div>`;
}
export function historyCsv(kind, mk) {
  const m = model(); const H = historyModel(m);
  if (kind === 'months') return R.toCSV(H.months.map((k) => H.byMonth[k]), [{ label: 'month', get: (r) => r.mk }, { label: 'installs', get: (r) => r.A.installs.length }, { label: 'left', get: (r) => r.A.churns.length }, { label: 'active_end', get: (r) => r.M.active }, { label: 'cash_in', get: (r) => r.A.cash }, { label: 'vat', get: (r) => (r.vat ? r.vat.vat.toFixed(2) : 0) }, { label: 'deposit_in', get: (r) => (r.vat ? r.vat.deposit : 0) }, { label: 'collection', get: (r) => (r.M.collection === null ? '' : r.M.collection.toFixed(4)) }, { label: 'overdue_end', get: (r) => r.M.overdueAmt }, { label: 'visits', get: (r) => r.A.visits.length }, { label: 'requests', get: (r) => r.A.requestsIn.length }]);
  const X = H.byMonth[mk]; if (!X) return '';
  const cn = (id) => { const c = S.D.customers.get(id); return c ? [c.code, c.name] : ['', '']; };
  if (kind === 'payments') return R.toCSV(X.A.payments, [{ key: 'date' }, { label: 'code', get: (r) => cn(r.customerId)[0] }, { label: 'customer', get: (r) => cn(r.customerId)[1] }, { key: 'type' }, { key: 'amount' }, { key: 'method' }, { key: 'ref' }, { key: 'billNo' }]);
  if (kind === 'visits') return R.toCSV(X.A.visits, [{ key: 'date' }, { label: 'code', get: (r) => cn(r.customerId)[0] }, { label: 'customer', get: (r) => cn(r.customerId)[1] }, { key: 'visitType' }, { key: 'filters' }, { key: 'tdsBefore' }, { key: 'tdsAfter' }, { key: 'flow' }, { key: 'technician' }]);
  if (kind === 'installs') return R.toCSV([...X.A.installs.map((c) => ({ ...c, ev: 'install', d: c.installDate })), ...X.A.churns.map((c) => ({ ...c, ev: 'left', d: c.churnDate }))], [{ key: 'ev' }, { key: 'd' }, { key: 'code' }, { key: 'name' }, { label: 'tole', get: (r) => toleOf(r) }, { key: 'agent' }]);
  return '';
}

function pageReports() {
  const t = (r, ic, l, s, list, ok = true) => (ok ? `<button class="tile" ${list ? `data-list="${r}"` : `data-report="${r}"`}><span class="ic">${ic}</span><span>${l}</span><span class="s">${s}</span></button>` : '');
  const money = can('money');
  return `<div class="panel" style="--i:0"><div class="ph"><span class="t"><b>Reports</b> · open on the right</span></div><div class="heat" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
    ${t('capack', '🧾', 'CA pack', 'sales + purchase book · Excel', 0, money)}${t('expenses', '🧾', 'Expenses', 'bills · input VAT', 0, can('expense') || money)}${t('payments', '💵', 'Payments', 'all money in', 0, money)}${t('vat', '🧾', 'VAT by month', 'AD months · CSV', 0, money)}${t('deposits', '🏦', 'Deposit book', 'liability per home', 0, money)}
    ${t('devices', '📦', 'Devices', 'every serial')}${t('relocations', '🚚', 'Relocations', 'moving house', 1)}${t('contract', '📜', 'Contract events', 'notice · transfer · lost', 1)}${t('screenings', '🔎', 'Screenings', 'sign-up checks', 1)}${t('proof', '✍️', 'Proof of visit', 'signatures · 30 days', 1)}${t('water', '🧫', 'Raw-water vials', 'E. coli · PoC', 1)}${t('claims', '📮', 'Supplier claims', 'defects → PI', 1, can('stock'))}${t('quality', '🩺', 'Data to fix', 'missing GPS · bill no.')}${t('gate', '🧭', 'Direction gate', 'with sample sizes', 0, money)}${t('stock', '📦', 'Stock & FCL', 'order signal', 0, can('stock'))}${t('learning', '🧪', 'Filter learning', 'real intervals')}
    ${t('referrals', '🎁', 'Referrals', 'G-1 §4 rewards')}${t('leavers', '🚪', 'Leavers', 'why homes left')}${t('capacity', '👷', 'Field capacity', 'jobs vs hands')}${t('funnel', '⏳', 'Sales stage days', 'lead → first payment')}${t('perform', '📑', 'Grant KPIs', 'PAYGo PERFORM', 0, money)}${t('billing', '🌊', 'Billing moves', 'new · left · month 14', 0, money)}${t('noshows', '🚪', 'Wasted trips', 'nobody home')}${t('callbacks', '🔁', 'Callbacks', 'problems soon after a job')}${t('trainings', '🎓', 'Trainings', 'records', 0, !!S.isAdmin)}${t('leads', '🧲', 'Leads', 'pipeline', 1)}
    ${t('help', '❓', 'How to use', 'staff one-pager')}${t('recoveries', '📦', 'Recoveries', 'cases', 1)}${t('paused', '⏸️', 'Paused', 'customers', 1)}${t('tomorrow', '📅', 'Bills tomorrow', 'reminders', 1)}
    ${isBoss() ? t('handover', '🆘', 'If Jun cannot work', 'handover page') + t('payroll', '💼', 'Payroll', 'SSF · TDS · payslips') : ''}${isBoss() ? t('users', '🪪', 'Staff & permissions', 'who can do what') + t('bank', '🏧', 'Bank CSV match', 'plan #2') + t('settings', '⚙️', 'Settings', 'company · calendar · techs') : ''}${t('export', '💾', 'Export all data', 'backup', 0, can('export'))}
  </div></div>`;
}

// ---------- 🗓️ calendar: company days + customer days on one month ----------
const BS_SHORT = ['Bai', 'Jes', 'Asa', 'Shr', 'Bha', 'Asw', 'Kar', 'Man', 'Pou', 'Mag', 'Fal', 'Cha'];
const EV_IC = { 'Office closed': '🚪', Payday: '💸', Deadline: '⏰', Meeting: '🤝', Training: '🎓', 'Price change': '💲', Campaign: '📣', 'Stock arrival': '📦', 'Customer visit': '🏠', 'Demo / event': '🎬', 'Installation day': '🛠️', Other: '📌' };
function calRange(p, t) {
  if (p.cm === 'bs') {
    const b0 = p.bm ? p.bm.split('-').map(Number) : null; const b = b0 ? { y: b0[0], m: b0[1] } : B.adToBs(p.d || t);
    const r = B.bsMonthRange(b.y, b.m); return { mode: 'bs', from: r.from, to: r.to, label: `${B.bsLabel(b.y, b.m)} · ${B.BS_MONTHS_NE[b.m - 1]}`, y: b.y, m: b.m };
  }
  const mo = p.mo || (p.d || t).slice(0, 7); return { mode: 'ad', from: mo + '-01', to: monthEnd(mo), label: monLabel(mo), mo };
}
function calModel(m, p) {
  const t = m.t; const RG = calRange(p, t); const days = CAL.gridDays(RG.from, RG.to); const gFrom = days[0], gTo = days[days.length - 1];
  const money = can('money'); const by = {}; const put = (d, lane, x) => { const o = (by[d] = by[d] || { co: [], cu: [] }); o[lane].push(x); };
  if (money) { for (const x of CAL.deadlines(gFrom, gTo, S.settings)) put(x.d, 'co', x); for (const x of CAL.paydays(gFrom, gTo, S.settings)) put(x.d, 'co', x); }
  if (can('stock') && m.filterPlan) for (const r of m.filterPlan.rows) if (r.orderBy) { const d = r.orderBy < t ? t : r.orderBy; if (d >= gFrom && d <= gTo) put(d, 'co', { ic: '🧪', t: `Order ${r.type} filters`, sub: `about ${r.qty} · runs out around ${r.runOut}${r.orderBy < t ? ' · late since ' + r.orderBy : ''}`, kind: 'order', g: '🔴' }); }
  for (const x of CAL.ownEvents(m.D.events, gFrom, gTo)) put(x.d, x.ev.lane === 'Customers' ? 'cu' : 'co', { ic: EV_IC[x.ev.kind] || '📌', t: x.ev.title || x.ev.kind, sub: [x.ev.kind, x.ev.time, x.ev.status === 'Done' ? 'done' : ''].filter(Boolean).join(' · '), own: x.ev, cid: x.ev.customerId || '' });
  const cu = CAL.customerDays(m, gFrom, gTo); for (const [d, xs] of Object.entries(cu)) for (const x of xs) put(d, 'cu', x);
  return { RG, days, by, t, hm: m.hm };
}
const KIND_ORDER = [['bill', '💵', 'Bills due'], ['visit', '🔧', 'Visits'], ['filter', '🧪', 'Filters'], ['call', '📞', 'Calls'], ['lead', '🧲', 'Leads & demos'], ['move', '🚚', 'Moves'], ['arrive', '📦', 'Devices in'], ['check', '🔍', 'Arrival checks'], ['paid', '💰', 'Cash in'], ['done', '✅', 'Done'], ['ev', '📌', 'Customer events']];
function cellHtml(d, K, p, sel) {
  const bs = B.adToBs(d); const wd = new Date(d + 'T00:00:00').getDay(); const hol = K.hm[d] || []; const off = hol.some((h) => h.kind === 'all');
  const o = K.by[d] || { co: [], cu: [] }; const lane = p.lane || 'both';
  const inMonth = d >= K.RG.from && d <= K.RG.to;
  const main = K.RG.mode === 'bs' ? (bs ? bs.d : '') : Number(d.slice(8));
  const other = K.RG.mode === 'bs' ? `${Number(d.slice(8))}${d.slice(8) === '01' ? ' ' + MON[Number(d.slice(5, 7)) - 1] : ''}` : bs ? `${bs.d}${bs.d === 1 ? ' ' + BS_SHORT[bs.m - 1] : ''}` : '';
  const holH = hol.filter((h) => h.kind === 'all').map((h) => `<div class="c-hol">${esc(h.day || h.n)}</div>`).join('') + hol.filter((h) => h.kind === 'part').map((h) => `<div class="c-part">${esc(h.n)}</div>`).join('');
  const co = lane !== 'customers' ? o.co.map((x) => `<div class="c-co ${['tax', 'reg', 'order'].includes(x.kind) ? 'due' : ''}">${x.ic} ${esc(x.t)}</div>`).slice(0, 3).join('') + (o.co.length > 3 ? `<div class="c-more">+${o.co.length - 3}</div>` : '') : '';
  let cu = '';
  if (lane !== 'company') {
    const cnt = {}; let bills = 0; for (const x of o.cu) { const k = x.own ? 'ev' : x.kind; cnt[k] = (cnt[k] || 0) + 1; if (x.kind === 'bill') bills += x.amt || 0; }
    const owns = o.cu.filter((x) => x.own).slice(0, 2).map((x) => `<div class="c-co cu">${x.ic} ${esc(x.t)}</div>`).join('');
    const paid = o.cu.find((x) => x.kind === 'paid');
    cu = owns + `<div class="c-cnt">${KIND_ORDER.filter(([k]) => cnt[k] && k !== 'ev' && k !== 'paid').map(([k, ic]) => `<span class="k-${k}">${ic}${cnt[k]}</span>`).join('')}${paid ? `<span class="k-paid">💰${fmtK(paid.amt)}</span>` : ''}</div>`;
  }
  return `<button class="cal-c${wd === 6 ? ' sat' : ''}${off ? ' off' : ''}${d === K.t ? ' today' : ''}${d === sel ? ' sel' : ''}${inMonth ? '' : ' out'}" data-calday="${d}"><div class="c-h"><b>${main}</b><small>${esc(other)}</small></div>${holH}${co}${cu}</button>`;
}
function agendaHtml(d, K, m) {
  const wd = new Date(d + 'T00:00:00').getDay(); const hol = K.hm[d] || []; const off = wd === 6 || hol.some((h) => h.kind === 'all');
  const o = K.by[d] || { co: [], cu: [] }; const lane = S.route.params.lane || 'both';
  const holR = hol.map((h) => `<div class="ag-i ${h.kind === 'all' ? 'hol' : 'part'}"><span class="ic">${h.kind === 'all' ? '🎉' : '·'}</span><div class="main"><div class="t">${esc(h.n)}${h.day && h.day !== h.n ? ` · ${esc(h.day)}` : ''}${h.ne ? ` <span class="muted">${esc(h.ne)}</span>` : ''}</div><div class="s">${h.kind === 'all' ? 'office closed' : esc(h.who || 'some people only')}${h.from && h.from !== h.until ? ` · ${esc(h.from.slice(5))} → ${esc(h.until.slice(5))}` : ''}${h.ref ? ` · 🟢 ${esc(h.ref)}` : ''}</div></div></div>`).join('');
  const coR = o.co.map((x) => `<div class="ag-i ${x.own ? '' : x.kind === 'pay' ? 'pay' : 'due'}" ${x.own ? `data-edit="event" data-id="${esc(x.own.id)}"` : ''}><span class="ic">${x.ic}</span><div class="main"><div class="t">${esc(x.t)}${x.g ? ` <span class="grade">${x.g}</span>` : ''}</div><div class="s">${esc(x.sub || '')}${(x.kind === 'tax' || x.kind === 'reg') && off ? ' · <b>a day off — do it the working day before</b>' : ''}</div></div></div>`).join('');
  const groups = {}; for (const x of o.cu) (groups[x.own ? 'ev' : x.kind] = groups[x.own ? 'ev' : x.kind] || []).push(x);
  const cuR = KIND_ORDER.filter(([k]) => groups[k]).map(([k, ic, l]) => {
    const xs = groups[k]; const tot = k === 'bill' ? ` · ${fmtN(xs.reduce((s2, x) => s2 + (x.amt || 0), 0))}` : '';
    const withGps = k === 'visit' || k === 'filter' ? xs.map((x) => m.cust.get(x.cid)).filter(Boolean) : [];
    return `<div class="ag-g"><div class="ag-gh">${ic} ${esc(l)} <span class="pill">${xs.length}${tot}</span>${withGps.length ? routeLink(withGps) : ''}</div>${xs.slice(0, 40).map((x) => `<div class="ag-i ${x.late ? 'late' : ''} ${x.status === 'paid' ? 'ok' : ''}" ${x.cid ? `data-cust="${esc(x.cid)}"` : x.edit ? `data-edit="${x.edit}" data-id="${esc(x.id)}"` : x.report ? `data-report="${x.report}"` : x.own ? `data-edit="event" data-id="${esc(x.own.id)}"` : ''}><div class="main"><div class="t">${esc(x.t)}</div><div class="s">${esc(x.sub || '')}${x.tole ? ' · ' + esc(x.tole) : ''}${x.status === 'paid' ? ' · paid' : ''}</div></div></div>`).join('')}${xs.length > 40 ? `<div class="muted">+${xs.length - 40} more</div>` : ''}</div>`;
  }).join('');
  const editCan = can('editCust');
  return `<div class="ag-h"><div class="eyebrow">${off ? '🎉 Day off' : 'Working day'}</div><h2 data-noi18n>${esc(dualDate(d, wd))}</h2></div>
    ${lane !== 'customers' ? `<div class="ag-sec">🏢 Company</div>${holR}${coR}${!holR && !coR ? '<div class="empty">Nothing</div>' : ''}${editCan ? `<button class="btn small ghost" data-go-form="event" data-date="${d}" data-lane="Company">＋ Company event</button>` : ''}` : ''}
    ${lane !== 'company' ? `<div class="ag-sec">👥 Customers</div>${cuR || '<div class="empty">Nothing</div>'}${editCan ? `<button class="btn small ghost" data-go-form="event" data-date="${d}" data-lane="Customers">＋ Customer event</button>` : ''}` : ''}`;
}
function pageCalendar(m) {
  const p = S.route.params || {}; const K = calModel(m, p); const t = K.t;
  const sel = p.d && K.days.includes(p.d) ? p.d : t >= K.RG.from && t <= K.RG.to ? t : K.RG.from;
  const lane = p.lane || 'both';
  // month numbers
  let work = 0, off = 0, billN = 0, billS = 0, visitN = 0;
  for (let d = K.RG.from; d <= K.RG.to; d = R.addDays(d, 1)) { if (CAL.isOff(K.hm, d)) off++; else work++; for (const x of (K.by[d] || { cu: [] }).cu) { if (x.kind === 'bill') { billN++; billS += x.amt || 0; } if (x.kind === 'visit' || x.kind === 'filter') visitN++; } }
  const hols = []; for (let d = K.RG.from; d <= K.RG.to; d = R.addDays(d, 1)) for (const h of K.hm[d] || []) if (h.first && h.kind === 'all') hols.push(h);
  const wk = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // next 14 days
  const next = []; for (let i = 0; i < 14; i++) { const d = R.addDays(t, i); const o = K.by[d]; const hol = (m.hm[d] || []).filter((h) => h.kind === 'all'); next.push({ d, o, hol }); }
  const cm = CAL.customerDays(m, t, R.addDays(t, 13)); const dl = can('money') ? CAL.deadlines(t, R.addDays(t, 120), S.settings) : [];
  const upcoming = CAL.HOLIDAYS.map((h) => ({ h, d: B.bsToAd(...h.bs), z: h.to ? B.bsToAd(...h.to) : null })).filter((x) => x.d && (x.z || x.d) >= t).sort((a, b) => a.d.localeCompare(b.d));
  return `<div class="cc cal">
    <div class="panel s12 cal-top" style="--i:0">
      <button class="nav" data-calnav="-1">‹</button><div class="cal-ttl"><h2>${esc(K.RG.label)}</h2><span class="muted">${K.RG.mode === 'bs' ? esc(`${monLabel(K.RG.from.slice(0, 7))} – ${monLabel(K.RG.to.slice(0, 7))}`) : (() => { const a = B.adToBs(K.RG.from), z = B.adToBs(K.RG.to); return a && z ? esc(a.m === z.m ? B.bsLabel(a.y, a.m) : `${B.bsLabel(a.y, a.m)} – ${B.bsLabel(z.y, z.m)}`) : ''; })()}</span></div><button class="nav" data-calnav="1">›</button>
      <button class="btn small ghost" data-calnav="0">Today</button>
      <div class="seg" style="margin-left:8px"><button data-calmode="ad" class="${K.RG.mode === 'ad' ? 'on' : ''}">AD month</button><button data-calmode="bs" class="${K.RG.mode === 'bs' ? 'on' : ''}">Nepali month</button></div>
      <div class="seg"><button data-callane="both" class="${lane === 'both' ? 'on' : ''}">Both</button><button data-callane="company" class="${lane === 'company' ? 'on' : ''}">🏢 Company</button><button data-callane="customers" class="${lane === 'customers' ? 'on' : ''}">👥 Customers</button></div>
      <span class="sp"></span>
      <div class="cal-kpi"><span><b>${work}</b> working days</span><span><b>${off}</b> days off</span><span><b>${billN}</b> bills · ${fmtK(billS)}</span><span><b>${visitN}</b> visits & filters</span></div>
    </div>
    <div class="panel s8 cal-grid-p" style="--i:1"><div class="cal-grid">${wk.map((w, i) => `<div class="cal-wd${i === 6 ? ' sat' : ''}">${w}</div>`).join('')}${K.days.map((d) => cellHtml(d, K, p, sel)).join('')}</div>
      <div class="legend cal-leg"><span><i class="sw off"></i>office closed</span><span><i class="sw sat"></i>Saturday</span><span>💵 bills</span><span>🔧 visits</span><span>🧪 filters</span><span>📞 calls</span><span>🧲 leads</span><span>🚚 moves</span><span>📦 devices</span><span>💰 cash in</span></div></div>
    <div class="panel s4 cal-ag" style="--i:2" id="calAgenda">${agendaHtml(sel, K, m)}</div>
    <div class="panel s8" style="--i:3"><div class="ph"><span class="t"><b>Next 14 days</b></span></div><div class="n14">${next.map(({ d, o, hol }) => { const cu = cm[d] || []; const cnt = {}; for (const x of cu) cnt[x.kind] = (cnt[x.kind] || 0) + 1; const wd = new Date(d + 'T00:00:00').getDay(); const co = (o ? o.co : []).filter((x) => lane !== 'customers'); return `<div class="n14-r${wd === 6 || hol.length ? ' off' : ''}${d === t ? ' today' : ''}" data-calday="${d}"><span class="n14-d"><b>${esc(wk[wd])} ${Number(d.slice(8))}</b><small>${esc(B.fmtBs(B.adToBs(d), '.'))}</small></span><span class="n14-h">${hol.map((h) => `<span class="pill bad">${esc(h.day || h.n)}</span>`).join('')}${wd === 6 && !hol.length ? '<span class="pill grey">Saturday</span>' : ''}${co.map((x) => `<span class="pill ${['tax', 'reg', 'order'].includes(x.kind) ? 'warn' : 'blue'}">${x.ic} ${esc(x.t)}</span>`).join('')}</span><span class="n14-c">${lane !== 'company' ? KIND_ORDER.filter(([k]) => cnt[k] && k !== 'paid' && k !== 'done').map(([k, ic]) => `<span>${ic} ${cnt[k]}</span>`).join('') : ''}</span></div>`; }).join('')}</div></div>
    <div class="panel s4" style="--i:4"><div class="ph"><span class="t"><b>Public holidays</b> · 2083, Pokhara</span></div><div class="mini-list">${upcoming.slice(0, 14).map(({ h, d, z }) => `<div class="item" data-calday="${d}"><span class="dot ${h.kind === 'all' ? 'r' : 'k'}"></span><div class="main"><div class="t">${esc(h.n)} <span class="muted">${esc(h.ne)}</span></div><div class="s">${esc(d.slice(5))}${z ? ' → ' + esc(z.slice(5)) : ''} · ${h.kind === 'all' ? 'office closed' : esc(h.who)}${h.region ? ' · ' + esc(h.region) + ' only' : ''}</div></div></div>`).join('')}</div>
      <div class="muted" style="margin-top:8px">🟢 ${esc(CAL.HOLIDAY_SRC.G)} · ${esc(CAL.HOLIDAY_SRC.GK)}<br>🔴 ${CAL.HOLIDAY_GAPS.map(esc).join(' · ')}</div></div>
    ${dl.length ? `<div class="panel s12" style="--i:5"><div class="ph"><span class="t"><b>Deadlines</b> · next 4 months</span><span class="sp"></span><button class="a" data-report="settings">payday · payroll →</button></div><div class="scroll-x"><table class="tbl"><tr><th>By</th><th>Nepali date</th><th>What</th><th>Note</th><th></th></tr>${dl.map((x) => `<tr data-calday="${x.d}" style="cursor:pointer"><td class="mono">${esc(x.d)}</td><td class="mono">${esc(B.fmtBs(B.adToBs(x.d), '.'))}</td><td>${x.ic} <b>${esc(x.t)}</b></td><td class="muted">${esc(x.sub || '')}${CAL.isOff(m.hm, x.d) ? ' · ⚠️ falls on a day off' : ''}</td><td>${x.g || ''}</td></tr>`).join('')}</table></div></div>` : ''}
  </div>`;
}

// ---------- 🧭 dispatch: who goes to which home (drag, or tick and send) ----------
const dsel = new Set(); let dmode = 'today', duntil = '', dundo = null;
function pageDispatch(m) {
  const t = m.t; if (!duntil) duntil = R.addDays(t, 2);
  const names = techNames(); const cols = [...names, ''];
  const work = new Map(); const mark = (cid, ic) => { const a = work.get(cid) || []; if (!a.includes(ic)) a.push(ic); work.set(cid, a); };
  for (const x of m.visitsDue) mark(x.c.id, x.filterOnly ? '🧪' : '🔧');
  for (const x of m.calls) mark(x.c.id, '📞');
  for (const x of m.collections) if (x.dn.stage === 'visit') mark(x.c.id, '💰');
  for (const o of m.openReq) if (o.c) mark(o.c.c.id, '📋');
  const homes = [...m.cust.values()].filter((x) => x.status !== 'Churned');
  const byCol = Object.fromEntries(cols.map((n) => [n, []])); for (const x of homes) { const w = R.assigneeOf(x.c, t); (byCol[w] || (byCol[w] = [])).push(x); }
  const extra = Object.keys(byCol).filter((n) => !cols.includes(n)); // assigned to a name no longer in the list
  const row = (x) => { const c = x.c; const cov = c.cover && c.cover.to && c.cover.until >= t; const w = work.get(c.id) || []; return `<div class="dp-row${dsel.has(c.id) ? ' on' : ''}" draggable="true" data-dcid="${esc(c.id)}"><span class="ck">${dsel.has(c.id) ? '✓' : ''}</span><span class="nm">${esc(c.name)}</span><span class="ics">${w.join('')}</span>${cov ? `<span class="pill warn" title="until ${esc(c.cover.until)}">↪ ${esc(c.cover.until === t ? 'today' : c.cover.until.slice(5))}</span>` : ''}<button class="op" data-cust="${esc(c.id)}" title="Open">›</button></div>`; };
  const col = (n) => {
    const xs = byCol[n] || []; const today = xs.filter((x) => work.has(x.c.id)); const byT = {}; for (const x of xs) (byT[toleOf(x.c)] = byT[toleOf(x.c)] || []).push(x);
    const load = today.length; const lc = load > 8 ? 'bad' : load >= 4 ? 'ok' : load ? 'warn' : '';
    return `<div class="dp-col" data-dcol="${esc(n)}"><div class="dp-h"><span class="avatar">${esc(n ? n.slice(0, 1).toUpperCase() : '?')}</span><div class="main"><b>${esc(n || 'Nobody yet')}</b><div class="muted">${xs.length} homes · <span class="pill ${lc}">${load} today</span></div></div>
      ${n && today.length ? `<select data-handover="${esc(n)}" title="Give today's jobs to someone else"><option value="">↪ today's jobs to…</option>${names.filter((q) => q !== n).map((q) => `<option value="${esc(q)}">${esc(q)}</option>`).join('')}</select>` : ''}</div>
      <div class="dp-load"><i style="width:${Math.min(100, (load / 8) * 100)}%" class="${lc}"></i></div>
      <div class="dp-sub">Today</div>${today.map(row).join('') || '<div class="empty">No jobs today</div>'}
      <div class="dp-sub">All homes</div>${Object.entries(byT).sort((a, b) => b[1].length - a[1].length).map(([tl, ys]) => `<details${ys.length <= 4 ? ' open' : ''}><summary>📍 ${esc(tl)} <span class="pill">${ys.length}</span><button class="btn small ghost" data-dtole="${esc(tl)}" data-dfrom="${esc(n)}">select</button></summary>${ys.map(row).join('')}</details>`).join('') || '<div class="empty">—</div>'}</div>`;
  };
  return `<div class="cc dispatch">
    <div class="panel s12 dp-bar" style="--i:0"><b>${dsel.size}</b>&nbsp;selected
      <div class="seg"><button data-dmode="today" class="${dmode === 'today' ? 'on' : ''}">Just today</button><button data-dmode="until" class="${dmode === 'until' ? 'on' : ''}">Until</button><button data-dmode="perm" class="${dmode === 'perm' ? 'on' : ''}">From now on</button></div>
      ${dmode === 'until' ? `<input type="date" id="dUntil" value="${esc(duntil)}" min="${esc(t)}">` : ''}
      <span class="muted">send to</span>${names.map((n) => `<button class="btn small" data-dsend="${esc(n)}" ${dsel.size ? '' : 'disabled'}>${esc(n)}</button>`).join('')}<button class="btn small ghost" data-dsend="" ${dsel.size ? '' : 'disabled'}>Nobody</button>
      <span class="sp"></span>${dsel.size ? '<button class="btn small ghost" data-dclear="1">Clear</button>' : ''}${dundo ? `<button class="btn small ghost" data-dundo="1">↩ Undo (${dundo.length})</button>` : ''}</div>
    <div class="panel s12 dp-tip muted" style="--i:1">Drag a home onto a person, or tick several and press a name. <b>Just today</b> = a cover that ends tonight (sick day) · <b>Until</b> = a cover to a date · <b>From now on</b> = their regular person. Staff phones then show their own homes + the unassigned ones (Jun sees everything).
      <span class="sp"></span><span class="dp-tole">Whole area: <select id="dTole"><option value="">tole…</option>${OPT.tole.filter((x) => x !== 'Other').map((x) => `<option>${esc(x)}</option>`).join('')}</select> → <select id="dToleTo"><option value="">person…</option>${names.map((n) => `<option>${esc(n)}</option>`).join('')}</select><button class="btn small" data-dtolemove="1">Move (from now on)</button></span></div>
    <div class="dp-board" style="--i:2">${[...cols, ...extra].map(col).join('')}</div>
  </div>`;
}
function dispatchApply(cids, to, mode) {
  const t = model().t; const undo = [];
  for (const cid of cids) {
    const c = S.D.customers.get(cid); if (!c) continue; undo.push({ cid, assignee: c.assignee || '', cover: c.cover || null });
    if (mode === 'perm' || !to || to === (c.assignee || '')) save(`customers/${cid}`, { assignee: mode === 'perm' || !to ? to : c.assignee || '', cover: null }, false);
    else save(`customers/${cid}`, { cover: { to, until: mode === 'today' ? t : duntil, from: c.assignee || '', at: t } }, false);
  }
  dundo = undo; dsel.clear();
  toast(`${undo.length} home${undo.length > 1 ? 's' : ''} → ${to || 'nobody'}${mode === 'perm' || !to ? '' : mode === 'today' ? ' (today only)' : ' (until ' + duntil + ')'}`);
}
document.addEventListener('click', (ev) => {
  if (!S.desk) return; const t = ev.target;
  if (S.route.screen === 'calendar') {
    const cd = t.closest('[data-calday]'); if (cd) { const d = cd.dataset.calday; const p = S.route.params; const inView = !!document.querySelector(`.cal-grid [data-calday="${d}"]`); p.d = d; if (!inView) { if (p.cm === 'bs') { const b = B.adToBs(d); p.bm = `${b.y}-${b.m}`; } else p.mo = d.slice(0, 7); } reDesk(); return; }
    const cn = t.closest('[data-calnav]'); if (cn) { const p = S.route.params; const k = Number(cn.dataset.calnav); const RG = calRange(p, model().t);
      if (k === 0) { delete p.mo; delete p.bm; delete p.d; } else if (RG.mode === 'bs') { const q = B.addBsMonths(RG.y, RG.m, k); p.bm = `${q.y}-${q.m}`; delete p.d; } else { p.mo = R.monthKey(R.addMonths(RG.mo + '-01', k)); delete p.d; }
      reDesk(); return; }
    const cmode = t.closest('[data-calmode]'); if (cmode) { const p = S.route.params; p.cm = cmode.dataset.calmode; if (p.cm === 'bs') { const b = B.adToBs(p.d || (p.mo ? p.mo + '-15' : model().t)); p.bm = `${b.y}-${b.m}`; } else { p.mo = (p.d || (p.bm ? B.bsToAd(...p.bm.split('-').map(Number), 15) : model().t)).slice(0, 7); } reDesk(); return; }
    const cl = t.closest('[data-callane]'); if (cl) { S.route.params.lane = cl.dataset.callane; reDesk(); return; }
  }
  if (S.route.screen === 'report' && S.route.params.r === 'billing') {
    const bm = t.closest('[data-bm]'); if (bm) { S.route.params.bm = bm.dataset.bm; reDesk(); return; }
    const bv = t.closest('[data-bv]'); if (bv) { S.route.params.bv = bv.dataset.bv; reDesk(); return; }
  }
  if (S.route.screen === 'changes') {
    const ac = t.closest('[data-ac]'); if (ac) { S.route.params.ac = ac.dataset.ac; reDesk(); return; }
    const aw = t.closest('[data-aw]'); if (aw) { S.route.params.aw = aw.dataset.aw; reDesk(); return; }
  }
  if (S.route.screen === 'watch') {
    const wf = t.closest('[data-wf]'); if (wf) { S.route.params.wf = wf.dataset.wf; reDesk(); return; }
    const wl = t.closest('[data-wl]'); if (wl) { S.route.params.wl = wl.dataset.wl; reDesk(); return; }
  }
  if (S.route.screen === 'dispatch') {
    if (t.closest('[data-cust]')) return;
    const r = t.closest('[data-dcid]'); if (r) { const id = r.dataset.dcid; if (dsel.has(id)) dsel.delete(id); else dsel.add(id); reDesk(); return; }
    const md = t.closest('[data-dmode]'); if (md) { dmode = md.dataset.dmode; reDesk(); return; }
    const sd = t.closest('[data-dsend]'); if (sd && dsel.size) { dispatchApply([...dsel], sd.dataset.dsend, dmode); reDesk(); return; }
    if (t.closest('[data-dclear]')) { dsel.clear(); reDesk(); return; }
    if (t.closest('[data-dundo]') && dundo) { for (const u of dundo) save(`customers/${u.cid}`, { assignee: u.assignee, cover: u.cover }, false); toast(`↩ ${dundo.length} undone`); dundo = null; reDesk(); return; }
    const dt = t.closest('[data-dtole]'); if (dt) { ev.preventDefault(); const m = model(); for (const x of m.cust.values()) if (x.status !== 'Churned' && toleOf(x.c) === dt.dataset.dtole && R.assigneeOf(x.c, m.t) === dt.dataset.dfrom) dsel.add(x.c.id); reDesk(); return; }
    if (t.closest('[data-dtolemove]')) { const tl = (document.getElementById('dTole') || {}).value, to = (document.getElementById('dToleTo') || {}).value; if (!tl || !to) { toast('Choose the tole and the person'); return; } const m = model(); const ids = [...m.cust.values()].filter((x) => x.status !== 'Churned' && toleOf(x.c) === tl).map((x) => x.c.id); if (!ids.length) { toast('No homes in ' + tl); return; } dispatchApply(ids, to, 'perm'); reDesk(); return; }
  }
}, true);
document.addEventListener('change', (ev) => {
  if (!S.desk || S.route.screen !== 'dispatch') return;
  if (ev.target.id === 'dUntil') { duntil = ev.target.value || duntil; return; }
  const ho = ev.target.closest('[data-handover]'); if (ho && ho.value) { const m = model(); const from = ho.dataset.handover; const ids = [...m.cust.values()].filter((x) => R.assigneeOf(x.c, m.t) === from && (m.visitsDue.some((y) => y.c.id === x.c.id) || m.calls.some((y) => y.c.id === x.c.id) || m.openReq.some((o) => o.c && o.c.c.id === x.c.id) || (x.dn && x.dn.stage === 'visit'))).map((x) => x.c.id); dispatchApply(ids, ho.value, 'today'); reDesk(); }
});
document.addEventListener('input', (ev) => {
  const k = ev.target.dataset && ev.target.dataset.wi; if (!k || !S.desk || !wi) return;
  wi[k] = Number(ev.target.value); const v = document.getElementById('wiv_' + k); if (v) v.textContent = wiFmt(wi[k]);
  clearTimeout(wiOut._t); wiOut._t = setTimeout(() => { const o = document.getElementById('wiOut'); if (o) o.innerHTML = wiOut(model()); }, 60);
});
document.addEventListener('click', (ev) => {
  const b = ev.target.closest && ev.target.closest('[data-wipreset]'); if (!b || !S.desk) return;
  const m = model(); const k = b.dataset.wipreset; wi = k === 'reset' ? wiStart(m) : { ...wiStart(m), ...SIM.PRESETS[k].v }; reDesk();
});
document.addEventListener('dragstart', (ev) => { const r = ev.target.closest && ev.target.closest('[data-dcid]'); if (!r) return; ev.dataTransfer.setData('text/plain', r.dataset.dcid); ev.dataTransfer.effectAllowed = 'move'; r.classList.add('drag'); });
document.addEventListener('dragend', (ev) => { const r = ev.target.closest && ev.target.closest('[data-dcid]'); if (r) r.classList.remove('drag'); document.querySelectorAll('.dp-col.over').forEach((c) => c.classList.remove('over')); });
document.addEventListener('dragover', (ev) => { const c = ev.target.closest && ev.target.closest('[data-dcol]'); if (!c) return; ev.preventDefault(); document.querySelectorAll('.dp-col.over').forEach((x) => { if (x !== c) x.classList.remove('over'); }); c.classList.add('over'); });
document.addEventListener('drop', (ev) => {
  const c = ev.target.closest && ev.target.closest('[data-dcol]'); if (!c) return; ev.preventDefault();
  const id = ev.dataTransfer.getData('text/plain'); if (!id) return; const to = c.dataset.dcol;
  const ids = dsel.has(id) ? [...dsel] : [id]; const m = model();
  const moving = ids.filter((x) => { const cc = S.D.customers.get(x); return cc && R.assigneeOf(cc, m.t) !== to; }); if (!moving.length) { c.classList.remove('over'); return; }
  dispatchApply(moving, to, dmode); reDesk();
});

// ---------- 🎛️ what-if: sliders → households · monthly cash · cash bridge · FCL order month (sim.js) ----------
let wi = null;
function wiStart(m) {
  const M = m.metrics;
  return { ...SIM.BASE, installsPerWeek: M.avg4w > 0 ? Math.round(M.avg4w * 2) / 2 : SIM.BASE.installsPerWeek, stockNow: Math.max(0, Math.round(M.fcl.stockDevices || 0)), leadWeeks: M.fcl.leadTimeWeeks || SIM.BASE.leadWeeks };
}
function comboChart(rows, w = 900, h = 260) {
  const pad = 46, padR = 46; const n = rows.length; const bw = (w - pad - padR) / n;
  // two scales: bars = monthly cash (left axis, green) · line = cash since today (right axis, blue) — one scale would flatten the bars
  const cashMax = Math.max(1, ...rows.map((r) => Math.abs(r.opCash))); const cumMax = Math.max(1, ...rows.map((r) => Math.abs(r.cum)));
  const homesMax = Math.max(1, ...rows.map((r) => r.homes));
  const y0 = (h - 24) / 2 + 4; const half = (h - 30) / 2; const ys = (v) => y0 - (v / cashMax) * half; const yc = (v) => y0 - (v / cumMax) * half; const yh = (v) => h - 20 - (v / homesMax) * (h - 30);
  const x = (i) => pad + i * bw + bw / 2;
  const barsH = rows.map((r, i) => `<rect x="${(x(i) - bw * 0.32).toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" y="${Math.min(ys(r.opCash), y0).toFixed(1)}" height="${Math.abs(ys(r.opCash) - y0).toFixed(1)}" fill="${r.opCash >= 0 ? 'var(--ok)' : 'var(--bad)'}" opacity=".75" data-tip="${esc(`M${r.m + 1} · cash ${fmtN(r.opCash)} · total ${fmtN(r.cum)} · ${Math.round(r.homes)} homes`)}"/>`).join('');
  const cum = rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${yc(r.cum).toFixed(1)}`).join(' ');
  const hm = rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${yh(r.homes).toFixed(1)}`).join(' ');
  const orders = rows.filter((r) => r.ordered).map((r) => `<line x1="${x(r.m).toFixed(1)}" x2="${x(r.m).toFixed(1)}" y1="6" y2="${h - 20}" stroke="var(--warn)" stroke-dasharray="4 3"/><text x="${(x(r.m) + 4).toFixed(1)}" y="16" class="ax" style="fill:var(--warn)">order ${r.ordered}</text>`).join('');
  const labels = rows.map((r, i) => (i % 3 === 0 ? `<text class="ax" x="${x(i).toFixed(1)}" y="${h - 4}" text-anchor="middle">M${r.m + 1}</text>` : '')).join('');
  return `<div class="chart"><svg viewBox="0 0 ${w} ${h}"><line class="grid" x1="${pad}" x2="${w - padR}" y1="${y0}" y2="${y0}"/>
    <text class="ax" x="0" y="${(ys(cashMax) + 8).toFixed(1)}" style="fill:var(--ok)">${fmtK(cashMax)}</text><text class="ax" x="0" y="${(y0 + 3).toFixed(1)}">0</text><text class="ax" x="0" y="${(ys(-cashMax) - 2).toFixed(1)}" style="fill:var(--ok)">−${fmtK(cashMax)}</text>
    <text class="ax" x="${w - padR + 4}" y="${(yc(cumMax) + 8).toFixed(1)}" style="fill:var(--brand)">${fmtK(cumMax)}</text><text class="ax" x="${w - padR + 4}" y="${(yc(-cumMax) - 2).toFixed(1)}" style="fill:var(--brand)">−${fmtK(cumMax)}</text>
    <text class="ax" x="${w - padR - 70}" y="${(yh(homesMax) + 12).toFixed(1)}" style="fill:var(--info)">${fmtN(homesMax)} homes</text>
    ${barsH}<path d="${cum}" fill="none" stroke="var(--brand)" stroke-width="2.5"/><path d="${hm}" fill="none" stroke="var(--info)" stroke-width="2" stroke-dasharray="5 4"/>${orders}${labels}</svg></div>
    <div class="legend"><span><i class="sw" style="background:var(--ok)"></i>monthly cash (no VAT) · red = loss</span><span><i class="sw" style="background:var(--brand)"></i>cash since today (incl. device orders)</span><span><i class="sw" style="background:var(--info)"></i>households</span><span><i class="sw" style="background:var(--warn)"></i>device order</span></div>`;
}
function wiOut(m) {
  const S0 = SIM.simulate(wi, { cohorts: homeCohorts(m) }); const r = S0.rows; const at = (k) => r[Math.min(k, r.length - 1)];
  const mon = (i) => (i < 0 ? 'never' : monLabel(R.monthKey(R.addMonths(m.t.slice(0, 7) + '-01', i)))); // row 0 = this month
  const tile = (l, v, s, c) => `<div class="pk-tile"><span>${esc(l)}</span><b class="num"${c ? ` style="color:${c}"` : ''}>${v}</b>${s ? `<small>${s}</small>` : ''}</div>`;
  return `<div class="pk-grid">
      ${tile('Homes in 12 · 24 · 36 months', `${Math.round(at(11).homes)} · ${Math.round(at(23).homes)} · ${Math.round(at(35).homes)}`)}
      ${tile('First month with cash left', esc(mon(S0.firstPositive)), S0.firstPositive >= 0 ? `month ${S0.firstPositive + 1} from now` : 'not within 36 months', S0.firstPositive < 0 ? 'var(--bad)' : 'var(--ok)')}
      ${tile('Cash needed to get there (lowest point)', fmtN(Math.min(0, S0.low.cum)), S0.low.cum < 0 ? `lowest in ${esc(mon(S0.low.m))}` : 'never below today', S0.low.cum < 0 ? 'var(--bad)' : 'var(--ok)')}
      ${tile('Monthly cash in month 36', fmtN(at(35).opCash), 'no VAT · before your salaries', at(35).opCash < 0 ? 'var(--bad)' : '')}
      ${tile('Device orders', S0.orders.length ? S0.orders.map((i) => esc(mon(i))).join(' · ') : 'none', `${S0.p.orderQty} each · ${fmtN(S0.p.orderQty * S0.p.unitCost)}`)}
      ${tile('Months short of devices', S0.stockouts, S0.stockouts ? 'installs stopped — order earlier or more' : 'never ran out', S0.stockouts ? 'var(--bad)' : 'var(--ok)')}
      ${tile('Months short of people', S0.busy, S0.busy ? 'visits ate the install time — hire' : 'enough hands', S0.busy ? 'var(--warn)' : 'var(--ok)')}
      ${tile('Deposit held at month 36', fmtN(r.reduce((s, x) => s + x.depositIn, 0)), 'customers’ money — not ours')}
    </div>
    ${comboChart(r)}
    <div class="scroll-x" style="margin-top:10px"><table class="tbl"><tr><th>Month</th><th class="n">Homes</th><th class="n">Installs</th><th class="n">Left</th><th class="n">Visits</th><th class="n">Revenue</th><th class="n">Costs</th><th class="n">Cash</th><th class="n">Devices bought</th><th class="n">Cash since today</th><th class="n">Stock</th><th>Limit</th></tr>
      ${r.filter((x) => x.m % 3 === 2 || x.m === 0 || x.ordered).map((x) => `<tr><td>${esc(mon(x.m))}</td><td class="n">${Math.round(x.homes)}</td><td class="n">${x.installs.toFixed(1)}</td><td class="n">${x.leave.toFixed(1)}</td><td class="n">${Math.round(x.visits)} / ${x.cap}</td><td class="n">${fmtN(x.revenue)}</td><td class="n">${fmtN(x.costs)}</td><td class="n" style="color:${x.opCash < 0 ? 'var(--bad)' : 'var(--ok)'}">${fmtN(x.opCash)}</td><td class="n">${x.buy ? fmtN(x.buy) : ''}</td><td class="n">${fmtN(x.cum)}</td><td class="n">${Math.round(x.stock)}</td><td>${x.limit === 'stock' ? '<span class="pill bad">no devices</span>' : x.limit === 'people' ? '<span class="pill warn">no time</span>' : ''}</td></tr>`).join('')}</table></div>`;
}
const wiFmt = (v) => (Number.isInteger(v) ? fmtN(v) : String(v));
function pageWhatIf(m) {
  if (!wi) wi = wiStart(m);
  const knob = ([k, l, lo, hi, st, src]) => `<div class="wi-k"><div class="wi-l"><span>${esc(l)}</span><b class="num" id="wiv_${k}">${wiFmt(wi[k])}</b></div><input type="range" data-wi="${k}" min="${lo}" max="${hi}" step="${st}" value="${wi[k]}"><div class="wi-s">${esc(src)}</div></div>`;
  return `<div class="cc wi">
    <div class="panel s12 wi-top" style="--i:0"><div><h2 style="margin:0">What-if</h2><div class="muted"><span>Move a slider — the next 36 months are recalculated from today (${fmtN(m.metrics.active)} homes now).</span> <span>🔴 A calculator on assumptions, not a forecast. Sources: plan 2026-09-27 §2–§3.</span></div></div><span class="sp"></span>
      <div class="seg">${Object.entries(SIM.PRESETS).map(([k, p]) => `<button data-wipreset="${k}">${esc(p.label)}</button>`).join('')}<button data-wipreset="reset">Reset to today</button></div></div>
    <div class="panel s4 wi-knobs" style="--i:1">${SIM.KNOBS.map(([g, gl, ks]) => `<div class="wi-g"><div class="status">${esc(gl)}</div>${ks.map(knob).join('')}</div>`).join('')}</div>
    <div class="panel s8" style="--i:2" id="wiOut">${wiOut(m)}</div>
  </div>`;
}

// ---------- 🕸️ referrals: who brought whom (tree of word of mouth) + how customers came ----------
function pageNetwork(m) {
  const cs = [...m.cust.values()]; const byId = new Map(cs.map((x) => [x.c.id, x]));
  const kids = new Map(); for (const x of cs) { const r = x.c.referrerId; if (r && byId.has(r)) { if (!kids.has(r)) kids.set(r, []); kids.get(r).push(x); } }
  const roots = cs.filter((x) => kids.has(x.c.id) && !(x.c.referrerId && byId.has(x.c.referrerId)));
  // generations: 0 = came on their own, 1 = brought by a gen-0 home, …
  const gen = new Map(); const walk = (x, g) => { gen.set(x.c.id, g); for (const k of kids.get(x.c.id) || []) walk(k, g + 1); };
  for (const x of cs) if (!(x.c.referrerId && byId.has(x.c.referrerId))) walk(x, 0);
  const gCount = {}; for (const g of gen.values()) gCount[g] = (gCount[g] || 0) + 1;
  const referred = cs.filter((x) => x.c.referrerId && byId.has(x.c.referrerId)); const referrers = cs.filter((x) => kids.has(x.c.id));
  const kf = referrers.length ? referred.length / referrers.length : 0;
  const stillIn = (xs) => (xs.length ? xs.filter((x) => x.status === 'Active').length / xs.length : null);
  const top = referrers.slice().sort((a, b) => (kids.get(b.c.id).length - kids.get(a.c.id).length)).slice(0, 8);
  // each tree drawn top → down (root on top), trees packed into rows, biggest first
  const size = (x) => 1 + (kids.get(x.c.id) || []).reduce((s2, k) => s2 + size(k), 0);
  const leaves = (x) => { const ks = kids.get(x.c.id) || []; return ks.length ? ks.reduce((s2, k) => s2 + leaves(k), 0) : 1; };
  const depthOf = (x) => 1 + Math.max(0, ...(kids.get(x.c.id) || []).map(depthOf));
  const W = 980, DX = 64, DY = 62, GAP = 26; const order = roots.slice().sort((p1, p2) => size(p2) - size(p1));
  const nodes = [], edges = []; let cx = 10, cy = 34, rowH = 0;
  for (const rt of order) {
    const tw = leaves(rt) * DX, th = depthOf(rt) * DY;
    if (cx + tw > W && cx > 10) { cx = 10; cy += rowH + GAP; rowH = 0; }
    let leaf = 0;
    const place = (x, depth) => {
      const ks = kids.get(x.c.id) || []; let nx;
      if (!ks.length) { nx = cx + leaf * DX + DX / 2; leaf++; }
      const kidPos = ks.map((k) => place(k, depth + 1));
      if (ks.length) nx = (kidPos[0][0] + kidPos[kidPos.length - 1][0]) / 2;
      const ny = cy + depth * DY; for (const [kx, ky] of kidPos) edges.push([nx, ny, kx, ky]);
      nodes.push({ x, nx, ny, depth, n: ks.length }); return [nx, ny];
    };
    place(rt, 0); cx += tw + GAP; rowH = Math.max(rowH, th);
  }
  const Hh = Math.max(160, cy + rowH + 10);
  const svg = nodes.length ? `<svg viewBox="0 0 ${W} ${Hh}" class="net">${edges.map(([a1, b1, c1, d1]) => `<path d="M${a1.toFixed(1)} ${b1.toFixed(1)} C${a1.toFixed(1)} ${((b1 + d1) / 2).toFixed(1)} ${c1.toFixed(1)} ${((b1 + d1) / 2).toFixed(1)} ${c1.toFixed(1)} ${d1.toFixed(1)}"/>`).join('')}
    ${nodes.map((o) => { const r = 7 + Math.min(9, o.n * 2.5); return `<g class="nd" data-cust="${esc(o.x.c.id)}" transform="translate(${o.nx.toFixed(1)} ${o.ny.toFixed(1)})"><circle r="${r.toFixed(1)}" fill="${HEX[o.x.dot] || HEX.g}" stroke="${o.depth ? 'none' : 'var(--ink)'}" stroke-width="2"><title>${esc(o.x.c.name)} · ${esc(toleOf(o.x.c))}${o.n ? ` · brought ${o.n}` : ''}</title></circle><text y="${(r + 13).toFixed(1)}" text-anchor="middle" class="${o.depth ? '' : 'root'}">${esc(o.x.c.name.split(' ')[0])}</text></g>`; }).join('')}</svg>`
    : '<div class="empty">No referrals yet — when a new customer says who told them, the tree grows here.</div>';
  const ch = {}; for (const x of cs) { const k = x.c.referral || '—'; ch[k] = (ch[k] || 0) + 1; }
  const rw = m.referrals; const ready = rw.filter((r) => r.ready && !r.done).length;
  return `<div class="cc">
    ${panel('s3 kpi', 0, '<b>Came by word of mouth</b>', `<div class="v">${counter('wom', cs.length ? referred.length / cs.length : 0, 'pct')}</div><div class="sub"><span>${referred.length} of ${cs.length} homes</span></div>`)}
    ${panel('s3 kpi', 1, '<b>Homes brought per referrer</b>', `<div class="v">${kf.toFixed(2)}</div><div class="sub"><span>${referrers.length} homes brought someone</span></div>`)}
    ${panel('s3 kpi', 2, '<b>Still with us</b> · referred vs others', `<div class="v">${stillIn(referred) === null ? '—' : R.pct(stillIn(referred))}</div><div class="sub"><span>others ${R.pct(stillIn(cs.filter((x) => !referred.includes(x))))}</span></div>`)}
    ${panel('s3 kpi', 3, '<b>Rewards</b> · G-1 §4', `<div class="v">${ready}</div><div class="sub"><span>ready to apply</span><span>${rw.filter((r) => r.done).length} done</span></div>`, '<button class="a" data-report="referrals">rewards →</button>')}
    ${panel('s12', 4, `<b>Who brought whom</b> · ${roots.length} trees · circle size = homes they brought`, svg, `<span class="muted">generations: ${Object.entries(gCount).sort((a, b) => a[0] - b[0]).map(([g, n]) => `${g === '0' ? 'on their own' : 'gen ' + g} ${n}`).join(' · ')}</span>`)}
    ${panel('s6', 5, '<b>Top referrers</b>', `<div class="mini-list">${top.map((x) => { const ks = kids.get(x.c.id); return `<div class="item" data-cust="${esc(x.c.id)}"><span class="dot ${x.dot}"></span><div class="main"><div class="t">${esc(x.c.name)} · ${ks.length}</div><div class="s">${esc(ks.map((k) => k.c.name.split(' ')[0]).join(', '))} · ${esc(toleOf(x.c))}</div></div></div>`; }).join('') || '<div class="empty">None yet</div>'}</div>`)}
    ${panel('s6', 6, '<b>How customers came</b>', hbars(Object.entries(ch).sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ l, v, color: l === 'Word of mouth' ? 'var(--ok)' : 'var(--brand)' })), 'var(--brand)'))}
  </div>`;
}

// ---------- 📡 field live: each technician today — planned vs done, cash, last seen (where the last record was saved) ----------
const tsOf = (x) => (x.savedAt && x.savedAt.t) || x.savedAtT || (x.updatedAt && x.updatedAt.toMillis ? x.updatedAt.toMillis() : 0) || x._localT || 0;
export function liveModel(m) {
  const t = m.t; const names = techNames(); const who = {};
  const P = (n) => (who[n] = who[n] || { name: n, plan: [], done: [], cash: 0, cashCash: 0, ev: [] });
  for (const n of names) P(n);
  const assigned = [...m.cust.values()].some((x) => R.assigneeOf(x.c, t));
  for (const x of m.visitsDue) { const a = R.assigneeOf(x.c, t) || ''; P(assigned ? a || '—' : '—').plan.push({ x, k: x.filterOnly ? 'filter' : 'visit' }); }
  for (const x of m.calls) { const a = R.assigneeOf(x.c, t) || ''; P(assigned ? a || '—' : '—').plan.push({ x, k: 'call' }); }
  const cn = (id) => { const c = S.D.customers.get(id); return c ? c.name : '?'; };
  const add = (n, e) => { if (!n) return; const p = P(n); p.ev.push(e); };
  for (const v of m.D.visits) if (v.date === t && String(v.status || '').includes('Completed')) { add(v.technician, { ic: '🔧', t: `${v.visitType || 'Visit'} · ${cn(v.customerId)}`, ms: tsOf(v), at: v.savedAt, cid: v.customerId }); if (v.technician) P(v.technician).done.push(v.customerId); }
  for (const v of m.D.visits) if (String(v.date || '').slice(0, 10) === t && R.isNoShow(v)) add(v.technician, { ic: '🚪', t: `Nobody home · ${cn(v.customerId)}`, ms: tsOf(v), at: v.savedAt, cid: v.customerId });
  for (const c of m.D.customers) if (c.installDate === t) { add(c.agent, { ic: '🏠', t: `Install · ${c.name}`, ms: tsOf(c), at: c.savedAt, cid: c.id }); if (c.agent) P(c.agent).done.push(c.id); }
  for (const q of m.D.payments) if (q.date === t && !R.isNonCash(q)) { add(q.by, { ic: '💵', t: `${R.npr(q.amount)} · ${q.method || ''} · ${cn(q.customerId)}`, ms: tsOf(q), at: q.savedAt, cid: q.customerId }); if (q.by) { P(q.by).cash += Number(q.amount) || 0; if (q.method === 'Cash') P(q.by).cashCash += Number(q.amount) || 0; } }
  for (const r of m.D.requests) if (r.status === 'Done' && r.doneDate === t) add(r.agent, { ic: '📋', t: `Request done · ${cn(r.customerId)}`, ms: tsOf(r), at: r.savedAt, cid: r.customerId });
  for (const q of m.D.checkins) if (q.date === t) add(q.by, { ic: '📞', t: `${q.kind} · ${cn(q.customerId)}`, ms: tsOf(q), at: q.savedAt, cid: q.customerId });
  const rows = Object.values(who).filter((p) => p.name !== '—' || p.plan.length);
  for (const p of rows) { p.ev.sort((a, b) => a.ms - b.ms); const last = p.ev.filter((e) => e.ms).slice(-1)[0]; p.last = last || null; p.lastAt = p.ev.filter((e) => e.at && Number.isFinite(e.at.lat)).slice(-1)[0] || null; const mins = last ? (Date.now() - last.ms) / 60000 : null; p.state = !p.ev.length ? 'not started' : mins !== null && mins < 45 ? 'working' : 'quiet'; p.doneSet = new Set(p.done); }
  return rows.sort((a, b) => (a.name === '—') - (b.name === '—') || b.ev.length - a.ev.length);
}
const hhmm = (ms) => (ms ? new Date(ms).toLocaleTimeString('en-GB', { timeZone: NPT, hour: '2-digit', minute: '2-digit' }) : '');
function pageLive(m) {
  const L = liveModel(m); const t = m.t;
  const card = (p) => {
    const planN = p.plan.length, doneN = p.done.length; const pct = planN + doneN ? doneN / (planN + doneN) : 0;
    const next = p.plan.find((q) => !p.doneSet.has(q.x.c.id));
    const cashWarn = p.cashCash > 0 && p.name !== 'Tara';
    return `<div class="lv-card ${p.state.replace(' ', '-')}"><div class="lv-h"><span class="avatar">${esc(p.name === '—' ? '?' : p.name.slice(0, 1).toUpperCase())}</span><div class="main"><b>${esc(p.name === '—' ? 'Not assigned yet' : p.name)}</b><div class="muted">${esc(p.state)}${p.last ? ` · last ${esc(hhmm(p.last.ms))} (${esc(agoS(p.last.ms))})` : ''}</div></div><span class="pill ${p.state === 'working' ? 'ok' : p.state === 'quiet' ? 'warn' : 'grey'}">${doneN} done · ${planN} to go</span></div>
      <div class="dp-load"><i style="width:${Math.round(pct * 100)}%" class="ok"></i></div>
      <div class="lv-kv"><span>💵 ${fmtN(p.cash)}</span>${p.cashCash ? `<span class="${cashWarn ? 'bad' : ''}">cash ${fmtN(p.cashCash)}${cashWarn ? ' · G-1 §1-1: only Tara takes cash' : ''}</span>` : ''}${p.lastAt ? `<span>📍 ${esc(hhmm(p.lastAt.ms))}</span>` : '<span class="muted">📍 no location saved today</span>'}</div>
      ${next ? `<div class="lv-next" data-cust="${esc(next.x.c.id)}">➜ next: <b>${esc(next.x.c.name)}</b> · ${esc(toleOf(next.x.c))} · ${esc(next.k)}</div>` : ''}
      <div class="lv-tl">${p.ev.slice(-8).reverse().map((e) => `<div class="ev" ${e.cid ? `data-cust="${esc(e.cid)}"` : ''}><span class="mono">${esc(hhmm(e.ms))}</span> ${e.ic} ${esc(e.t)}</div>`).join('') || '<div class="empty">Nothing saved today yet</div>'}</div></div>`;
  };
  const allDone = L.reduce((s, p) => s + p.done.length, 0), allPlan = L.reduce((s, p) => s + p.plan.length, 0), cash = L.reduce((s, p) => s + p.cash, 0);
  return `<div class="cc live">
    ${panel('s3 kpi', 0, '<b>Done today</b>', `<div class="v">${counter('lvd', allDone)}</div><div class="sub"><span>${allPlan} still to go</span></div>`)}
    ${panel('s3 kpi', 1, '<b>Cash today</b>', `<div class="v">${counter('lvc', cash)}</div><div class="sub"><span>NPR · all methods</span></div>`)}
    ${panel('s3 kpi', 2, '<b>Out working</b>', `<div class="v">${L.filter((p) => p.state === 'working').length}</div><div class="sub"><span>saved something in the last 45 min</span></div>`)}
    ${panel('s3 kpi', 3, '<b>Today</b>', `<div class="v" style="font-size:22px" data-noi18n>${esc(dualDate(t, new Date(t + 'T00:00:00').getDay()))}</div>`)}
    ${panel('s7 r2', 4, '<b>Map</b> · last saved spot of each person · green = done today · grey = still to go', `<div id="mapBox" class="mapbox" style="height:560px"></div><div class="muted" style="margin-top:6px">📍 A spot is saved only when someone saves a record with location allowed — not tracked in between.</div>`)}
    <div class="s5 lv-cards" style="--i:5">${L.map(card).join('') || '<div class="panel empty">No staff yet</div>'}</div>
  </div>`;
}
function drawLive() {
  const m = model(); const L = liveModel(m); const pts = []; const done = new Set(L.flatMap((p) => p.done));
  const todo = new Map(); for (const p of L) for (const q of p.plan) todo.set(q.x.c.id, q.x);
  for (const [id, x] of todo) { const g = x.c.gps; if (!g || !Number.isFinite(g.lat) || done.has(id)) continue; pts.push([g.lat, g.lng]); layer.addLayer(Lf.circleMarker([g.lat, g.lng], { radius: 6, color: '#8a97a6', weight: 2, fillColor: '#8a97a6', fillOpacity: 0.35 }).bindPopup(`<b>${esc(x.c.name)}</b><br>${esc(toleOf(x.c))} · to do<br><button class="btn small" data-cust="${esc(id)}" style="margin-top:6px">Open</button>`)); }
  for (const id of done) { const c = S.D.customers.get(id); const g = c && c.gps; if (!g || !Number.isFinite(g.lat)) continue; pts.push([g.lat, g.lng]); layer.addLayer(Lf.circleMarker([g.lat, g.lng], { radius: 7, color: HEX.g, weight: 2, fillColor: HEX.g, fillOpacity: 0.9 }).bindPopup(`<b>${esc(c.name)}</b> · done today`)); }
  const colors = ['#34c1ff', '#ff9a3d', '#b184ff', '#ffcc4d', '#2ee59d', '#ff5c5c'];
  L.filter((p) => p.name !== '—').forEach((p, i) => {
    const trail = p.ev.filter((e) => e.at && Number.isFinite(e.at.lat)).map((e) => [e.at.lat, e.at.lng]); const col = colors[i % colors.length];
    if (trail.length > 1) layer.addLayer(Lf.polyline(trail, { color: col, weight: 3, opacity: 0.7, dashArray: '6 6' }));
    if (p.lastAt) { pts.push([p.lastAt.at.lat, p.lastAt.at.lng]); layer.addLayer(Lf.marker([p.lastAt.at.lat, p.lastAt.at.lng], { icon: Lf.divIcon({ className: '', html: `<div class="tech-pin" style="--c:${col}">${esc(p.name.slice(0, 1).toUpperCase())}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] }), zIndexOffset: 800 }).bindPopup(`<b>${esc(p.name)}</b><br>last save ${esc(hhmm(p.lastAt.ms))}<br>${esc(p.lastAt.t)}`)); }
  });
  return pts;
}


// desk: projected shelf stock per filter type (weeks ahead) — where each line crosses zero is when it runs out
// active homes by months since install — the what-if engine needs the age (monthly visits for the first months, then every 3)
function homeCohorts(m) {
  const ages = {}; for (const x of m.cust.values()) if (x.status === 'Active' && R.isDate(x.c.installDate)) { const a = Math.max(0, R.monthsBetween(x.c.installDate, m.t)); ages[a] = (ages[a] || 0) + 1; }
  return Object.entries(ages).map(([a, n]) => ({ age: Number(a), n }));
}
function stockLines(plan, t, weeks = 39, w = 900, h = 250) {
  const cols = { PP: '#34c1ff', CTO: '#2ee59d', UF: '#b184ff', UV: '#ffcc4d' };
  const series = plan.rows.map((r) => { const pts = []; let cum = 0; let i = 0; const cs = r.cum; for (let k = 0; k <= weeks; k++) { const d = R.addDays(t, k * 7); while (i < cs.length && cs[i][0] <= d) { cum += cs[i][1]; i++; } pts.push(r.have - cum); } return { r, pts }; });
  const hi = Math.max(1, ...series.flatMap((s2) => s2.pts)); const floor = -Math.round(hi * 0.6); // below this the line is clipped (a short is a short)
  const lo = Math.max(floor, Math.min(0, ...series.flatMap((s2) => s2.pts)));
  const pad = 40; const x = (k) => pad + (k / weeks) * (w - pad - 10); const y = (v) => 18 + (hi - Math.max(lo, v)) / (hi - lo || 1) * (h - 42);
  const lines = series.map(({ r, pts }) => `<path d="${pts.map((v, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="${cols[r.type]}" stroke-width="2.2"/>`).join('');
  const outS = series.filter(({ r }) => r.runOut && R.daysBetween(t, r.runOut) <= weeks * 7).sort((a, b) => a.r.runOut.localeCompare(b.r.runOut));
  const outs = outS.map(({ r }, i) => { const k = Math.max(0, R.daysBetween(t, r.runOut) / 7); return `<circle cx="${x(k).toFixed(1)}" cy="${y(0).toFixed(1)}" r="5" fill="${cols[r.type]}" stroke="var(--bg)" stroke-width="2"><title>${esc(r.type)} runs out around ${esc(r.runOut)}</title></circle><text x="${(x(k) + 6).toFixed(1)}" y="${(y(0) + 14 + (i % 3) * 11).toFixed(1)}" class="ax" style="fill:${cols[r.type]}">${esc(r.type)} out ~${esc(r.runOut.slice(5))}</text>`; }).join('');
  const inWin = series.filter(({ r }) => r.orderBy && R.daysBetween(t, r.orderBy) <= weeks * 7);
  const lateS = inWin.filter(({ r }) => r.orderBy <= t); const soonS = inWin.filter(({ r }) => r.orderBy > t).sort((a, b) => a.r.orderBy.localeCompare(b.r.orderBy));
  const dash = (k, c) => `<line x1="${x(k).toFixed(1)}" x2="${x(k).toFixed(1)}" y1="14" y2="${h - 24}" stroke="${c}" stroke-dasharray="4 3" opacity=".8"/>`;
  const marks = (lateS.length ? lateS.map(({ r }) => dash(0, cols[r.type])).join('') + `<text x="${(x(0) + 3).toFixed(1)}" y="12" class="ax" style="fill:var(--bad)">order ${esc(lateS.map(({ r }) => r.type).join(', '))} now</text>` : '')
    + soonS.map(({ r }, i) => { const k = R.daysBetween(t, r.orderBy) / 7; const row = (i + (lateS.length ? 1 : 0)) % 3; return dash(k, cols[r.type]) + `<text x="${(x(k) + 3).toFixed(1)}" y="${12 + row * 11}" class="ax" style="fill:${cols[r.type]}">order ${esc(r.type)} by ${esc(r.orderBy.slice(5))}</text>`; }).join('');
  const nm = noteMarks(Array.from({ length: weeks }, (_, k) => [R.addDays(t, k * 7), R.addDays(t, k * 7 + 6)]), (k) => x(k + 0.5), 14, h - 24, h - 30); // icons low: the order labels sit at the top
  const lab = Array.from({ length: 7 }, (_, i) => Math.round(i * weeks / 6)).map((k) => `<text class="ax" x="${x(k).toFixed(1)}" y="${h - 6}" text-anchor="middle">${esc(R.addDays(t, k * 7).slice(2, 7))}</text>`).join('');
  return `<div class="chart"><svg viewBox="0 0 ${w} ${h}"><rect x="${pad}" y="${y(0).toFixed(1)}" width="${w - pad - 10}" height="${(y(lo) - y(0)).toFixed(1)}" fill="var(--bad)" opacity=".07"/><line class="grid" x1="${pad}" x2="${w - 10}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" style="stroke:var(--bad);opacity:.6"/><text class="ax" x="0" y="${(y(0) + 3).toFixed(1)}">0</text><text class="ax" x="0" y="${(y(hi) + 8).toFixed(1)}">${Math.round(hi)}</text>${lo < 0 ? `<text class="ax" x="0" y="${(y(lo) - 2).toFixed(1)}">${Math.round(lo)}</text>` : ''}${nm.marks}${lines}${outs}${marks}${lab}</svg></div>${nm.legend}
    <div class="legend">${series.map(({ r }) => `<span><i class="sw" style="background:${cols[r.type]}"></i>${esc(r.type)}</span>`).join('')}<span class="muted">red band = short (clipped) · dot = runs out · dashed = last day to order</span></div>`;
}

// ---------- 🕵️ change log (v0.8 security): who changed what — append-only, admin only ----------
const AUDIT_COL = { customers: '👤 Customer', payments: '💵 Payment', visits: '🔧 Visit', recoveries: '📦 Recovery', requests: '📋 Request', leads: '🧲 Lead', relocations: '🚚 Relocation', expenses: '🧾 Expense', checkins: '📞 Call', stockMoves: '📦 Stock', deviceEvents: '📦 Device', contractEvents: '📜 Contract', screenings: '🔎 Screening', claims: '📮 Claim', tools: '🧰 Tool', payroll: '💼 Payroll', waterTests: '🧫 Vial', events: '🗓️ Event', trainings: '🎓 Training', settings: '⚙️ Settings' };
const MONEY_FIELDS = new Set(['amount', 'discount', 'depositRefunded', 'depositForfeited', 'approval', 'status', 'churnDate', 'type', 'customerId', 'perms', 'apprDiscountOver', 'apprRefundOver', 'apprWho']);
const auditAt = (a) => (a.createdAt && a.createdAt.toMillis ? new Date(a.createdAt.toMillis()).toISOString() : String(a.at || '')); // server time; own unsent entries: the phone's
const auditBy = (a) => userName(a.createdBy, a.createdBy ? '' : a.by); // the account that wrote it — the "by" text inside is not trusted
function pageChanges(m) {
  ensureUsers(() => reDesk());
  const p = S.route.params || {}; const all = (m.D.audit || []).map((a) => ({ ...a, by: auditBy(a), at: auditAt(a) })).sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  const xs = all.filter((a) => (!p.ac || a.col === p.ac) && (!p.aw || a.by === p.aw));
  const cols = [...new Set(all.map((a) => a.col))]; const who = [...new Set(all.map((a) => a.by || '—'))];
  const seg = (key, val, label, n) => `<button data-${key}="${esc(val)}" class="${(p[key] || '') === val ? 'on' : ''}">${esc(label)}${n !== undefined ? ` <b>${n}</b>` : ''}</button>`;
  const cn = (id) => { const c = S.D.customers.get(id); return c ? `${c.name} (${c.code})` : ''; };
  const money = all.filter((a) => (a.fields || []).some((f) => MONEY_FIELDS.has(f))).length;
  return `<div class="cc">
    ${panel('s3 kpi', 0, '<b>Changes</b> · all', `<div class="v">${all.length}</div><div class="sub"><span>edits of saved records</span></div>`)}
    ${panel('s3 kpi', 1, '<b>Money & status</b>', `<div class="v" style="color:${money ? 'var(--warn)' : 'inherit'}">${money}</div><div class="sub"><span>amount · discount · refund · status · rights</span></div>`)}
    ${panel('s3 kpi', 2, '<b>People</b>', `<div class="v">${who.length}</div>`)}
    ${panel('s3 kpi', 3, '<b>Last change</b>', `<div class="v" style="font-size:20px">${esc(String((all[0] || {}).at || '—').slice(0, 16).replace('T', ' '))}</div>`)}
    ${panel('s12', 4, `<b>Change log</b> · ${xs.length}`, `<div class="seg">${seg('ac', '', 'Everything', all.length)}${cols.map((c) => seg('ac', c, (AUDIT_COL[c] || c).replace(/^\S+ /, ''), all.filter((a) => a.col === c).length)).join('')}</div>
      <div class="seg">${seg('aw', '', 'Everyone')}${who.map((w) => seg('aw', w, w)).join('')}</div>
      <div class="scroll-x"><table class="tbl chg"><tr><th>When</th><th>Who</th><th>What</th><th>Changed</th></tr>
      ${xs.slice(0, 300).map((a) => `<tr${a.customerId ? ` data-cust="${esc(a.customerId)}" style="cursor:pointer"` : ''}><td class="mono">${esc(String(a.at || '').slice(0, 16).replace('T', ' '))}</td><td>${esc(a.by || '—')}</td><td>${esc(AUDIT_COL[a.col] || a.col)}${a.customerId ? `<div class="muted">${esc(cn(a.customerId))}</div>` : ''}</td>
        <td>${(a.fields || []).map((f) => `<div class="${MONEY_FIELDS.has(f) ? 'chg-money' : ''}" data-noi18n><b>${esc(f)}</b>: <span class="muted">${esc((a.before || {})[f] || '—')}</span> → ${esc((a.after || {})[f] || '—')}</div>`).join('')}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">No edits yet — new records are not listed, only changes to saved ones.</td></tr>'}</table></div>`)}
    <div class="panel s12 muted" style="--i:5">Every edit of a saved record (and of Settings) writes one entry: who, when, and each field before → after. Entries cannot be changed or deleted (rules v0.8), and only you can read them. New records are not listed — they carry who made them.</div>
  </div>`;
}

// ---------- 📱 phones: every device's sync state (heartbeat · rules v0.8) ----------
let fleetBusy = false;
export async function loadFleet(visible) {
  if (fleetBusy || (S.fleetAt && Date.now() - S.fleetAt < 60e3)) return; fleetBusy = true;
  try { if (visible) await heartbeat(true); S.fleetCache = await fetchDevices(); S.fleetErr = ''; } catch (e) { S.fleetErr = e.code || e.message; }
  finally { S.fleetAt = Date.now(); fleetBusy = false; }
  S.ver++; if (S.route.screen === 'phones' || visible) reDesk();
}
function pagePhones(m) {
  const rows = (S.fleetCache || []).map((d) => ({ d, ...deviceIssues(d) })).sort((a, b) => ({ bad: 0, warn: 1, ok: 2 }[a.lvl] - { bad: 0, warn: 1, ok: 2 }[b.lvl]) || b.seen - a.seen);
  const agoT = (ms) => (ms ? agoS(ms) : '—'); const yn = (v) => (v === true ? '✓' : v === false ? '✗' : '—');
  const nBad = rows.filter((r) => r.lvl !== 'ok').length;
  return `<div class="cc">
    ${panel('s3 kpi', 0, '<b>Devices</b>', `<div class="v">${rows.length}</div><div class="sub"><span>${new Set(rows.map((r) => r.d.uid)).size} people</span></div>`)}
    ${panel('s3 kpi', 1, '<b>Need a look</b>', `<div class="v" style="color:${nBad ? 'var(--warn)' : 'var(--ok)'}">${nBad}</div>`)}
    ${panel('s3 kpi', 2, '<b>Records waiting</b>', `<div class="v">${rows.reduce((s2, r) => s2 + (Number(r.d.pending) || 0), 0)}</div><div class="sub"><span>on phones, not on the server yet</span></div>`)}
    ${panel('s3 kpi', 3, '<b>Refused</b>', `<div class="v" style="color:${rows.some((r) => r.d.rejected) ? 'var(--bad)' : 'inherit'}">${rows.reduce((s2, r) => s2 + (Number(r.d.rejected) || 0), 0)}</div><div class="sub"><span>the server said no — see the phone's Status</span></div>`)}
    ${panel('s12', 4, `<b>Phones & computers</b> · ${rows.length}`, S.fleetErr ? `<div class="empty">Could not load: ${esc(S.fleetErr)} — publish rules v0.8 first.</div>` : !S.fleetAt ? '<div class="empty">Loading…</div>' : `<div class="scroll-x"><table class="tbl"><tr><th>Who</th><th>Device</th><th>App</th><th>Last opened</th><th>Last server contact</th><th class="n">Waiting</th><th class="n">Refused</th><th>Home-screen app</th><th>Storage protected</th><th>Needs</th></tr>
      ${rows.map(({ d, seen, out, lvl }) => `<tr><td><span class="dot ${lvl === 'bad' ? 'r' : lvl === 'warn' ? 'y' : 'g'}"></span> <b>${esc(userName(d.uid, d.name || d.email || '?'))}</b></td><td>${esc(d.ua || '')}${d.desk ? ' · desk' : ''}</td><td class="mono">${esc(String(d.appVersion || '').replace(/ \(.*\)/, ''))}</td><td class="mono">${esc(agoT(seen))}</td><td class="mono">${esc(agoT(d.lastServerAt))}</td><td class="n">${d.pending || 0}</td><td class="n">${d.rejected || 0}</td><td>${d.desk ? '—' : yn(d.standalone)}</td><td>${d.desk ? '—' : yn(d.persisted)}</td><td>${out.map(([l, t2]) => `<span class="pill ${l}">${esc(t2)}</span>`).join(' ') || '<span class="pill ok">ok</span>'}</td></tr>`).join('') || '<tr><td colspan="10" class="muted">No device has reported yet — each phone reports when the app opens.</td></tr>'}</table></div>`, '<button class="a" data-act="fleetReload">↻ reload</button>')}
    <div class="panel s12 muted" style="--i:5">Each phone reports every 10 minutes while the app is open, when the connection comes back, and after sending: only counts, app version and settings — no locations, no record contents. This computer: <span class="mono">${esc(deviceId())}</span></div>
  </div>`;
}
document.addEventListener('click', (ev) => { const a = ev.target.closest && ev.target.closest('[data-act="fleetReload"]'); if (a && S.desk) { S.fleetAt = 0; loadFleet(true); } });

// ---------- ⚠️ watch list: homes to look after this week (points from the records · not a forecast) ----------
const WCAT = { money: ['💰', 'Money'], service: ['🔧', 'Service & water'], stage: ['🌱', 'Stage of life'] };
function watchFiltered(m, p) { return m.watch.filter((w) => (!p.wl || w.lvl === p.wl) && (!p.wf || w.why.some((r) => r.cat === p.wf))); }
function pageWatch(m) {
  const p = S.route.params || {}; const xs = watchFiltered(m, p);
  const cnt = (lv) => m.watch.filter((w) => w.lvl === lv).length;
  const reasonN = {}; const catN = {}; for (const w of m.watch) for (const r of w.why) { const k = r.ic + ' ' + R.WATCH_SIGNS[r.k][1]; reasonN[k] = (reasonN[k] || 0) + 1; }
  for (const w of m.watch) for (const ct of new Set(w.why.map((r) => r.cat))) catN[ct] = (catN[ct] || 0) + 1; // homes per kind of sign (matches the filter)
  const who = {}; for (const w of m.watch.filter((z) => z.lvl !== 'low')) { const a = R.assigneeOf(w.x.c, m.t) || 'Nobody yet'; who[a] = (who[a] || 0) + 1; }
  const seg = (key, val, label, n) => `<button data-${key}="${val}" class="${(p[key] || '') === val ? 'on' : ''}">${esc(label)}${n !== undefined ? ` <b>${n}</b>` : ''}</button>`;
  return `<div class="cc watch">
    ${panel('s3 kpi', 0, '<b>Look after first</b>', `<div class="v" style="color:var(--bad)">${counter('wh', cnt('high'))}</div><div class="sub"><span>${R.WATCH.high}+ points</span></div>`)}
    ${panel('s3 kpi', 1, '<b>Keep an eye on</b>', `<div class="v" style="color:var(--warn)">${counter('ww', cnt('watch'))}</div><div class="sub"><span>${R.WATCH.watch}–${R.WATCH.high - 1} points</span></div>`)}
    ${panel('s3 kpi', 2, '<b>Small signs</b>', `<div class="v">${counter('wl', cnt('low'))}</div><div class="sub"><span>1–${R.WATCH.watch - 1} points</span></div>`)}
    ${panel('s3 kpi', 3, '<b>Checked this week</b>', `<div class="v">${m.watchChecked}</div><div class="sub"><span>hidden 7 days unless worse</span>${m.watchChecked ? '<a href="#" data-act="watchShowAll">show again</a>' : ''}</div>`)}
    <div class="panel s12 wt-bar" style="--i:4"><div class="seg">${seg('wl', '', 'All levels', m.watch.length)}${seg('wl', 'high', '🔴 First', cnt('high'))}${seg('wl', 'watch', '🟠 Eye', cnt('watch'))}${seg('wl', 'low', '🔵 Small', cnt('low'))}</div>
      <div class="seg">${seg('wf', '', 'All signs')}${Object.entries(WCAT).map(([k, [ic, l]]) => seg('wf', k, `${ic} ${l}`, catN[k] || 0)).join('')}</div><span class="sp"></span>
      <span class="muted">Points from signs in the records. It orders who to call first — not a forecast (no verdict before 600 household-months).</span></div>
    ${panel('s7', 5, `<b>Homes</b> · ${xs.length}`, `<div class="mini-list wt-list">${xs.map((w) => watchItem(w, { max: 5 })).join('') || '<div class="empty">Nobody here 🎉</div>'}</div>`)}
    <div class="s5 wt-side" style="--i:6">
      ${panel('', 6, '<b>Map</b> · red = first · orange = eye · faint = small signs', '<div id="mapBox" class="mapbox" style="height:320px"></div>')}
      ${panel('', 7, '<b>Most common signs</b>', Object.keys(reasonN).length ? hbars(Object.entries(reasonN).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([l, v]) => ({ l, v })), 'var(--warn)') : '<div class="empty">No signs</div>')}
      ${panel('', 8, '<b>Whose homes</b> · first + eye', Object.keys(who).length ? hbars(Object.entries(who).sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ l, v })), 'var(--brand)') : '<div class="empty">Nobody here 🎉</div>', isBoss() ? '<button class="a" data-side="dispatch">dispatch →</button>' : '')}
      ${panel('', 9, '<b>How points are given</b>', `<div class="kv wt-rules">${Object.values(R.WATCH_SIGNS).map(([w, l]) => `<div class="k">${esc(l)}</div><div class="v">${w}</div>`).join('')}</div>
        <div class="muted" style="margin-top:6px">🔴 Weights are a first guess. One late bill counts little: skipping a payment early is common in pay-as-you-go businesses. New homes get a point: the first 90 days carry most of the leaving.</div>`)}
    </div>
  </div>`;
}
let watchFitKey = null;
function drawWatch() {
  const m = model(); const pts = []; const col = { high: HEX.r, watch: HEX.o, low: HEX.b };
  const xs = watchFiltered(m, S.route.params || {}).slice().reverse(); // low first so red/orange are drawn on top
  for (const w of xs) { const g = w.x.c.gps; if (!g || !Number.isFinite(g.lat)) continue; if (w.lvl !== 'low') pts.push([g.lat, g.lng]);
    const low = w.lvl === 'low';
    layer.addLayer(Lf.circleMarker([g.lat, g.lng], { radius: w.lvl === 'high' ? 9 : low ? 4 : 7, color: col[w.lvl], weight: low ? 1 : 2, fillColor: col[w.lvl], fillOpacity: low ? 0.35 : 0.85, opacity: low ? 0.5 : 1 }).bindPopup(`<b>${esc(w.x.c.name)}</b> · ${w.score} pts<br>${w.why.slice(0, 3).map((r) => esc(r.ic + ' ' + r.t)).join('<br>')}<br><button class="btn small" data-cust="${esc(w.x.c.id)}" style="margin-top:6px">Open</button>`)); }
  if (!pts.length) for (const w of xs) { const g = w.x.c.gps; if (g && Number.isFinite(g.lat)) pts.push([g.lat, g.lng]); }
  // fit only when the filter changes (mountMap fits on first draw) — a data refresh or ✓ Checked keeps your zoom
  const key = `${(S.route.params || {}).wl || ''}|${(S.route.params || {}).wf || ''}`;
  if (key !== watchFitKey) { const first = watchFitKey === null; watchFitKey = key; if (!first && pts.length && map) setTimeout(() => { try { map.fitBounds(pts, { padding: [24, 24], maxZoom: 15, animate: false }); } catch (e) {} }, 0); }
  return pts;
}

// ---------- search ----------
export function onSearch(q) {
  const box = document.getElementById('deskSearchRes'); if (!box) return;
  q = String(q || '').trim().toLowerCase();
  if (!q) { box.classList.add('hidden'); return; }
  const m = model();
  const hits = [...m.cust.values()].filter((x) => [x.c.name, x.c.code, x.c.phone, toleOf(x.c), x.c.deviceSerial].some((s) => String(s || '').toLowerCase().includes(q))).slice(0, 12);
  box.innerHTML = hits.map((x) => cItem(x)).join('') || '<div class="empty">No match</div>';
  box.classList.remove('hidden');
}
const reDesk = () => renderDesk(document.getElementById('view'), false);
document.addEventListener('click', (ev) => {
  if (!S.desk) return;
  const box = document.getElementById('deskSearchRes'); if (box && !ev.target.closest('#deskSearchRes') && ev.target.id !== 'deskSearch') box.classList.add('hidden');
  const s = ev.target.closest('[data-dseg]'); if (s) { S.route.params.f = s.dataset.dseg; reDesk(); return; }
  const so = ev.target.closest('th[data-sort]'); if (so) { S.route.params.sort = so.dataset.sort; reDesk(); return; }
  const to = ev.target.closest('[data-tole]'); if (to) { S.route.params.tole = to.dataset.tole || ''; reDesk(); return; }
  const h = ev.target.closest('[data-hist]'); if (h && !h.disabled) { if (S.route.screen !== 'history') go('history', 'history', { m: h.dataset.hist }); else { S.route.params.m = h.dataset.hist; reDesk(); const on = document.querySelector('.monthbar .chips .on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' }); } return; }
  const mp = ev.target.closest('[data-monthpeek]'); if (mp) { const body = peek(monthPeekHtml(mp.dataset.monthpeek), 'month'); animateCounts(body); return; }
  if (ev.target.closest('#peek [data-cust], #peek [data-edit], #peek [data-capack-open]')) closePeek();
  const co = ev.target.closest('[data-capack-open]'); if (co) { const [y, mo] = co.dataset.capackOpen.split('|').map(Number); nav('status', 'report', { r: 'capack', y, m: mo, n: 1 }); return; }
  const hc = ev.target.closest('[data-csv^="hist:"]'); if (hc) { const [, kind, mk] = hc.dataset.csv.split(':'); const txt = historyCsv(kind, mk); const b = new Blob([txt], { type: 'text/csv;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `kora-history-${kind}-${mk}.csv`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); ev.stopImmediatePropagation(); }
}, true);
document.addEventListener('keydown', (ev) => {
  if (!S.desk || S.route.screen !== 'history' || S.drawer || document.getElementById('palette') || /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) return;
  if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
  const H = historyModel(model()); const cur = S.route.params.m && H.byMonth[S.route.params.m] ? S.route.params.m : H.months[H.months.length - 1];
  const i = H.months.indexOf(cur) + (ev.key === 'ArrowLeft' ? -1 : 1); if (i < 0 || i >= H.months.length) return;
  S.route.params.m = H.months[i]; reDesk();
});

// ---------- map (Leaflet, loaded on demand; kept alive across data refreshes) ----------
let Lf = null, map = null, layer = null, view = null, mapEl = null, meLayer = null;
export function showMe() { const h = hereNow(); if (map && meLayer && h) { drawMe(map, meLayer, h); map.setView([h.lat, h.lng], Math.max(map.getZoom(), 14)); } }
export function dropMap() { if (!map) return; replayStop(true); watchFitKey = null; try { view = { c: map.getCenter(), z: map.getZoom() }; map.off(); map.remove(); } catch (e) {} map = null; layer = null; mapEl = null; meLayer = null; }
export async function mountMap(box) {
  if (!box) return;
  try { Lf = await loadLeaflet(); } catch (e) { box.innerHTML = '<div class="empty">Map library could not load.</div>'; return; }
  if (!box.isConnected) return;
  dropMap();
  map = Lf.map(box, { ...MAP_OPTS, zoomControl: true, attributionControl: true, preferCanvas: false, fadeAnimation: false, zoomAnimation: false, markerZoomAnimation: false }); // SVG, not canvas: the canvas renderer crashes when the kept map element is moved between renders
  mapEl = box;
  Lf.tileLayer(TILE, { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
  layer = Lf.layerGroup().addTo(map);
  const pts = drawMarkers();
  meLayer = addLocate(map, { position: 'topleft', note: (why) => locHelp(why), onFound: (p) => { map.setView([p.lat, p.lng], Math.max(map.getZoom(), 14)); } });
  hereIfAllowed().then((p) => { if (p && map && meLayer) drawMe(map, meLayer, p); });
  if (view && !['live', 'watch'].includes(S.route.screen)) map.setView(view.c, view.z, { animate: false }); // field live always fits everyone in
  else if (pts.length) map.fitBounds(pts, { padding: [30, 30], maxZoom: 15, animate: false });
  else map.setView(POKHARA, 13, { animate: false });
}
function drawMarkers() {
  if (!map || replay) return [];
  if (S.route.screen === 'live') { layer.clearLayers(); return drawLive(); }
  if (S.route.screen === 'watch') { layer.clearLayers(); return drawWatch(); }
  const m = model(); layer.clearLayers(); const pts = [];
  for (const x of m.cust.values()) {
    const g = x.c.gps; if (!g || !Number.isFinite(g.lat) || !Number.isFinite(g.lng)) continue;
    pts.push([g.lat, g.lng]);
    const col = HEX[x.dot] || HEX.g;
    const mk = x.dot === 'r' ? Lf.marker([g.lat, g.lng], { icon: Lf.divIcon({ className: '', html: '<div class="pulse-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }), zIndexOffset: 500 })
      : Lf.circleMarker([g.lat, g.lng], { radius: 6, color: col, weight: 2, fillColor: col, fillOpacity: 0.75 });
    mk.bindPopup(`<b>${esc(x.c.name)}</b> <span class="mono">${esc(x.c.code)}</span><br>${esc(toleOf(x.c))} · ${x.led.overdue ? `<span style="color:${HEX.r}">${R.npr(x.led.overdue)} overdue</span>` : 'paid up'}<br>${x.nv ? 'next visit ' + esc(x.nv.date) : ''}<br><button class="btn small" data-cust="${esc(x.c.id)}" style="margin-top:6px">Open</button>`);
    layer.addLayer(mk);
  }
  return pts;
}

// ---------- ▶ replay: homes appear month by month at their install date, leavers turn grey ----------
let replay = null, replayT = 0;
function replayStart() {
  if (!map || !Lf) return; replayStop(true);
  const m = model(); const cs = [...m.cust.values()].filter((x) => x.c.gps && Number.isFinite(x.c.gps.lat) && Number.isFinite(x.c.gps.lng) && R.isDate(x.c.installDate)).sort((a, b) => a.c.installDate.localeCompare(b.c.installDate));
  if (!cs.length) { toast('No homes with a location yet'); return; }
  const months = []; for (let k = cs[0].c.installDate.slice(0, 7); k <= m.t.slice(0, 7); k = R.monthKey(R.addMonths(k + '-01', 1))) months.push(k);
  layer.clearLayers(); const rl = Lf.layerGroup().addTo(map); const dots = new Map(); let i = 0;
  const ov = document.createElement('div'); ov.className = 'replay-ov'; map.getContainer().appendChild(ov);
  replay = { rl, ov };
  const step = () => {
    if (!replay) return; const mk = months[i]; const end = i === months.length - 1 ? m.t : monthEnd(mk); let on = 0, gone = 0, added = 0;
    for (const x of cs) {
      const c = x.c; if (c.installDate > end) continue;
      const left = c.status === 'Churned' && R.isDate(c.churnDate) && c.churnDate <= end;
      let d = dots.get(c.id);
      if (!d) { d = Lf.circleMarker([c.gps.lat, c.gps.lng], { radius: 11, color: '#fff', weight: 2, fillColor: HEX.g, fillOpacity: 1 }).addTo(rl); dots.set(c.id, d); added++; setTimeout(() => { try { d.setRadius(6); d.setStyle({ color: HEX.g, fillOpacity: 0.8 }); } catch (e) {} }, 420); }
      if (left) { d.setStyle({ color: HEX.k, fillColor: HEX.k, fillOpacity: 0.6 }); gone++; } else on++;
    }
    ov.innerHTML = `<b>${esc(monLabel(mk))}</b><span>${on} homes${added ? ` · +${added}` : ''}${gone ? ` · ${gone} left` : ''}</span><i style="width:${((i + 1) / months.length) * 100}%"></i>`;
    i++; replayT = setTimeout(i < months.length ? step : () => replayStop(), i < months.length ? 900 : 2600);
  };
  step();
}
function replayStop(quiet) {
  clearTimeout(replayT); replayT = 0; if (!replay) return;
  try { map && map.removeLayer(replay.rl); } catch (e) {} replay.ov.remove(); replay = null;
  if (!quiet) drawMarkers();
}
document.addEventListener('click', (ev) => { const a = ev.target.closest && ev.target.closest('[data-act="replay"]'); if (a && S.desk) { if (replay) replayStop(); else replayStart(); } });

// ---------- 📺 TV mode: walks through the main pages every 20 s, full screen ----------
const TV_PAGES = ['command', 'live', 'calendar', 'field', 'money', 'map', 'history'];
let tvT = 0, tvI = 0;
function tvStart() {
  tvI = 0; document.body.classList.add('tv'); try { const r = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); if (r && r.catch) r.catch(() => {}); } catch (e) {}
  const bar = document.createElement('div'); bar.id = 'tvbar'; bar.innerHTML = '<span>📺 TV</span><b id="tvName"></b><i><s></s></i><span class="muted">Esc or click to stop</span>'; document.body.appendChild(bar);
  tvStep();
}
function tvStep() {
  const pages = TV_PAGES.filter((k) => { const d = SIDE.find((x) => x[0] === k); return d && sideOk(d); });
  const k = pages[tvI % pages.length]; tvI++;
  go(k, k, {}, true);
  const nm = document.getElementById('tvName'); if (nm) nm.textContent = (SIDE.find((x) => x[0] === k) || [])[2] || k;
  const s2 = document.querySelector('#tvbar s'); if (s2) { s2.style.animation = 'none'; void s2.offsetWidth; s2.style.animation = ''; }
  tvT = setTimeout(tvStep, 20000);
}
export function tvStop() {
  if (!tvT) return false; clearTimeout(tvT); tvT = 0; document.body.classList.remove('tv');
  const b = document.getElementById('tvbar'); if (b) b.remove();
  try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); } catch (e) {}
  return true;
}
document.addEventListener('click', (ev) => {
  if (!S.desk) return;
  if (tvT) { ev.stopPropagation(); ev.preventDefault(); tvStop(); return; }
  const a = ev.target.closest && ev.target.closest('[data-act="tv"]'); if (a) { ev.stopPropagation(); tvStart(); }
}, true);
document.addEventListener('keydown', (ev) => { if (tvT && ev.key === 'Escape') { ev.stopImmediatePropagation(); tvStop(); } }, true);

// ---------- motion: cursor spotlight on panels ----------
document.addEventListener('mousemove', (ev) => {
  if (!S.desk) return; const p = ev.target.closest && ev.target.closest('.panel'); if (!p) return;
  const r = p.getBoundingClientRect(); p.style.setProperty('--mx', (ev.clientX - r.left) + 'px'); p.style.setProperty('--my', (ev.clientY - r.top) + 'px');
}, { passive: true });

// ---------- ⌘K: search & actions from anywhere on the desk ----------
let palSel = 0;
function palItems(q) {
  const m = model(); q = String(q || '').trim().toLowerCase();
  const acts = [
    ...SIDE.map(([k, i, l]) => ({ ic: i, t: l, s: 'page', run: () => go(k, k, {}) })),
    { ic: '🏠', t: 'New install', s: 'form', run: () => nav('new', 'form', { form: 'install' }) },
    { ic: '💵', t: 'Payment', s: 'form', run: () => nav('new', 'form', { form: 'payment' }) },
    { ic: '🔧', t: 'Visit', s: 'form', run: () => nav('new', 'form', { form: 'visit' }) },
    { ic: '📋', t: 'Service request', s: 'form', run: () => nav('new', 'form', { form: 'request' }) },
    { ic: '🧲', t: 'Lead', s: 'form', run: () => nav('new', 'form', { form: 'lead' }) },
    { ic: '📞', t: 'Check-in call', s: 'form', run: () => nav('new', 'form', { form: 'checkin' }) },
    { ic: '🧾', t: 'CA pack', s: 'IRD sales book', run: () => nav('status', 'report', { r: 'capack' }) },
    { ic: '🩺', t: 'Data to fix', s: 'report', run: () => nav('status', 'report', { r: 'quality' }) },
    { ic: '🏦', t: 'Deposit book', s: 'report', run: () => nav('status', 'report', { r: 'deposits' }) },
    { ic: '🧭', t: 'Direction gate', s: 'report', run: () => nav('status', 'report', { r: 'gate' }) },
    { ic: '📦', t: 'Stock & FCL', s: 'report', run: () => nav('status', 'report', { r: 'stock' }) },
    { ic: '💰', t: 'Collections', s: 'list', run: () => nav('today', 'list', { list: 'collections' }) },
    { ic: '▶', t: 'Story', s: 'since last time + the day in 7 slides', run: () => storyOpen() },
    { ic: '📺', t: 'TV mode', s: 'pages rotate every 20 s', run: () => tvStart() },
    { ic: '🗓️', t: 'Calendar event', s: 'form', run: () => nav('new', 'form', { form: 'event' }) },
    { ic: 'EN', t: 'English', s: 'language', run: () => { setLang('en'); render(true); } },
    { ic: '한', t: '한국어', s: 'language', run: () => { setLang('ko'); render(true); } },
    { ic: 'ने', t: 'नेपाली', s: 'language', run: () => { setLang('ne'); render(true); } },
  ];
  const custs = q ? [...m.cust.values()].filter((x) => [x.c.name, x.c.code, x.c.phone, toleOf(x.c), x.c.deviceSerial, x.c.notes].some((s) => String(s || '').toLowerCase().includes(q))).slice(0, 8).map((x) => ({ ic: '👤', t: x.c.name, s: `${x.c.code} · ${toleOf(x.c)}${x.led.overdue ? ' · ' + R.npr(x.led.overdue) + ' due' : ''}`, run: () => nav('customers', 'detail', { id: x.c.id }) })) : [];
  const a2 = acts.filter((a) => !q || (a.t + ' ' + a.s).toLowerCase().includes(q));
  return [...custs, ...a2].slice(0, 14);
}
function palRender() {
  const el = document.getElementById('palette'); if (!el) return;
  const items = palItems(el.querySelector('input').value); palSel = Math.max(0, Math.min(palSel, items.length - 1));
  el.querySelector('.pl').innerHTML = items.map((x, i) => `<div class="pi ${i === palSel ? 'on' : ''}" data-pi="${i}"><span class="ic">${esc(x.ic)}</span><span class="t">${esc(x.t)}</span><span class="s">${esc(x.s)}</span></div>`).join('') || '<div class="empty">No match</div>';
  el._items = items;
}
export function paletteOpen() {
  if (document.getElementById('palette')) return;
  const el = document.createElement('div'); el.id = 'palette'; el.className = 'palette';
  el.innerHTML = `<div class="pbox"><input placeholder="Customer, page or action…" autocomplete="off"><div class="pl"></div><div class="ph2"><span>↑↓ choose</span><span>↵ open</span><span>esc close</span></div></div>`;
  document.body.appendChild(el); palSel = 0; palRender(); el.querySelector('input').focus();
}
export function paletteClose() { const el = document.getElementById('palette'); if (el) el.remove(); }
function palRun(i) { const el = document.getElementById('palette'); const it = el && el._items && el._items[i]; paletteClose(); if (it) it.run(); }
document.addEventListener('keydown', (ev) => {
  if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k' && S.desk) { ev.preventDefault(); if (document.getElementById('palette')) paletteClose(); else paletteOpen(); return; }
  const el = document.getElementById('palette'); if (!el) return;
  if (ev.key === 'Escape') { ev.preventDefault(); paletteClose(); }
  else if (ev.key === 'ArrowDown') { ev.preventDefault(); palSel++; palRender(); }
  else if (ev.key === 'ArrowUp') { ev.preventDefault(); palSel = Math.max(0, palSel - 1); palRender(); }
  else if (ev.key === 'Enter') { ev.preventDefault(); palRun(palSel); }
});
document.addEventListener('input', (ev) => { if (ev.target.closest && ev.target.closest('#palette')) { palSel = 0; palRender(); } });
document.addEventListener('click', (ev) => {
  const pi = ev.target.closest('[data-pi]'); if (pi) { palRun(Number(pi.dataset.pi)); return; }
  if (ev.target.id === 'palette') paletteClose();
  if (ev.target.closest('[data-act="palette"]')) paletteOpen();
});

// ---------- ▶ Story: the day in six full-screen slides (auto-advance like Instagram stories) ----------
let storyT = 0, storyI = 0;
function storySlides() {
  const m = model(), M = m.metrics, t = m.t;
  const byTole = {}; for (const x of m.visitsDue) byTole[toleOf(x.c)] = (byTole[toleOf(x.c)] || 0) + 1;
  const topT = Object.entries(byTole).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const stages = R.DUNNING.map((d) => ({ d, n: m.collections.filter((x) => x.dn.stage === d.stage).length }));
  const maxS = Math.max(1, ...stages.map((x) => x.n)); const G = M.gate; const F = M.fcl;
  const vatNow = m.vat.find((r) => r.month === R.monthKey(t));
  const big = (v, fmt) => counter('st_' + Math.random().toString(36).slice(2, 6), v, fmt);
  // slide 0: what changed since the last Story on this computer (first time: the last 7 days)
  const lastMs = storySeen(); const sinceD = lastMs ? R.fmtD(new Date(lastMs)) : R.addDays(t, -6);
  const A = R.periodActivity(m.D, sinceD, t); const reqDone = A.requestsDone.length; const leadsNew = m.D.leads.filter((l) => { const ms = l.createdAt && l.createdAt.toMillis ? l.createdAt.toMillis() : Number(l._localT) || 0; return ms && ms >= (lastMs || Date.now() - 7 * 864e5); }).length;
  const agoTxt = lastMs ? (Date.now() - lastMs < 864e5 ? `${Math.max(1, Math.round((Date.now() - lastMs) / 3600e3))} h ago` : `${Math.round((Date.now() - lastMs) / 864e5)} days ago`) : 'the last 7 days';
  const digest = `<div class="eyebrow">Since you last looked · ${esc(agoTxt)}</div><div class="huge">${A.cash ? big(A.cash) : '0'}</div><div class="sub">NPR came in · ${A.payments.length} payments</div>
      <div class="row3"><div><b>+${A.installs.length}</b><span>new homes</span></div><div><b>${A.churns.length}</b><span>left</span></div><div><b>${A.visits.length}</b><span>visits done</span></div><div><b>${A.requestsIn.length} → ${reqDone}</b><span>requests in → done</span></div><div><b>${leadsNew}</b><span>new leads</span></div></div>`;
  return [digest,
    `<div class="eyebrow">KORA · ${esc(fmtDate(new Date(), { timeZone: NPT, weekday: 'long', day: 'numeric', month: 'long' }))}</div><div class="huge">${big(M.active)}</div><div class="sub">households drinking KORA water today</div>
      <div class="row3"><div><b>${M.installed}</b><span>installed so far</span></div><div><b>${M.avg4w.toFixed(1)}</b><span>installs / week (4 wk)</span></div><div><b>${M.paused}</b><span>paused</span></div><div><b>${M.churned}</b><span>left</span></div></div>`,
    `<div class="eyebrow">Money · this month</div><div class="huge">${big(M.cashThisMonth)}</div><div class="sub">NPR in so far · recurring ${fmtN(M.mrr)} / month</div>
      <div class="row3"><div><b>${fmtN(M.overdueAmt)}</b><span>overdue</span></div><div><b>${fmtN(m.deposits.total.held)}</b><span>deposit held — not ours</span></div><div><b>${vatNow ? fmtN(vatNow.vat) : 0}</b><span>VAT to file</span></div></div>`,
    `<div class="eyebrow">Collections · G-1 §1-3</div><div class="huge">${M.collection === null ? '—' : big(M.collection, 'pct')}</div><div class="sub">of bills paid · ${M.billsPaid} of ${M.billsDue}</div>
      <div class="mini-bars">${stages.map((x, i) => `<i style="height:${Math.max(4, (x.n / maxS) * 100)}%;animation-delay:${i * 90}ms" title="${esc(x.d.short)}"></i>`).join('')}</div><div class="row3">${stages.map((x) => `<div><b>${x.n}</b><span>${esc(x.d.short)}</span></div>`).join('')}</div>`,
    `<div class="eyebrow">Field · today</div><div class="huge">${big(m.visitsDue.length)}</div><div class="sub">visits due · ${m.calls.length} calls · ${m.openReq.length} open requests</div>
      <div class="row3">${topT.map(([k, n]) => `<div><b>${n}</b><span>📍 ${esc(k)}</span></div>`).join('') || '<div><b>0</b><span>nothing due</span></div>'}</div>`,
    `<div class="eyebrow">Direction gate · Plan B triggers</div><div class="huge" style="font-size:clamp(48px,8vw,110px)">${[G.collection, G.retention, G.churn].filter((g) => g.judgeable && g.bad).length ? 'CHECK' : 'ON COURSE'}</div>
      <div class="row3"><div><b>${R.pct(G.collection.value)}</b><span>collection · trigger 50% ${G.collection.judgeable ? '' : '· sample thin'}</span></div><div><b>${R.pct(G.retention.value)}</b><span>90-day retention · trigger 85% ${G.retention.judgeable ? '' : '· sample thin'}</span></div><div><b>${R.pct(G.churn.value, 1)}</b><span>churn / month · trigger 3.5% ${G.churn.judgeable ? '' : '· not judgeable yet'}</span></div></div>`,
    `<div class="eyebrow">FCL#1 · order signal</div><div class="huge" style="font-size:clamp(48px,8vw,110px)">${F.ready ? 'ORDER NOW' : 'NOT YET'}</div><div class="sub">stock ${F.stockDevices} devices · order point ${F.threshold.toFixed(1)} (${F.avg4w.toFixed(2)}/week × ${F.leadTimeWeeks} weeks)</div>
      <div class="row3"><div><b>${F.stockSignal ? '✓' : '·'}</b><span>stock at order point</span></div><div><b>${F.billsOk ? '✓' : '·'}</b><span>30+ bills</span></div><div><b>${F.collectionOk ? '✓' : '·'}</b><span>collection ≥ 60%</span></div><div><b>${F.defectsOk ? '✓' : '·'}</b><span>no repeated defect</span></div></div>`,
  ];
}
function storyShow(i) {
  const el = document.getElementById('story'); if (!el) return;
  const slides = storySlides(); storyI = Math.max(0, Math.min(i, slides.length - 1));
  el.querySelector('.bars').innerHTML = slides.map((_, k) => `<i class="${k < storyI ? 'done' : k === storyI ? 'cur' : ''}"><b></b></i>`).join('');
  const sl = el.querySelector('.slide'); sl.innerHTML = slides[storyI]; animateCounts(sl);
  clearTimeout(storyT); storyT = setTimeout(() => { if (storyI < slides.length - 1) storyShow(storyI + 1); else storyClose(); }, 5200);
}
function storyOpen() {
  storyClose();
  const el = document.createElement('div'); el.id = 'story'; el.className = 'story';
  el.innerHTML = '<div class="glow"></div><div class="bars"></div><button class="close" data-act="storyClose">✕</button><div class="nav l" data-act="storyPrev"></div><div class="nav r" data-act="storyNext"></div><div class="slide"></div>';
  document.body.appendChild(el); storyShow(0);
}
function storyClose() { clearTimeout(storyT); const el = document.getElementById('story'); if (el) { el.remove(); storySeen(Date.now()); } }
function storySeen(set) { try { if (set) localStorage.setItem('kfp_story_seen', String(set)); return Number(localStorage.getItem('kfp_story_seen')) || 0; } catch (e) { return 0; } }
document.addEventListener('click', (ev) => {
  const a = ev.target.closest('[data-act]'); if (!a) return;
  if (a.dataset.act === 'story') storyOpen(); else if (a.dataset.act === 'storyClose') storyClose();
  else if (a.dataset.act === 'storyNext') storyShow(storyI + 1); else if (a.dataset.act === 'storyPrev') storyShow(storyI - 1);
});
document.addEventListener('keydown', (ev) => { if (!document.getElementById('story')) return; if (ev.key === 'Escape') storyClose(); if (ev.key === 'ArrowRight') storyShow(storyI + 1); if (ev.key === 'ArrowLeft') storyShow(storyI - 1); });
export { storyOpen, storyClose };

// ---------- alerts dropdown · chart tooltips ----------
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-act="bell"]'); const box = document.getElementById('bellBox');
  if (b && box) { box.classList.toggle('hidden'); return; }
  if (box && !ev.target.closest('#bellBox')) box.classList.add('hidden');
});
let tip = null;
document.addEventListener('mousemove', (ev) => {
  if (!S.desk) return; const r = ev.target.closest && ev.target.closest('rect.barr, .chart circle');
  if (!r) { if (tip) tip.style.opacity = '0'; return; }
  const t = r.querySelector('title'); if (!t) return;
  if (!tip) { tip = document.createElement('div'); tip.className = 'ctip'; document.body.appendChild(tip); }
  tip.textContent = t.textContent; tip.style.left = ev.clientX + 14 + 'px'; tip.style.top = ev.clientY - 10 + 'px'; tip.style.opacity = '1';
}, { passive: true });
