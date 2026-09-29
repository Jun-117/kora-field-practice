// KORA Field — today's route on a map (phone). Numbered stops like a delivery app: visits due, 7+ day collections
// (home visit, G-1 §1-3), open repairs; done today = green.
// Order: AUTO (default) = nearest-neighbour from where you stand + 2-opt, redone as you move (live position).
//        MANUAL = your own order (▲▼ / 📌 in the list); "Auto" switches back. Both are kept per day on the phone.
import * as R from './logic.js';
import { S, model, esc, custLabel, toleOf, waLink, dunText, nav, toast, today, offerLink, omwBtn, omwChips, can } from './app.js';
import { loadLeaflet, MAP_OPTS, setHere, hereNow, openDirections, dirUrl } from './geo.js';

const KIND = {
  visit: { cls: 'visit', label: 'Visit due', color: '#1f6fb2' },
  collect: { cls: 'collect', label: 'Home visit — overdue', color: '#d4382b' },
  repair: { cls: 'repair', label: 'Repair / request', color: '#e2700c' },
  done: { cls: 'done', label: 'Done today', color: '#16a34a' },
};
let Lf = null, map = null, layer = null, meLayer = null, me = null, filter = 'all', lastView = null, watchId = null, orderedAt = null;
const dayKey = () => 'kfp_route_' + today();
const modeKey = () => 'kfp_route_mode_' + today();
const LIVE_REORDER_KM = 0.15; // re-order after moving 150 m (auto mode)
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

// ---------- which houses are stops today ----------
export function stopsFor(m) {
  const t = m.t; const by = new Map();
  const add = (x, kind, why) => { if (!x || !x.c) return; let s = by.get(x.c.id); if (!s) { s = { id: x.c.id, x, kinds: new Set(), why: [] }; by.set(x.c.id, s); } s.kinds.add(kind); s.why.push(why); };
  for (const x of m.visitsDue) add(x, 'visit', x.filterOnly ? `Filter due ${x.due}` : `Visit due ${x.due}`);
  for (const x of m.collections) if (x.dn.stage === 'visit') add(x, 'collect', `${R.npr(x.dn.owed)} · ${x.dn.days} d late`);
  for (const o of m.openReq) if (o.c) add(o.c, 'repair', `${o.r.type} · ${o.r.status}`);
  const doneToday = new Set(m.D.visits.filter((v) => v.date === t && String(v.status).includes('Completed')).map((v) => v.customerId));
  for (const id of doneToday) { const x = m.cust.get(id); if (x) add(x, 'done', 'Visited today'); }
  const all = [...by.values()].map((s) => ({ ...s, kinds: [...s.kinds], done: s.kinds.has('done') && s.kinds.size === 1, main: s.kinds.has('collect') ? 'collect' : s.kinds.has('repair') ? 'repair' : s.kinds.has('visit') ? 'visit' : 'done' }));
  const withGps = all.filter((s) => s.x.c.gps && Number.isFinite(s.x.c.gps.lat));
  return { all, withGps, noGps: all.filter((s) => !(s.x.c.gps && Number.isFinite(s.x.c.gps.lat))) };
}

// ---------- ordering ----------
const rad = (d) => (d * Math.PI) / 180;
export function km(a, b) { const R0 = 6371, dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng); const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2; return 2 * R0 * Math.asin(Math.sqrt(h)); }
export function orderStops(pts, start) {
  if (!pts.length) return [];
  const left = pts.slice(); const out = [];
  let cur = start || left[0].p;
  while (left.length) { let bi = 0, bd = Infinity; left.forEach((s, i) => { const d = km(cur, s.p); if (d < bd) { bd = d; bi = i; } }); const s = left.splice(bi, 1)[0]; out.push(s); cur = s.p; }
  // 2-opt: undo crossings (small n, so plain loops are fine)
  const len = (r) => r.reduce((sum, s, i) => sum + km(i ? r[i - 1].p : (start || r[0].p), s.p), 0);
  let best = out, bestL = len(out), improved = true, guard = 0;
  while (improved && guard++ < 40) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) for (let k = i + 1; k < best.length; k++) {
      const cand = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)];
      const L = len(cand); if (L + 1e-9 < bestL) { best = cand; bestL = L; improved = true; }
    }
  }
  return best;
}
export const routeKm = (r, start) => r.reduce((sum, s, i) => sum + km(i ? r[i - 1].p : (start || r[0].p), s.p), 0);
export const routeMode = () => lsGet(modeKey(), 'auto');
function ordered(stops) {
  const pts = stops.filter((s) => !s.done).map((s) => ({ ...s, p: s.x.c.gps }));
  const saved = routeMode() === 'manual' ? lsGet(dayKey(), null) : null;
  let seq;
  if (saved && saved.ids) {
    const byId = new Map(pts.map((s) => [s.id, s]));
    seq = saved.ids.map((id) => byId.get(id)).filter(Boolean);
    const extra = pts.filter((s) => !saved.ids.includes(s.id));
    seq = seq.concat(orderStops(extra, seq.length ? seq[seq.length - 1].p : me));
  } else seq = orderStops(pts, me);
  return seq;
}

