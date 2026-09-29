// KORA Field — maps & location shared by the phone and the command centre.
// · Directions always start from where you really are: Google Maps without an origin guesses from the computer's
//   network (which put Jun in Kathmandu), so we ask the browser for the position first and pass origin=lat,lng.
// · Calm mouse-wheel zoom on every map (Leaflet default is 1 full zoom level per 60 px of wheel).
// No imports from app.js: this module stays side-effect free.

let Lf = null;
export function loadLeaflet() {
  if (Lf) return Promise.resolve(Lf);
  return new Promise((res, rej) => {
    if (!document.querySelector('link[data-leaflet]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = './vendor/leaflet/leaflet.css'; l.dataset.leaflet = '1'; document.head.appendChild(l); }
    if (window.L) { Lf = window.L; res(Lf); return; }
    const s = document.createElement('script'); s.src = './vendor/leaflet/leaflet.js'; s.onload = () => { Lf = window.L; res(Lf); }; s.onerror = rej; document.head.appendChild(s);
  });
}
// Leaflet 1.9 options: wheelPxPerZoomLevel (default 60 — "smaller values make wheel-zooming faster"),
// zoomSnap/zoomDelta allow quarter/half steps so one trackpad flick is not a whole level.
export const MAP_OPTS = { scrollWheelZoom: true, wheelPxPerZoomLevel: 220, wheelDebounceTime: 80, zoomSnap: 0.25, zoomDelta: 0.5 };
export const TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const POKHARA = [28.2096, 83.9856];

// ---------- where am I ----------
let here = null; // { lat, lng, acc, t }
export const hereNow = (maxAgeMs = 5 * 60e3) => (here && Date.now() - here.t < maxAgeMs ? here : null);
export function setHere(p) { if (p && Number.isFinite(p.lat)) here = { lat: p.lat, lng: p.lng, acc: p.acc || null, t: Date.now() }; }
export function getHere(maxAgeMs = 2 * 60e3, timeout = 8000) {
  const h = hereNow(maxAgeMs); if (h) return Promise.resolve(h);
  return new Promise((res) => {
    if (!navigator.geolocation) { res(null); return; }
    navigator.geolocation.getCurrentPosition((p) => { setHere({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }); res(here); },
      (e) => { getHere.lastError = e && e.code === 1 ? 'denied' : 'unavailable'; res(null); }, { enableHighAccuracy: true, timeout, maximumAge: maxAgeMs });
  });
}
// Location permission state: 'granted' · 'prompt' · 'denied' · 'unknown' (Safari/older browsers)
export async function locState() { try { return (await navigator.permissions.query({ name: 'geolocation' })).state; } catch (e) { return 'unknown'; } }
// Ask on purpose (from a button, so the browser shows its pop-up). Tells WHY it failed:
// os = the site is not blocked but the computer blocks the browser (macOS Location Services) · site = blocked for this site.
export function askLocation() {
  return new Promise((res) => {
    if (!navigator.geolocation) { res({ ok: false, why: 'none' }); return; }
    navigator.geolocation.getCurrentPosition((p) => { setHere({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }); res({ ok: true, p: here }); },
      async (e) => { const st = await locState(); res({ ok: false, why: e.code === 1 ? (st === 'denied' ? 'site' : 'os') : e.code === 2 ? 'unavailable' : 'timeout' }); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });
}
// Ask the browser only if the user already allowed it (no surprise permission pop-up on page load).
export async function hereIfAllowed() {
  try { const st = await navigator.permissions.query({ name: 'geolocation' }); if (st.state === 'granted') return getHere(); } catch (e) {}
  return null;
}
const rad = (d) => (d * Math.PI) / 180;
export function km(a, b) { const R0 = 6371, dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng); const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2; return 2 * R0 * Math.asin(Math.sqrt(h)); }

// ---------- Google Maps directions from the real position ----------
// https://developers.google.com/maps/documentation/urls/get-started#directions-action — origin/destination/waypoints/travelmode
export function dirUrl(dest, way, origin) {
  let u = `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(dest)}`;
  if (origin) u += `&origin=${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}`;
  if (way) u += `&waypoints=${encodeURIComponent(way)}`;
  return u;
}
// Click handler body.
// · Position already known (fresh) → open Google right away, inside the click (pop-up blockers allow that).
// · Not known → ask the browser first (the permission prompt must stay on this tab), then offer a real link
//   (offer(url, origin)) because the click's right to open a window may have expired while the prompt was up.
export function openDirections(dest, way, { note, offer } = {}) {
  const o = hereNow();
  if (o) { const url = dirUrl(dest, way, o); const w = window.open(url, '_blank'); if (!w && offer) offer(url, o); return Promise.resolve(url); }
  if (note) note('📍 Finding your location…');
  return getHere(60e3, 15000).then((p) => {
    if (!p && note) note(getHere.lastError === 'denied' ? '📍 Location is blocked for this site — Google will guess the start. Allow location for this site.' : '📍 Location not available — Google will guess the start.');
    const url = dirUrl(dest, way, p);
    if (offer) offer(url, p); else window.open(url, '_blank');
    return url;
  });
}

// ---------- "my location" on any Leaflet map ----------
export function drawMe(map, layer, p) {
  if (!map || !layer || !p) return; layer.clearLayers();
  if (p.acc && p.acc < 3000) Lf.circle([p.lat, p.lng], { radius: p.acc, color: '#2f8cff', weight: 1, fillColor: '#2f8cff', fillOpacity: 0.1, interactive: false }).addTo(layer);
  Lf.marker([p.lat, p.lng], { icon: Lf.divIcon({ className: '', html: '<div class="me-pin"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), zIndexOffset: 2000, interactive: false }).addTo(layer);
}
// Adds a 📍 button (Leaflet control). onFound(p) lets the caller also fit other points.
export function addLocate(map, { position = 'topright', onFound, note } = {}) {
  const meLayer = Lf.layerGroup().addTo(map);
  const C = Lf.Control.extend({
    onAdd() {
      const b = Lf.DomUtil.create('button', 'loc-btn'); b.type = 'button'; b.title = 'My location'; b.innerHTML = '📍';
      Lf.DomEvent.disableClickPropagation(b);
      Lf.DomEvent.on(b, 'click', async (ev) => {
        Lf.DomEvent.stop(ev); b.classList.add('busy');
        const p = await getHere(30e3, 10000); b.classList.remove('busy');
        if (!p) { const r = await askLocation(); if (r.ok) { drawMe(map, meLayer, r.p); if (onFound) onFound(r.p); return; } if (note) note(r.why); return; }
        drawMe(map, meLayer, p);
        if (onFound) onFound(p); else map.setView([p.lat, p.lng], Math.max(map.getZoom(), 15));
      });
      return b;
    },
  });
  new C({ position }).addTo(map);
  const h = hereNow(); if (h) drawMe(map, meLayer, h);
  return meLayer;
}

// ---------- small map on the customer page: this house only ----------
const minis = new Map(); // element → map
const miniView = new Map(); // customer id → last view (kept across re-renders)
export function dropMinis() { for (const [el, mp] of minis) { if (!el.isConnected) { try { mp.off(); mp.remove(); } catch (e) {} minis.delete(el); } } }
export async function mountMini(box, { id, lat, lng, label, note }) {
  if (!box || box._mounting) return; box._mounting = true;
  try { await loadLeaflet(); } catch (e) { box.innerHTML = '<div class="empty">Map could not load (needs internet once).</div>'; return; }
  if (!box.isConnected || box._map) return;
  dropMinis();
  const house = [lat, lng];
  const mp = Lf.map(box, { ...MAP_OPTS, zoomControl: false, attributionControl: true, fadeAnimation: false, markerZoomAnimation: false });
  box._map = mp; minis.set(box, mp);
  Lf.tileLayer(TILE, { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mp);
  Lf.control.zoom({ position: 'topright' }).addTo(mp);
  Lf.marker(house, { icon: Lf.divIcon({ className: '', html: `<div class="house-pin"><span>🏠</span></div><div class="house-lab">${String(label || '').replace(/[<>&"]/g, '')}</div>`, iconSize: [36, 44], iconAnchor: [18, 42] }), zIndexOffset: 1000 }).addTo(mp);
  const dist = box.parentElement && box.parentElement.querySelector('[data-mini-dist]');
  const showDist = (p) => { if (dist && p) { const d = km(p, { lat, lng }); dist.textContent = `📍 ${d < 1 ? Math.round(d * 1000) + ' m' : d.toFixed(1) + ' km'} from you (straight line)`; } };
  box._dist = showDist;
  addLocate(mp, { position: 'topright', note, onFound: (p) => { showDist(p); mp.fitBounds([house, [p.lat, p.lng]], { padding: [40, 40], maxZoom: 17 }); } });
  const Home = Lf.Control.extend({ onAdd() { const b = Lf.DomUtil.create('button', 'loc-btn'); b.type = 'button'; b.title = 'Back to the house'; b.innerHTML = '🏠'; Lf.DomEvent.disableClickPropagation(b); Lf.DomEvent.on(b, 'click', (ev) => { Lf.DomEvent.stop(ev); mp.setView(house, 17); }); return b; } });
  new Home({ position: 'topright' }).addTo(mp);
  const v = miniView.get(id);
  if (v) mp.setView(v.c, v.z, { animate: false }); else mp.setView(house, 17, { animate: false });
  mp.on('moveend', () => miniView.set(id, { c: mp.getCenter(), z: mp.getZoom() }));
  const h = hereNow(); if (h) showDist(h);
}