// ---------- screen ----------
export function routeHtml() {
  const m = model(); const st = stopsFor(m);
  const n = (k) => st.all.filter((s) => s.kinds.includes(k)).length;
  const chips = [['all', 'All', st.all.length, 'var(--ink)'], ['visit', 'Visits', n('visit'), KIND.visit.color], ['collect', 'Collect', n('collect'), KIND.collect.color], ['repair', 'Repairs', n('repair'), KIND.repair.color], ['done', 'Done', n('done'), KIND.done.color]];
  const calls = m.calls.length, chase = m.collections.length;
  return `<div class="route">
    <div id="rmap" class="rmap"></div>
    <div class="rtop">
      <div class="rsum">${chips.map(([k, l, c, col]) => `<span class="k ${filter === k ? 'on' : ''}" data-rfilter="${k}" style="color:${col}"><b>${c}</b>${l}</span>`).join('')}
        <span class="k" data-list="calls" style="color:var(--c-call)"><b>${calls}</b>Calls</span><span class="k" data-list="collections" style="color:var(--c-money)"><b>${chase}</b>To chase</span></div>
      <div class="rmode">${routeMode() === 'auto' ? `<span class="on">📡 Auto order · from where you are${me ? '' : ' (finding you…)'}</span>` : `<span class="man">✋ Your own order</span><button data-act="rAuto">📡 Back to auto</button>`}</div>
      ${st.noGps.length ? `<div class="rsum" style="font-size:12px;color:var(--muted)">📍 ${st.noGps.length} stop(s) without GPS — open the customer and tap “Get location” next visit</div>` : ''}
    </div>
    <div class="rbot"><button data-act="rList">✋ Order</button><button class="primary" data-act="rNext" id="rNext">🧭 Next</button><button class="round" data-act="rMe" title="My location">📍</button><button class="round" data-act="rList" title="List">☰</button></div>
  </div>`;
}
export async function mountRoute(root) {
  const box = root.querySelector('#rmap'); if (!box) return;
  try { Lf = await loadLeaflet(); } catch (e) { box.innerHTML = '<div class="empty" style="padding-top:40vh">Map library could not load.</div>'; return; }
  if (!box.isConnected) return;
  drop();
  map = Lf.map(box, { ...MAP_OPTS, zoomControl: false, attributionControl: true, fadeAnimation: false, zoomAnimation: true, markerZoomAnimation: false });
  Lf.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  layer = Lf.layerGroup().addTo(map); meLayer = Lf.layerGroup().addTo(map);
  const lab = () => box.classList.toggle('labels', map.getZoom() >= 15); map.on('zoomend', lab);
  map.on('click', () => closeSheet());
  draw(true); lab();
  if (!me && hereNow()) me = hereNow();
  startWatch();
}
// Live position while the route screen is open: the blue dot follows you; in auto mode the order is redone after 150 m.
function startWatch() {
  if (watchId !== null || !navigator.geolocation) return;
  watchId = navigator.geolocation.watchPosition((p) => {
    const np = { lat: p.coords.latitude, lng: p.coords.longitude };
    const moved = !orderedAt || km(orderedAt, np) > LIVE_REORDER_KM;
    me = np; setHere({ ...np, acc: Math.round(p.coords.accuracy) }); drawMe();
    if (routeMode() === 'auto' && moved) { orderedAt = np; update(); }
  }, () => {}, { enableHighAccuracy: true, maximumAge: 30000, timeout: 30000 });
}
function stopWatch() { if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId); watchId = null; }
export function drop() { stopWatch(); if (map) { try { lastView = { c: map.getCenter(), z: map.getZoom() }; map.off(); map.remove(); } catch (e) {} } map = null; layer = null; meLayer = null; }
export function update() { const top = document.querySelector('.route .rtop'); if (top) { const tmp = document.createElement('div'); tmp.innerHTML = routeHtml(); top.replaceWith(tmp.querySelector('.rtop')); } draw(false); if (document.querySelector('#rsheet.list')) listSheet(true); }
function drawMe() { if (!map || !me) return; meLayer.clearLayers(); Lf.marker([me.lat, me.lng], { icon: Lf.divIcon({ className: '', html: '<div class="me-pin"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(meLayer); }
function draw(fit) {
  if (!map) return;
  const m = model(); const st = stopsFor(m);
  const seq = ordered(st.withGps); const num = new Map(seq.map((s, i) => [s.id, i + 1]));
  layer.clearLayers(); const pts = [];
  const shown = st.withGps.filter((s) => filter === 'all' || s.kinds.includes(filter));
  for (const s of shown) {
    const g = s.x.c.gps; pts.push([g.lat, g.lng]);
    const k = s.done ? 'done' : s.main; const n = num.get(s.id);
    const html = `<div class="stop-pin ${KIND[k].cls} ${k === 'collect' ? 'pulse' : ''}"><div class="b"><span>${s.done ? '✓' : n || '•'}</span></div><div class="lab">${esc((s.x.c.name || '').split(' ')[0])} · ${esc(toleOf(s.x.c))}</div></div>`;
    const mk = Lf.marker([g.lat, g.lng], { icon: Lf.divIcon({ className: '', html, iconSize: [34, 34], iconAnchor: [17, 34] }), zIndexOffset: s.done ? 0 : 1000 - (n || 0) });
    mk.on('click', () => sheet(s, n));
    layer.addLayer(mk);
  }
  if (seq.length > 1 && filter === 'all') Lf.polyline(seq.map((s) => [s.p.lat, s.p.lng]), { color: '#1f6fb2', weight: 3, opacity: 0.45, dashArray: '6 8' }).addTo(layer);
  const nx = document.getElementById('rNext'); const first = seq[0];
  if (nx) nx.innerHTML = first ? `🧭 Next: #1 ${esc((first.x.c.name || '').split(' ')[0])}` : '🧭 Nothing left';
  if (fit) { if (lastView) map.setView(lastView.c, lastView.z, { animate: false }); else if (pts.length) map.fitBounds(pts, { padding: [70, 70], maxZoom: 16, animate: false }); else map.setView([28.2096, 83.9856], 13, { animate: false }); }
  drawMe();
  S.routeSeq = seq; // for tests & the list
}
function sheet(s, n) {
  const x = s.x, c = x.c; closeSheet();
  const el = document.createElement('div'); el.className = 'sheet'; el.id = 'rsheet';
  const dest = c.gps ? `${c.gps.lat.toFixed(6)},${c.gps.lng.toFixed(6)}` : '';
  el.innerHTML = `<div class="grab" data-act="rClose"></div><button class="sx" data-act="rClose" title="Close">✕</button><div style="display:flex;align-items:center;gap:10px">${n ? `<span class="pill blue" style="font-size:14px">#${n}</span>` : ''}<b style="font-size:19px">${esc(c.name)}</b><span class="muted mono">${esc(c.code)}</span></div>
    <div class="muted" style="margin-top:4px">📍 ${esc(toleOf(c))} · Ward ${esc(c.ward || '–')}${c.houseDetail ? ' · ' + esc(c.houseDetail) : ''}</div>
    <div class="why">${s.kinds.map((k) => `<span class="pill" style="color:${KIND[k].color};border-color:currentColor">${esc(KIND[k].label)}</span>`).join('')}</div>
    <div class="muted" style="margin-top:6px">${s.why.map(esc).join(' · ')}</div>
    <div class="acts2">
      ${dest ? `<a href="${esc(dirUrl(dest))}" data-nav="${esc(dest)}" target="_blank" rel="noopener"><span class="i">🧭</span>Navigate</a>` : ''}
      <a href="tel:${esc(c.phone)}"><span class="i">📞</span>Call</a>
      <a href="${esc(waLink(c.phone, x.dn ? dunText(x) : ''))}" target="_blank" rel="noopener"><span class="i">💬</span>WhatsApp</a>
      ${can('visit') && c.phone ? `<button data-omw="${esc(c.id)}"><span class="i">🛵</span>On my way</button>` : ''}
      <button data-go-form="visit" data-cid="${esc(c.id)}"><span class="i">🔧</span>Visit</button>
      <button data-go-form="payment" data-cid="${esc(c.id)}"><span class="i">💵</span>Pay</button>
      <button data-go-form="request" data-cid="${esc(c.id)}"><span class="i">📋</span>Request</button>
      <button data-cust="${esc(c.id)}"><span class="i">👤</span>Open</button>
      <button data-act="rClose"><span class="i">✕</span>Close</button>
    </div>${can('visit') ? omwChips(c) : ''}`;
  document.body.appendChild(el);
}
export function closeSheet() { const el = document.getElementById('rsheet'); if (el) el.remove(); }
function listSheet(keep) {
  const old = document.getElementById('rsheet'); const scroll = old && keep ? old.querySelector('.rl').scrollTop : 0;
  if (keep && !(old && old.classList.contains('list'))) return;
  closeSheet(); const seq = S.routeSeq || []; const auto = routeMode() === 'auto';
  const el = document.createElement('div'); el.className = 'sheet list'; el.id = 'rsheet';
  const total = seq.length ? routeKm(seq.map((s) => ({ p: s.p })), me) : 0;
  el.innerHTML = `<div class="grab" data-act="rClose"></div><button class="sx" data-act="rClose" title="Close">✕</button>
    <div class="rl-h"><b style="font-size:18px">Today's order</b> <span class="muted">${seq.length} stops · ≈${total.toFixed(1)} km straight-line</span></div>
    <div class="rl-mode">${auto ? '<span class="on">📡 Auto — redone from where you are as you move</span>' : '<span class="man">✋ Your own order</span><button class="btn small ghost" data-act="rAuto">📡 Back to auto</button>'}</div>
    <div class="muted" style="font-size:12px;margin:4px 0 8px">▲▼ move a stop · 📌 go there next · tap a name to open. Changing the order switches to your own order.</div>
    <div class="card flush rl">${seq.map((s, i) => `<div class="item rl-i"><span class="pill blue">#${i + 1}</span><div class="main" data-cust="${esc(s.id)}"><div class="t">${esc(s.x.c.name)}</div><div class="s">${esc(toleOf(s.x.c))} · ${s.why.map(esc).join(' · ')}</div></div>
      <div class="ord"><button data-rmove="${esc(s.id)}|-1" ${i === 0 ? 'disabled' : ''} title="Up">▲</button><button data-rmove="${esc(s.id)}|1" ${i === seq.length - 1 ? 'disabled' : ''} title="Down">▼</button><button data-rnext="${esc(s.id)}" ${i === 0 ? 'disabled' : ''} title="Go there next">📌</button></div></div>`).join('') || '<div class="empty">No stops</div>'}</div>`;
  document.body.appendChild(el);
  if (scroll) el.querySelector('.rl').scrollTop = scroll;
}
function setManual(ids) { lsSet(modeKey(), 'manual'); lsSet(dayKey(), { ids, at: Date.now() }); }
function moveStop(id, d) {
  const ids = (S.routeSeq || []).map((s) => s.id); const i = ids.indexOf(id); const j = d === 'next' ? 0 : i + d;
  if (i < 0 || j < 0 || j >= ids.length || i === j) return;
  ids.splice(j, 0, ids.splice(i, 1)[0]); setManual(ids); update(); listSheet(true);
}
function toAuto() { lsSet(modeKey(), 'auto'); lsSet(dayKey(), null); orderedAt = me; update(); listSheet(true); toast(`📡 Auto order from ${me ? 'your location' : 'the first stop'}`); }
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && document.getElementById('rsheet')) closeSheet(); });
document.addEventListener('click', (ev) => {
  const f = ev.target.closest('[data-rfilter]'); if (f) { filter = f.dataset.rfilter; update(); return; }
  const mv = ev.target.closest('[data-rmove]'); if (mv) { const [id, d] = mv.dataset.rmove.split('|'); moveStop(id, Number(d)); return; }
  const nx = ev.target.closest('[data-rnext]'); if (nx) { moveStop(nx.dataset.rnext, 'next'); return; }
  const a = ev.target.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act;
  if (act === 'rClose') closeSheet();
  else if (act === 'rAuto') toAuto();
  else if (act === 'rOrder') {
    const run = () => { if (me) setHere(me); lsSet(modeKey(), 'auto'); lsSet(dayKey(), null); const seq = ordered(stopsFor(model()).withGps); lsSet(dayKey(), { ids: seq.map((s) => s.id), at: Date.now() }); draw(false); toast(`🔢 ${seq.length} stops ordered from ${me ? 'your location' : 'the first stop'} · ≈${routeKm(seq, me).toFixed(1)} km`); };
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition((p) => { me = { lat: p.coords.latitude, lng: p.coords.longitude }; run(); }, run, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }); else run();
  } else if (act === 'rNext') { const s = (S.routeSeq || [])[0]; if (s) openDirections(`${s.p.lat.toFixed(6)},${s.p.lng.toFixed(6)}`, '', { note: (x) => toast(x, 4000), offer: offerLink }); } // starts from where you stand, not Google's guess
  else if (act === 'rMe') { if (!navigator.geolocation) { toast('No location on this phone'); return; } navigator.geolocation.getCurrentPosition((p) => { me = { lat: p.coords.latitude, lng: p.coords.longitude }; setHere({ ...me, acc: Math.round(p.coords.accuracy) }); drawMe(); if (map) map.setView([me.lat, me.lng], 15); }, () => toast('Location not available'), { enableHighAccuracy: true, timeout: 15000 }); }
  else if (act === 'rList') listSheet();
});
