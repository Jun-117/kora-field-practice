// KORA Field — field app + command centre, offline-first.
// Storage = Firestore offline cache (IndexedDB) + a second copy of every save (localStorage journal; photos in our own IndexedDB).
// A save counts as "arrived" only when the server confirms it. Until then the second copy is kept and re-sent.
import { initializeApp, deleteApp } from './vendor/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, connectAuthEmulator, sendPasswordResetEmail, createUserWithEmailAndPassword, initializeAuth, inMemoryPersistence, setPersistence, browserSessionPersistence, indexedDBLocalPersistence } from './vendor/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, CACHE_SIZE_UNLIMITED,
  collection, doc, setDoc, getDoc, getDocs, getDocFromServer, getDocsFromCache, onSnapshot, query, where,
  serverTimestamp, Timestamp, waitForPendingWrites, terminate, clearIndexedDbPersistence,
  limit as qLimit, writeBatch, connectFirestoreEmulator, disableNetwork, enableNetwork } from './vendor/firebase-firestore.js';
import { getStorage, ref as sRef, uploadString, getDownloadURL, deleteObject, getMetadata, connectStorageEmulator } from './vendor/firebase-storage.js';
import * as R from './logic.js';
import { initLang, setLang, getLang, locale, langSegHtml, fmtDate, fmtTime } from './i18n.js';
import * as G from './geo.js';
import * as CA from './capack.js';
import * as B from './bs.js';
import * as CAL from './cal.js';
import * as RC from './receipt.js';

document.addEventListener('input', (ev) => { const ta = ev.target && ev.target.id === 'memoTa' ? ev.target : null; if (!ta) return; lsSet('kfp_memo', ta.value.slice(0, 4000)); const h = $('#memoHint'); if (h) h.textContent = ta.value ? 'Saved on this phone' : 'Anything — it is saved as you type'; const b = document.querySelector('[data-act="memoToggle"]'); if (b) { b.classList.toggle('has', !!ta.value); b.textContent = '📝 Memo' + (ta.value ? ' ·' : ''); } }); /* v0.13.2 memo pad */
export const APP_VERSION = 'kf-v0.19.1 (2026-10-04)';
const ADMIN_EMAIL = 'koracarepokhara@gmail.com';
// v0.9.3 (Jun 2026-09-29): a backup admin address — kept here only as a SHA-256 hash so the public app code does not show it. The rules hold the real list.
const ADMIN_BACKUP_SHA256 = ['26d538c7399e96ff2b279a1ea2823fd31653cdc8290fd0e5f35ed492d1e13a17'];
export async function isAdminEmail(email) {
  const e = String(email || '').trim().toLowerCase(); if (!e) return false; if (e === ADMIN_EMAIL) return true;
  try { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(e)); return ADMIN_BACKUP_SHA256.includes([...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('')); } catch (err) { return false; }
}
const firebaseConfig = { apiKey: 'practice-no-server', authDomain: 'practice.invalid', projectId: 'kora-field-practice-none', storageBucket: 'practice.invalid', messagingSenderId: '0', appId: '1:0:web:practice' }; // PRACTICE: fake on purpose
// Local self-test/preview only (127.0.0.1 / localhost with ?demo): fake signed-in admin + demo data. Never active on the live site.
export const DEMO = true; // PRACTICE build (koracarenepal.com/kora-field-practice/): fake data only — nothing reaches the server (fake Firebase config above)
if (/[?&]reset=1/.test(location.search)) { try { Object.keys(localStorage).filter((k) => k.startsWith('kfp_')).forEach((k) => localStorage.removeItem(k)); indexedDB.deleteDatabase('kfp-photos'); } catch (e) {} location.replace(location.pathname); }
// v0.18.0 (A-1) Jun 10/4 "300가구 전까지 해야할거 다 하자": the real save → server → read-back path, against the Firebase Local Emulator Suite
// (a fake Firestore + Auth on this Mac). Only on localhost with ?emu=1 — never on the live site. The emulator run is tools/emutest.sh.
export const EMU = !DEMO && ['127.0.0.1', 'localhost'].includes(location.hostname) && /[?&]emu=1/.test(location.search);
const DEMO_KEEP = true; // the practice build turns this on: the chosen person is remembered · a start-over button · the fake world keeps living
const DEMO_LABEL = 'PRACTICE';

// Option lists — Airtable options (English names per the Phase 2 mapping) + SOP E-1/E-2/G-1 wording.
export const OPT = {
  zone: ['Zone_A', 'Zone_B', 'Zone_C'],
  ward: Array.from({ length: 33 }, (_, i) => String(i + 1)),
  tole: ['Lakeside', 'Baidam', 'Simalchaur', 'Matepani', 'Begnas', 'Chipledhunga', 'Rambazar', 'Newroad', 'Miyapatan', 'Mahendrapul', 'Prithvi', 'Sabhagriha', 'Other'],
  plan: ['Standard', 'Standard + Backup Power'],
  referral: ['Word of mouth', 'Tara_Direct', 'Jun_Direct', 'Community_event', 'Pop-up Booth', 'Instagram', 'Facebook', 'TikTok', 'Other'],
  prevWater: ['Jar (20L delivery)', 'Boiled tap', 'Bottled', 'Has purifier', 'Untreated'],
  waterSource: ['Municipal tap', 'Well / borehole', 'Tanker', 'Spring', 'Other'],
  installChecks: ['No leaks at any joint (checked twice)', 'Pump runs quietly', 'UV lamp is on', 'TDS shown to the customer', 'Contract signed (2 copies)', 'Told: next filter change in about 4 months', 'Gave our number for breakdowns'],
  firstPay: ['Received 4,900', 'Not yet'], // v0.10.2 (Jun 2026-09-29): the first day is always 4,900 — a referee's free month comes off bill 2 (🎁 apply on the customer page)
  method: ['Khalti', 'eSewa', 'Fonepay QR', 'Bank transfer', 'Cash'],
  point: ['Field visit', 'Office', 'Digital'],
  discountReason: ['Promotion', 'Referral', 'Claim compensation'],
  filters: R.FILTER_TYPES,
  ppColor: ['White', 'Brown', 'Black'],
  yesNo: ['Yes', 'No'],
  visitType: ['Routine check', 'Filter change', 'Repair', 'Sanitisation'],
  visitStatus: ['🔵 Scheduled', '🟡 In progress', '✅ Completed', '🚪 Nobody home', '🔴 Cancelled', '🟠 On hold'],
  reqType: ['Breakdown', 'Water quality', 'Leak', 'Install request', 'Claim', 'Other'],
  priority: ['Urgent', 'Normal', 'Low'],
  reqStatus: ['Received', 'In progress', 'Done', 'On hold'],
  leadOutcome: ['New', 'Thinking', 'Demo booked', 'Signed', 'Rejected'],
  recOutcome: ['In progress', 'Recovered', 'Partial', 'Failed – no contact', 'Failed – refused', 'Failed – lost or damaged'],
  yesNoUnknown: ['Yes', 'No', 'Unknown'],
  checkinKind: ['D7', 'Follow-up call', R.CHASE_KIND], /* v0.11: one call at day 7 · a follow-up when needed · payment chases (Jun 2026-09-30) */
  checkinKindLabel: { D7: 'Day-7 call' },
  result: ['OK', 'Issue found'],
  stars: ['1', '2', '3', '4', '5'],
  topic: ['Install SOP (E-1)', 'A/S SOP (E-2)', 'Field rules (G-1)', 'Cash & payments', 'App use', 'Other'],
  stockItem: ['Device', ...R.FILTER_TYPES],
  stockType: ['In', 'Out', 'Adjustment', 'Disposal', 'Issue', 'Return'],
  custStatus: ['Active', 'Paused', 'Churned'],
  expCat: ['Devices & import', 'Filters & spare parts', 'Customs, freight & clearing', 'Salaries & wages', 'Fuel & transport', 'Motorbike upkeep', 'Rent', 'Phone & internet', 'Software & subscriptions', 'Marketing & printing', 'Office supplies', 'Tools & equipment', 'Professional fees (CA, lawyer)', 'Bank & payment fees', 'Government fees & taxes', 'Training', 'Other'],
  paidFrom: ['Company bank', 'Petty cash (Tara)', 'Jun personal — reimburse', 'Wallet / card'],
  expMethod: ['Bank transfer', 'Cash', 'Fonepay QR', 'Khalti', 'eSewa', 'Card'],
  devEvent: R.DEVICE_EVENTS,
  relStatus: ['Requested', 'Scheduled', 'Done', 'Cancelled'],
  photoKind: ['House / entrance', 'Device', 'Contract', 'Receipt', 'Water / TDS', 'Other'],
  leaveReason: R.LEAVE_REASONS, lateReason: R.LATE_REASONS, noShowReason: R.NO_SHOW_REASONS, pauseReason: R.PAUSE_REASONS, noSign: R.NO_SIGN,
  evLane: ['Company', 'Customers'],
  evKindCo: ['Office closed', 'Payday', 'Deadline', 'Meeting', 'Training', 'Price change', 'Campaign', 'Other'],
  evKindCu: ['Stock arrival', 'Customer visit', 'Demo / event', 'Installation day', 'Other'],
  evRepeat: ['Once', 'Every month', 'Every Nepali month', 'Every year'],
  evStatus: ['Planned', 'Done', 'Cancelled'],
};
// ---------- permissions (Jun = admin = everything; staff get a preset, then single switches) ----------
// Server-side, firestore.rules v0.5 enforces money-sensitive ones (expenses read/write, payments/customers create);
// the rest is what the screens show. "Areas" only tidy the screens — they are not a security wall.
export const PERM_SHORT = { seeAll: 'All customers', install: 'Install', visit: 'Field', pay: 'Payments', cash: 'Cash', editCust: 'Edit', money: 'Money', expense: 'Expenses', stock: 'Stock', export: 'Download' };
export const PERMS = [
  ['seeAll', 'See every customer', 'off = only the areas ticked below'],
  ['install', 'New installs'],
  ['visit', 'Visits · requests · calls · relocations'],
  ['pay', 'Record payments'],
  ['cash', 'Take cash (only Tara)'],
  ['editCust', 'Edit any customer'],
  ['money', 'See money & reports (VAT, deposits, CA pack, history)'],
  ['expense', 'Record & see expenses'],
  ['stock', 'Stock & devices'],
  ['export', 'Download data (CSV · backup)'],
];
export const PRESETS = {
  office: { label: 'Office (all but export)', perms: { seeAll: 1, install: 1, visit: 1, pay: 1, cash: 1, editCust: 1, money: 1, expense: 1, stock: 1, export: 0 } },
  technician: { label: 'Technician', perms: { seeAll: 1, install: 1, visit: 1, pay: 1, cash: 0, editCust: 0, money: 0, expense: 0, stock: 0, export: 0 } },
  viewer: { label: 'View only', perms: { seeAll: 1, install: 0, visit: 0, pay: 0, cash: 0, editCust: 0, money: 0, expense: 0, stock: 0, export: 0 } },
};
// G-1 §1-1 names Tara as the only cash taker — so even Jun (admin) gets the warning; staff need the 'cash' switch.
export const mayTakeCash = () => !S.isAdmin && can('cash');
// v0.9 #8: the deputy admin (users/{uid}.deputy, set by Jun) has every right; only Jun changes settings, picks the deputy, and self-approves money
export const isBoss = () => S.isAdmin || !!S.isDeputy;
export function can(p) {
  if (S.isAdmin || S.isDeputy) return true;
  const pr = S.profile && S.profile.perms;
  if (!pr) return !!PRESETS.office.perms[p]; // accounts approved before v0.5 keep office rights until Jun sets them
  return !!pr[p];
}
const UV_FLOW_LIMIT = 1.2; // L/min — UV 6W verdict 2026-09-22: passes at or below 1.2
const MAX_PHOTOS = 8 /* v0.19.0 Jun 10/4 "3장 이상 업로드해도 3장밖에 안보임" — was 3 */, PHOTO_MAX_PX = 1024, PHOTO_Q = 0.6, PHOTO_MAX_CHARS = 950000;
const COLS = ['customers', 'visits', 'payments', 'requests', 'leads', 'recoveries', 'trainings', 'checkins', 'stockMoves', 'expenses', 'deviceEvents', 'relocations', 'events', 'audit', 'contractEvents', 'screenings', 'claims', 'tools', 'payroll', 'waterTests', 'milestones']; /* v0.15: milestone boards (Jun + deputy) */
const colsForMe = () => COLS.filter((c) => (c !== 'expenses' || can('expense') || can('money')) && (c !== 'audit' || isBoss()) && (c !== 'payroll' || isBoss()) && (c !== 'milestones' || !!S.isAdmin)); // the change log and payroll: Jun + deputy · the boards: Jun only (10/3 "나만 봄") and the deputy (rules too)

// ---------- Firebase ----------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager(), cacheSizeBytes: CACHE_SIZE_UNLIMITED }),
});
// v0.18.3 (B3) Jun 10/4 "2000가구여도 끄떡없게": the picture itself goes to Cloud Storage (photos/{customerId}/{photoId}.jpg); the Firestore photo
// document keeps a small thumbnail (480 px · ≤ ~110 KB) for the cards and the gallery + the Storage path. Full size = a link (download URL).
// Old documents with the whole picture inside (img) still read as before. Firebase's own guidance: files in Storage, the URL/path in Firestore.
const storage = getStorage(app);
if (EMU) { connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true }); connectFirestoreEmulator(db, '127.0.0.1', 8080); connectStorageEmulator(storage, '127.0.0.1', 9199); }
const THUMB_PX = 480, THUMB_Q = 0.6, THUMB_MAX_CHARS = 110000;
export const photoSrc = (x) => (x && (x.thumb || x.img)) || '';
function makeThumb(dataUrl) {
  return new Promise((resolve) => { if (!dataUrl || !dataUrl.startsWith('data:image/')) return resolve(''); const img = new Image();
    img.onload = () => { const k = Math.min(1, THUMB_PX / Math.max(img.naturalWidth, img.naturalHeight)); const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k)); const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); let q = THUMB_Q, d = c.toDataURL('image/jpeg', q); while (d.length > THUMB_MAX_CHARS && q > 0.2) { q -= 0.15; d = c.toDataURL('image/jpeg', q); } resolve(d.length > THUMB_MAX_CHARS ? '' : d); };
    img.onerror = () => resolve(''); img.src = dataUrl; });
}
export const storagePath = (e) => `photos/${String((e.data && e.data.customerId) || 'none').replace(/[^A-Za-z0-9_-]/g, '')}/${e.id}.${String(e.img || '').startsWith('data:application/pdf') ? 'pdf' : 'jpg'}`;

// ---------- helpers ----------
export const $ = (sel, root = document) => root.querySelector(sel);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
export const today = () => R.fmtD(new Date());
const nowLocal = () => { const d = new Date(); return `${R.fmtD(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lim = (p, ms = 4000) => Promise.race([p, sleep(ms).then(() => { throw new Error('timeout'); })]);
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
export function toast(msg, ms = 2800) {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms);
}
export function ago(ms) {
  if (!ms) return '–'; const s = (Date.now() - ms) / 1000;
  if (s < 60) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago'; return Math.round(s / 86400) + ' d ago';
}
const CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function newCode() {
  for (let i = 0; i < 80; i++) {
    let c = 'KC-'; for (let j = 0; j < 4; j++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!arr('customers').some((x) => x.code === c)) return c;
  }
  return 'KC-' + Date.now().toString(36).toUpperCase().slice(-5);
}
export function normPhone(raw) {
  const s0 = String(raw || '').trim(); let d = s0.replace(/[^\d]/g, ''); let intl = s0.startsWith('+');
  if (d.startsWith('00') && d.length >= 10) { d = d.slice(2); intl = true; } /* v0.18.4: 0082 10… = the + written the old way */
  if (d.length === 13 && d.startsWith('977')) d = d.slice(3);
  if (d.length === 11 && d.startsWith('09')) d = d.slice(1); /* v0.18.4: 09812345678 — a national 0 in front of a Nepal mobile */
  if (/^9\d{9}$/.test(d)) return '+977' + d;
  if (/^0[1-9]\d{7}$/.test(d) && !intl) return '+977' + d.slice(1); /* v0.19.0 Jun 10/4 "호텔이나 정부기관, 학교, 단체": a Nepal landline with its area code — 061-xxxxxx (Pokhara) · 01-xxxxxxx (Kathmandu) = 9 digits 🟡 NTC numbering */
  if (/^010\d{8}$/.test(d)) return '+82' + d.slice(1); /* v0.18.4 Jun 10/4 "번호 꼭 98로 아니어도 되게": a Korean mobile written as 010-xxxx-xxxx (Jun's own test phone — not shown as an example anywhere) */
  if (/^\d{8,15}$/.test(d) && !d.startsWith('977') && (intl || (d.length >= 11 && !d.startsWith('0')))) return '+' + d; /* v0.16.0 (8) Jun 10/3 "내 번호로 해보게 풀어봐": a foreign number with its country code · v0.18.4: the + may be left out (82 10…) */
  return null;
}
export const custLabel = (c) => c ? `${c.name || '(no name)'} (${c.code || '?'})` : '(unknown customer)';
export const toleOf = (c) => (c && (c.tole === 'Other' ? c.toleOther : c.tole)) || '—';
// v0.17.2 (2) Jun 10/4 — wa.me turned 🙏 into "�" (its redirect re-encodes the text: %F0%9F%99%8F → %EF%BF%BD, checked 10/4) and on the Mac every tap opened another
// browser that had to be linked again (→ "Your account on linked devices is restricted"). Phone → api.whatsapp.com/send (where wa.me sends you, minus the broken step) ·
// this computer → WhatsApp Web in one named tab (default) or the WhatsApp app (Settings → This computer — only once the company account is in the Mac app)
// v0.17.3 (5) Jun 10/4 "딱 하나로만 나오게 니가 확실히 정해봐 고정으로": a web page cannot pick the browser (a link opens in the browser KORA runs in — from
// the Dock app, in the Mac's default browser) → the one fixed place on a computer is the WhatsApp app with the company account. The Web / app choice is gone.
export const waOpenPref = () => 'app';
export const WA = { open: (url) => { location.href = url; } }; /* one door for the app links (the tests watch it) */
export const isComputer = () => { const ua = navigator.userAgent || ''; return !/Android|iPhone|iPad|iPod|Mobile/i.test(ua) && !(navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)); };
export function waUrl(phone, text, o = {}) { /* pure — the tests call it with every combination */
  const d = o.demo ? '' : String(phone || '').replace(/\D/g, ''); const q = [d ? 'phone=' + d : '', text ? 'text=' + encodeURIComponent(text) : ''].filter(Boolean).join('&');
  if (o.computer) return o.app ? 'whatsapp://send' + (q ? '?' + q : '') : 'https://web.whatsapp.com/' + (q ? 'send?' + q : '');
  return 'https://api.whatsapp.com/send' + (q ? '?' + q : '');
}
export const waLink = (phone, text, demo = DEMO) => waUrl(phone, text, { demo, computer: isComputer(), app: waOpenPref() === 'app' }); /* v0.17.0 (9) E2: practice opens WhatsApp without a number — the demo numbers look like real people's */
// ---- 🛵 "On my way" (v0.8 #7): a WhatsApp before leaving; stamped on the visit when it is saved (omwAt) so the desk can compare wasted trips with and without it
const OMW = 'kfp_omw';
export const OMW_ETAS = [10, 20, 30, 45, 60];
// v0.17.2 (2) Jun 10/4 "뭔가 좀 스팸같음": one language per customer (customer → "WhatsApp messages in"; empty = Settings default, Nepali) · no emoji. Nepali checked by Tara 10/4 — editable in Settings → WhatsApp messages.
export const MSG_LANGS = ['Nepali', 'English', 'Both'];
// v0.17.2 (6) Jun 10/4 "정수기 시리얼넘버를 우리가 만들어서 붙이거나 기록해야하는데 그거 자체적으로 메뉴얼이나 방법,계획 없음": KORA's own device numbers KD-YY-NNNN
// (D = device — customer codes are KC-…) · a sticker at the arrival check (PI: within 14 days) · the install picks from stock · a number is never used twice (manual E-3)
export const SERIAL_RE = /^KD-(\d{2})-(\d{4})$/;
export function nextSerials(n = 1, at = today(), also = []) {
  const yy = String(at).slice(2, 4); const seen = new Set(also.map(R.normSerial));
  for (const d of model().devices || []) seen.add(d.serial);
  for (const c of S.D.customers.values()) if (c.deviceSerial) seen.add(R.normSerial(c.deviceSerial));
  let max = 0; for (const s of seen) { const m = SERIAL_RE.exec(s); if (m && m[1] === yy) max = Math.max(max, Number(m[2])); }
  return Array.from({ length: Math.max(1, Math.min(500, Number(n) || 1)) }, (_, i) => `KD-${yy}-${String(max + 1 + i).padStart(4, '0')}`);
}
export const stockSerials = () => (model().devices || []).filter((d) => d.status === 'In stock').map((d) => d.serial);
export const msgLang = (c) => (MSG_LANGS.includes(c && c.msgLang) ? c.msgLang : MSG_LANGS.includes(S.settings && S.settings.msgLang) ? S.settings.msgLang : 'Nepali');
const bi = (c, en, ne) => { const l = msgLang(c); return l === 'English' ? en : l === 'Both' ? en + '\n\n' + ne : ne; };
// v0.17.0 (8) visit-note buttons — "English | नेपाली", one per line (Settings → 📝 Visit note) · Nepali checked by Tara 10/4
export const VISIT_LINES_DEFAULT = ['No leak — checked | चुहावट छैन — जाँच गरियो', 'Leak fixed (O-ring) | चुहावट मर्मत गरियो (ओ-रिङ)', 'PP filter colour checked — still fine | PP फिल्टरको रङ जाँचियो — अझै ठीक छ', 'UF backwashed | UF ब्याकवास गरियो', 'A part is needed — we will come back | पार्टपुर्जा चाहिन्छ — हामी फेरि आउँछौं', 'Weak flow — we check it at the next visit | पानी कम आउँछ — अर्को भ्रमणमा जाँच्छौं'];
export function visitLines() { const raw = String(S.settings.visitLines || '').trim(); const ls = (raw ? raw.split('\n') : VISIT_LINES_DEFAULT).map((l) => { const [en, ...ne] = l.split('|'); return { en: String(en || '').trim().slice(0, 80), ne: ne.join('|').trim().slice(0, 90) }; }).filter((x) => x.en); return ls.slice(0, 12); }
export const MSG_DEFAULTS = {
  omwEn: 'Namaste {name} ji, this is {tech} from KORA CARE. I am on my way for your water purifier visit — about {eta} minutes. If now is not a good time, reply here.',
  omwNe: 'नमस्ते {name} जी, म KORA CARE बाट {tech}। तपाईंको पानी प्युरिफायर भ्रमणका लागि आउँदैछु — करिब {eta} मिनेटमा। अहिले मिल्दैन भने यहीँ जवाफ दिनुहोस्।',
  missEn: 'Namaste {name} ji, KORA CARE came today at {time} for your water purifier visit, but nobody was home. We will come again on {retry}. If another day is better, reply here.',
  missNe: 'नमस्ते {name} जी, KORA CARE आज {time} मा तपाईंको पानी प्युरिफायर भ्रमणका लागि आएको थियो, तर घरमा कोही हुनुहुन्नथ्यो। हामी फेरि {retry} मा आउँछौं। अर्को दिन मिल्छ भने यहीँ जवाफ दिनुहोस्।',
  nextEn: 'Namaste {name} ji, this is {tech} from KORA CARE. We plan to come tomorrow ({date}) for your water purifier visit. If tomorrow does not suit, reply here and we will pick another day.',
  nextNe: 'नमस्ते {name} जी, म KORA CARE बाट {tech}। भोलि ({date}) तपाईंको पानी प्युरिफायर भ्रमणका लागि आउने योजना छ। भोलि मिल्दैन भने यहीँ जवाफ दिनुहोस्, अर्को दिन मिलाउँछौं।',
  confEn: 'Namaste {name} ji, KORA CARE here. Your purifier installation is on {date} — is that still fine? Reply here if you need another day.',
  confNe: 'नमस्ते {name} जी, KORA CARE। तपाईंको प्युरिफायर जडान {date} मा छ — ठीक छ? अर्को दिन चाहिए यहीँ जवाफ दिनुहोस्।',
};
export const nextText = (c, date) => { const o = { name: firstName(c), tech: myName() || 'KORA CARE', date }; return bi(c, fillMsg(msgT('nextEn'), o), fillMsg(msgT('nextNe'), o)); }; /* v0.14 (#4): the evening-before notice */
export const confText = (c, date) => { const o = { name: firstName(c), date }; return bi(c, fillMsg(msgT('confEn'), o), fillMsg(msgT('confNe'), o)); }; /* v0.14 (#4): 3-day confirm for a booked install */
const fillMsg = (tpl, o) => String(tpl).replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));
const firstName = (c) => String((c && c.name) || '').trim().split(/\s+/)[0] || '';
const msgT = (k) => (S.settings && String(S.settings[k] || '').trim()) || MSG_DEFAULTS[k];
export const omwText = (c, eta) => { const o = { name: firstName(c), tech: myName() || 'KORA CARE', eta }; return bi(c, fillMsg(msgT('omwEn'), o), fillMsg(msgT('omwNe'), o)); };
export const missText = (c, v) => { const ms = (v.savedAt && v.savedAt.t) || v.savedAtT || v._localT || Date.now(); const o = { name: firstName(c), time: new Date(ms).toTimeString().slice(0, 5), retry: v.retryDate || '' }; return bi(c, fillMsg(msgT('missEn'), o), fillMsg(msgT('missNe'), o)); };
// v0.11.1 (#3) a payment reminder sent by WhatsApp is remembered on this phone (per home, per day) — the list shows "sent HH:MM" and drops that home to the bottom
const REM = 'kfp_rem';
export function remMark(cid) { const m = lsGet(REM, {}); for (const k of Object.keys(m)) if (!m[k] || m[k].day !== today()) delete m[k]; m[cid] = { at: Date.now(), day: today() }; lsSet(REM, m); }
export function remSent(cid) { const r = lsGet(REM, {})[cid]; return r && r.day === today() ? r : null; }
export function omwMark(cid, eta) { const m = lsGet(OMW, {}); for (const k of Object.keys(m)) if (!m[k] || Date.now() - m[k].at > 2 * 864e5) delete m[k]; m[cid] = { at: Date.now(), day: today(), eta: Number(eta) || null, by: myName() }; lsSet(OMW, m); }
export const omwFor = (cid, day) => { const e = lsGet(OMW, {})[cid]; return e && e.day === day ? e : null; };
const omwClear = (cid) => { const m = lsGet(OMW, {}); if (m[cid]) { delete m[cid]; lsSet(OMW, m); } };
export const omwBtn = (c, cls = '') => (c && c.phone ? `<button type="button" class="${cls}" data-omw="${esc(c.id)}">🛵 On my way</button>` : '');
export const omwChips = (c) => (c && c.phone ? `<div class="omw-eta hidden" id="omw_${esc(c.id)}"><span class="muted">Arriving in about</span>${OMW_ETAS.map((n) => `<a class="chip" href="${esc(waLink(c.phone, omwText(c, n)))}" target="_blank" rel="noopener" data-omw-sent="${esc(c.id)}" data-eta="${n}">${n} min</a>`).join('')}${(() => { const e = omwFor(c.id, today()); return e ? `<span class="pill ok">sent ${new Date(e.at).toTimeString().slice(0, 5)}</span>` : ''; })()}</div>` : '');

// ---------- state ----------
export const S = {
  user: null, role: null, isAdmin: false, profile: {},
  D: Object.fromEntries(COLS.map((c) => [c, new Map()])), settings: {},
  unsub: [], lastServer: lsGet('kfp_last_server', 0), listenErr: '', ver: 0,
  route: { tab: 'today', screen: 'today', params: {} },
  storageOk: true, swWaiting: null, formPhotos: [], desk: false, drawer: null, drawerStack: [], staleDesk: false,
};
export const arr = (col) => [...S.D[col].values()];
const bump = () => { S.ver++; };

// ---------- photo second copy (own IndexedDB, kept until the server has the photo) ----------
let pdbP = null;
function photoDb() {
  if (!pdbP) pdbP = new Promise((res, rej) => {
    const r = indexedDB.open('kfp-photos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('p');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return lim(pdbP);
}
async function photoOp(mode, fn) {
  try {
    const d = await photoDb();
    return await lim(new Promise((res, rej) => {
      const tx = d.transaction('p', mode); const st = tx.objectStore('p'); let out;
      const r = fn(st); if (r) r.onsuccess = () => { out = r.result; };
      tx.oncomplete = () => res(out === undefined ? true : out); tx.onerror = () => rej(tx.error);
    }));
  } catch (e) { return null; }
}
const photoPut = (id, v) => photoOp('readwrite', (st) => st.put(v, id));
export const photoGet = (id) => photoOp('readonly', (st) => st.get(id)).then((v) => (typeof v === 'string' && v.startsWith('data:') ? v : null)); /* v0.17.3 (1) Jun 10/4 "여전히 사진 3장 업로드해도 안된다": a copy already dropped (the server has the photo) came back as true — photoOp's "done" value — and the card took true for a photo */
const photoDel = (id) => photoOp('readwrite', (st) => st.delete(id));

// v0.16: the payment QR as a crisp 320px square PNG (contain on white) for settings/app.coQr
function shrinkQr(file, px = 320) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = px; c.height = px; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, px, px);
      const k = Math.min(px / img.naturalWidth, px / img.naturalHeight); const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k); g.drawImage(img, (px - w) / 2, (px - h) / 2, w, h); URL.revokeObjectURL(url);
      const d = c.toDataURL('image/png'); d.length > 120000 ? reject(new Error('QR picture too detailed — crop it to the QR')) : resolve(d);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('cannot read this picture')); };
    img.src = url;
  });
}
// v0.15: a small square JPEG for the staff photo on the customer cards (≤ ~12 KB in the users doc)
function shrinkAvatar(file, px = 160) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const s = Math.min(img.naturalWidth, img.naturalHeight); const sx = (img.naturalWidth - s) / 2, sy = (img.naturalHeight - s) / 2;
      const c = document.createElement('canvas'); c.width = px; c.height = px; c.getContext('2d').drawImage(img, sx, sy, s, s, 0, 0, px, px); URL.revokeObjectURL(url);
      let q = 0.82, d = c.toDataURL('image/jpeg', q); while (d.length > 24000 && q > 0.3) { q -= 0.1; d = c.toDataURL('image/jpeg', q); }
      resolve(d);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('cannot read this photo')); };
    img.src = url;
  });
}
function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const k = Math.min(1, PHOTO_MAX_PX / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url);
      let q = PHOTO_Q, d = c.toDataURL('image/jpeg', q);
      while (d.length > PHOTO_MAX_CHARS && q > 0.2) { q -= 0.15; d = c.toDataURL('image/jpeg', q); }
      d.length > PHOTO_MAX_CHARS ? reject(new Error('photo too big')) : resolve({ img: d, w, h, chars: d.length });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('cannot read this photo')); };
    img.src = url;
  });
}

// ---------- journal (second copy of every save) ----------
const JKEY = 'kfp_journal_v1';
export const jLoad = () => lsGet(JKEY, []);
function jSave(list) {
  const cutoff = Date.now() - 14 * 864e5;
  list = list.filter((e) => e.state !== 'done' || e.t > cutoff).slice(-1500);
  const ok = lsSet(JKEY, list); S.storageOk = ok; return ok;
}
function jPut(entry) { const l = jLoad(); const i = l.findIndex((x) => x.key === entry.key); if (i >= 0) l[i] = { ...entry, isNew: l[i].isNew || entry.isNew, data: { ...l[i].data, ...entry.data } }; else l.push(entry); return jSave(l); } // PRACTICE: edits add up
function jMark(key, state, err) {
  const l = jLoad(); const e = l.find((x) => x.key === key); if (!e || e.state === state) return;
  e.state = state; e.err = err || ''; if (state === 'done') e.doneAt = Date.now(); jSave(l);
}
const myJournal = () => jLoad().filter((e) => S.user && e.uid === S.user.uid);
function payloadOf(e) {
  const p = { ...e.data, updatedAt: serverTimestamp(), updatedBy: e.uid };
  if (e.isNew) { p.createdAt = serverTimestamp(); p.createdBy = e.uid; }
  return p;
}
async function sendEntry(e, img) {
  if (DEMO) return; // preview: keep everything on this device
  const p = payloadOf(e);
  if (e.photo) {
    img = img || await photoGet(e.id);
    if (!img) { jMark(e.key, 'rejected', 'photo copy missing on this phone'); refreshChrome(); return; }
    const path = storagePath({ ...e, img }); /* v0.18.3 (B3): the file → Storage first (needs the network; a failed upload stays "pending" and is tried again), then the small document */
    try { await uploadString(sRef(storage, path), img, 'data_url'); } catch (err) { jMark(e.key, err && err.code === 'storage/unauthorized' ? 'rejected' : 'pending', err && err.code); refreshChrome(); return; }
    p.st = path; p.thumb = await makeThumb(img); p.bytes = Math.round(img.length * 0.75); delete p.img;
  }
  setDoc(doc(db, e.path), p, { merge: !e.isNew })
    .then(() => { jMark(e.key, 'done'); if (e.photo) photoDel(e.id); refreshChrome(); hbSoon(); })
    .catch((err) => {
      const col = e.path.split('/')[0]; const amt = Number((e.data || {})[col === 'payments' ? 'discount' : 'depositRefunded']) || 0;
      if (err && err.code === 'permission-denied' && (col === 'payments' || col === 'recoveries') && amt > 0 && e.data.approval !== 'Pending' && !e.pendRetry) {
        // the server's limit is lower than this phone knew → send it again as "waiting for an OK" (once)
        e.pendRetry = true; e.data = { ...e.data, approval: 'Pending', approvedBy: '', approvedByUid: '', approvedAt: '', approvedAmount: null }; jPut(e);
        const cur = S.D[col] && S.D[col].get(e.id); if (cur) S.D[col].set(e.id, { ...cur, approval: 'Pending' }); bump(); sendEntry(e); return;
      }
      jMark(e.key, (err && err.code === 'permission-denied') ? 'rejected' : 'pending', err && err.code); refreshChrome(); hbSoon(); });
}
// Save = journal copy first, then Firestore (phone at once, server when online). Also updates the in-memory data right away.
// New field records carry where and when they were saved (only if location is already allowed — never asks, never tracks in between).
const PLACE_COLS = new Set(['visits', 'payments', 'customers', 'requests', 'checkins', 'recoveries', 'relocations', 'deviceEvents', 'leads']);
function stampPlace(col, data) {
  if (!PLACE_COLS.has(col)) return data;
  const h = G.hereNow(10 * 60e3);
  return h ? { ...data, savedAt: { lat: Number(h.lat.toFixed(5)), lng: Number(h.lng.toFixed(5)), acc: h.acc ? Math.round(h.acc) : null, t: Date.now() } } : { ...data, savedAtT: Date.now() };
}
let FIELD_L = null;
export function fieldLabel(col, k) { /* v0.17.0 (1) A6 */
  if (!FIELD_L) { FIELD_L = {}; for (const f of Object.values(FORMS)) { let sp = []; try { sp = (typeof f.spec === 'function' ? f.spec() : f.spec) || []; } catch (e) { sp = []; } for (const q of sp) if (q && q.k && q.l) { if (!FIELD_L[(f.col || '') + '|' + q.k]) FIELD_L[(f.col || '') + '|' + q.k] = q.l; if (!FIELD_L['|' + q.k]) FIELD_L['|' + q.k] = q.l; } } }
  const own = { techNames: 'Technician names', perms: 'Rights', toles: 'Areas', role: 'Account status', fullName: 'Full name' };
  return FIELD_L[(col || '') + '|' + k] || own[k] || FIELD_L['|' + k] || String(k).replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().replace(/\b(tds|gps|vat|pan|pp|uf|cto|uv|id|qr)\b/g, (x) => x.toUpperCase()).replace(/^./, (c) => c.toUpperCase());
}
// ---- change log (v0.8 security): every edit of a saved record leaves one append-only entry (who · when · field: before → after) — the admin reads it
const AUDIT_SKIP = new Set(['updatedAt', 'updatedBy', 'createdAt', 'createdBy', '_pending', '_localT', 'savedAt', 'savedAtT', 'id']);
const auditVal = (v) => { if (v === undefined || v === null || v === '') return ''; if (Array.isArray(v)) v = v.map((x) => (x && typeof x === 'object' ? JSON.stringify(x) : x)).join(', '); else if (typeof v === 'object') v = v.toMillis ? new Date(v.toMillis()).toISOString() : JSON.stringify(v); const t = String(v); return t.length > 120 ? t.slice(0, 117) + '…' : t; };
export function auditDiff(prev, data) {
  const fields = []; const before = {}; const after = {};
  for (const k of Object.keys(data)) { if (AUDIT_SKIP.has(k)) continue; const a = auditVal(prev[k]), b = auditVal(data[k]); if (a !== b) { fields.push(k); before[k] = a; after[k] = b; } }
  return fields.length ? { fields: fields.slice(0, 60), before, after } : null;
}
function auditLog(col, docId, prev, data) {
  if (col === 'audit' || col === 'photos') return; const d = auditDiff(prev || {}, data); if (!d) return;
  save(`audit/${newId('audit')}`, { col, docId, customerId: (prev && prev.customerId) || data.customerId || (col === 'customers' ? docId : ''), ...d, by: myName(), at: new Date().toISOString() }, true);
}
// v0.18.2 (B1) Jun 10/4 "1000가구,2000가구여도 끄떡없게": every record that belongs to a customer carries live:true; once the customer has left AND the
// recovery case is closed (or 60 days passed), the desk flips them to live:false → staff phones stop downloading them (their query = live == true).
// The desk (admin / deputy) still loads everything. The phone keeps copies it already had; "Reload all" drops them.
const LIVE_COLS = new Set(['visits', 'payments', 'checkins', 'requests', 'recoveries', 'relocations', 'contractEvents', 'waterTests']);
export function save(path, data, isNew, img) {
  const parts = path.split('/'); const id = parts[parts.length - 1]; const col = parts[0];
  if (isNew && parts.length === 2) data = stampPlace(col, data);
  if (parts.length === 2 && LIVE_COLS.has(col) && data && !('live' in data)) { const cid = data.customerId || (S.D[col].get(id) || {}).customerId; const c = cid && S.D.customers.get(cid); data = { ...data, live: !(c && c.status === 'Churned' && col !== 'recoveries') }; } /* a recovery case of a churned home stays live until it is closed */
  if (!isNew && parts.length === 2 && S.D[col] && S.D[col].has(id)) auditLog(col, id, S.D[col].get(id), data);
  const e = { key: path, path, id, data, isNew, uid: S.user.uid, state: 'practice', t: Date.now(), err: '', photo: !!img };
  const ok = jPut(e);
  if (img) photoPut(id, img);
  if (parts.length === 2 && S.D[col]) {
    const prev = S.D[col].get(id) || {};
    S.D[col].set(id, { ...prev, ...data, id, _pending: false, createdBy: prev.createdBy || S.user.uid, updatedBy: S.user.uid, _localT: Date.now() });
    bump();
  }
  sendEntry(e, img);
  return ok;
}
const newId = (col) => doc(collection(db, col)).id;
function savePhotos(customerId, parent, kind) {
  const n = S.formPhotos.length;
  S.formPhotos.forEach((ph, i) => {
    save(`photos/${newId('photos')}`, { customerId, parent, kind, n: i + 1, w: ph.w, h: ph.h, chars: ph.chars, date: today(), ...(ph.role ? { role: ph.role } : {}) }, true, ph.img); /* v0.19.0 (4): role */
  });
  S.formPhotos = []; return n;
}

let reconciling = false;
async function reconcile(manual) {
  if (reconciling || !S.user || !navigator.onLine || S.role === 'pending' || DEMO) return;
  reconciling = true;
  try {
    const pend = myJournal().filter((e) => e.state === 'pending' && (manual || Date.now() - e.t > 20000));
    if (pend.length) {
      await Promise.race([waitForPendingWrites(db).catch(() => {}), sleep(15000)]);
      for (const e of pend) {
        try {
          const s = await getDocFromServer(doc(db, e.path));
          if (s.exists() && (e.isNew || !e.data || Object.keys(e.data).every((k) => JSON.stringify(s.get(k)) === JSON.stringify(e.data[k])))) { jMark(e.key, 'done'); if (e.photo) photoDel(e.id); }
          else if (!e.isNew && s.exists() && s.get('updatedBy') && s.get('updatedBy') !== e.uid && s.get('updatedAt') && s.get('updatedAt').toMillis && s.get('updatedAt').toMillis() > e.t) { jMark(e.key, 'rejected', 'someone else saved this record after your edit — open it again and re-do your change'); } /* v0.11.1 (#14): no silent overwrite */
          else sendEntry(e);
        } catch (err) { if (err && err.code === 'permission-denied') jMark(e.key, 'rejected', err.code); }
      }
    }
  } finally { reconciling = false; refreshChrome(); hbSoon(); }
  if (S.desk) liveSweep(false).catch(() => {}); /* v0.18.2 (B1) */
}

// v0.18.2 (B1): the desk's housekeeping — ① records of customers who left AND whose recovery is closed (or 60 days passed) → live:false
// ② records from before v0.18.2 (no live field) of customers still with us → live:true (one-off backfill, in chunks). Once an hour, admin / deputy, online.
const REC_CLOSED = (r) => r.outcome && r.outcome !== 'In progress';
export function liveSweepPlan(t = today()) {
  const off = [], on = [];
  for (const c of S.D.customers.values()) {
    const churned = c.status === 'Churned'; const recs = [...S.D.recoveries.values()].filter((r) => r.customerId === c.id);
    const closed = churned && (recs.some(REC_CLOSED) || (R.isDate(c.churnDate) && R.daysBetween(c.churnDate, t) >= 60));
    for (const col of LIVE_COLS) for (const x of S.D[col].values()) { if (x.customerId !== c.id || x._pending) continue;
      if (closed && x.live !== false) off.push(`${col}/${x.id}`); else if (!churned && x.live !== true) on.push(`${col}/${x.id}`); }
  }
  return { off, on };
}
let liveSweepAt = 0;
export async function liveSweep(force) {
  if (DEMO || !isBoss() || !navigator.onLine || (!force && Date.now() - liveSweepAt < 3600e3)) return null; liveSweepAt = Date.now();
  const plan = liveSweepPlan(); const all = [...plan.off.map((p) => [p, false]), ...plan.on.map((p) => [p, true])]; let n = 0;
  for (let i = 0; i < all.length; i += 400) { const b = writeBatch(db); for (const [p, live] of all.slice(i, i + 400)) b.update(doc(db, p), { live, updatedAt: serverTimestamp(), updatedBy: S.user.uid }); await b.commit(); n += Math.min(400, all.length - i); }
  for (const [p, live] of all) { const [col, id] = p.split('/'); const x = S.D[col].get(id); if (x) S.D[col].set(id, { ...x, live }); }
  if (n) bump(); return { off: plan.off.length, on: plan.on.length };
}
// ---------- data: phone cache first, then only what changed on the server ----------
const toObj = (d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }), _pending: d.metadata.hasPendingWrites });
const sinceKey = (col) => `kfp_since_${S.user.uid}_${col}`;
export const AUDIT_DAYS = 90;
export async function auditOlder() { /* v0.18.1 (B4): one more 90-day slice of the change log from the server (into memory for this session) */
  const to = S.auditFloor || Date.now() - AUDIT_DAYS * 864e5; const from = to - AUDIT_DAYS * 864e5;
  const snap = await getDocs(query(collection(db, 'audit'), where('updatedAt', '>', Timestamp.fromMillis(from)), where('updatedAt', '<=', Timestamp.fromMillis(to))));
  snap.forEach((d) => S.D.audit.set(d.id, toObj(d))); S.auditFloor = from; bump(); return snap.size;
}
async function startData(full) {
  S.unsub.forEach((u) => u()); S.unsub = [];
  await Promise.all(colsForMe().map(async (col) => {
    try { (await getDocsFromCache(!isBoss() && LIVE_COLS.has(col) ? query(collection(db, col), where('live', '==', true)) : collection(db, col))).forEach((d) => S.D[col].set(d.id, toObj(d))); } catch (e) { S.listenErr = 'cache: ' + (e.code || e.message); } /* v0.18.2 (B1): a staff phone's cache copy is filtered the same way */
  }));
  bump(); scheduleRender();
  for (const col of colsForMe()) {
    const sinceMs = full ? 0 : lsGet(sinceKey(col), 0);
    const floor = col === 'audit' ? Date.now() - AUDIT_DAYS * 864e5 : 0; /* v0.18.1 (B4): the change log is append-only and grows for ever → the desk follows the last 90 days; older = "Load older" on the Change log page */
    const q = !isBoss() && LIVE_COLS.has(col) ? query(collection(db, col), where('live', '==', true), where('updatedAt', '>', Timestamp.fromMillis(Math.max(sinceMs, floor)))) /* v0.18.2 (B1): a staff phone follows live records only (composite index live + updatedAt) */
      : query(collection(db, col), where('updatedAt', '>', Timestamp.fromMillis(Math.max(sinceMs, floor))));
    const un = onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
      let changed = false;
      snap.docChanges({ includeMetadataChanges: true }).forEach((ch) => { if (ch.type !== 'removed') { S.D[col].set(ch.doc.id, toObj(ch.doc)); changed = true; } });
      if (!snap.metadata.fromCache) {
        S.lastServer = Date.now(); lsSet('kfp_last_server', S.lastServer);
        let max = lsGet(sinceKey(col), 0);
        snap.docs.forEach((d) => {
          if (d.metadata.hasPendingWrites) return;
          const u = d.get('updatedAt'); if (u && u.toMillis && u.toMillis() > max) max = u.toMillis();
          jMark(`${col}/${d.id}`, 'done');
        });
        lsSet(sinceKey(col), max);
      }
      S.listenErr = ''; if (changed) bump(); scheduleRender();
    }, (err) => { S.listenErr = err.code || String(err); if (err.code === 'permission-denied' && !S.isAdmin && !S.wiped) refreshRole().then(() => render()); scheduleRender(); });
    S.unsub.push(un);
  }
  const un2 = onSnapshot(doc(db, 'settings', 'app'), (s) => { S.settings = s.exists() ? s.data() : {}; bump(); scheduleRender(); }, () => {});
  S.unsub.push(un2);
}

// ---------- derived model (recomputed only when data changes) ----------
const WATCH_OK = 'kfp_watch_ok';
export function watchCheck(cid, score) { const z = lsGet(WATCH_OK, {}); const t = today(); for (const k of Object.keys(z)) if (z[k].until < t) delete z[k]; z[cid] = { until: R.addDays(t, 6), score }; lsSet(WATCH_OK, z); bump(); }
export function watchUncheckAll() { lsSet(WATCH_OK, {}); bump(); }
let modelCache = { ver: -1, day: '', m: null };
// v0.18.1 (B2) Jun 10/4 "1000가구,2000가구여도 끄떡없게": per-customer results are kept between redraws and only recomputed for a customer whose own
// records changed (🟢 1,494 homes: ledger 68 ms + filter learning 82 ms of a 207 ms model() → cached). A record's stamp = its server time + local save time.
const stampOf = (x) => `${x.id}:${x.updatedAt && x.updatedAt.toMillis ? x.updatedAt.toMillis() : 0}:${x._localT || 0}:${x._pending ? 1 : 0}`;
const stampList = (l) => (l && l.length ? l.map(stampOf).join(',') : '');
export const stampSum = (l) => { let n = l.length; for (const x of l) n += (x.updatedAt && x.updatedAt.toMillis ? x.updatedAt.toMillis() : 0) + (x._localT || 0); return n; };
let custCache = new Map(); let learnCache = { key: '', FM: null, learning: null }; let modelSeq = 0; export const modelStamp = () => `${modelSeq}:${today()}`;
export function model() {
  const t = today();
  if (modelCache.ver === S.ver && modelCache.day === t) return modelCache.m;
  modelSeq++; /* v0.18.1: a cheap "the data changed" counter for the desk's page-level caches */
  const D = Object.fromEntries(COLS.map((c) => [c, arr(c)]));
  // Area switch: a staff member without "see every customer" only gets the toles ticked for them (screen tidy-up).
  const areas = !can('seeAll') && S.profile && Array.isArray(S.profile.toles) && S.profile.toles.length ? new Set(S.profile.toles) : null;
  if (areas) { D.customers = D.customers.filter((c) => areas.has(toleOf(c))); const ids = new Set(D.customers.map((c) => c.id)); for (const col of ['visits', 'payments', 'requests', 'checkins', 'recoveries', 'relocations', 'contractEvents', 'waterTests']) D[col] = D[col].filter((x) => ids.has(x.customerId)); }
  const byCust = (list) => { const m = new Map(); for (const x of list) { if (!m.has(x.customerId)) m.set(x.customerId, []); m.get(x.customerId).push(x); } return m; };
  const payBy = byCust(D.payments), visBy = byCust(D.visits), chkBy = byCust(D.checkins);
  const ledgers = new Map(); const cust = new Map();
  const learnKey = `${D.customers.length}:${stampSum(D.customers)}:${D.visits.length}:${stampSum(D.visits)}:${S.settings.learnFilters}`;
  if (learnCache.key !== learnKey) learnCache = { key: learnKey, FM: R.learnedMonths(D.customers, D.visits, S.settings.learnFilters !== 'No'), learning: R.filterLearning(D.customers.filter((c) => c.status !== 'Churned'), D.visits) }; /* v0.14 (#3): observed intervals once 5+ changes · v0.18.1: kept until a customer or visit changes */
  const FM = learnCache.FM;
  const nextCache = new Map(); const perKey = `${t}|${learnKey}|${S.settings.filterMode}`;
  for (const c of D.customers) {
    const pays = payBy.get(c.id) || [], viss = visBy.get(c.id) || [], chks = chkBy.get(c.id) || [];
    const key = `${perKey}|${stampOf(c)}|${stampList(pays)}|${stampList(viss)}|${stampList(chks)}`;
    const hit = custCache.get(c.id);
    if (hit && hit.key === key) { nextCache.set(c.id, hit); ledgers.set(c.id, hit.v.led); cust.set(c.id, hit.v); continue; }
    const led = R.ledger(c, pays, t);
    ledgers.set(c.id, led);
    const vs = viss.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const status = c.status || 'Active';
    const dn = status === 'Active' ? R.dunning(led, t) : null;
    const nv = status === 'Active' ? R.nextVisit(c, vs) : null;
    const fd = status === 'Active' ? R.filterDues(c, vs, t, FM) : [];
    const fb = status === 'Active' && S.settings.filterMode !== 'Separate' ? R.filterBatch(fd, FM) : null; /* v0.15: filters go together */
    const ob = status === 'Active' ? R.onboarding(c, chks, t) : [];
    const chases = R.chaseLog(chks); const pr = status === 'Active' && led.overdue > 0 ? R.promiseOf(chases, pays, t) : null; /* v0.9 #1 */
    const dot = status === 'Churned' ? 'k' : status === 'Paused' ? 'b' : led.daysOverdue >= 7 ? 'r' : led.overdue > 0 ? 'y' : 'g';
    const v = { c, led, dn, nv, fd, fb, ob, vs, dot, status, chases, pr };
    cust.set(c.id, v); nextCache.set(c.id, { key, v });
  }
  custCache = nextCache; /* customers that left the data drop out of the cache */
  const act = [...cust.values()].filter((x) => x.status === 'Active');
  // Dispatch: once Jun gives a staff member their own homes, their field lists show those + the unassigned ones.
  const me = isBoss() ? '' : myName();
  const mineOnly = !!me && act.some((x) => R.assigneeOf(x.c, t) === me);
  const forMe = (x) => !mineOnly || !x.c || !R.assigneeOf(x.c, t) || R.assigneeOf(x.c, t) === me;
  const collections = act.filter((x) => x.dn).filter(forMe).sort((a, b) => b.dn.days - a.dn.days); /* v0.11.1 (#10): collections + requests follow the same assignment as visits */
  const visitsDue = act.filter((x) => x.nv && x.nv.date <= R.addDays(t, 0)).map((x) => ({ ...x, due: x.nv.date })).concat(
    act.filter((x) => !(x.nv && x.nv.date <= t) && x.fd.some((f) => f.status === 'overdue')).map((x) => ({ ...x, due: x.fd.filter((f) => f.status === 'overdue').map((f) => f.due).sort()[0], filterOnly: true })),
  ).filter(forMe).sort((a, b) => String(a.due).localeCompare(String(b.due)));
  const calls = [];
  for (const x of act) if (forMe(x)) for (const o of x.ob) if (o.status === 'due' || o.status === 'overdue') calls.push({ ...x, o });
  calls.sort((a, b) => a.o.due.localeCompare(b.o.due));
  const tomorrow = R.addDays(t, 1);
  const tomorrowBills = act.filter((x) => x.led.nextBill && x.led.nextBill.due === tomorrow);
  // Saturdays + the official 2083 list (cal.js) + extra days typed in Settings → the G-1 §2-4 clock skips them
  const hm = CAL.holidayMap(S.settings.holidays);
  const isHol = (d) => CAL.isOff(hm, R.fmtD(d));
  const openReq = D.requests.filter((r) => r.status !== 'Done').map((r) => ({ r, sla: R.requestSla(r.receivedAtMs || Date.parse(r.receivedAt || '') || Date.now(), isHol), c: cust.get(r.customerId) }))
    .filter((o) => !o.c || forMe({ c: o.c.c })).sort((a, b) => a.sla.replyBy - b.sla.replyBy);
  const leadsDue = D.leads.filter((l) => !['Signed', 'Rejected'].includes(l.outcome) && R.isDate(l.followUpDate) && l.followUpDate <= t);
  const metrics = R.metrics(D, ledgers, t, S.settings);
  const deposits = R.depositBook(D.customers, ledgers, D.recoveries);
  const vat = R.vatByMonth(D.payments, ledgers, D.recoveries);
  const referrals = R.referralRewards(D.customers, D.payments, ledgers, t, referralOn()); /* v0.15: off unless the campaign is switched on */
  const learning = learnCache.learning;
  const filtersAll = act.flatMap((x) => x.fd.filter((f) => f.status !== 'none').map((f) => ({ ...f, x })));
  // Alerts: things that need a person today (each links to its list)
  const alerts = [];
  const pastReply = openReq.filter((o) => Date.now() > o.sla.replyBy).length; if (pastReply) alerts.push({ lvl: 'bad', ic: '📋', t: `${pastReply} request(s) past the reply time`, list: 'requests' });
  const late7 = collections.filter((x) => x.dn.stage === 'visit' && !(x.pr && x.pr.status === 'waiting')).length; if (late7) alerts.push({ lvl: 'bad', ic: '💰', t: `${late7} home(s) 7+ days late — home visit`, list: 'collections' });
  const broken = collections.filter((x) => x.pr && x.pr.status === 'broken').length; if (broken) alerts.push({ lvl: 'bad', ic: '🤝', key: 'promise:broken', t: `${broken} payment promise(s) broken`, list: 'collections' });
  const fOver = filtersAll.filter((f) => f.status === 'overdue').length; if (fOver) alerts.push({ lvl: 'warn', ic: '🧪', t: `${fOver} filter(s) past the booking date`, list: 'filters' });
  const callsOver = calls.filter((x) => x.o.status === 'overdue').length; if (callsOver) alerts.push({ lvl: 'warn', ic: '📞', t: `${callsOver} day-7 call(s) overdue`, list: 'calls' });
  if (metrics.fcl.ready) alerts.push({ lvl: 'ok', ic: '📦', t: 'FCL#1: all order conditions met — order now', report: 'stock' });
  else if (metrics.fcl.stockSignal) alerts.push({ lvl: 'warn', ic: '📦', t: 'Stock is at the FCL#1 order point', report: 'stock' });
  for (const [k, g] of Object.entries(metrics.gate)) if (g.judgeable && g.bad) alerts.push({ lvl: 'bad', ic: '🧭', t: `Direction gate: ${k} crossed its trigger`, report: 'gate' });
  if (leadsDue.length) alerts.push({ lvl: 'info', ic: '🧲', t: `${leadsDue.length} lead(s) to follow up`, list: 'leads' });
  if (isBoss()) { const lb = S.settings.lastBackupAt; const age = lb ? R.daysBetween(lb, t) : null; if (age === null || age > 7) alerts.push({ lvl: 'warn', ic: '💾', t: age === null ? 'No backup yet — make one' : `Last backup ${age} days ago — make a new one`, report: 'backup' }); }
  const devices = R.deviceRegistry(D.customers, D.recoveries, D.deviceEvents, D.relocations, t);
  const num = (v) => (v === '' || v === undefined || v === null ? undefined : Number(v));
  // filter order dates (settings: lead weeks · safety weeks · months to cover — 🔴 until a real filter order has come in)
  const capPeople = S.settings.capPeople !== undefined && S.settings.capPeople !== '' ? Number(S.settings.capPeople) : Math.max(1, techNames().filter((n) => n !== 'Jun').length);
  // people who only see some areas get no capacity / filter-order plan: built from a slice of homes it would be wrong
  const capacity = areas ? null : R.capacityPlan(cust, D, t, { jobsPerDay: num(S.settings.capJobsPerDay), installSlots: num(S.settings.capInstallSlots), hireLeadWeeks: num(S.settings.hireLeadWeeks), people: capPeople, installsPerWeek: metrics.avg4w, isOff: (d) => CAL.isOff(hm, d) });
  if (capacity) for (const w of capacity.weeks.slice(0, 4)) if (!w.closed && w.load > 1) { alerts.push({ lvl: 'warn', ic: '👷', key: 'capacity:' + w.from, t: `Week of ${w.from}: ${Math.round(w.demand)} jobs for ${w.cap} slots — move visits or add hands`, report: 'capacity' }); break; }
  const filterPlan = areas ? null : R.filterOrderPlan(cust, metrics.stock, t, { leadWeeks: num(S.settings.filterLeadWeeks), safetyWeeks: num(S.settings.filterSafetyWeeks), coverMonths: num(S.settings.filterCoverMonths), installsPerWeek: metrics.avg4w });
  if (filterPlan && can('stock')) for (const r of filterPlan.rows) if (r.status !== 'ok') alerts.push({ lvl: r.status === 'late' ? 'bad' : 'warn', ic: '🧪', key: 'filter:' + r.type + ':' + r.status, t: `Order ${r.type} filters by ${r.orderBy}${r.status === 'late' ? ' (late)' : ''} — stock runs out around ${r.runOut}`, report: 'stock' });
  const expMonths = R.expensesByMonth(D.expenses);
  const relOpen = D.relocations.filter((r) => ['Requested', 'Scheduled'].includes(r.status));
  const devCheck = devices.filter((d) => d.checkDue); if (devCheck.length && can('stock')) alerts.push({ lvl: devCheck.some((d) => d.checkDue < t) ? 'bad' : 'warn', ic: '📦', t: `${devCheck.length} device(s) waiting for the 14-day arrival check`, report: 'devices' });
  // money approvals (v0.8 #12)
  const approvals = R.approvalQueue(D);
  const forMeToOk = approvals.pending.filter((r) => S.isAdmin || (r.x.createdBy !== (S.user && S.user.uid) && r.x.updatedBy !== (S.user && S.user.uid))).length;
  if (forMeToOk && isApprover()) alerts.push({ lvl: 'warn', ic: '✋', key: 'approvals', t: `${forMeToOk} money action(s) wait for your OK`, list: 'approvals' });
  else { const mine = approvals.pending.filter((r) => r.x.createdBy === (S.user && S.user.uid)).length; if (mine) alerts.push({ lvl: 'info', ic: '✋', key: 'approvals:mine', t: `${mine} of your money action(s) wait for an OK`, list: 'approvals' }); }
  if (relOpen.length) alerts.push({ lvl: 'info', ic: '🚚', t: `${relOpen.length} relocation(s) to do`, list: 'relocations' });
  const contractOpen = R.contractOpen(D.contractEvents, D.recoveries, t); /* v0.9 #3 */
  const claimsSt = R.claimStats(D.claims, t); /* v0.9 #6 */
  const vials = R.vialStats(D.waterTests, D.customers, t); /* v0.9 #10 */ if (vials.toRead.length) alerts.push({ lvl: 'info', ic: '🧫', key: 'vials', t: `${vials.toRead.length} water vial(s) to read`, list: 'water' });
  if (can('stock')) { const pmin = Number(S.settings.partsMin) > 0 ? Number(S.settings.partsMin) : R.PARTS_MIN; const low = partsList().filter((p) => (metrics.stock['Part: ' + p] ?? 0) < pmin); if (low.length && D.stockMoves.some((s2) => String(s2.item || '').startsWith('Part: '))) alerts.push({ lvl: 'warn', ic: '🔩', key: 'parts:low', t: `${low.length} part(s) below ${pmin} on the shelf`, report: 'stock' }); }
  if (can('stock')) { const cl = claimsSt.open.filter((x) => x.notSentLate || x.dueSoon); if (cl.length) alerts.push({ lvl: cl.some((x) => x.notSentLate) ? 'bad' : 'warn', ic: '📮', key: 'claims', t: `${cl.length} supplier claim(s) to send — PI deadline`, list: 'claims' }); }
  const nSoon = contractOpen.filter((o) => o.kind === 'notice' && (o.soon || o.overdue)).length; if (nSoon) alerts.push({ lvl: 'warn', ic: '📜', key: 'contract:notice', t: `${nSoon} home(s) ending soon — book the recovery`, list: 'contract' });
  const nLost = contractOpen.filter((o) => o.kind === 'lost').length; if (nLost) alerts.push({ lvl: 'warn', ic: '📜', key: 'contract:lost', t: `${nLost} lost or stolen device(s) not settled`, list: 'contract' });
  const pSoon = R.pauseReminders(D.customers, null, t); if (pSoon.length) alerts.push({ lvl: 'info', ic: '⏸️', key: 'pause:soon', t: `${pSoon.length} paused home(s) restart within 7 days — message them and book the refit visit`, list: 'paused' });
  const repairCr = R.repairCredits(D.requests, D.payments, t); /* v0.10 */ const rcDue = repairCr.filter((x) => x.c.done && !x.given); const rcSlow = repairCr.filter((x) => !x.c.done);
  if (rcSlow.length) alerts.push({ lvl: 'warn', ic: '🛠️', key: 'repair:slow', t: `${rcSlow.length} repair(s) open over 7 days — the credit grows each day`, list: 'repairs' });
  if (rcDue.length && isBoss()) alerts.push({ lvl: 'warn', ic: '🛠️', key: 'repair:credit', t: `${rcDue.length} late repair(s) — give the credit`, list: 'repairs' });
  const pLate = [...cust.values()].filter((x) => x.status === 'Paused' && R.isDate(x.c.pausedUntil) && x.c.pausedUntil < t).length; if (pLate) alerts.push({ lvl: 'warn', ic: '⏸️', key: 'pause:late', t: `${pLate} paused home(s) past their restart day`, list: 'paused' });
  const offTomorrow = (hm[tomorrow] || []).find((h) => h.kind === 'all'); if (offTomorrow) alerts.push({ lvl: 'info', ic: '🏖️', t: `Office closed tomorrow — ${offTomorrow.n}`, cal: tomorrow });
  if (can('money')) for (const dl of CAL.deadlines(t, R.addDays(t, 5), S.settings)) alerts.push({ lvl: dl.d <= R.addDays(t, 2) ? 'bad' : 'warn', ic: dl.ic, t: `${dl.t} — ${dl.d === t ? 'today' : 'by ' + dl.d}${CAL.isOff(hm, dl.d) ? ' (a holiday — do it the day before)' : ''}`, cal: dl.d });
  // watch list (homes to look after this week) — "✓ checked" hides a home for 7 days on this device unless its points go up
  const wOk = lsGet(WATCH_OK, {});
  const watchAll = R.watchList(cust, D, t).filter((w) => forMe(w.x));
  const watchVis = watchAll.filter((w) => { const k = wOk[w.x.c.id]; return !(k && k.until >= t && w.score <= k.score); });
  const watch = watchVis.slice(0, 10); /* v0.11.2 (#13) Jun: "최대 10까지만" — the ten highest scores, the rest wait their turn */
  const wHigh = watch.filter((w) => w.lvl === 'high').length; if (wHigh) alerts.push({ lvl: 'warn', ic: '⚠️', key: 'watch:high', t: `${wHigh} home(s) to look after this week`, list: 'watch' });
  if (isBoss() && S.fleetCache) for (const d of S.fleetCache) { const q = deviceIssues(d); if (q.lvl === 'bad') { alerts.push({ lvl: 'bad', ic: '📱', key: 'phone:' + d.id, t: `${userName(d.uid, d.name || d.email || 'A phone')}: ${q.out.filter((x) => x[0] === 'bad').map((x) => x[1]).join(' · ')}`, side: 'phones' }); } }
  const m = { t, D, cust, ledgers, approvals, repairCr, contractOpen, claimsSt, vials, collections, visitsDue, calls, tomorrowBills, openReq, leadsDue, metrics, deposits, vat, referrals, learning, filtersAll, alerts, devices, expMonths, relOpen, hm, mineOnly, watch, watchChecked: watchAll.length - watchVis.length, watchMore: watchVis.length - watch.length, filterPlan, capacity };
  modelCache = { ver: S.ver, day: t, m };
  return m;
}

// ---------- auth ----------
onAuthStateChanged(auth, async (user) => {
  if (DEMO) return;
  S.unsub.forEach((u) => u()); S.unsub = []; COLS.forEach((c) => S.D[c].clear()); bump();
  S.user = user;
  if (!user) { S.role = null; render(); return; }
  S.isAdmin = await isAdminEmail(user.email);
  if (S.isAdmin && lsGet('kfp_lang', null) === null) setLang('ko');
  S.role = S.isAdmin ? 'admin' : lsGet('kfp_role_' + user.uid, null);
  S.profile = lsGet('kfp_prof_' + user.uid, {}); S.isDeputy = !S.isAdmin && !!(S.profile && S.profile.role === 'staff' && S.profile.deputy === true);
  render();
  await refreshRole();
  if (S.role === 'staff' || S.role === 'admin') { await startData(false); reconcile(false); startHeartbeat(); }
  render();
});
async function refreshRole() {
  try {
    const ref = doc(db, 'users', S.user.uid);
    const s = await getDoc(ref);
    if (s.exists()) {
      S.profile = s.data(); if (!S.isAdmin) S.role = s.get('role') || 'pending'; S.isDeputy = !S.isAdmin && S.role === 'staff' && S.profile.deputy === true;
      if (S.role === 'blocked' && !DEMO) { await wipePhone(); return; }
      if (!S.isAdmin && S.role === 'staff') setDoc(ref, { lastSeenAt: serverTimestamp(), appVersion: APP_VERSION }, { merge: true }).catch(() => {});
    }
    else if (!S.isAdmin) { await setDoc(ref, { role: 'pending', email: S.user.email || '', name: '', createdAt: serverTimestamp() }); S.role = 'pending'; }
    lsSet('kfp_role_' + S.user.uid, S.role); lsSet('kfp_prof_' + S.user.uid, S.profile || {});
  } catch (e) { if (!S.role) S.role = S.isAdmin ? 'admin' : 'pending'; }
}
// Blocked (e.g. left the company): remove the company data kept on this phone — offline cache, second copies, photos.
async function wipePhone() {
  S.unsub.forEach((u) => u()); S.unsub = []; COLS.forEach((c) => S.D[c].clear()); bump();
  try { await terminate(db); await clearIndexedDbPersistence(db); } catch (e) {}
  try { Object.keys(localStorage).filter((k) => k.startsWith('kfp_') && k !== 'kfp_lang' && !k.startsWith('kfp_login_')).forEach((k) => localStorage.removeItem(k)); } catch (e) {} /* v0.9.4: the login choices (email, remember, stay signed in) are not company data */
  try { indexedDB.deleteDatabase('kfp-photos'); } catch (e) {}
  S.wiped = true; S.profile = {};
}
// v0.18.0 (A-4) Jun 10/4: app errors reach the desk — the last 10 (message · where · screen · version, never record contents) ride on the
// phone heartbeat (devices/{id}.errors) → Phones page + alert. No third-party service, no CSP change.
const ERR_MAX = 10; let errQ = lsGet('kfp_errs', []);
export function noteError(kind, msg, where) {
  const e = { t: Date.now(), k: String(kind || 'error').slice(0, 12), m: String(msg || '').slice(0, 200), w: String(where || '').slice(0, 120), s: String((S.route && S.route.screen) || '').slice(0, 20), v: APP_VERSION };
  errQ = [...errQ.slice(-(ERR_MAX - 1)), e]; lsSet('kfp_errs', errQ); try { hbSoon(); } catch (e2) {} return e;
}
export const errList = () => errQ;
window.addEventListener('error', (ev) => { if (ev && ev.message) noteError('error', ev.message, `${String(ev.filename || '').split('/').pop()}:${ev.lineno || ''}`); });
window.addEventListener('unhandledrejection', (ev) => { const r = ev && ev.reason; noteError('reject', (r && (r.code || r.message)) || String(r || ''), ''); });
export const myName = () => (S.isAdmin ? 'Jun' : (S.profile && S.profile.name) || (S.user && S.user.email ? S.user.email.split('@')[0] : ''));
export const referralOn = () => S.settings.referralCampaign === 'Yes'; /* v0.15: the referral campaign (card · rewards · tree) is off until Settings says Yes */
export const techNames = () => { const base = ['Tara', 'Jun']; const extra = String(S.settings.techNames || '').split(',').map((s) => s.trim()).filter(Boolean); return [...new Set([...base, ...extra])]; };

// ================= forms =================
// Field spec: { k, l, t, req, o, def, ph, step, multi, admin, show(v), hint }
function field(f, v) {
  if (f.admin && !isBoss()) return '';
  if (f.t === 'section') return `<div class="fsec"${f.k ? ` data-k="${esc(f.k)}"` : ''}><div class="t">${esc(f.l)}</div>${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}</div>`;
  if (f.t === 'info') return `<div class="fld" data-k="${f.k}"><div class="note" id="info_${f.k}"></div></div>`;
  const val = v !== undefined && v !== null ? v : (typeof f.def === 'function' ? f.def() : (f.def ?? ''));
  const req = f.req ? ' <span class="req">*</span>' : '';
  const lab = f.l ? `<label for="f_${f.k}">${esc(f.l)}${req}</label>` : '';
  const opts = typeof f.o === 'function' ? f.o() : f.o;
  let input = '';
  switch (f.t) {
    case 'chips': {
      const sel = f.multi ? (Array.isArray(val) ? val : []) : [val];
      input = `<div class="chips" data-group="${f.k}" data-multi="${f.multi ? 1 : 0}"${f.noi18n ? ' data-noi18n' : ''}>` + opts.map((o) => `<button type="button" class="chip${sel.includes(o) ? ' on' : ''}" data-v="${esc(o)}">${esc((f.lbl && f.lbl[o]) || o)}</button>`).join('') + '</div>'; break; /* lbl = what is shown; the saved value stays o */
    }
    case 'checks': {
      const sel = Array.isArray(val) ? val : [];
      input = `<div class="checks" data-group="${f.k}" data-multi="1">` + opts.map((o) => `<div class="chk chip${sel.includes(o) ? ' on' : ''}" data-v="${esc(o)}"><span class="box"></span><span>${esc(o)}</span></div>`).join('') + '</div>'; break;
    }
    case 'select':
      input = `<select id="f_${f.k}" name="${f.k}"><option value="">— choose —</option>` + opts.map((o) => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(ov)}"${String(ov) === String(val) ? ' selected' : ''}>${esc(ol)}</option>`; }).join('') + '</select>'; break;
    case 'customer': {
      const list = arr('customers').filter((c) => c.status !== 'Churned' || c.id === val).sort((a, b) => String(a.name).localeCompare(String(b.name)));
      input = `${list.length > 12 ? `<input type="search" class="custpick" data-for="f_${f.k}" placeholder="Search name · KC code · phone" autocomplete="off">` : ''}<select id="f_${f.k}" name="${f.k}"><option value="">— choose customer —</option>${list.map((c) => `<option value="${esc(c.id)}"${c.id === val ? ' selected' : ''}>${esc(custLabel(c))} · ${esc(toleOf(c))}</option>`).join('')}</select>`; break; /* v0.11.1 (#8): 750 homes are not a wheel */
    }
    case 'textarea': input = `<textarea id="f_${f.k}" name="${f.k}" placeholder="${esc(f.ph || '')}">${esc(val)}</textarea>` + (f.gen ? `<div class="row sg-row"><input type="number" id="sgN" min="1" max="500" value="1" aria-label="how many" data-noi18n><button type="button" class="btn small ghost" data-act="serialGen" data-for="${f.k}">🏷️ New KORA numbers</button></div>` : ''); break; /* v0.17.2 (6) */
    case 'serial': { const st = stockSerials(); input = `<div class="row sg-row"><input id="f_${f.k}" name="${f.k}" type="text" value="${esc(val)}" list="dl_${f.k}" placeholder="${esc(f.ph || '')}" autocomplete="off" data-noi18n><button type="button" class="btn small ghost" data-act="serialNext" data-for="${f.k}">🏷️ Next number</button></div><datalist id="dl_${f.k}">${st.map((s) => `<option value="${esc(s)}">`).join('')}</datalist>`; break; } /* v0.17.2 (6): pick the sticker's number from stock */
    case 'gps': {
      const g = val && val.lat ? val : null;
      input = `<button type="button" class="btn ghost" data-act="gps">📍 Get location now</button><div class="hint" id="gpsOut">${g ? `✅ ${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}${g.acc ? ` (±${esc(Math.round(Number(g.acc) || 0))} m)` : ''}` : 'Not captured yet'}</div>
        <input type="hidden" name="gpsLat" value="${g ? esc(Number(g.lat)) : ''}"><input type="hidden" name="gpsLng" value="${g ? esc(Number(g.lng)) : ''}"><input type="hidden" name="gpsAcc" value="${g && g.acc ? esc(Number(g.acc) || '') : ''}">`; break;
    }
    case 'photos': /* v0.17.2 (3) Jun 10/4 "사진 한번에 2장 이상 누를수있게": on a computer both buttons opened the same file window, one photo each → one button, several at once */
      input = `<div class="row">${isComputer() ? '' : '<button type="button" class="photo-btn" data-act="cam">📷<br>Take photo</button>'}<button type="button" class="photo-btn" data-act="gal">🖼️<br>${isComputer() ? 'Choose photos (several at once)' : 'From album'}</button></div>
        <input type="file" accept="image/*" capture="environment" hidden class="photoIn"><input type="file" accept="${f.pdf ? 'image/*,application/pdf' : 'image/*'}" multiple hidden class="photoIn">
        <div class="thumbs" id="thumbs"${f.roles ? ` data-roles="${esc(f.roles.join('|'))}"` : ''}></div>`; break; /* v0.19.0 (4) Jun 10/4 "헌필터 사진 넣는곳, 새 필터 사진 넣는곳": each photo carries a role */
    case 'counts': {
      const cnt = {}; for (const x of Array.isArray(val) ? val : []) cnt[x] = (cnt[x] || 0) + 1;
      input = `<div class="counts" data-counts="${f.k}">` + opts.map((o) => `<span class="cnt${cnt[o] ? ' on' : ''}" data-v="${esc(o)}" data-n="${cnt[o] || 0}"><button type="button" class="chip${cnt[o] ? ' on' : ''}" data-cplus>${esc(o)}<b class="cn">${cnt[o] ? ' ×' + cnt[o] : ''}</b></button><button type="button" class="cminus" data-cminus aria-label="one less">−</button></span>`).join('') + '</div>'; break;
    }
    case 'sign':
      input = `<div class="signpad" data-sign="${f.k}"><canvas width="640" height="220"></canvas><div class="signhint">✍️ <span>Sign here with a finger</span></div><button type="button" class="btn small ghost" data-signclear>✕ Erase</button></div>`; break;
    case 'number':
      input = `<input id="f_${f.k}" name="${f.k}" type="number" inputmode="${f.step ? 'decimal' : 'numeric'}" step="${f.step || 1}" value="${esc(val)}" placeholder="${esc(f.ph || '')}">`; break;
    default:
      input = `<input id="f_${f.k}" name="${f.k}" type="${f.t}" value="${esc(val)}" placeholder="${esc(f.ph || '')}" ${f.t === 'tel' ? 'inputmode="tel"' : ''} autocomplete="off">`;
  }
  const w1 = ['text', 'tel', 'number', 'date', 'time', 'email', 'select', 'month', 'url'].includes(f.t) || (f.t === 'chips' && !f.multi && (opts || []).length <= 3 && (opts || []).every((o) => String((f.lbl && f.lbl[o]) || o).length <= 16)); /* v0.17.0 (4) B3 */
  return `<div class="fld${w1 ? ' w1' : ''}" data-k="${f.k}">${lab}${input}${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}<div class="err hidden"></div><div class="warn hidden"></div></div>`;
}
function readForm(form, spec) {
  const v = {};
  for (const f of spec) {
    if (['section', 'info', 'photos'].includes(f.t)) continue;
    if (f.admin && !isBoss()) continue;
    if (f.t === 'chips' || f.t === 'checks') {
      const on = [...form.querySelectorAll(`[data-group="${f.k}"] .chip.on`)].map((b) => b.dataset.v);
      v[f.k] = f.multi || f.t === 'checks' ? on : (on[0] || '');
    } else if (f.t === 'number') {
      const el = form.elements[f.k]; const s = el ? el.value.trim() : ''; v[f.k] = s === '' ? null : Number(s);
    } else if (f.t === 'counts') {
      v[f.k] = [...form.querySelectorAll(`[data-counts="${f.k}"] .cnt`)].flatMap((s2) => Array(Number(s2.dataset.n) || 0).fill(s2.dataset.v));
    } else if (f.t === 'sign') {
      v[f.k] = signValue(form, f.k);
    } else if (f.t === 'gps') {
      const lat = form.elements.gpsLat.value, lng = form.elements.gpsLng.value;
      v.gps = lat && lng ? { lat: Number(lat), lng: Number(lng), acc: Number(form.elements.gpsAcc.value) || null } : null;
    } else { const el = form.elements[f.k]; v[f.k] = el ? el.value.trim() : ''; }
  }
  return v;
}
// v0.9 #5 signature pad: finger strokes on a canvas → a small PNG (320×110) saved like a photo
function signValue(form, k) {
  const pad = form.querySelector(`[data-sign="${k}"]`); if (!pad || pad.dataset.signed !== '1') return '';
  const src = pad.querySelector('canvas'); const out = document.createElement('canvas'); out.width = 320; out.height = 110;
  const g = out.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 320, 110); g.drawImage(src, 0, 0, 320, 110); return out.toDataURL('image/png');
}
function saveSign(customerId, parent, dataUrl, name) {
  if (!dataUrl) return 0;
  save(`photos/${newId('photos')}`, { customerId, parent, kind: 'Signature', n: 1, signName: name || '', chars: dataUrl.length, date: today() }, true, dataUrl); return 1;
}
{ let pad = null, last = null;
  const at = (cv, ev) => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) * cv.width / r.width, (ev.clientY - r.top) * cv.height / r.height]; };
  document.addEventListener('pointerdown', (ev) => { const cv = ev.target.closest && ev.target.closest('.signpad canvas'); if (!cv) return; ev.preventDefault(); pad = cv; last = at(cv, ev); try { cv.setPointerCapture(ev.pointerId); } catch (e) {} });
  document.addEventListener('pointermove', (ev) => { if (!pad) return; const p = at(pad, ev); const g = pad.getContext('2d'); g.strokeStyle = '#0b2545'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(last[0], last[1]); g.lineTo(p[0], p[1]); g.stroke(); last = p; pad.closest('.signpad').dataset.signed = '1'; });
  document.addEventListener('pointerup', () => { if (!pad) return; const f = pad.closest('form'); pad = null; last = null; if (f && f.id === 'theForm') refreshConditional(f); });
  document.addEventListener('click', (ev) => { const cb = ev.target.closest && ev.target.closest('[data-cplus], [data-cminus]'); if (!cb) return; ev.preventDefault(); ev.stopPropagation(); const sp = cb.closest('.cnt'); const n = Math.max(0, (Number(sp.dataset.n) || 0) + (cb.hasAttribute('data-cplus') ? 1 : -1)); sp.dataset.n = n; sp.classList.toggle('on', n > 0); const ch = sp.querySelector('.chip'); ch.classList.toggle('on', n > 0); ch.querySelector('.cn').textContent = n ? ' ×' + n : ''; const f = sp.closest('form'); if (f && f.id === 'theForm') refreshConditional(f); }, true);
  document.addEventListener('click', (ev) => { const b = ev.target.closest && ev.target.closest('[data-signclear]'); if (!b) return; ev.preventDefault(); ev.stopPropagation(); const sp = b.closest('.signpad'); const cv = sp.querySelector('canvas'); cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); sp.dataset.signed = ''; const f = sp.closest('form'); if (f) refreshConditional(f); }, true);
}
function showMsgs(form, errs, warns) {
  form.querySelectorAll('.fld').forEach((el) => {
    const k = el.dataset.k; const e = el.querySelector('.err'); const w = el.querySelector('.warn'); if (!e) return;
    e.textContent = errs[k] || ''; e.classList.toggle('hidden', !errs[k]);
    w.textContent = warns[k] || ''; w.classList.toggle('hidden', !warns[k]);
    el.querySelectorAll('input,select,textarea').forEach((i) => i.classList.toggle('bad', !!errs[k]));
  });
  const first = form.querySelector('.err:not(.hidden), .warn:not(.hidden)');
  if (first) first.closest('.fld').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
const inRange = (n, lo, hi) => n === null || n === undefined || (Number.isFinite(n) && n >= lo && n <= hi);
const need = (errs, v, k, msg) => { const x = v[k]; if (x === '' || x === null || x === undefined || (Array.isArray(x) && !x.length)) errs[k] = msg || 'Required.'; };
const isDone = (s) => String(s || '').includes('Completed');

// ---------- form definitions ----------
const custPicker = { k: 'customerId', l: 'Customer', t: 'customer', req: 1 };
const isLate = (cid) => { const x = cid && model().cust.get(cid); return !!(x && x.led.daysOverdue >= 1); };
const isChase = (v) => v.kind === R.CHASE_KIND;
export const partsList = () => { const s = String(S.settings.partsList || '').split(/\n|,/).map((x) => x.trim()).filter(Boolean); return s.length ? s : R.PARTS_DEFAULT; }; /* v0.9 #7 */
const stockItems = () => ['Device', ...R.FILTER_TYPES, ...partsList().map((p) => 'Part: ' + p)];
const FORMS = {};
// the open form edits a saved record (not a new one)
const editingForm = () => { const r = S.drawer && S.drawer.screen === 'form' ? S.drawer : S.route && S.route.screen === 'form' ? S.route : null; return !!(r && r.params && r.params.id); };
const editedCust = () => { const r = S.drawer && S.drawer.screen === 'form' ? S.drawer : S.route && S.route.screen === 'form' ? S.route : null; return r && r.params && r.params.id ? S.D.customers.get(r.params.id) : null; };

FORMS.install = {
  col: 'customers', title: 'New install', icon: '🏠',
  spec: () => [
    { t: 'section', l: 'Customer' },
    { k: 'name', l: 'Customer name', t: 'text', req: 1 },
    { k: 'phone', l: 'Mobile number', t: 'tel', req: 1, ph: '98XXXXXXXX' },
    { k: 'msgLang', l: 'WhatsApp messages in', t: 'chips', o: MSG_LANGS, hint: 'Empty = the Settings default (Nepali) · one language reads less like spam' }, /* v0.17.2 (2) */
    { k: 'zone', l: 'Zone', t: 'chips', o: OPT.zone, req: 1 },
    { k: 'ward', l: 'Ward', t: 'select', o: OPT.ward, req: 1 },
    { k: 'tole', l: 'Tole', t: 'select', o: OPT.tole, req: 1 },
    { k: 'toleOther', l: 'Tole name', t: 'text', show: (v) => v.tole === 'Other' },
    { k: 'houseDetail', l: 'How to find the house', t: 'textarea', ph: 'e.g. next to the blue-gate shop, 2nd floor' },
    { k: 'referral', l: 'How they heard about KORA', t: 'select', o: OPT.referral, req: 1 },
    { k: 'referrerId', l: 'Referred by (existing customer)', t: 'customer', show: (v) => v.referral === 'Word of mouth', hint: 'During a referral campaign the referrer gets 50% off a bill, 3 months after this home joins.' },
    { k: 'referrerName', l: 'Referred by (name, if not a customer)', t: 'text', show: (v) => v.referral === 'Word of mouth' },
    { t: 'section', l: 'Water & site', hint: 'Measure before installing.' },
    { k: 'waterSource', l: 'Water source', t: 'chips', o: OPT.waterSource, req: 1 },
    { k: 'pressurePsi', l: 'Water pressure (PSI)', t: 'number', hint: '30–80 normal · 20–30 low (pump needed) · <20 very low · >80 needs a reducer' },
    { k: 'rawTds', l: 'Raw water TDS', t: 'number', req: 1 },
    { t: 'section', l: 'Device' },
    { k: 'deviceSerial', l: 'Device number (KORA sticker)', t: 'serial', req: 1, ph: 'KD-26-0001', hint: 'Pick the number on the sticker from the stock list · no sticker yet → 🏷️ Next number, then write it on a sticker (manual E-3)' },
    { k: 'installDate', l: 'Install date', t: 'date', req: 1, def: today, hint: 'The monthly bill falls on this same day every month.' },
    { k: 'signUpDate', l: 'Sign-up date', t: 'date', req: 1, def: today },
    { t: 'section', l: 'Final checks', hint: 'All must be ticked. Flow and water source are required.' },
    { k: 'checks', l: 'Checklist', t: 'checks', o: OPT.installChecks, req: 1 },
    { k: 'purifiedTds', l: 'Purified water TDS', t: 'number', req: 1 },
    { k: 'flow', l: 'Flow at the tap (L/min)', t: 'number', step: 0.1, req: 1, ph: 'e.g. 1.1', hint: 'The UV lamp is safe at 1.2 L/min or less.' },
    { t: 'section', l: 'First-day payment', hint: 'Day 1 = NPR 4,900 (install fee incl. first month). Do not finish the install before the payment is confirmed.' },
    { k: 'firstPay', l: 'First-day payment', t: 'chips', o: OPT.firstPay, req: 1 },
    { k: 'payMethod', l: 'Paid by', t: 'chips', o: OPT.method, show: (v) => String(v.firstPay).startsWith('Received') },
    { k: 'payRef', l: 'Transaction ID', t: 'text', show: (v) => String(v.firstPay).startsWith('Received') },
    { k: 'payBillNo', l: 'VAT bill no.', t: 'text', show: (v) => String(v.firstPay).startsWith('Received'), ph: 'number on the VAT bill you gave', hint: 'Goes into the IRD sales book for the CA. The app does not print tax invoices.' },
    { t: 'section', l: 'Raw-water vial (PoC)', hint: '🚨 Our own check — never tell the customer the water is safe or unsafe from it. Every second install (about 25 homes), spread over water sources.' },
    { k: 'vialStarted', l: 'Vial filled from the kitchen tap before connecting?', t: 'chips', o: OPT.yesNo, def: 'No' },
    { t: 'section', l: 'Customer signature', hint: 'Proof of the install — the customer signs with a finger (saved like a photo). No signature → say why.' },
    { k: 'signName', l: 'Signed by (name)', t: 'text' },
    { k: 'sign', l: '', t: 'sign' },
    { k: 'noSign', l: 'No signature — why?', t: 'chips', o: OPT.noSign, show: (v) => !v.sign },
    { t: 'section', l: 'Photos', hint: 'Device as installed · TDS meter (raw vs purified) · signed contract.' },
    { k: 'photos', l: 'Photos (3 required)', t: 'photos' },
    { t: 'section', l: 'Other' },
    { k: 'gps', l: 'House location', t: 'gps' },
    { k: 'agent', l: 'Installed by', t: 'chips', o: techNames, req: 1, def: myName },
    ...(editingForm() ? [{ k: 'buyerPan', l: 'Buyer PAN (business customers only)', t: 'text', ph: '9 digits — leave empty for homes', hint: 'Printed in the IRD sales book. Hotels, shops, offices usually have one.' }] : []), /* v0.11 (Tara 2026-09-30): not on a new install — the office adds it when a business asks for it */
    { k: 'notes', l: 'Special comment', t: 'textarea', ph: 'e.g. dog in the yard · call before coming · landlord must be present' },
    { k: 'privateNotes', l: '🔒 Private notes (only admin sees)', t: 'textarea', admin: 1 },
  ],
  // v0.11: from a lead (the id travels with the screen, never a global — a cancelled convert must not fill a later install) and its sign-up screening
  prefill(p) {
    const l = p.lead ? S.D.leads.get(p.lead) : null; S.convertLead = l ? l.id : '';
    const sc = l ? R.findScreening(arr('screenings'), l.id, normPhone(l.phone)) : null;
    return { ...(l ? { name: l.name || '', phone: String(l.phone || '').replace('+977', ''), tole: l.tole || '', ward: l.ward || '', referral: l.channel || '', referrerId: l.referrerId || '' } : {}), ...(sc && sc.waterSource ? { waterSource: sc.waterSource } : {}) };
  },
  check(v, confirmed) {
    const errs = {}, warns = {};
    if (!v.name || v.name.length < 2) errs.name = 'Enter the customer name.';
    const phone = normPhone(v.phone);
    if (!phone) errs.phone = 'Enter a Nepal mobile (98XXXXXXXX) or a landline with its area code (061-…).';
    else { const dup = arr('customers').find((c) => c.phone === phone && c.id !== v._id); if (dup && !confirmed) warns.phone = `Same number as ${custLabel(dup)}. Save anyway only if this is really a different household.`; else if (!phone.startsWith('+977') && !confirmed) warns.phone = 'Not a Nepal number — fine for a test or a foreign phone (WhatsApp still works).'; }
    need(errs, v, 'zone', 'Choose a zone.'); need(errs, v, 'ward', 'Choose a ward.'); need(errs, v, 'tole', 'Choose a tole.');
    if (v.tole === 'Other' && !v.toleOther) errs.toleOther = 'Write the tole name.';
    if (!inRange(v.householdSize, 1, 40)) errs.householdSize = 'Check this number (1–40).';
    need(errs, v, 'referral', 'Choose one.'); need(errs, v, 'waterSource', 'Choose the water source.');
    if (!inRange(v.pressurePsi, 0, 200)) errs.pressurePsi = 'Check the pressure (0–200 PSI).';
    else if (v.pressurePsi !== null && !confirmed && (v.pressurePsi < 20 || v.pressurePsi > 80)) warns.pressurePsi = v.pressurePsi < 20 ? 'Very low pressure — tell the customer flow may be slow.' : 'High pressure — a reducing valve is needed.';
    if (v.rawTds === null) errs.rawTds = 'Measure the raw water TDS.'; else if (!inRange(v.rawTds, 0, 5000)) errs.rawTds = 'Check the TDS number (0–5000).';
    else if (v.rawTds >= 250 && !confirmed) warns.rawTds = 'TDS 250+ → offer the Siliphos option.';
    need(errs, v, 'deviceSerial', 'Enter the device serial.');
    { const ns = R.normSerial(v.deviceSerial); const stock = stockSerials(); if (ns && stock.length && !stock.includes(ns) && !(v._id && R.normSerial((S.D.customers.get(v._id) || {}).deviceSerial) === ns)) warns.deviceSerial = 'This number is not "In stock" in Devices — check the sticker, or receive it into stock first.'; } /* v0.17.2 (6) */ need(errs, v, 'installDate', 'Enter the date.'); need(errs, v, 'signUpDate', 'Enter the date.');
    if ((v.checks || []).length < OPT.installChecks.length && !v._edit) errs.checks = `Tick all ${OPT.installChecks.length} checks before finishing.`;
    if (v.purifiedTds === null && !v._edit) errs.purifiedTds = 'Measure the purified water TDS.'; else if (!inRange(v.purifiedTds, 0, 5000)) errs.purifiedTds = 'Check the TDS number.';
    if (v.flow === null && !v._edit) errs.flow = 'Measure the flow.'; else if (!inRange(v.flow, 0, 10)) errs.flow = 'Check the flow (0–10 L/min).';
    else if (v.flow > UV_FLOW_LIMIT && !confirmed) warns.flow = `Above ${UV_FLOW_LIMIT} L/min the UV margin is thin — tighten the flow restrictor.`;
    if (!v._edit) {
      need(errs, v, 'firstPay', 'Choose one.');
      if (String(v.firstPay).startsWith('Received') && !v.payMethod) errs.payMethod = 'How was it paid?';
      if (v.firstPay === 'Not yet' && !confirmed) warns.firstPay = 'The install is not finished until the payment is confirmed. It will show as due today.';
      if (v.payMethod === 'Cash' && !mayTakeCash() && !confirmed) warns.payMethod = 'Only Tara may take cash.';
      const np = S.formPhotos.length;
      if (!np) errs.photos = 'Add the photos — a visit without photos does not count.';
      else if (np < 3 && !confirmed) warns.photos = `3 photos are needed — you have ${np}.`;
    }
    need(errs, v, 'agent', 'Who installed?');
    if (!v._edit && !confirmed && !(v.gps && Number.isFinite(Number(v.gps.lat)))) warns.gps = 'No location saved — tap “Get location now” at the door. Without it the house is missing from the map and the route.'; /* v0.11.1 (#4) */
    if (!v._edit && !confirmed && S.settings.screenWarn === 'Yes' && phone && !R.findScreening(arr('screenings'), S.convertLead, phone)) warns.name = 'No sign-up screening for this phone yet — do one first (🔎 New → Sign-up screening), or save anyway.';
    const scr = !v._edit && phone ? R.findScreening(arr('screenings'), S.convertLead, phone) : null; /* v0.10 H5: the ID must be seen by the install day */
    if (scr && !confirmed && scr.idSeen !== 'Yes') warns.name = (warns.name ? warns.name + ' ' : '') + 'ID not seen at the screening — see the ID before installing (hold).';
    if (v.buyerPan && !/^\d{9}$/.test(String(v.buyerPan).replace(/\s/g, ''))) errs.buyerPan = 'PAN has 9 digits.';
    return { errs, warns, phone };
  },
  save(v, id, isNew) {
    const priv = v.privateNotes; delete v.privateNotes;
    const phone = normPhone(v.phone);
    const sig = v.sign; const data = { ...v, phone, ward: String(v.ward), buyerPan: String(v.buyerPan || '').replace(/\s/g, '') };
    delete data.firstPay; delete data.payMethod; delete data.payRef; delete data.payBillNo; delete data.sign; const vial = data.vialStarted === 'Yes'; delete data.vialStarted;
    if (isNew) { data.signed = !!sig; if (sig) data.noSign = ''; } else { delete data.signName; delete data.noSign; } /* the edit form has no signature box */
    if (isNew) { data.code = newCode(); data.status = 'Active'; }
    if (!data.plan) data.plan = 'Standard'; /* v0.11.2 (#19) Jun: one plan — "기본+전원옵션 빼라" */
    // v0.11: household size and the water they drank before come from the sign-up screening (asked once, there) — sales statistics, blank when there was no screening
    const scr0 = isNew ? R.findScreening(arr('screenings'), S.convertLead, phone) : null;
    if (scr0) { if (data.householdSize === undefined || data.householdSize === null) data.householdSize = scr0.householdSize ?? null; if (!data.prevWater) data.prevWater = scr0.prevWater || ''; }
    // converted from a lead → link both ways and mark the lead signed (sales stage days)
    const lead0 = isNew && S.convertLead ? S.D.leads.get(S.convertLead) : null; // the same person only (a cancelled convert must not link a later install)
    const lead = lead0 && (lead0.phone ? normPhone(lead0.phone) === phone : String(lead0.name || '').trim() === String(v.name || '').trim()) ? lead0 : null;
    if (lead) data.leadId = lead.id;
    const ok = save(`customers/${id}`, data, isNew);
    if (lead && ok && (isBoss() || lead.createdBy === S.user.uid)) { const sd = { ...(lead.stageDates || {}) }; if (!sd.New) sd.New = R.leadDates(lead).lead || v.signUpDate; if (!sd.Signed) sd.Signed = v.signUpDate || today(); save(`leads/${lead.id}`, { outcome: 'Signed', stageDates: sd, customerId: id, followUpDate: '' }, false); }
    if (isNew) S.convertLead = ''; // someone else's lead: the customer's leadId is the link (the funnel treats it as signed)
    if (isBoss() && priv !== undefined && (priv || !isNew)) save(`customers/${id}/private/main`, { notes: priv || '' }, false);
    if (isNew && String(v.firstPay).startsWith('Received')) {
      save(`payments/${newId('payments')}`, { customerId: id, date: v.installDate, type: 'Installation fee (4,900)', amount: R.PRICES.installFee, method: v.payMethod, ref: v.payRef || '', billNo: String(v.payBillNo || '').trim(), point: 'Field visit', by: myName() }, true);
    }
    if (isNew && ok && vial) save(`waterTests/${newId('waterTests')}`, { customerId: id, sampledDate: v.installDate, result: '', by: myName() }, true); /* v0.9 #10 */
    const np = (isNew ? savePhotos(id, `customers/${id}`, 'install') : savePhotos(id, `customers/${id}`, 'customer')) + (isNew && ok ? saveSign(id, `customers/${id}`, sig, v.signName) : 0);
    return { ok, np, go: ['customers', 'detail', { id, inst: id }] }; /* v0.14: installed card button on the page */
  },
};
FORMS.customerEdit = {
  col: 'customers', title: 'Edit customer', icon: '✏️', edit: true,
  spec: () => [
    { k: 'status', l: 'Status', t: 'chips', o: OPT.custStatus, req: 1 },
    { k: 'churnDate', l: 'Churn date', t: 'date', show: (v) => v.status === 'Churned' },
    // v0.9 #2: each pause is one line in the home's pause history (start · why · planned restart · restarted)
    { k: 'pausedFrom', l: 'Paused from', t: 'date', def: () => ((editedCust() || {}).status === 'Paused' ? '' : today()), show: (v) => v.status === 'Paused', hint: 'Empty is fine for a home that was paused before this box existed.' },
    { k: 'pauseReason', l: 'Why paused', t: 'chips', o: OPT.pauseReason, show: (v) => v.status === 'Paused' },
    { k: 'pausedUntil', l: 'Paused until', t: 'date', show: (v) => v.status === 'Paused', hint: 'Empty = the skipped bill day + 1 month − 1 day. At most 1 month.' },
    { k: 'pauseInfo', t: 'info', show: (v) => v.status === 'Paused' },
    { k: 'resumedOn', l: 'Restarted on', t: 'date', def: today, show: (v) => v.status === 'Active' && (editedCust() || {}).status === 'Paused' },
    ...FORMS.install.spec().filter((f) => !['checks', 'purifiedTds', 'flow', 'firstPay', 'payMethod', 'payRef', 'payBillNo', 'photos', 'signName', 'sign', 'noSign', 'vialStarted'].includes(f.k) && !(f.t === 'section' && ['Final checks', 'First-day payment', 'Photos', 'Customer signature', 'Raw-water vial (PoC)'].includes(f.l))),
    { t: 'section', l: 'Household', hint: 'Usually filled from the sign-up screening.' },
    { k: 'householdSize', l: 'People in the household', t: 'number' },
    { k: 'prevWater', l: 'Drinking water before KORA', t: 'chips', o: OPT.prevWater },
    { k: 'photos', l: 'Add photos', t: 'photos' },
  ],
  info(v) {
    const c = (v._id && S.D.customers.get(v._id)) || editedCust(); if (!c || v.status !== 'Paused') return '';
    const line = (x) => `<div>${esc(x)}</div>`; const E = R.pauseEligibility(c, model().ledgers.get(c.id), today(), { from: v.pausedFrom, reason: v.pauseReason, until: v.pausedUntil });
    return (E.skipDue ? line(`Skipped bill: ${E.skipDue} · paused until ${v.pausedUntil || E.until}`) : '') + line('Back within 15 days of that bill day → that bill is charged. Either way it is the one pause for 12 months.') + line('Collect the cartridges at the start · fit new ones at the restart visit.')
      + (E.why.length ? `<div class="warn" style="margin-top:6px">⚠️ ${E.why.map(esc).join('<br>')}</div>` : line('✅ All pause rules met.'));
  },
  check(v, confirmed) {
    const r = FORMS.install.check({ ...v, _edit: true }, confirmed); if (v.status === 'Churned' && !v.churnDate) r.errs.churnDate = 'When did they leave?';
    const pc = S.D.customers.get(v._id); if (v.status === 'Paused' && pc && pc.status !== 'Paused' && !confirmed) { const E = R.pauseEligibility(pc, model().ledgers.get(pc.id), today(), { from: v.pausedFrom, reason: v.pauseReason, until: v.pausedUntil }); if (E.why.length) r.warns.pauseReason = E.why.join(' '); }
    if (v.status === 'Paused') { if (!v.pausedFrom && (S.D.customers.get(v._id) || {}).status !== 'Paused') r.errs.pausedFrom = 'When did it stop?'; if (!v.pauseReason) r.errs.pauseReason = 'Choose why.'; if (v.pausedUntil && v.pausedFrom && v.pausedUntil < v.pausedFrom) r.errs.pausedUntil = 'Cannot be before the pause starts.'; }
    const open = R.pauseSpans(S.D.customers.get(v._id) || {}, today()).find((p) => p.open);
    if (v.status === 'Active' && v.resumedOn && open && open.from && v.resumedOn < open.from) r.errs.resumedOn = 'Cannot be before the pause started.';
    return r;
  },
  save(v, id) {
    const prev = S.D.customers.get(id) || {}; const log = Array.isArray(prev.pauseLog) ? prev.pauseLog.map((p) => ({ ...p })) : []; const t = today();
    const open = log.length && !R.isDate(log[log.length - 1].resumed) ? log[log.length - 1] : null;
    if (v.status === 'Paused') {
      const E = R.pauseEligibility(prev, model().ledgers.get(id), t, { from: v.pausedFrom }); /* v0.10: the bill the pause skips is fixed when it is saved */
      if (!v.pausedUntil && E.until) v.pausedUntil = E.until;
      if (open) Object.assign(open, { from: v.pausedFrom, until: v.pausedUntil || '', reason: v.pauseReason, skipDue: open.skipDue || E.skipDue || '' });
      else log.push({ from: v.pausedFrom || '', until: v.pausedUntil || '', reason: v.pauseReason, skipDue: E.skipDue || '', resumed: '', by: myName(), at: new Date().toISOString() });
    } else if (prev.status === 'Paused') {
      const end = v.status === 'Active' ? v.resumedOn || t : v.churnDate || t;
      if (open) Object.assign(open, { resumed: end, endedAs: v.status });
      else log.push({ from: R.isDate(prev.pausedFrom) ? prev.pausedFrom : '', until: prev.pausedUntil || '', reason: prev.pauseReason || '', resumed: end, endedAs: v.status, by: myName(), at: new Date().toISOString() });
    }
    const d = { ...v, pauseLog: log }; delete d.resumedOn;
    if (v.status !== 'Paused') { d.pausedFrom = ''; d.pauseReason = ''; d.pausedUntil = ''; }
    return FORMS.install.save(d, id, false);
  },
};
FORMS.visit = {
  col: 'visits', title: 'Visit', icon: '🔧',
  spec: () => [
    custPicker,
    { k: 'dueBox', t: 'info' }, /* v0.11.1 (#7): what is due at this house */
    { k: 'date', l: 'Visit date', t: 'date', req: 1, def: today },
    { k: 'visitType', l: 'Visit type', t: 'chips', o: OPT.visitType, req: 1, def: 'Routine check' },
    { k: 'status', l: 'Status', t: 'chips', o: OPT.visitStatus, req: 1, def: '✅ Completed' },
    // 🚪 nobody home: a wasted trip — the visit is still owed, "try again on" moves the next visit (v0.8 #7)
    { k: 'noShowReason', l: 'What happened?', t: 'chips', o: OPT.noShowReason, show: (v) => R.isNoShow(v) },
    { k: 'waitedMin', l: 'Minutes you waited or called', t: 'number', show: (v) => R.isNoShow(v) },
    { k: 'retryDate', l: 'Try again on', t: 'date', show: (v) => R.isNoShow(v), hint: 'The visit stays owed — this date becomes the next visit. After saving, send the "sorry we missed you" message from the customer page.' },
    { t: 'section', k: 'secFilters', l: 'Filters', hint: 'Booking intervals are a guide — decide by what you see. PP brown/black → replace now.', show: (v) => !R.isNoShow(v) },
    { k: 'filters', l: 'Filters changed', t: 'chips', multi: 1, o: OPT.filters, show: (v) => !R.isNoShow(v), hint: S.settings.filterMode === 'Separate' ? '' : 'Filters go together: everything that falls due before the next change is done on this visit (pre-ticked).' },
    { k: 'ppColor', l: 'Old PP filter colour', t: 'chips', o: OPT.ppColor, show: (v) => !R.isNoShow(v) },
    { k: 'oldCollected', l: 'Old filters taken back?', t: 'chips', o: OPT.yesNo, show: (v) => !R.isNoShow(v) && (v.filters || []).length > 0 },
    { k: 'oldCount', l: 'How many old filters', t: 'number', show: (v) => !R.isNoShow(v) && (v.filters || []).length > 0, hint: 'One old filter back for each new one.' },
    { t: 'section', k: 'secMeasure', l: 'Measurements', show: (v) => !R.isNoShow(v) },
    { k: 'tdsBefore', l: 'TDS before', t: 'number', show: (v) => !R.isNoShow(v) },
    { k: 'tdsAfter', l: 'TDS after', t: 'number', hint: 'Required to complete a visit.', show: (v) => !R.isNoShow(v) },
    { k: 'flow', l: 'Flow (L/min)', t: 'number', step: 0.1, ph: 'e.g. 1.1', show: (v) => !R.isNoShow(v) },
    { k: 'parts', l: 'Parts used', t: 'counts', o: partsList, show: (v) => !R.isNoShow(v), hint: 'Tap a part once for each one used (tap again = 2). − takes one off. Counted off stock.' },
    { k: 'issuedFrom', l: 'Parts came from', t: 'chips', o: ['my bag', 'shelf'], def: 'my bag', show: (v) => !R.isNoShow(v) && (v.parts || []).length > 0, hint: 'My bag = issued to me this morning. Shelf = taken straight from stock.' },
    { k: 'partsUsed', l: 'Other parts / extra quantity', t: 'text', ph: 'e.g. O-ring ×2, fitting ×1', show: (v) => !R.isNoShow(v) },
    { k: 'sanitised', l: 'Pipes sanitised on this visit?', t: 'chips', o: OPT.yesNo, hint: 'Full pipe sanitisation every 3 months.', show: (v) => !R.isNoShow(v) },
    { t: 'section', k: 'secCust', l: 'For the customer (visit note)', hint: 'Tap what you did — it goes on the visit note in English and Nepali. Anything else: one line in English or Nepali; the other language is added once the visit reaches the server.', show: (v) => !R.isNoShow(v) }, /* v0.17.0 (8) */
    { k: 'custPick', l: 'What we did', t: 'chips', multi: 1, noi18n: 1, o: () => visitLines().map((x) => x.en), show: (v) => !R.isNoShow(v) }, /* the button words are data (Settings) — not run through the UI dictionary */
    { k: 'custNote', l: 'Anything else for the customer', t: 'text', ph: 'English or नेपाली — one short line', show: (v) => !R.isNoShow(v) },
    { t: 'section', l: 'Next & who' },
    { k: 'nextVisitDate', l: 'Next visit date', t: 'date', hint: 'Required to complete. Suggested: monthly for 6 months after install, then every 3 months.', show: (v) => !R.isNoShow(v) },
    { k: 'technician', l: 'Technician', t: 'chips', o: techNames, req: 1, def: myName },
    { k: 'durationMin', l: 'Time at the house (minutes)', t: 'number', show: (v) => !R.isNoShow(v) },
    { t: 'section', k: 'secSign', l: 'Customer signature', hint: 'Proof we were there — the customer signs with a finger (saved like a photo). No signature → say why.', show: (v) => !R.isNoShow(v) },
    { k: 'signName', l: 'Signed by (name)', t: 'text', show: (v) => !R.isNoShow(v) },
    { k: 'sign', l: '', t: 'sign', show: (v) => !R.isNoShow(v) },
    { k: 'noSign', l: 'No signature — why?', t: 'chips', o: OPT.noSign, show: (v) => !R.isNoShow(v) && !v.sign },
    { t: 'section', l: 'Photos', hint: 'Filter change: old filter · device after · TDS after. Repair: fault close-up · working after. Label each photo — "before" and "after" go on the visit note.' },
    { k: 'photos', l: 'Photos', t: 'photos', roles: ['before', 'after', 'tds', 'other'] }, /* v0.19.0 (4) */
    { k: 'notes', l: 'Notes', t: 'textarea', ph: 'complaints, symptoms, anything to remember' },
  ],
  info(v) {
    const x = v.customerId ? model().cust.get(v.customerId) : null; if (!x) return '';
    const due = (x.fd || []).filter((f) => f.status === 'overdue' || f.status === 'due').map((f) => `${f.type}${f.due ? ' (' + f.due + ')' : ''}`);
    const last = arr('visits').filter((q) => q.customerId === x.c.id && q.status && String(q.status).includes('Completed')).sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    const line = (s) => `<div>${s}</div>`;
    return line(`<b>${esc('Due at this house')}</b>: ${due.length ? esc(due.join(' · ')) : esc('no filter due')}`) + (last ? line(`${esc('Last visit')} ${esc(last.date)} · ${esc(last.visitType || '')}${last.ppColor ? ' · PP ' + esc(last.ppColor) : ''}${last.tdsAfter ? ' · TDS ' + esc(last.tdsAfter) : ''}${esc(last.notes ? ' · ' + String(last.notes).slice(0, 60) : '')}`) : line(esc('No completed visit yet'))) + (x.led && x.led.overdue ? line(`<span style="color:var(--bad)">${esc('Overdue ' + R.npr(x.led.overdue) + ' — ask for it while you are there')}</span>`) : '');
  },
  prefill(p) { const c = S.D.customers.get(p.cid); const x = p.cid ? model().cust.get(p.cid) : null; const due = x ? (x.fb && x.fb.date <= R.addDays(today(), 14) ? x.fb.types : (x.fd || []).filter((f) => f.status === 'overdue').map((f) => f.type)) : []; /* v0.15: together → the whole batch */ return { customerId: p.cid || '', nextVisitDate: c ? R.suggestNextVisit(c.installDate, today()) : '', retryDate: R.addDays(today(), 1), signName: c ? c.name || '' : '', ...(due.length ? { filters: due, visitType: 'Filter change' } : {}) }; },
  check(v, confirmed) {
    const errs = {}, warns = {};
    if (!v.customerId || !S.D.customers.has(v.customerId)) errs.customerId = 'Choose the customer.';
    need(errs, v, 'date'); need(errs, v, 'visitType'); need(errs, v, 'status'); need(errs, v, 'technician', 'Who did the visit?');
    const done = isDone(v.status);
    if (done && v.visitType === 'Filter change' && !(v.filters || []).length) errs.filters = 'Which filters did you change?';
    if (done && v.tdsAfter === null) errs.tdsAfter = 'Measure TDS after.';
    if (done && !v.nextVisitDate) errs.nextVisitDate = 'Enter the next visit date.';
    if (!inRange(v.tdsBefore, 0, 5000)) errs.tdsBefore = 'Check the TDS number (0–5000).';
    if (!inRange(v.tdsAfter, 0, 5000)) errs.tdsAfter = 'Check the TDS number (0–5000).';
    if (!inRange(v.flow, 0, 10)) errs.flow = 'Check the flow (0–10 L/min).';
    else if (v.flow !== null && v.flow > UV_FLOW_LIMIT && !confirmed) warns.flow = `Above ${UV_FLOW_LIMIT} L/min the UV margin is thin — check the flow restrictor.`;
    if (!inRange(v.oldCount, 0, 20)) errs.oldCount = 'Check this number (0–20).';
    const nf = (v.filters || []).length;
    if (nf && !confirmed && (v.oldCollected !== 'Yes' || (v.oldCount !== null && v.oldCount < nf))) warns.oldCount = `${nf} new filter(s) → ${nf} old filter(s) back.`;
    if (['Brown', 'Black'].includes(v.ppColor) && !(v.filters || []).includes('PP') && !confirmed) warns.ppColor = `PP is ${v.ppColor.toLowerCase()} — replace it now.`;
    if (!inRange(v.durationMin, 0, 600)) errs.durationMin = 'Check the minutes (0–600).';
    if (R.isNoShow(v)) {
      if (!v.noShowReason) errs.noShowReason = 'What happened at the door?';
      if (!v.retryDate) errs.retryDate = 'When will you try again? The visit is still owed.';
      else if (v.retryDate <= v.date) errs.retryDate = 'Pick a day after the visit.';
      if (!inRange(v.waitedMin, 0, 240)) errs.waitedMin = 'Check the minutes (0–240).';
    }
    if (done && !v._edit && !v.sign && !v.noSign && !confirmed && S.settings.signAsk === 'Yes') warns.noSign = 'No signature — ask the customer to sign, or say why.';
    if (done && !v._edit) { const np = S.formPhotos.length; if (!np) errs.photos = 'A visit without photos does not count as done.'; else if (np < 3 && !confirmed && ['Filter change', 'Repair'].includes(v.visitType)) warns.photos = `3 photos for this visit — you have ${np}.`; }
    return { errs, warns };
  },
  save(v, id, isNew) {
    const c = S.D.customers.get(v.customerId);
    const sig = v.sign; const data = { ...v, customerCode: c.code || '', customerName: c.name || '', oldCollected: v.oldCollected === 'Yes' ? true : v.oldCollected === 'No' ? false : null };
    delete data.sign; if (sig) { data.signed = true; data.noSign = ''; } else if (isNew || !(S.D.visits.get(id) || {}).signed) data.signed = false; /* an edit without a new signature keeps the old one */
    { const VL = visitLines(); const prev = S.D.visits.get(id) || {}; data.custPick = (v.custPick || []).filter((en) => typeof en === 'string').slice(0, 6); /* v0.17.0 (8): both languages saved with the visit — a later edit of the buttons does not change old notes */
      data.custLines = data.custPick.map((en) => { const q = VL.find((x) => x.en === en) || (Array.isArray(prev.custLines) ? prev.custLines.find((x) => x && x.en === en) : null); return { en, ne: q ? q.ne || '' : '' }; });
      data.custNote = String(v.custNote || '').trim().slice(0, 200); if (!isNew && String(prev.custNote || '') !== data.custNote) data.custNoteTr = null; } /* a changed line waits for its new translation */
    if (isNew) { const e = omwFor(v.customerId, v.date); if (e) { data.omwAt = new Date(e.at).toISOString(); data.omwEta = e.eta; } } // "on my way" sent that day → stamped for the wasted-trip page
    const ok = save(`visits/${id}`, data, isNew);
    if (isNew && ok) omwClear(v.customerId);
    const np = savePhotos(v.customerId, `visits/${id}`, v.visitType === 'Repair' ? 'repair' : 'visit') + (ok ? saveSign(v.customerId, `visits/${id}`, sig, v.signName) : 0);
    return { ok, np, go: ['customers', 'detail', { id: v.customerId, vrep: id }] };
  },
};
FORMS.payment = {
  col: 'payments', title: 'Payment', icon: '💵',
  spec: () => [
    custPicker,
    { k: 'due', t: 'info' },
    { k: 'date', l: 'Payment date', t: 'date', req: 1, def: today },
    { k: 'type', l: 'What for', t: 'chips', o: () => R.PAYMENT_TYPES.filter((x) => !R.NONCASH.has(x) || isBoss()), req: 1, def: 'Monthly subscription' },
    { k: 'months', l: 'Prepay — how many bills?', t: 'chips', o: ['1', '2', '3', '6', '12'], def: '1', show: (v) => v.type === 'Monthly subscription', hint: 'The amount fills in: the next bills added up. More than one = paid ahead; each bill keeps its own date on the receipt.' }, /* v0.19.0 (3) Jun 10/4 "선납 옵션" — no discount: one price (memory kora-price-1100-decision) */
    { k: 'amount', l: 'Amount received (NPR)', t: 'number', req: 1 },
    { k: 'method', l: 'Paid by', t: 'chips', o: OPT.method, req: 1, def: 'Khalti' },
    { k: 'ref', l: 'Transaction ID', t: 'text', ph: 'from Khalti / eSewa / bank' },
    { k: 'billNo', l: 'VAT bill no.', t: 'text', ph: 'number on the VAT bill you gave', hint: 'Goes into the IRD sales book for the CA (Money → CA pack). The app does not print tax invoices.', show: (v) => v.type !== 'Referral credit' },
    { k: 'point', l: 'Where', t: 'chips', o: OPT.point, def: 'Field visit' },
    { k: 'lateReason', l: 'Paid late — why?', t: 'chips', o: OPT.lateReason, show: (v) => isLate(v.customerId) || (editingForm() && !!v.lateReason), hint: 'Ask once. "Money not come in yet" (remittance, salary) vs "no money this month" need different fixes.' },
    { k: 'discount', l: 'Discount given (NPR)', t: 'number' },
    { k: 'discountReason', l: 'Discount reason', t: 'chips', o: OPT.discountReason, show: (v) => Number(v.discount) > 0 },
    { k: 'referralFor', l: 'Referral credit for (the new customer)', t: 'customer', show: (v) => v.type === 'Referral credit', admin: 1 },
    { k: 'notes', l: 'Notes', t: 'textarea' },
  ],
  prefill(p) {
    const x = p.cid && model().cust.get(p.cid); if (!x) return { customerId: p.cid || '' };
    const b = x.led.nextBill; const owed = x.led.overdue > 0 ? x.led.overdue : b ? b.amount - b.paid : null;
    S.payLost = p.lost || ''; /* v0.19.0 (8): a lost-device settlement opened from the customer page remembers which contract event it closes */
    return { customerId: p.cid, amount: p.amount || owed, type: b && b.k === 1 ? 'Installation fee (4,900)' : 'Monthly subscription', referralFor: p.referralFor || '', ...(p.type ? { type: p.type } : {}) };
  },
  onChange(form, v, key) { /* v0.19.0 (3): the "how many bills" chip → the amount = the next N open bills (beyond the ledger: the price rule) */
    if (key !== 'months' || v.type !== 'Monthly subscription') return; const n = Math.max(1, Number(v.months) || 1); const x = v.customerId && model().cust.get(v.customerId); if (!x) return;
    const open = x.led.bills.filter((b) => b.status !== 'paid'); let sum = 0, k = 0;
    for (let i = 0; i < n; i++) { const b = open[i]; if (b) { sum += b.amount - b.paid; k = b.k; } else { k = (k || (x.led.bills.length ? x.led.bills[x.led.bills.length - 1].k : 1)) + 1; sum += R.billAmount(k).amount; } }
    const el = form.elements.amount; if (el) el.value = Math.round(sum);
  },
  info(v) {
    const x = v.customerId && model().cust.get(v.customerId); if (!x) return '';
    const b = x.led.nextBill;
    return `<b>${esc(custLabel(x.c))}</b><br>${x.led.overdue > 0 ? `🔴 Overdue <b>${R.npr(x.led.overdue)}</b> since ${esc(x.led.overdueSince)} (${x.led.daysOverdue} days)` : '✅ Nothing overdue'}<br>${b ? `Next: bill ${b.k} · <b>${R.npr(b.amount - b.paid)}</b> on ${esc(b.due)}${b.deposit ? ` <span class="muted">(incl. deposit ${R.npr(b.deposit)})</span>` : ''}` : 'No more bills — has left'}`;
  },
  check(v, confirmed) {
    const errs = {}, warns = {};
    if (!v.customerId || !S.D.customers.has(v.customerId)) errs.customerId = 'Choose the customer.';
    need(errs, v, 'date'); need(errs, v, 'type'); need(errs, v, 'method', 'How was it paid?');
    if (v.amount === null || !inRange(v.amount, 1, 200000)) errs.amount = 'Enter the amount.';
    if (!inRange(v.discount, 0, 50000)) errs.discount = 'Check the discount.';
    if (v._edit && !isBoss()) { const old = S.D.payments.get(v._id) || {}; for (const k of ['amount', 'date', 'type', 'method', 'discount', 'customerId']) if (String(old[k] ?? '') !== String(v[k] ?? '') && !(old[k] == null && (v[k] === '' || v[k] === null))) errs[k === 'customerId' ? 'customerId' : k] = 'A saved payment can only be changed by Jun — tell him what is wrong.'; }
    if (v.method === 'Cash' && !mayTakeCash() && !confirmed) warns.method = 'Only Tara may take cash. Save anyway only if Tara took it.';
    const x = v.customerId && model().cust.get(v.customerId);
    if (x && v.amount && !confirmed && v.type === 'Monthly subscription') { const owed = x.led.overdue > 0 ? x.led.overdue : x.led.nextBill ? x.led.nextBill.amount - x.led.nextBill.paid : 0; if (owed > 0 && v.amount > owed * 3) warns.amount = `That is more than 3 months (${R.npr(owed)} owed now). Prepayment is fine — check the number.`; }
    if (v.type === 'Referral credit' && !v.referralFor) errs.referralFor = 'Which new customer is this for?';
    if (v.billNo && !confirmed) { const dup = arr('payments').find((q) => q.id !== v._id && String(q.billNo || '').trim() === String(v.billNo).trim()); if (dup) warns.billNo = `Bill no. ${v.billNo} is already on another payment (${dup.date}). Each VAT bill has its own number.`; }
    return { errs, warns };
  },
  save(v, id, isNew) {
    const data = withApproval('payments', id, { ...v, by: myName() });
    const ok = save(`payments/${id}`, data, isNew);
    if (ok && v.type === 'Lost device settlement' && S.payLost && S.D.contractEvents.has(S.payLost)) { save(`contractEvents/${S.payLost}`, { settledDate: v.date, settleAmount: Number(v.amount) || 0, settlePaymentId: id }, false); S.payLost = ''; } /* v0.19.0 (8) Jun 10/4 "정산 누르면 걍 정보 수정 페이지뿐": the money closes the case */
    if (data.approval === 'Pending') setTimeout(() => toast(`Discount ${R.npr(Number(v.discount))} sent for an OK — it counts once approved`, 4500), 50);
    return { ok, np: 0, go: ['customers', 'detail', { id: v.customerId, receipt: id }] };
  },
};
FORMS.request = {
  col: 'requests', title: 'Service request', icon: '📋',
  spec: () => [
    custPicker,
    { k: 'type', l: 'Problem', t: 'chips', o: OPT.reqType, req: 1 },
    { k: 'priority', l: 'Priority', t: 'chips', o: OPT.priority, req: 1, def: 'Normal' },
    { k: 'status', l: 'Status', t: 'chips', o: OPT.reqStatus, req: 1, def: 'Received' },
    { k: 'receivedAt', l: 'Received at', t: 'datetime-local', req: 1, def: nowLocal, hint: 'Office hours → reply within 2 h, visit same or next day.' },
    { k: 'description', l: 'What the customer said', t: 'textarea', req: 1 },
    { k: 'agent', l: 'Handled by', t: 'chips', o: techNames, def: myName },
    { k: 'resolution', l: 'What we did', t: 'textarea', show: (v) => v.status === 'Done' || v.status === 'In progress' },
    { k: 'doneDate', l: 'Done on', t: 'date', show: (v) => v.status === 'Done', def: today },
    { k: 'ourFault', l: 'Whose fault was it?', t: 'chips', o: ['Our unit / our work', 'No — power, water supply or the customer'], def: 'Our unit / our work', show: (v) => v.status === 'Done' && R.REPAIR.types.includes(v.type), hint: 'Billing goes on. Not fixed within 7 days of the report → every day from the report comes off the next bill.' },
  ],
  prefill(p) { return { customerId: p.cid || '', type: p.type || '' }; },
  check(v) {
    const errs = {}, warns = {};
    if (!v.customerId || !S.D.customers.has(v.customerId)) errs.customerId = 'Choose the customer.';
    need(errs, v, 'type', 'What is the problem?'); need(errs, v, 'priority'); need(errs, v, 'status'); need(errs, v, 'receivedAt'); need(errs, v, 'description', 'Write what the customer said.');
    return { errs, warns };
  },
  save(v, id, isNew) {
    const ms = Date.parse(v.receivedAt); const data = { ...v, receivedAtMs: Number.isFinite(ms) ? ms : Date.now(), receivedDate: String(v.receivedAt).slice(0, 10) };
    const ok = save(`requests/${id}`, data, isNew);
    return { ok, np: 0, go: ['customers', 'detail', { id: v.customerId }] };
  },
};
FORMS.lead = {
  col: 'leads', title: 'Lead', icon: '🧲',
  spec: () => [
    { k: 'name', l: 'Name', t: 'text', req: 1 },
    { k: 'phone', l: 'Mobile number', t: 'tel', ph: '98XXXXXXXX' },
    { k: 'tole', l: 'Tole', t: 'select', o: OPT.tole },
    { k: 'ward', l: 'Ward', t: 'select', o: OPT.ward },
    { k: 'channel', l: 'How they heard about KORA', t: 'select', o: OPT.referral },
    { k: 'outcome', l: 'Stage', t: 'chips', o: OPT.leadOutcome, req: 1, def: 'New' },
    { k: 'demoDate', l: 'Demo date', t: 'date', show: (v) => v.outcome === 'Demo booked' },
    { k: 'followUpDate', l: 'Follow up on', t: 'date', show: (v) => !['Signed', 'Rejected'].includes(v.outcome), def: () => R.addDays(today(), 3) },
    { k: 'rejectReason', l: 'Why not', t: 'text', show: (v) => v.outcome === 'Rejected' },
    { k: 'notes', l: 'Notes', t: 'textarea' },
  ],
  check(v) {
    const errs = {}, warns = {};
    if (!v.name || v.name.length < 2) errs.name = 'Enter the name.';
    if (v.phone && !normPhone(v.phone)) errs.phone = 'Enter a Nepal mobile (98XXXXXXXX) or a landline with its area code (061-…).';
    need(errs, v, 'outcome');
    return { errs, warns };
  },
  save(v, id, isNew) {
    // the first day the lead entered each stage (sales stage days, v0.8 #9)
    const prev = S.D.leads.get(id) || {}; const sd = { ...(prev.stageDates || {}) }; const t = today();
    if (!sd.New) sd.New = isNew ? t : (R.leadDates(prev).lead || t); if (!sd[v.outcome]) sd[v.outcome] = t;
    const ok = save(`leads/${id}`, { ...v, phone: normPhone(v.phone) || '', stageDates: sd }, isNew);
    return { ok, np: 0, go: ['today', 'list', { list: 'leads' }] };
  },
};
FORMS.recovery = {
  col: 'recoveries', title: 'Recovery case', icon: '📦',
  spec: () => [
    custPicker,
    { t: 'section', l: 'Why this case exists', hint: 'Recovery protocol: record every attempt — success/fail, days, cost, why it failed (Recovery_Cases design).' },
    { k: 'churnDate', l: 'Customer left on', t: 'date', req: 1, def: today },
    { k: 'reasonCode', l: 'Main reason they left', t: 'chips', o: OPT.leaveReason, req: 1, hint: 'One main reason — the Leavers page adds them up (lost monthly revenue per reason).' },
    { k: 'reason', l: 'In their words', t: 'text', ph: 'e.g. moving to Kathmandu in November' },
    { k: 'startedDate', l: 'Recovery started', t: 'date', req: 1, def: today },
    { k: 'attempts', l: 'Attempts so far', t: 'number', def: 1 },
    { k: 'outcome', l: 'Outcome', t: 'chips', o: OPT.recOutcome, req: 1, def: 'In progress' },
    { k: 'closedDate', l: 'Closed on', t: 'date', show: (v) => v.outcome && v.outcome !== 'In progress' },
    { k: 'failReason', l: 'Why it failed', t: 'textarea', show: (v) => String(v.outcome).startsWith('Failed') || v.outcome === 'Partial', hint: 'This is the real output of the table — why recovery fails.' },
    { t: 'section', l: 'Device & deposit' },
    { k: 'deviceSerial', l: 'Device serial', t: 'text' },
    { k: 'refurbishable', l: 'Can it be refurbished?', t: 'chips', o: OPT.yesNoUnknown },
    { k: 'filterSerials', l: 'Filter serials', t: 'text' },
    { k: 'costNpr', l: 'Cost of recovery (NPR)', t: 'number', hint: 'transport + time' },
    { k: 'depositRefunded', l: 'Deposit refunded (NPR)', t: 'number' },
    { k: 'depositForfeited', l: 'Deposit forfeited (NPR)', t: 'number', hint: 'Forfeited deposit becomes taxable (lawyer R3 D2(c)).' },
    { k: 'photos', l: 'Photos', t: 'photos' },
    { k: 'notes', l: 'Notes', t: 'textarea' },
  ],
  prefill(p) { const c = S.D.customers.get(p.cid); const n = c ? arr('contractEvents').filter((e) => e.customerId === c.id && e.kind === 'Notice to end').sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] : null; return { customerId: p.cid || '', deviceSerial: c ? c.deviceSerial || '' : '', ...(n ? { churnDate: n.endDate || '', reasonCode: n.reasonCode || '' } : {}) }; },
  check(v) {
    const errs = {}, warns = {};
    if (!v.customerId || !S.D.customers.has(v.customerId)) errs.customerId = 'Choose the customer.';
    need(errs, v, 'churnDate'); need(errs, v, 'startedDate'); need(errs, v, 'outcome'); need(errs, v, 'reasonCode', 'Choose the main reason.');
    if (v.outcome && v.outcome !== 'In progress' && !v.closedDate) errs.closedDate = 'When was it closed?';
    if (String(v.outcome).startsWith('Failed') && !v.failReason) errs.failReason = 'Write why — this is what we learn from.';
    const led = v.customerId && model().ledgers.get(v.customerId);
    const held = led ? led.depositCollected : 0;
    if ((Number(v.depositRefunded) || 0) + (Number(v.depositForfeited) || 0) > held + 0.01) warns.depositForfeited = `This customer paid ${R.npr(held)} of deposit so far.`;
    return { errs, warns };
  },
  save(v, id, isNew) {
    const data = withApproval('recoveries', id, { ...v, daysToClose: v.closedDate && v.startedDate ? R.daysBetween(v.startedDate, v.closedDate) : null });
    const ok = save(`recoveries/${id}`, data, isNew);
    if (data.approval === 'Pending') setTimeout(() => toast(`Deposit refund ${R.npr(Number(v.depositRefunded))} sent for an OK — pay it out only after the OK`, 4500), 50);
    const c = S.D.customers.get(v.customerId);
    if (c && c.status !== 'Churned' && (isBoss() || c.createdBy === S.user.uid)) save(`customers/${c.id}`, { status: 'Churned', churnDate: v.churnDate, ...(c.status === 'Paused' ? { pauseLog: R.closePauseLog(c, v.churnDate, 'Churned', myName()), pausedFrom: '', pauseReason: '', pausedUntil: '' } : {}) }, false);
    const np = savePhotos(v.customerId, `recoveries/${id}`, 'recovery');
    if (REC_CLOSED(data) && isBoss() && !DEMO) setTimeout(() => liveSweep(true).catch(() => {}), 4000); /* v0.18.2 (B1): the case is closed → the home's records leave the phones */
    return { ok, np, go: ['today', 'list', { list: 'recoveries' }] };
  },
};
FORMS.checkin = {
  col: 'checkins', title: 'Check-in call', icon: '📞',
  spec: () => [
    custPicker,
    { k: 'kind', l: 'Which call', t: 'chips', o: OPT.checkinKind, lbl: OPT.checkinKindLabel, req: 1 },
    { k: 'date', l: 'Date', t: 'date', req: 1, def: today },
    { k: 'by', l: 'Called by', t: 'chips', o: techNames, req: 1, def: myName },
    // v0.9 #1 payment chase: how, who answered, and the day they will pay
    { k: 'channel', l: 'How', t: 'chips', o: R.CHASE_CHANNELS, req: 1, def: 'Phone', show: isChase },
    { k: 'reached', l: 'Did you reach them?', t: 'chips', o: R.REACHED, req: 1, show: isChase },
    { k: 'promiseDate', l: 'They will pay by', t: 'date', show: (v) => isChase(v) && (['Talked', 'Message sent'].includes(v.reached) || !!v.promiseDate), hint: 'Only if they gave a day. Until then the home waits in “Promised”; if the money is not in by that day it comes back as “Promise broken”.' },
    { k: 'promiseAmount', l: 'Amount promised (NPR)', t: 'number', show: (v) => isChase(v) && !!v.promiseDate, hint: 'Empty = any payment counts.' },
    { k: 'result', l: 'Result', t: 'chips', o: OPT.result, req: 1, show: (v) => !isChase(v) },
    { k: 'satisfaction', l: 'How happy (1–5)', t: 'chips', o: OPT.stars, show: (v) => !isChase(v) },
    { k: 'nps', l: 'How likely to recommend KORA to family or friends? (0–10)', t: 'chips', o: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], hint: 'Ask it word for word — grant reports use this score (NPS). Skip if you did not ask.', show: (v) => !isChase(v) },
    { k: 'lateReason', l: 'If a payment is late — why?', t: 'chips', o: OPT.lateReason, show: (v) => isChase(v) || isLate(v.customerId) || (editingForm() && !!v.lateReason), hint: '"Money not come in yet" can be fixed by moving the bill day; "no money" cannot — so keep the two apart.' },
    { k: 'notes', l: 'What they said', t: 'textarea' },
  ],
  prefill(p) {
    const v = { customerId: p.cid || '', kind: p.kind || '' };
    if (v.kind === R.CHASE_KIND && v.customerId) { const x = model().cust.get(v.customerId); if (x && x.led.overdue > 0) v.promiseAmount = Math.round(x.led.overdue); }
    return v;
  },
  check(v) {
    const errs = {}, warns = {};
    if (!v.customerId || !S.D.customers.has(v.customerId)) errs.customerId = 'Choose the customer.';
    need(errs, v, 'kind'); need(errs, v, 'date'); need(errs, v, 'by');
    if (isChase(v)) {
      need(errs, v, 'channel'); need(errs, v, 'reached');
      if (v.promiseDate && v.date && v.promiseDate < v.date) errs.promiseDate = 'The pay-by day cannot be before the call.';
      const maxD = Number(S.settings.promiseMaxDays) > 0 ? Number(S.settings.promiseMaxDays) : R.PROMISE.maxDays;
      if (v.promiseDate && v.date && R.daysBetween(v.date, v.promiseDate) > maxD) warns.promiseDate = `More than ${maxD} days away — agree an earlier day or a home visit (Settings → Collections).`;
      if (v.promiseAmount !== null && v.promiseAmount !== undefined && !(v.promiseAmount >= 0)) errs.promiseAmount = 'Amount cannot be negative.';
    } else {
      need(errs, v, 'result');
      if (v.result === 'Issue found' && !v.notes) errs.notes = 'Write the issue — a complaint means a visit gets booked.';
    }
    return { errs, warns };
  },
  save(v, id, isNew) {
    const d = { ...v }; const drop = (ks) => { for (const k of ks) { if (isNew) delete d[k]; else d[k] = k === 'promiseAmount' ? null : ''; } }; /* an edit merges on the server → blank, not delete */
    if (isChase(d)) { drop(['result', 'satisfaction', 'nps']); if (!d.promiseDate) { d.promiseDate = ''; d.promiseAmount = null; } } else drop(['channel', 'reached', 'promiseDate', 'promiseAmount']);
    const ok = save(`checkins/${id}`, d, isNew);
    return { ok, np: 0, go: isChase(d) ? ['today', 'list', { list: 'collections' }] : d.result === 'Issue found' ? ['new', 'form', { form: 'request', cid: d.customerId }] : ['today', 'list', { list: 'calls' }] };
  },
};
FORMS.training = {
  col: 'trainings', title: 'Training record', icon: '🎓',
  spec: () => [
    { k: 'person', l: 'Who was trained', t: 'text', req: 1 },
    { k: 'date', l: 'Date', t: 'date', req: 1, def: today },
    { k: 'topic', l: 'Topic', t: 'chips', multi: 1, o: OPT.topic, req: 1 },
    { k: 'trainer', l: 'Trainer', t: 'chips', o: techNames, req: 1, def: myName },
    { k: 'durationMin', l: 'Minutes', t: 'number' },
    { k: 'photos', l: 'Photo of the signed sheet', t: 'photos' },
    { k: 'notes', l: 'What was covered', t: 'textarea' },
  ],
  check(v) { const errs = {}; need(errs, v, 'person'); need(errs, v, 'date'); need(errs, v, 'topic'); need(errs, v, 'trainer'); return { errs, warns: {} }; },
  save(v, id, isNew) { const ok = save(`trainings/${id}`, v, isNew); const np = savePhotos('', `trainings/${id}`, 'training'); return { ok, np, go: ['status', 'report', { r: 'trainings' }] }; },
};
FORMS.stock = {
  col: 'stockMoves', title: 'Stock movement', icon: '📦',
  spec: () => [
    { k: 'item', l: 'Item', t: 'chips', o: stockItems, req: 1 },
    { k: 'type', l: 'Movement', t: 'chips', o: OPT.stockType, req: 1, def: 'In', hint: 'Installs and filter changes are subtracted automatically. Issue = a person takes parts for the day, Return = brings back what is left.' },
    { k: 'person', l: 'Person', t: 'chips', o: techNames, show: (v) => ['Issue', 'Return'].includes(v.type) },
    { k: 'signName', l: 'Signed by (name)', t: 'text', show: (v) => ['Issue', 'Return'].includes(v.type) },
    { k: 'sign', l: 'Signed receipt', t: 'sign', show: (v) => ['Issue', 'Return'].includes(v.type) },
    { k: 'qty', l: 'Quantity', t: 'number', req: 1, hint: 'Adjustment may be negative.' },
    { k: 'date', l: 'Date', t: 'date', req: 1, def: today },
    { k: 'ref', l: 'Reference (PI / shipment / person)', t: 'text' },
    { k: 'notes', l: 'Notes', t: 'textarea' },
  ],
  check(v) {
    const errs = {}; need(errs, v, 'item'); need(errs, v, 'type'); need(errs, v, 'date');
    if (v.qty === null || !Number.isFinite(v.qty) || v.qty === 0 || (v.type !== 'Adjustment' && v.qty < 0) || Math.abs(v.qty) > 5000) errs.qty = 'Enter the quantity.';
    if (['Issue', 'Return'].includes(v.type) && !v.person) errs.person = 'Who takes or brings back the parts?';
    return { errs, warns: {} };
  },
  save(v, id, isNew) { const sig = v.sign; const d = { ...v, signed: !!sig }; delete d.sign; const ok = save(`stockMoves/${id}`, d, isNew); const np = ok ? saveSign('', `stockMoves/${id}`, sig, v.signName) : 0; return { ok, np, go: ['status', 'report', { r: 'stock' }] }; },
};
// ---------- v0.5: expenses · devices · relocations · photos ----------
FORMS.expense = {
  col: 'expenses', title: 'Expense', icon: '🧾', perm: 'expense',
  spec: () => [
    { k: 'date', l: 'Date paid', t: 'date', req: 1, def: today },
    { k: 'category', l: 'Category', t: 'select', o: OPT.expCat, req: 1 },
    { k: 'description', l: 'What was bought', t: 'text', ph: 'e.g. 10 PP filters · September rent · petrol' },
    { k: 'amount', l: 'Amount paid (NPR, VAT included)', t: 'number', req: 1 },
    { k: 'supplier', l: 'Supplier', t: 'text', ph: 'shop / company / person' },
    { k: 'vatBill', l: 'VAT bill (with the supplier PAN)?', t: 'chips', o: OPT.yesNo, req: 1, def: 'No', hint: 'Only a VAT bill gives input VAT back. Petrol pumps, shops and CA fees usually give one if you ask.' },
    { k: 'supplierPan', l: 'Supplier PAN', t: 'text', ph: '9 digits', show: (v) => v.vatBill === 'Yes' },
    { k: 'billNo', l: 'Supplier bill no.', t: 'text', show: (v) => v.vatBill === 'Yes' },
    { k: 'vat', l: 'VAT on the bill (NPR)', t: 'number', step: 0.01, show: (v) => v.vatBill === 'Yes', hint: 'Leave empty = 13% of the amount (amount × 13 ÷ 113).' },
    { k: 'import', l: 'Import (customs declaration)?', t: 'chips', o: OPT.yesNo, def: 'No', show: (v) => v.vatBill === 'Yes' },
    { k: 'customsNo', l: 'Customs declaration no. (प्रज्ञापनपत्र)', t: 'text', show: (v) => v.import === 'Yes' },
    { k: 'capital', l: 'Asset that lasts more than a year?', t: 'chips', o: OPT.yesNo, def: 'No', hint: 'Devices for rent, motorbikes, tools, computer → yes (purchase book capital column).' },
    { k: 'paidFrom', l: 'Paid from', t: 'chips', o: OPT.paidFrom, req: 1, def: 'Company bank' },
    { k: 'method', l: 'Paid by', t: 'chips', o: OPT.expMethod, def: 'Bank transfer' },
    { k: 'reimbursed', l: 'Paid back to Jun?', t: 'chips', o: OPT.yesNo, def: 'No', show: (v) => String(v.paidFrom).startsWith('Jun') },
    { k: 'photos', l: 'Receipt / bill photo (or PDF)', t: 'photos', pdf: 1 },
    { k: 'notes', l: 'Notes', t: 'textarea' },
  ],
  info(v) { return v.vatBill === 'Yes' && Number(v.amount) > 0 ? `Input VAT ${R.npr(R.expVat(v))} · value ${R.npr(Number(v.amount) - R.expVat(v))}` : ''; },
  check(v, confirmed) {
    const errs = {}, warns = {};
    need(errs, v, 'date'); need(errs, v, 'category', 'Choose a category.'); need(errs, v, 'paidFrom');
    if (v.amount === null || !inRange(v.amount, 1, 50000000)) errs.amount = 'Enter the amount.';
    if (v.vatBill === 'Yes') {
      if (v.supplierPan && !/^\d{9}$/.test(String(v.supplierPan).replace(/\s/g, ''))) errs.supplierPan = 'PAN has 9 digits.';
      if (!v.billNo && !confirmed) warns.billNo = 'The purchase book needs the bill number to claim the VAT back.';
      if (v.vat !== null && v.vat !== undefined && v.vat !== '' && !inRange(Number(v.vat), 0, Number(v.amount) || 0)) errs.vat = 'VAT cannot be more than the amount.';
    }
    if (!v._edit && !S.formPhotos.length && !confirmed) warns.photos = 'No receipt photo — the CA may ask for it.';
    return { errs, warns };
  },
  save(v, id, isNew) {
    const data = { ...v, supplierPan: String(v.supplierPan || '').replace(/\s/g, ''), by: myName() };
    const ok = save(`expenses/${id}`, data, isNew);
    const np = savePhotos('', `expenses/${id}`, 'receipt');
    return { ok, np, go: ['status', 'report', { r: 'expenses' }] };
  },
};
FORMS.device = {
  col: 'deviceEvents', title: 'Device event', icon: '📦', perm: 'stock',
  spec: () => [
    { k: 'event', l: 'What happened', t: 'chips', o: OPT.devEvent.filter((e) => !['Installed'].includes(e)), req: 1, def: 'Received into stock', hint: 'Installs, recoveries and relocation swaps are added automatically from those forms.' },
    { k: 'serials', l: 'Serial number(s)', t: 'textarea', req: 1, ph: 'one per line — several at once for a shipment', gen: 1, hint: 'New units: type how many → 🏷️ New KORA numbers (KD-26-0001 …) → same order as the stickers' },
    { k: 'date', l: 'Date', t: 'date', req: 1, def: today },
    { k: 'batch', l: 'Batch / PI', t: 'text', ph: 'e.g. TQ-PI-20260808', show: (v) => ['Received into stock', 'Arrival check OK', 'Arrival check — defect'].includes(v.event) },
    { k: 'cost', l: 'Landed cost per device (NPR)', t: 'number', show: (v) => v.event === 'Received into stock', hint: 'Price + freight + customs + clearing ÷ units (for the asset register).' },
    { k: 'defect', l: 'What is wrong', t: 'text', show: (v) => v.event === 'Arrival check — defect', hint: 'PI: inspect within 14 days of arrival — photos + serial for the claim.' },
    { k: 'photos', l: 'Photos', t: 'photos' },
    { k: 'notes', l: 'Notes', t: 'textarea' },
  ],
  prefill(p) { return { serials: p.serial || '', event: p.event || 'Received into stock' }; },
  check(v) { const errs = {}; need(errs, v, 'event'); need(errs, v, 'date'); if (!String(v.serials || '').trim()) errs.serials = 'Enter at least one serial.'; if (v.event === 'Arrival check — defect' && !v.defect) errs.defect = 'Write what is wrong.'; return { errs, warns: {} }; },
  save(v, id, isNew) {
    const list = [...new Set(String(v.serials).split(/[\n,;]+/).map(R.normSerial).filter(Boolean))];
    let ok = true; let first = '';
    list.forEach((serial, i) => { const eid = i === 0 ? id : newId('deviceEvents'); if (!first) first = serial; const { serials, photos, ...rest } = v; ok = save(`deviceEvents/${eid}`, { ...rest, serial, by: myName() }, isNew || i > 0) && ok; });
    const np = savePhotos('', `deviceEvents/${id}`, 'device');
    return { ok, np, go: ['status', 'report', list.length === 1 ? { r: 'device', serial: first } : { r: 'devices' }] };
  },
};
// v0.9 #3 contract events — the customer agreement working draft (2026-09-03, still with the lawyer)
const isKind = (k) => (v) => v.kind === k;
FORMS.contract = {
  col: 'contractEvents', title: 'Contract event', icon: '📜', perm: 'editCust',
  spec: () => [
    custPicker,
    { k: 'kind', l: 'What happened', t: 'chips', o: R.CONTRACT_KINDS, req: 1 },
    { k: 'date', l: 'Date we were told', t: 'date', req: 1, def: today },
    { k: 'channel', l: 'How they told us', t: 'chips', o: ['WhatsApp', 'SMS', 'Phone', 'In person', 'Letter'], hint: 'Draft §2.14: WhatsApp, SMS or a phone call count as notice.' },
    { k: 'endDate', l: 'They want to end on', t: 'date', show: isKind('Notice to end') },
    { k: 'reasonCode', l: 'Main reason', t: 'chips', o: OPT.leaveReason, show: isKind('Notice to end') },
    { k: 'noticeStatus', l: 'Still leaving?', t: 'chips', o: ['Yes, leaving', 'Withdrawn'], def: 'Yes, leaving', show: isKind('Notice to end'), hint: 'Withdrawn = they changed their mind — the reminder stops.' },
    { k: 'abroad', l: 'Moving abroad (proof seen)?', t: 'chips', o: OPT.yesNo, def: 'No', show: isKind('Notice to end'), hint: 'Jun 2026-09-29: moving abroad with proof → the early-ending charge is halved (🔴 the lawyer words the proof).' },
    { k: 'newName', l: 'New holder — name', t: 'text', show: isKind('Transfer to a new holder') },
    { k: 'newPhone', l: 'New holder — mobile', t: 'tel', ph: '98XXXXXXXX', show: isKind('Transfer to a new holder') },
    { k: 'relation', l: 'Relation to the old holder', t: 'text', ph: 'e.g. son, new owner, tenant', show: isKind('Transfer to a new holder') },
    { k: 'transferReason', l: 'Why', t: 'chips', o: R.TRANSFER_REASONS, show: isKind('Transfer to a new holder') },
    { k: 'depositHandling', l: 'Deposit', t: 'chips', o: ['Carried over to the new holder', 'Refunded — new deposit', 'Not decided'], show: isKind('Transfer to a new holder') },
    { k: 'newSigned', l: 'New holder signed the agreement?', t: 'chips', o: OPT.yesNo, show: isKind('Transfer to a new holder') },
    { k: 'lostDate', l: 'Lost or stolen on', t: 'date', show: isKind('Lost or stolen') },
    { k: 'fault', l: 'Whose fault', t: 'chips', o: R.LOST_FAULT, show: isKind('Lost or stolen') },
    { k: 'policeRef', l: 'Police report no.', t: 'text', show: (v) => v.kind === 'Lost or stolen' && v.fault === R.LOST_FAULT[1] },
    { k: 'settleAmount', l: 'Settlement the customer pays (NPR)', t: 'number', show: isKind('Lost or stolen'), hint: 'Draft §2.5(b): negligence → replacement cost; police report and not their fault → a reasonable settlement. 🔴 The amount is Jun\'s call.' },
    { k: 'settledDate', l: 'Settled on', t: 'date', show: isKind('Lost or stolen') },
    { k: 'terms', t: 'info' },
    { k: 'notes', l: 'Notes', t: 'textarea' },
    { k: 'photos', l: 'Photos (the message, police report…)', t: 'photos' },
  ],
  info(v) {
    const c = S.D.customers.get(v.customerId); if (!c || !v.kind) return '';
    const line = (x) => `<div>${esc(x)}</div>`;
    if (v.kind === 'Notice to end') {
      const T = R.noticeTerms(c, v.date, v.endDate, R.PRICES, { abroad: v.abroad === 'Yes' }); const dep = (model().deposits.rows.find((r) => r.c.id === c.id) || {}).held || 0;
      return T.early ? `<div>⚠️ <b>${esc('Before 36 months')}</b> · <span>${esc(`month ${T.monthN || '?'} · minimum ends ${T.minEnd || '?'}`)}</span></div>` + line(`Early-ending charge (30% of the subscription still to come): ${T.remaining} months left → ${R.npr(T.earlyFee)}`) + line(T.earlyFee >= dep ? `Deposit paid so far ${R.npr(dep)} is used first → the customer pays ${R.npr(T.earlyFee - dep)} more.` : `Deposit paid so far ${R.npr(dep)} is used first → ${R.npr(dep - T.earlyFee)} goes back to the customer.`) + line('Jun set 30% on 2026-09-29 — 🔴 the lawyer still checks whether it holds (draft §2.2).') + line(T.removeBy ? `The unit comes back within 7 days — by ${T.removeBy}.` : 'The unit comes back within 7 days.') + line('The install fee and the months served are not refunded.') + line('🔴 [TBC] what happens to the part of the deposit not paid yet.')
        : line('After 36 months — draft §2.2:') + line(T.earliestEnd ? `30 days' notice — earliest end ${T.earliestEnd}.` : "30 days' notice.") + line(`The deposit (${R.npr(dep)}) is refunded with the unit back in working order.`);
    }
    if (v.kind === 'Transfer to a new holder') return line('🔴 Draft §2.11 (transfer / succession) is still [TBC] with the lawyer — this only records it. Saving puts the new name and phone on the customer; the old ones stay in this record.');
    const LS = R.lostSettlement(c, model().ledgers.get(c.id), v.lostDate || v.date);
    return line(`Settlement: early-ending charge ${R.npr(LS.fee)} + the unit's value ${R.npr(LS.residual)} − deposit paid ${R.npr(LS.deposit)} = ${R.npr(LS.total)}`) + line(`Draft §2.5(b): the customer tells us within ${R.CONTRACT.lostNotifyDays} days.`) + (c.deviceSerial ? line(`Saving marks the device ${c.deviceSerial} as “Lost / stolen”.`) : '');
  },
  prefill(p) { return { customerId: p.cid || '', kind: p.kind || '' }; },
  check(v) {
    const errs = {}, warns = {};
    if (!v.customerId || !S.D.customers.has(v.customerId)) errs.customerId = 'Choose the customer.';
    need(errs, v, 'kind'); need(errs, v, 'date');
    if (v.kind === 'Notice to end') {
      need(errs, v, 'endDate', 'When do they want to end?'); need(errs, v, 'reasonCode', 'Choose the main reason.');
      if (v.endDate && v.date && v.endDate < v.date) errs.endDate = 'Cannot be before the notice.';
      const T = R.noticeTerms(S.D.customers.get(v.customerId), v.date, v.endDate); if (T.shortNotice) warns.endDate = `Less than 30 days' notice (draft §2.2) — earliest end ${T.earliestEnd}.`;
    }
    if (v.kind === 'Transfer to a new holder') {
      if (!v.newName || String(v.newName).trim().length < 2) errs.newName = 'Enter the new holder\'s name.';
      if (!normPhone(v.newPhone)) errs.newPhone = 'Enter a Nepal mobile (98XXXXXXXX) or a landline with its area code (061-…).';
      need(errs, v, 'transferReason', 'Choose why.'); need(errs, v, 'depositHandling', 'Choose what happens to the deposit.');
    }
    if (v.kind === 'Lost or stolen') {
      need(errs, v, 'lostDate', 'When was it lost?'); need(errs, v, 'fault', 'Choose one.');
      if (v.lostDate && v.date && v.lostDate > v.date) errs.lostDate = 'Cannot be after the day we were told.';
      else if (v.lostDate && v.date && R.daysBetween(v.lostDate, v.date) > R.CONTRACT.lostNotifyDays) warns.lostDate = `Told us after ${R.daysBetween(v.lostDate, v.date)} days — the draft asks for ${R.CONTRACT.lostNotifyDays} (§2.5(b)).`;
      if (v.settleAmount !== null && v.settleAmount !== undefined && !(v.settleAmount >= 0)) errs.settleAmount = 'Amount cannot be negative.';
    }
    return { errs, warns };
  },
  save(v, id, isNew) {
    const c = S.D.customers.get(v.customerId) || {}; const d = { ...v, by: myName() }; delete d.terms; delete d.photos;
    for (const [k2, kinds] of Object.entries({ endDate: ['Notice to end'], reasonCode: ['Notice to end'], noticeStatus: ['Notice to end'], abroad: ['Notice to end'], newName: ['Transfer to a new holder'], newPhone: ['Transfer to a new holder'], relation: ['Transfer to a new holder'], transferReason: ['Transfer to a new holder'], depositHandling: ['Transfer to a new holder'], newSigned: ['Transfer to a new holder'], lostDate: ['Lost or stolen'], fault: ['Lost or stolen'], policeRef: ['Lost or stolen'], settleAmount: ['Lost or stolen'], settledDate: ['Lost or stolen'] })) if (!kinds.includes(d.kind) && isNew) delete d[k2];
    if (d.kind === 'Notice to end') { const T = R.noticeTerms(c, d.date, d.endDate, R.PRICES, { abroad: d.abroad === 'Yes' }); const paid = (model().deposits.rows.find((r) => r.c.id === c.id) || {}).held || 0; Object.assign(d, { early: T.early, removeBy: T.removeBy || '', depositPaid: paid, earlyFee: T.earlyFee, earlyNet: T.earlyFee - paid }); }
    if (d.kind === 'Transfer to a new holder') { d.newPhone = normPhone(d.newPhone); if (isNew) { d.oldName = c.name || ''; d.oldPhone = c.phone || ''; } }
    const ok = save(`contractEvents/${id}`, d, isNew);
    if (ok && isNew && d.kind === 'Transfer to a new holder' && c.id) save(`customers/${c.id}`, { name: String(d.newName).trim(), phone: d.newPhone, holderSince: d.date }, false);
    if (ok && isNew && d.kind === 'Lost or stolen' && c.deviceSerial && can('stock')) save(`deviceEvents/${newId('deviceEvents')}`, { event: 'Lost / stolen', serial: R.normSerial(c.deviceSerial), date: d.lostDate || d.date, notes: 'from contract event ' + id, by: myName() }, true);
    const np = savePhotos(v.customerId, `contractEvents/${id}`, 'contract');
    return { ok, np, go: ['customers', 'detail', { id: v.customerId }] };
  },
};
// v0.9 #4 sign-up screening — 🔴 first-guess rules (G-1 has none); the verdict advises, a person decides
FORMS.screening = {
  col: 'screenings', title: 'Sign-up screening', icon: '🔎',
  spec: () => [
    { t: 'section', l: 'Who' },
    { k: 'name', l: 'Name', t: 'text', req: 1 },
    { k: 'phone', l: 'Mobile number', t: 'tel', req: 1, ph: '98XXXXXXXX' },
    { k: 'tole', l: 'Tole', t: 'select', o: OPT.tole },
    { k: 'date', l: 'Date', t: 'date', req: 1, def: today },
    { t: 'section', l: 'Home', hint: '🔴 First-guess rules (G-1 has no sign-up rule yet) — the verdict only advises; you decide at the end.' },
    { k: 'housing', l: 'Own house or rent?', t: 'chips', o: ['Own house', 'Renting'], req: 1 },
    { k: 'mount', l: 'Unit on the wall or on a stand?', t: 'chips', o: ['Stand', 'Wall'], def: 'Stand', show: (v) => v.housing === 'Renting', hint: 'Wall = drilling. Renting + wall needs the landlord\'s written OK.' },
    { k: 'landlordOk', l: 'Landlord agreed in writing?', t: 'chips', o: OPT.yesNo, show: (v) => v.housing === 'Renting' && v.mount === 'Wall' },
    { k: 'landlordName', l: 'Landlord — name', t: 'text', show: (v) => v.housing === 'Renting' },
    { k: 'landlordPhone', l: 'Landlord — mobile', t: 'tel', ph: '98XXXXXXXX', show: (v) => v.housing === 'Renting' },
    { k: 'yearsHere', l: 'Years living in this house', t: 'number', step: 0.5 },
    { k: 'stay36', l: 'Will they stay here 36 months?', t: 'chips', o: ['Yes', 'Not sure', 'No'], req: 1 },
    { k: 'householdSize', l: 'People in the household', t: 'number' },
    { t: 'section', l: 'Water & money' },
    { k: 'prevWater', l: 'Drinking water now', t: 'chips', o: OPT.prevWater },
    { k: 'waterSpend', l: 'Spent on drinking water a month (NPR)', t: 'number' },
    { k: 'income', l: 'Main income', t: 'chips', o: R.SCREEN_INCOME, hint: 'Only the kind — do not ask the amount.' },
    { k: 'remitMonths', l: 'Months the money usually comes', t: 'text', ph: 'e.g. Baisakh, Kartik', show: (v) => v.income === 'Money from abroad', hint: 'For the bill day — not a reason to hold.' },
    { k: 'cashDay1', l: 'First-day 4,900 in cash on the install day?', t: 'chips', o: OPT.yesNo, req: 1, hint: 'No = hold. The first day is not split, owed or waived.' },
    { t: 'section', l: 'Checks' },
    { k: 'phone2', l: 'Second phone (family)', t: 'tel' },
    { k: 'phone2Who', l: 'Whose is it', t: 'text', ph: 'e.g. husband, son abroad' },
    { k: 'referee', l: 'Referee — name · relation · phone', t: 'text', ph: 'a neighbour, ward person or relative', hint: 'Needed when there is only one phone, or renting here under a year.' },
    { k: 'consentSigned', l: 'Consent form signed?', t: 'chips', o: OPT.yesNo, hint: 'Needed before we tell a family number or referee about a late bill.' },
    { k: 'verifyBy', l: 'Check call made by', t: 'text', ph: 'someone other than the seller — usually Tara' },
    { k: 'verifyDate', l: 'Check call on', t: 'date' },
    { k: 'idSeen', l: 'Citizenship card / ID seen?', t: 'chips', o: OPT.yesNo, req: 1, hint: 'Tick only — do not write the number or photograph it.' },
    { k: 'power', l: 'Power point near the tap?', t: 'chips', o: OPT.yesNo, req: 1 },
    { k: 'tap', l: 'A tap the unit can use?', t: 'chips', o: OPT.yesNo, req: 1 },
    { k: 'waterSource', l: 'Water source', t: 'chips', o: OPT.waterSource },
    { k: 'verdictBox', t: 'info' },
    { k: 'decision', l: 'Your decision', t: 'chips', o: ['Go ahead', 'Wait', 'Say no'], req: 1 },
    { k: 'notes', l: 'Notes', t: 'textarea' },
  ],
  info(v) {
    const V = R.screenVerdict(v); const head = { Pass: '✅ Pass', Check: '🟡 Check first', Hold: '🔴 Hold' }[V.verdict];
    return `<div><b>${esc(head)}</b></div>${V.hold.map((x) => `<div>🔴 <span>${esc(x)}</span></div>`).join('')}${V.check.map((x) => `<div>🟡 <span>${esc(x)}</span></div>`).join('')}<div class="muted">${esc('First-guess rules — you decide below.')}</div>`;
  },
  prefill(p) { S.screenLead = p.lead || ''; const l = p.lead ? S.D.leads.get(p.lead) : null; return l ? { name: l.name || '', phone: l.phone || '', tole: l.tole || '' } : {}; },
  check(v) {
    const errs = {}, warns = {};
    if (!v.name || v.name.length < 2) errs.name = 'Enter the name.';
    if (!normPhone(v.phone)) errs.phone = 'Enter a Nepal mobile (98XXXXXXXX) or a landline with its area code (061-…).';
    if (v.phone2 && !normPhone(v.phone2)) errs.phone2 = 'Enter a Nepal mobile (98XXXXXXXX) or a landline with its area code (061-…).';
    need(errs, v, 'date'); need(errs, v, 'housing', 'Choose one.'); need(errs, v, 'stay36', 'Choose one.'); need(errs, v, 'idSeen', 'Choose one.'); need(errs, v, 'power', 'Choose one.'); need(errs, v, 'tap', 'Choose one.'); need(errs, v, 'decision', 'Choose your decision.');
    if (v.housing === 'Renting' && v.mount === 'Wall') need(errs, v, 'landlordOk', 'Choose one.'); need(errs, v, 'cashDay1', 'Choose one.');
    if (!inRange(v.householdSize, 1, 40)) errs.householdSize = 'Check this number (1–40).';
    if (v.decision === 'Go ahead' && R.screenVerdict(v).verdict === 'Hold') warns.decision = 'The rules say hold — write why you go ahead in the notes.';
    return { errs, warns };
  },
  save(v, id, isNew) {
    const V = R.screenVerdict(v); const phone = normPhone(v.phone);
    const lead = isNew ? (S.screenLead && S.D.leads.get(S.screenLead)) || arr('leads').find((l) => l.phone && l.phone === phone) : null; /* an edit never re-links */
    const prev = S.D.screenings.get(id) || {};
    const d = { ...v, phone, phone2: normPhone(v.phone2) || '', verdict: V.verdict, verdictWhy: [...V.hold, ...V.check], leadId: prev.leadId || (lead ? lead.id : ''), by: myName() }; delete d.verdictBox;
    const ok = save(`screenings/${id}`, d, isNew); S.screenLead = '';
    return { ok, np: 0, go: ['today', 'list', { list: 'screenings' }] };
  },
};
// v0.9 #6 supplier claims — PI TQ-PI-20260808 conditions 4 (30 days after install) and 7 (14 days after arrival)
FORMS.claim = {
  col: 'claims', title: 'Supplier claim', icon: '📮', perm: 'stock',
  spec: () => [
    { k: 'supplier', l: 'Supplier', t: 'text', req: 1, def: 'Frank' },
    { k: 'piNo', l: 'PI / order no.', t: 'text', def: 'TQ-PI-20260808' },
    { k: 'what', l: 'What', t: 'chips', o: ['Device', 'Part'], req: 1, def: 'Device' },
    { k: 'serial', l: 'Device serial', t: 'text', show: (v) => v.what === 'Device' },
    { k: 'part', l: 'Part', t: 'text', ph: 'e.g. UV lamp, 1/2" to 1/4" adapter', show: (v) => v.what === 'Part' },
    { k: 'qty', l: 'How many', t: 'number', def: 1 },
    { k: 'problem', l: 'Problem', t: 'chips', o: R.CLAIM_PROBLEMS, req: 1 },
    { k: 'foundDate', l: 'Found on', t: 'date', req: 1, def: today },
    { k: 'basis', l: 'Which PI rule', t: 'chips', o: R.CLAIM_BASIS, req: 1 },
    { k: 'arrivalDate', l: 'Goods arrived on', t: 'date', show: (v) => v.basis === R.CLAIM_BASIS[0] },
    { k: 'installDate', l: 'Installed on', t: 'date', show: (v) => v.basis === R.CLAIM_BASIS[1] },
    { k: 'deadlineBox', t: 'info' },
    { k: 'sentDate', l: 'Claim sent on', t: 'date' },
    { k: 'reply', l: 'Supplier reply', t: 'textarea' },
    { k: 'result', l: 'Result', t: 'chips', o: R.CLAIM_RESULTS, def: 'Waiting' },
    { k: 'creditUsd', l: 'Credit (USD)', t: 'number', step: 0.01, show: (v) => v.result === 'Credited' },
    { k: 'usedInOrder', l: 'Taken off an order already?', t: 'chips', o: OPT.yesNo, show: (v) => v.result === 'Credited' },
    { k: 'closedDate', l: 'Closed on', t: 'date', show: (v) => v.result && v.result !== 'Waiting' },
    { k: 'photos', l: 'Photos (serial label, the fault, the box)', t: 'photos' },
    { k: 'notes', l: 'Notes', t: 'textarea' },
  ],
  info(v) {
    const by = R.claimDeadline(v); if (!by) return v.basis ? esc('Fill in the date above — the deadline comes from it.') : '';
    const t = today(); const late = v.foundDate && v.foundDate > by;
    return `<div><b>${esc(`Claim by ${by}`)}</b> · <span>${esc(v.basis === R.CLAIM_BASIS[1] ? 'PI 4: 30 days after install' : 'PI 7: 14 days after arrival')}</span></div>${late ? `<div>⚠️ ${esc('Found after the deadline — ask anyway, but the PI does not promise it.')}</div>` : !v.sentDate && by >= t ? `<div>${esc(`${R.daysBetween(t, by)} day(s) left to send it.`)}</div>` : ''}`;
  },
  prefill(p) {
    const s2 = p.serial ? R.normSerial(p.serial) : ''; const d = s2 ? model().devices.find((x) => x.serial === s2) : null;
    const firstIn = d ? d.events.find((e) => e.event === 'Received into stock') : null; const inst = d ? d.events.filter((e) => e.event === 'Installed').pop() : null;
    return { serial: s2, what: 'Device', arrivalDate: firstIn ? firstIn.date : '', installDate: inst ? inst.date : '', basis: inst ? R.CLAIM_BASIS[1] : firstIn ? R.CLAIM_BASIS[0] : '' };
  },
  check(v, confirmed) {
    const errs = {}, warns = {};
    need(errs, v, 'supplier'); need(errs, v, 'what'); need(errs, v, 'problem', 'What is wrong?'); need(errs, v, 'foundDate'); need(errs, v, 'basis', 'Which PI rule?');
    if (v.what === 'Device' && !String(v.serial || '').trim()) errs.serial = 'Enter the serial (the supplier asks for it).';
    if (v.what === 'Part' && !String(v.part || '').trim()) errs.part = 'Which part?';
    if (v.basis === R.CLAIM_BASIS[0] && !v.arrivalDate) errs.arrivalDate = 'When did the goods arrive?';
    if (v.basis === R.CLAIM_BASIS[1] && !v.installDate) errs.installDate = 'When was it installed?';
    if (!inRange(v.qty, 1, 500)) errs.qty = 'Check the number (1–500).';
    const by = R.claimDeadline(v); if (by && v.foundDate > by && !confirmed) warns.foundDate = `Past the PI deadline (${by}) — save anyway if you will still ask.`;
    if (v.result === 'Credited' && !(Number(v.creditUsd) > 0)) errs.creditUsd = 'How much credit (USD)?';
    if (!S.formPhotos.length && !v._edit && !confirmed) warns.photos = 'Add photos — the supplier asks for the serial label and the fault.';
    return { errs, warns };
  },
  save(v, id, isNew) {
    const d = { ...v, serial: v.what === 'Device' ? R.normSerial(v.serial) : '', deadline: R.claimDeadline(v) || '', by: myName() }; delete d.deadlineBox; delete d.photos;
    const ok = save(`claims/${id}`, d, isNew); const np = savePhotos('', `claims/${id}`, 'claim');
    return { ok, np, go: ['today', 'list', { list: 'claims' }] };
  },
};
// v0.15 milestone boards (Jun 10/3 "게이트 보드·선적 트래커 = 관제실 카테고리 · 등급 칸"): one kind of board, many boards.
// An item = what · who holds the ball · state · since when · due · how sure the date is (🟢🟡🔴) · source · note. Values live here, never in code.
export const MS_WHO = ['Us', 'Ministry', 'Lawyer', 'Supplier', 'Forwarder', 'Bank', 'CA', 'Immigration', 'Other'];
export const MS_STATE = ['Todo', 'Waiting', 'Blocked', 'Done'];
export const MS_GRADE = ['🟢 measured', '🟡 second-hand', '🔴 guess'];
export const msBoards = () => { const mn = new Map(); for (const x of arr('milestones')) { const b = x.board || 'Board'; const o = Number(x.order) || 0; if (!mn.has(b) || o < mn.get(b)) mn.set(b, o); } return [...mn.keys()].sort((a, b) => mn.get(a) - mn.get(b)); }; /* v0.17.4: boards in the order of their items (the v2 board file numbers them 100 · 200 · …) — it was the order the server happened to send */
FORMS.milestone = {
  col: 'milestones', title: 'Milestone', icon: '🧱',
  spec: () => [
    { k: 'board', l: 'Board', t: 'text', req: 1, ph: 'e.g. Licences · Shipment', hint: msBoards().length ? 'Type a new name for a new board.' : 'Type a name — a board is made from its first item.' }, /* the boards are the tabs on the page */
    { k: 'title', l: 'What', t: 'text', req: 1, ph: 'e.g. Import licence (EXIM code)' },
    { k: 'who', l: 'Who holds the ball', t: 'chips', o: MS_WHO, req: 1, def: 'Us' },
    { k: 'whoName', l: 'Name (optional)', t: 'text', ph: 'the officer · the forwarder · the lawyer' },
    { k: 'state', l: 'State', t: 'chips', o: MS_STATE, req: 1, def: 'Todo' },
    { k: 'since', l: 'With them since', t: 'date', show: (v) => v.state === 'Waiting' || v.state === 'Blocked', def: today, hint: 'The board counts the days from here.' },
    { k: 'due', l: 'Due / expected', t: 'date' },
    { k: 'grade', l: 'How sure is that date', t: 'chips', o: MS_GRADE, def: MS_GRADE[2] },
    { k: 'src', l: 'Source', t: 'text', ph: 'file:line · who said it · link' },
    { k: 'note', l: 'Note', t: 'textarea' },
    { k: 'order', l: 'Order on the board', t: 'number', def: 10, hint: 'Smaller = higher.' },
  ],
  prefill(p) { return { board: p.board && p.board !== '__new__' ? p.board : (msBoards()[0] || ''), since: today(), grade: MS_GRADE[2], order: 10 * (arr('milestones').filter((x) => (x.board || 'Board') === p.board).length + 1) }; },
  check(v) { const errs = {}; need(errs, v, 'board', 'Which board?'); need(errs, v, 'title', 'What is it?'); need(errs, v, 'who', 'Who has it?'); need(errs, v, 'state'); if (!inRange(v.order, 0, 9999)) errs.order = 'A number.'; return { errs, warns: {} }; },
  save(v, id, isNew) {
    const d = { ...v, board: String(v.board || '').trim().slice(0, 60), title: String(v.title || '').trim().slice(0, 160), doneDate: v.state === 'Done' ? (v.doneDate || today()) : '', by: myName(), impAt: null }; /* v0.17.4: touched in the app → a later board file only wins if it is newer */
    const ok = save(`milestones/${id}`, d, isNew); return { ok, np: 0, go: ['status', S.desk ? 'board' : 'status', { b: d.board }] };
  },
};
// v0.9 #7 tools — who holds it, its state, repairs (G-1 §5-3: carelessness = the person pays half)
FORMS.tool = {
  col: 'tools', title: 'Tool', icon: '🧰', perm: 'stock',
  spec: () => [
    { k: 'name', l: 'Tool', t: 'text', req: 1, ph: 'e.g. TDS meter, drill, pipe cutter' },
    { k: 'serial', l: 'Serial / mark', t: 'text' },
    { k: 'bought', l: 'Bought on', t: 'date' },
    { k: 'cost', l: 'Cost (NPR)', t: 'number' },
    { k: 'holder', l: 'Who has it', t: 'chips', o: () => [...techNames(), 'Office'], req: 1, def: 'Office' },
    { k: 'status', l: 'State', t: 'chips', o: R.TOOL_STATUS, req: 1, def: 'OK' },
    { k: 'fault', l: 'How it happened', t: 'chips', o: R.TOOL_FAULT, lbl: { [R.TOOL_FAULT[1]]: 'Carelessness (person pays half)' }, show: (v) => ['Broken', 'Lost', 'Needs repair'].includes(v.status) },
    { k: 'repairCost', l: 'Repair or replacement cost (NPR)', t: 'number', show: (v) => ['Broken', 'Lost', 'Needs repair'].includes(v.status) },
    { k: 'calibrated', l: 'Last checked / calibrated', t: 'date', hint: 'For meters (TDS, flow): the day it was checked against a known value.' },
    { k: 'notes', l: 'Notes', t: 'textarea' },
  ],
  check(v) {
    const errs = {}, warns = {}; if (!v.name || v.name.length < 2) errs.name = 'Name the tool.'; need(errs, v, 'holder'); need(errs, v, 'status');
    if (['Broken', 'Lost'].includes(v.status) && !v.fault) errs.fault = 'How did it happen?';
    if (!inRange(v.cost, 0, 1000000)) errs.cost = 'Check the cost.'; if (!inRange(v.repairCost, 0, 1000000)) errs.repairCost = 'Check the cost.';
    return { errs, warns };
  },
  save(v, id, isNew) {
    const prev = S.D.tools.get(id) || {}; const log = Array.isArray(prev.log) ? prev.log.slice(-40) : [];
    if (isNew || prev.holder !== v.holder || prev.status !== v.status) log.push({ date: today(), holder: v.holder, status: v.status, by: myName() });
    const ok = save(`tools/${id}`, { ...v, log, staffShare: R.toolShare(v) }, isNew);
    return { ok, np: 0, go: ['status', 'report', { r: 'stock' }] };
  },
};
// v0.9 payroll rows for one Nepali month: saved payslips as they were saved (leavers too) + people working that month not saved yet.
// The Dashain bonus is suggested only in the month that holds the first Dashain holiday, and not again within ~10 months for that person.
export function payrollRows(m, key) {
  const [py, pm] = key.split('-').map(Number); const rg = B.bsMonthRange(py, pm); const dashain = R.dashainStartsIn(m.hm || {}, rg.from, rg.to);
  const runs = m.D.payroll.filter((x) => x.kind === 'run' && x.month === key); const byId = new Map(m.D.payroll.filter((x) => x.kind === 'person').map((x) => [x.id, x]));
  const rows = runs.map((sv) => ({ pe: byId.get(sv.personId) || { id: '', name: sv.name, job: sv.job || '' }, P: sv, sv }));
  const bonusLately = (pid) => m.D.payroll.some((x) => x.kind === 'run' && x.personId === pid && Number(x.bonus) > 0 && x.to && R.daysBetween(x.to, rg.to) >= 0 && R.daysBetween(x.to, rg.to) < 300);
  for (const pe of m.D.payroll.filter((x) => x.kind === 'person' && x.active !== 'No' && !(R.isDate(x.startDate) && x.startDate > rg.to))) {
    if (runs.some((r) => r.personId === pe.id)) continue;
    rows.push({ pe, P: R.payslip(pe, { bonus: dashain && !bonusLately(pe.id) ? R.dashainBonus(pe, rg.to) : 0, extra: 0, taxTable: S.settings.taxTable }), sv: null });
  }
  return { rows: rows.sort((a, b) => String(a.pe.name).localeCompare(String(b.pe.name))), rg, dashain };
}
// v0.9 #9 payroll — one person's pay (the month's payslips are on the Payroll page)
FORMS.payPerson = {
  col: 'payroll', title: 'Staff pay', icon: '💼',
  spec: () => [
    { k: 'name', l: 'Name', t: 'text', req: 1 },
    { k: 'job', l: 'Job', t: 'text', ph: 'e.g. field technician' },
    { k: 'basic', l: 'Basic salary a month (NPR)', t: 'number', req: 1, hint: `🟡 Minimum wage NPR ${R.PAY.minWage.toLocaleString('en-IN')} (Embassy seminar slides — check the current figure). G-1 §5-2 says ${R.PAY.g1Low.toLocaleString('en-IN')}–${R.PAY.g1High.toLocaleString('en-IN')} for field staff [conflict].` },
    { k: 'allowance', l: 'Allowances a month (NPR)', t: 'number', def: 0 },
    { k: 'ssf', l: 'In the Social Security Fund (SSF)?', t: 'chips', o: OPT.yesNo, req: 1, def: 'Yes', hint: '🟡 11% from the salary + 20% from the company, on the basic salary.' },
    { k: 'startDate', l: 'Started on', t: 'date' },
    { k: 'active', l: 'Still working here?', t: 'chips', o: OPT.yesNo, req: 1, def: 'Yes' },
    { k: 'notes', l: 'Notes', t: 'textarea' },
  ],
  check(v, confirmed) {
    const errs = {}, warns = {}; if (!v.name || v.name.length < 2) errs.name = 'Enter the name.';
    if (!inRange(v.basic, 1, 1000000) || v.basic === null) errs.basic = 'Enter the basic salary.'; if (!inRange(v.allowance, 0, 1000000)) errs.allowance = 'Check the amount.';
    if (v.basic && (Number(v.basic) + (Number(v.allowance) || 0)) < R.PAY.minWage && !confirmed) warns.basic = `Below the minimum wage NPR ${R.PAY.minWage.toLocaleString('en-IN')} (🟡) — check with the CA.`;
    return { errs, warns };
  },
  save(v, id, isNew) { const ok = save(`payroll/${id}`, { ...v, kind: 'person' }, isNew); return { ok, np: 0, go: ['status', 'report', { r: 'payroll' }] }; },
};
// v0.9 #10 raw-water vial — started at the install, read a day or two later
FORMS.waterTest = {
  col: 'waterTests', title: 'Raw-water vial', icon: '🧫',
  spec: () => [
    custPicker,
    { k: 'sampledDate', l: 'Filled on', t: 'date', req: 1, def: today, hint: 'Kitchen tap, before the unit is connected. Keep the vial indoors at room temperature and read it after 2 days.' },
    { k: 'readDate', l: 'Read on', t: 'date' },
    { k: 'result', l: 'Colour', t: 'chips', o: R.VIAL_RESULTS, hint: 'Black = faecal contamination · no change = none seen. 🚨 Our own check — never tell the customer the water is safe or unsafe from it.' },
    { k: 'photos', l: 'Photo of the vial', t: 'photos' },
    { k: 'notes', l: 'Notes', t: 'textarea' },
  ],
  prefill(p) { return { customerId: p.cid || '', ...(p.cid ? { sampledDate: (S.D.customers.get(p.cid) || {}).installDate || today() } : {}) }; },
  check(v) {
    const errs = {}, warns = {}; if (!v.customerId || !S.D.customers.has(v.customerId)) errs.customerId = 'Choose the customer.'; need(errs, v, 'sampledDate');
    if (v.result && !v.readDate) errs.readDate = 'When did you read it?'; if (v.readDate && v.sampledDate && v.readDate < v.sampledDate) errs.readDate = 'Cannot be before the vial was filled.';
    return { errs, warns };
  },
  save(v, id, isNew) { const d = { ...v, by: myName() }; delete d.photos; const ok = save(`waterTests/${id}`, d, isNew); const np = savePhotos(v.customerId, `waterTests/${id}`, 'vial'); return { ok, np, go: ['today', 'list', { list: 'water' }] }; },
};
FORMS.relocation = {
  col: 'relocations', title: 'Relocation', icon: '🚚', perm: 'visit',
  spec: () => [
    custPicker,
    { k: 'status', l: 'Status', t: 'chips', o: OPT.relStatus, req: 1, def: 'Requested' },
    { k: 'moveDate', l: 'Move date', t: 'date', req: 1 },
    { t: 'section', l: 'New address', hint: 'When the status is Done, the customer\'s address and map pin change to this one (the old one stays on this record).' },
    { k: 'newTole', l: 'Tole', t: 'select', o: OPT.tole, req: 1 },
    { k: 'newToleOther', l: 'Tole name', t: 'text', show: (v) => v.newTole === 'Other' },
    { k: 'newWard', l: 'Ward', t: 'select', o: OPT.ward, req: 1 },
    { k: 'newZone', l: 'Zone', t: 'chips', o: OPT.zone },
    { k: 'newHouseDetail', l: 'How to find the new house', t: 'textarea' },
    { k: 'gps', l: 'New house location', t: 'gps' },
    { t: 'section', l: 'Device' },
    { k: 'sameDevice', l: 'Same device moved?', t: 'chips', o: OPT.yesNo, def: 'Yes' },
    { k: 'newSerial', l: 'New device serial', t: 'text', show: (v) => v.sameDevice === 'No' },
    { k: 'technician', l: 'Technician', t: 'chips', o: techNames, def: myName },
    { k: 'fee', l: 'Relocation fee charged (NPR)', t: 'number', hint: 'No fixed fee in the contract draft yet — 0 if none.' },
    { k: 'pressurePsi', l: 'Water pressure at the new house (PSI)', t: 'number' },
    { k: 'photos', l: 'Photos', t: 'photos' },
    { k: 'notes', l: 'Notes', t: 'textarea' },
  ],
  prefill(p) { const c = S.D.customers.get(p.cid); return c ? { customerId: c.id, newZone: c.zone || '' } : { customerId: p.cid || '' }; },
  check(v) {
    const errs = {}, warns = {};
    if (!v.customerId || !S.D.customers.has(v.customerId)) errs.customerId = 'Choose the customer.';
    need(errs, v, 'status'); need(errs, v, 'moveDate'); need(errs, v, 'newTole', 'Choose the new tole.'); need(errs, v, 'newWard', 'Choose the new ward.');
    if (v.newTole === 'Other' && !v.newToleOther) errs.newToleOther = 'Write the tole name.';
    if (v.sameDevice === 'No' && !v.newSerial) errs.newSerial = 'Enter the new serial.';
    if (!inRange(v.fee, 0, 100000)) errs.fee = 'Check the fee.';
    if (v.status === 'Done' && !(v.gps && Number.isFinite(v.gps.lat))) errs.gps = 'Save the new house location before marking Done.';
    return { errs, warns };
  },
  save(v, id, isNew) {
    const c = S.D.customers.get(v.customerId);
    const old = { oldTole: c.tole || '', oldToleOther: c.toleOther || '', oldWard: c.ward || '', oldZone: c.zone || '', oldHouseDetail: c.houseDetail || '', oldGps: c.gps || null, oldSerial: c.deviceSerial || '' };
    const prev = !isNew ? S.D.relocations.get(id) : null;
    const data = { ...(prev && prev.oldTole !== undefined ? {} : old), ...v, newGps: v.gps || null, newSerial: v.sameDevice === 'No' ? R.normSerial(v.newSerial) : '', by: myName() }; delete data.gps;
    const ok = save(`relocations/${id}`, data, isNew);
    if (v.status === 'Done' && (can('editCust') || c.createdBy === S.user.uid)) {
      save(`customers/${c.id}`, { tole: v.newTole, toleOther: v.newToleOther || '', ward: String(v.newWard), zone: v.newZone || c.zone || '', houseDetail: v.newHouseDetail || '', gps: v.gps, ...(v.sameDevice === 'No' ? { deviceSerial: R.normSerial(v.newSerial) } : {}) }, false);
    }
    const np = savePhotos(v.customerId, `relocations/${id}`, 'relocation');
    return { ok, np, go: ['customers', 'detail', { id: v.customerId }] };
  },
};
FORMS.photo = {
  col: 'photos', title: 'Add photos', icon: '📷',
  spec: () => [custPicker, { k: 'kind', l: 'What is it', t: 'chips', o: OPT.photoKind, req: 1, def: 'House / entrance' }, { k: 'photos', l: 'Photos', t: 'photos', pdf: 1 }],
  prefill(p) { return { customerId: p.cid || '' }; },
  check(v) { const errs = {}; if (!v.customerId || !S.D.customers.has(v.customerId)) errs.customerId = 'Choose the customer.'; if (!S.formPhotos.length) errs.photos = 'Add at least one photo.'; return { errs, warns: {} }; },
  save(v) { const np = savePhotos(v.customerId, `customers/${v.customerId}`, v.kind); return { ok: np > 0, np, go: ['customers', 'detail', { id: v.customerId }] }; },
};
FORMS.event = {
  col: 'events', title: 'Calendar event', icon: '🗓️', perm: 'editCust',
  spec: () => [
    { k: 'lane', l: 'Which calendar', t: 'chips', o: OPT.evLane, req: 1, def: 'Company', hint: 'Company = paydays, days off, meetings, deadlines · Customers = stock arrivals, demos, special visits' },
    { k: 'kindCo', l: 'What kind', t: 'chips', o: OPT.evKindCo, def: 'Office closed', show: (v) => v.lane !== 'Customers' },
    { k: 'kindCu', l: 'What kind', t: 'chips', o: OPT.evKindCu, def: 'Stock arrival', show: (v) => v.lane === 'Customers' },
    { k: 'chart', l: 'Mark it on the charts?', t: 'chips', o: OPT.yesNo, hint: 'Empty = price changes, campaigns, demos / events and stock arrivals are marked on the time charts; other kinds are not.' },
    { k: 'title', l: 'Title', t: 'text', req: 1, ph: 'e.g. 50 devices arrive · Tara day off · CA meeting' },
    { k: 'date', l: 'Date', t: 'date', req: 1, def: today },
    { k: 'endDate', l: 'Last day (only if it runs several days)', t: 'date' },
    { k: 'time', l: 'Time', t: 'time' },
    { k: 'repeat', l: 'Repeats', t: 'chips', o: OPT.evRepeat, def: 'Once' },
    { k: 'customerId', l: 'Customer (optional)', t: 'customer', show: (v) => v.lane === 'Customers' },
    { k: 'status', l: 'Status', t: 'chips', o: OPT.evStatus, def: 'Planned' },
    { k: 'notes', l: 'Notes', t: 'textarea' },
  ],
  prefill(p) { return { date: p.date || today(), lane: p.lane || 'Company' }; },
  check(v) {
    const errs = {}; need(errs, v, 'lane'); need(errs, v, 'title', 'Write a title.'); need(errs, v, 'date');
    if (v.endDate && v.endDate < v.date) errs.endDate = 'The last day is before the first day.';
    if (v.endDate && R.daysBetween(v.date, v.endDate) > 60) errs.endDate = 'Up to 60 days.';
    return { errs, warns: {} };
  },
  save(v, id, isNew) {
    const data = { ...v, kind: v.lane === 'Customers' ? v.kindCu : v.kindCo, by: myName() };
    const ok = save(`events/${id}`, data, isNew);
    return { ok, np: 0, go: S.desk ? ['calendar', 'calendar', { d: v.date, mo: v.date.slice(0, 7) }] : ['today', 'today', {}] };
  },
};
export { FORMS };

// v0.11.1 (#1) drafts: a half-written form survives a tab tap, a phone call or iOS closing the app — kept on the phone per form, 3 days
const DRAFT_KEY = (form) => 'kfp_draft_' + form;
export function draftGet(form) { const d = lsGet(DRAFT_KEY(form), null); return d && d.v && Date.now() - d.t < 3 * 864e5 ? d : null; }
export function draftClear(form) { try { localStorage.removeItem(DRAFT_KEY(form)); } catch (e) {} }
let draftT = 0;
export function draftSave(form) {
  if (!form || form.dataset.id || S.noDraft || form.dataset.form === 'login') return;
  clearTimeout(draftT); draftT = setTimeout(() => {
    const Fm = FORMS[form.dataset.form]; if (!Fm || !form.isConnected) return;
    const v = readForm(form, Fm.spec()); delete v.sign;
    if (!Object.values(v).some((x) => (Array.isArray(x) ? x.length : x !== '' && x !== null && x !== undefined))) return;
    lsSet(DRAFT_KEY(form.dataset.form), { v, t: Date.now() });
  }, 300);
}
function formHtml(p) {
  const F = FORMS[p.form]; if (!F) return '<div class="card">Unknown form</div>';
  const existing = p.id ? S.D[F.col].get(p.id) : null;
  const draft = !existing && !S.noDraft ? draftGet(p.form) : null;
  const pre = existing ? { ...existing } : { ...(F.prefill ? F.prefill(p) : {}), ...(draft ? draft.v : {}) };
  if (F.col === 'customers' && existing && isBoss()) pre.privateNotes = S.privCache && S.privCache[p.id] !== undefined ? S.privCache[p.id] : '';
  const spec = F.spec();
  return `<button class="back" data-back>‹ Back</button><h1>${F.icon} ${esc(existing ? (F.edit ? F.title : 'Edit ' + F.title.toLowerCase()) : F.title)}</h1>
    <div class="muted"><span style="color:var(--bad)">*</span> required${existing ? ' · editing a saved record' : ''}</div>
    <form class="card" id="theForm" data-form="${p.form}" data-id="${esc(p.id || '')}" novalidate>
      ${draft ? `<div class="draftbar">📝 <span>Draft from ${esc(new Date(draft.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))} restored</span><button type="button" class="btn small ghost" data-act="draftClear" style="margin-left:auto">Start fresh</button></div>` : ''}
      ${spec.map((f) => field(f, pre[f.k])).join('')}
      <button class="btn" type="submit" id="saveBtn">Save</button>
    </form>`;
}
function refreshConditional(form, key) {
  const F = FORMS[form.dataset.form]; if (!F) return;
  const spec = F.spec(); const v = readForm(form, spec);
  for (const f of spec) if (f.show && f.k) { const el = form.querySelector(`.fld[data-k="${f.k}"], .fsec[data-k="${f.k}"]`); if (el) el.classList.toggle('hidden', !f.show(v)); }
  if (F.onChange && key) F.onChange(form, v, key); /* v0.19.0 (3) */
  if (F.info) for (const f of spec) if (f.t === 'info') { const el = form.querySelector('#info_' + f.k); if (el) { const h = F.info(v); el.innerHTML = h; el.parentElement.classList.toggle('hidden', !h); } }
}
function submitForm(form) {
  const F = FORMS[form.dataset.form]; const spec = F.spec();
  const v = readForm(form, spec);
  for (const f of spec) if (f.show && f.k && f.t !== 'section' && !f.show(v)) { if (f.t === 'chips' || f.t === 'checks') v[f.k] = f.multi ? [] : ''; else if (f.t === 'number') v[f.k] = null; else if (f.t !== 'gps') v[f.k] = ''; }
  const editId = form.dataset.id; const isNew = !editId;
  if (!isNew) { v._edit = true; v._id = editId; }
  const confirmed = form.dataset.confirmed === '1';
  const { errs, warns } = F.check(v, confirmed);
  showMsgs(form, errs, warns);
  if (Object.keys(errs).length) { toast('Fix the red fields'); return; }
  if (Object.keys(warns).length) { form.dataset.confirmed = '1'; form.querySelector('#saveBtn').textContent = 'Save anyway'; toast('Check the yellow notes, then tap Save anyway'); return; }
  delete v._edit; delete v._id;
  const id = editId || newId(F.col);
  const r = F.save(v, id, isNew);
  if (isNew && r.ok) draftClear(form.dataset.form);
  if (r.ok && r.go && r.go[2]) { const g = r.go[2]; if (g.receipt) prerenderCard('receipt', g.receipt); else if (g.vrep) prerenderCard('visit', g.vrep); else if (g.inst) prerenderCard('install', g.inst); } /* v0.16 #4: the card is ready before the button is tapped */
  toast(r.ok ? (navigator.onLine && !DEMO ? `🟢 Saved${r.np ? ` (+${r.np} photo)` : ''} — sending now` : `🟡 Saved on phone${r.np ? ` (+${r.np} photo)` : ''} — sends when online`) : '🔴 Could not save — write it on paper');
  if (S.desk && S.drawer) {
    // Desk: the finished form is dropped (Back must not return to it); the result opens where the form was.
    S.drawer = null; const [, scr, prm] = r.go;
    const top = S.drawerStack[S.drawerStack.length - 1];
    if (top && top.screen === scr && (top.params.id || '') === ((prm || {}).id || '') && (top.params.list || '') === ((prm || {}).list || '')) S.drawerStack.pop();
    if (['detail', 'list', 'report', 'form'].includes(scr)) openDrawer(scr, prm, 'none'); else { closeDrawer(true); go(r.go[0], scr, prm); }
    S.staleDesk = true; scheduleRender();
    return;
  }
  go(r.go[0], r.go[1], r.go[2]);
}

// ================= navigation & rendering =================
// Back = one step back, everywhere: the in-app ‹ Back, the browser/trackpad back and Esc on the desk.
// Every forward step also pushes a browser history entry, so the browser's back button walks the same steps.
const history_ = [];
let navDepth = 0;
function pushNav() { try { history.pushState({ kf: ++navDepth }, ''); } catch (e) {} }
window.addEventListener('popstate', () => { navDepth = Math.max(0, navDepth - 1); goBack(); });
function backClick() { if (navDepth > 0) history.back(); else goBack(); }
export function go(tab, screen, params, isBack) {
  const sh = document.getElementById('rsheet'); if (sh) sh.remove();
  const next = { tab, screen: screen || tab, params: params || {} };
  if (S.desk && ['detail', 'form', 'list'].includes(next.screen)) { openDrawer(next.screen, next.params); return; }
  if (S.desk && next.screen === 'report') { closeDrawer(true); }
  if (!isBack && S.route && S.route.screen !== 'form') { history_.push(S.route); pushNav(); }
  if (history_.length > 40) history_.shift();
  if (S.route && S.route.screen === 'form' && next.screen !== 'form' && !S.desk) { const fm = S.route.params && S.route.params.form; if (fm && !S.route.params.id && draftGet(fm)) toast('📝 Draft kept — open the same form again to continue'); } /* v0.11.1 (#1) */
  S.navDir = isBack ? 'back' : S.route && next.screen === next.tab && S.route.tab !== next.tab ? 'tab' : next.screen === next.tab ? 'tab' : 'fwd'; /* v0.11.1 motion: which way the next screen slides in */
  S.route = next;
  if (S.route.screen === 'form') S.formPhotos = [];
  render(true);
  window.scrollTo(0, 0);
}
function goBack() {
  if (S.drawer) {
    if (S.drawerStack.length) { S.drawer = S.drawerStack.pop(); if (S.drawer.screen === 'form') S.formPhotos = []; paintDrawer('back', S.drawer.scroll || 0); }
    else closeDrawer();
    return;
  }
  let r = history_.pop();
  while (r && r.screen === S.route.screen && JSON.stringify(r.params) === JSON.stringify(S.route.params)) r = history_.pop();
  if (r) go(r.tab, r.screen, r.params, true); else if (S.route.screen !== S.route.tab) go(S.route.tab, S.route.tab, {}, true);
}
let rq = 0;
export function scheduleRender() {
  if (rq) return;
  rq = requestAnimationFrame(() => { rq = 0; rerender(); });
}
let routeMod = null;
// v0.17.2 (1): a page or window holding a form (Settings · What-if · a new staff line) is not redrawn while someone types in it, or while it has unsaved changes
function pageEditing() {
  const ae = document.activeElement;
  if (ae && ae.matches && ae.matches('input:not([type=file]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), textarea, select') && ae.closest('#view, #drawer')) return true;
  return !!document.querySelector('#view form[data-dirty="1"], #drawer form[data-dirty="1"]');
}
document.addEventListener('input', (ev) => { const f = ev.target && ev.target.closest && ev.target.closest('form'); if (f && f.id !== 'theForm' && f.id !== 'loginForm' && f.closest('#view, #drawer') && !ev.target.closest('[data-nodirty]')) f.dataset.dirty = '1'; }, true);
document.addEventListener('click', (ev) => { /* v0.17.2 (2) · v0.17.4 Jun 10/4 "왓츠앱 pc(앱스토어) 연결 성공 · 모든 링크는 앱 자체로": a computer opens every WhatsApp link in the WhatsApp app — a web.whatsapp.com / wa.me / api.whatsapp.com link becomes whatsapp:// (no browser tab, no QR) */
  const a = ev.target && ev.target.closest && ev.target.closest('a[href^="https://web.whatsapp.com/"], a[href^="whatsapp://"], a[href^="https://wa.me/"], a[href^="https://api.whatsapp.com/"]'); if (!a) return;
  if (!a.href.startsWith('whatsapp:') && !isComputer()) return; /* a phone: the WhatsApp link opens the phone's WhatsApp app itself */
  ev.preventDefault(); try { WA.open(toAppUrl(a.href)); } catch (e) {}
}, true);
document.addEventListener('focusout', () => { setTimeout(() => { if (S.staleDesk && !pageEditing() && !(S.route.screen === 'form' || (S.drawer && S.drawer.screen === 'form'))) scheduleRender(); }, 0); }, true);
function rerender() {
  if (S.route.screen === 'form' || (S.drawer && S.drawer.screen === 'form')) { S.staleDesk = true; refreshChrome(true); return; }
  if (S.route.screen === 'route' && !S.desk) { if (routeMod) routeMod.update(); refreshChrome(true); return; }
  const ae = document.activeElement;
  if (ae && ae.id === 'custSearch') { const l = $('#custList'); if (l) l.innerHTML = custListHtml(S.route.params); refreshChrome(true); return; }
  if (pageEditing()) { S.staleDesk = true; refreshChrome(true); return; } /* v0.17.2 (1) Jun 10/4 "번호,이름 다 넣어도 빈칸으로 자동으로 바뀌는데": the 30-second check redrew Settings over what was being typed */
  S.staleDesk = false;
  render(false);
  if (S.drawer && S.drawer.screen !== 'form') refreshDrawer();
}
export function refreshChrome(noRender) {
  $('#banner').style.display = S.storageOk ? 'none' : 'block';
  const s = syncState();
  document.querySelectorAll('[data-sync-dot]').forEach((el) => { el.className = 'dot live ' + s.c; });
  document.querySelectorAll('[data-sync-text]').forEach((el) => { el.textContent = s.t; });
  if (!noRender) scheduleRender();
}
export function syncState() {
  const j = S.user ? myJournal() : [];
  const pending = j.filter((e) => e.state === 'pending').length;
  const rejected = j.filter((e) => e.state === 'rejected').length;
  if (!S.storageOk || rejected) return { c: 'r', t: rejected ? `${rejected} refused by the server — see Status` : 'Phone storage failing — use paper', pending, rejected };
  if (pending) return { c: 'y', t: `${pending} on this phone — sends when online`, pending, rejected };
  return { c: 'g', t: 'Practice — saved on this phone only', pending, rejected };
}

let deskMod = null;
export function render(fresh) {
  const v = $('#view'); const tabs = $('#nav');
  $('#banner').style.display = S.storageOk ? 'none' : 'block';
  if (!S.user) { tabs.classList.add('hidden'); document.body.classList.remove('desk'); v.innerHTML = viewLogin(); return; }
  if (!S.role || S.role === 'pending' || S.role === 'blocked') { tabs.classList.add('hidden'); document.body.classList.remove('desk'); v.innerHTML = viewPending(); return; }
  const wantDesk = window.innerWidth >= 960 && lsGet('kfp_desk', true);
  S.desk = wantDesk;
  document.documentElement.dataset.theme = lsGet('kfp_theme_' + (wantDesk ? 'desk' : 'phone'), wantDesk ? 'dark' : 'light');
  if (wantDesk) {
    document.body.classList.add('desk'); tabs.classList.add('hidden');
    if (!deskMod) { import('./desk.js').then((m) => { deskMod = m; render(true); }); v.innerHTML = '<div style="padding:24px"><div class="skeleton" style="height:140px"></div></div>'; return; }
    if (!deskMod.DESK_PAGES.includes(S.route.screen)) S.route = { tab: 'command', screen: 'command', params: {} };
    deskMod.renderDesk(v, fresh);
    return;
  }
  document.body.classList.remove('desk');
  tabs.classList.remove('hidden');
  if (!['today', 'route', 'new', 'customers', 'status', 'detail', 'form', 'list', 'report'].includes(S.route.screen)) S.route = { tab: 'today', screen: 'today', params: {} };
  const m = model();
  document.body.classList.toggle('routing', S.route.screen === 'route');
  if (S.route.screen === 'route') {
    tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.tab === 'route'));
    v.classList.remove('view-enter');
    import('./route.js').then((rm) => { routeMod = rm; v.innerHTML = rm.routeHtml(); rm.mountRoute(v); });
    return;
  }
  if (routeMod) { routeMod.drop(); routeMod.closeSheet(); }
  tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.tab === S.route.tab));
  const badge = m.collections.filter((x) => ['call', 'visit'].includes(x.dn.stage)).length + m.openReq.filter((x) => Date.now() > x.sla.replyBy).length;
  const tb = tabs.querySelector('[data-tab="today"] .badge'); tb.textContent = badge; tb.classList.toggle('hidden', !badge);
  // language switch on every phone screen (Today has it in the header)
  v.innerHTML = (!['today', 'status'].includes(S.route.screen) ? `<div class="lang-float">🌐 ${langSeg()}</div>` : '') + screenHtml(S.route);
  if (fresh) { v.classList.remove('view-enter', 'view-fwd', 'view-back'); void v.offsetWidth; v.classList.add('view-enter'); if (S.navDir === 'fwd') v.classList.add('view-fwd'); else if (S.navDir === 'back') v.classList.add('view-back'); S.navDir = ''; clearTimeout(S.enterT); S.enterT = setTimeout(() => v.classList.remove('view-enter', 'view-fwd', 'view-back'), 600); /* entrance classes go after the animation so a data refresh does not replay it */ }
  afterRender(v, S.route);
}
export function screenHtml(r) {
  const views = { today: viewToday, new: viewNew, customers: viewCustomers, status: viewStatus, detail: viewDetail, form: formHtml, list: viewList, report: viewReport };
  return (views[r.screen] || viewToday)(r.params || {});
}
export function afterRender(root, r) {
  if (r.screen === 'form') G.hereIfAllowed().catch(() => {});
  const form = root.querySelector('#theForm');
  if (form) { refreshConditional(form); renderThumbs(); }
  if (r.screen === 'detail') {
    loadPrivate(r.params.id); loadPhotos(r.params.id);
    const mb = root.querySelector('#miniMap');
    if (mb) G.mountMini(mb, { id: mb.dataset.id, lat: Number(mb.dataset.lat), lng: Number(mb.dataset.lng), label: mb.dataset.label, note: (why) => locHelp(why) });
    G.hereIfAllowed().then((pos) => { if (pos && mb && mb._dist) mb._dist(pos); }); // one-tap directions + distance when location is already allowed
  }
  if (r.screen === 'status' || (r.screen === 'report' && r.params.r === 'diag')) fillDiag();
  if (r.screen === 'report' && r.params.r === 'users') loadUsers();
  if (r.screen === 'list' && r.params.list === 'map') { const box = root.querySelector('#mapBox'); import('./desk.js').then((mm) => mm.mountMap(box)); }
  else if (!S.desk) import('./desk.js').then((mm) => mm.dropMap()).catch(() => {});
}

// ---------- drawer (desktop: forms & details slide in from the right) ----------
// The drawer keeps its own steps (list → customer → form): ‹ Back goes one step back inside it; ✕ / Esc / clicking
// outside closes it. The page behind is never rebuilt by opening or closing the drawer.
// mode: 'push' (default — remember the current drawer page) · 'none' (replace without remembering)
export function openDrawer(screen, params, mode = 'push') {
  if (S.drawer && mode === 'push') { const dr0 = $('#drawer'); S.drawerStack.push({ ...S.drawer, scroll: dr0 ? dr0.scrollTop : 0 }); if (S.drawerStack.length > 30) S.drawerStack.shift(); }
  const first = !S.drawer && !$('#drawer');
  S.drawer = { screen, params: params || {} };
  if (screen === 'form') S.formPhotos = [];
  if (mode === 'push') pushNav();
  paintDrawer(first ? '' : 'fwd', 0);
}
function deskTidy(dr) { /* v0.17.1 ④ Jun 10/4 "가로로 쭉 눌린거 하지말랬는데 새 이사는 아직도 이런데?": a list window's "＋ New …" goes to the top right at normal size (it was a 1,066-px bar under the list — v0.17.0 sized buttons on the page, not in the window) */
  if (!S.desk || !dr) return; const pg = dr.querySelector('.dpage'); if (!pg || !/\bscr-(list|report)\b/.test(pg.className)) return;
  const nb = [...pg.children].filter((e) => e.matches('.btn[data-go-form]') && !e.classList.contains('ghost') && !e.classList.contains('small')); if (!nb.length) return;
  const h = pg.querySelector(':scope > h1'); if (!h) return; const bar = document.createElement('div'); bar.className = 'dp-acts';
  const sub = h.nextElementSibling && h.nextElementSibling.classList.contains('muted') ? h.nextElementSibling : h; sub.after(bar); for (const b of nb) { b.classList.add('small'); bar.appendChild(b); }
}
function drawerHead() { return `<button class="x" data-act="closeDrawer" title="Close (Esc)">✕</button><button class="fx" data-act="drawerFull" title="Full width">⤢</button>${S.drawerStack.length ? `<div class="crumbs">${S.drawerStack.slice(-3).map((d) => `<span>${esc(crumbOf(d))}</span>`).join('<i>›</i>')}<i>›</i></div>` : ''}`; }
function crumbOf(d) { if (d.screen === 'detail') { const c = S.D.customers.get(d.params.id); return c ? c.name : 'Customer'; } if (d.screen === 'form') return (FORMS[d.params.form] || {}).title || 'Form'; if (d.screen === 'list') return d.params.list || 'List'; return d.params.r || d.screen; }
function paintDrawer(dir, scroll) {
  let dr = $('#drawer');
  if (!dr) { const bg = document.createElement('div'); bg.id = 'drawerBg'; bg.className = 'drawer-bg'; document.body.appendChild(bg); dr = document.createElement('div'); dr.id = 'drawer'; dr.className = 'drawer'; document.body.appendChild(dr); }
  dr.classList.toggle('wide', ['list', 'report'].includes(S.drawer.screen) && !dr.classList.contains('full')); /* v0.15: centred modal — lists and reports get the wide one */
  dr.innerHTML = drawerHead() + `<div class="dpage ${dir} scr-${esc(S.drawer.screen || '')}">${screenHtml(S.drawer)}</div>`; deskTidy(dr);
  dr.scrollTop = scroll || 0;
  afterRender(dr, S.drawer);
}
function refreshDrawer() { const dr = $('#drawer'); if (!dr || !S.drawer) return; const st = dr.scrollTop; dr.innerHTML = drawerHead() + `<div class="dpage scr-${esc(S.drawer.screen || '')}">${screenHtml(S.drawer)}</div>`; deskTidy(dr); dr.scrollTop = st; afterRender(dr, S.drawer); }
export function closeDrawer(silent) {
  if (!S.drawer) return; S.drawer = null; S.drawerStack = []; S.formPhotos = [];
  const bg = $('#drawerBg'), dr = $('#drawer'); if (bg) bg.remove(); if (dr) dr.remove();
  G.dropMinis();
  if (!silent && S.staleDesk) scheduleRender(); // only if data changed while a form was open
}
// Desktop: detail/form/list/report open in the drawer; phones: full screens.
export function nav(tab, screen, params) { if (S.desk && ['detail', 'form', 'list'].includes(screen)) openDrawer(screen, params); else go(tab, screen, params); }

// ================= screens (phone) =================
function viewLogin() {
  return `<div style="max-width:420px;margin:0 auto"><div style="margin-top:12vh" class="stagger">
  <div style="--i:0;display:flex;align-items:center;gap:12px"><div style="width:44px;height:44px;border-radius:12px;background:radial-gradient(circle at 30% 30%,#7fe3ff,#1f6fb2 60%,#0b2a44)"></div><div><h1 style="margin:0">KORA Field</h1><div class="muted">Pokhara water service · staff app</div></div></div>
  <form class="card" id="loginForm" autocomplete="on" style="--i:1">
    <label for="lg_email">Email</label><div class="pwbox"><input id="lg_email" name="email" type="email" autocomplete="username" inputmode="email" value="${esc(lsGet('kfp_login_email', ''))}"><div class="pwbtns"><button type="button" class="pwbtn" data-act="lgClear" data-for="lg_email" aria-label="Clear">✕</button></div></div>
    <label for="lg_pw">Password</label><div class="pwbox"><input id="lg_pw" name="pw" type="password" autocomplete="current-password"><div class="pwbtns"><button type="button" class="pwbtn" data-act="pwShow" aria-label="Show password">👁</button><button type="button" class="pwbtn" data-act="lgClear" data-for="lg_pw" aria-label="Clear">✕</button></div></div>
    <label class="chk-line"><input type="checkbox" id="lg_remember"${lsGet('kfp_login_remember', true) ? ' checked' : ''}> <span>Remember my email</span></label>
    <label class="chk-line"><input type="checkbox" id="lg_keep"${lsGet('kfp_login_keep', true) ? ' checked' : ''}> <span>Keep me signed in on this phone</span></label><div class="hint">Keep it on for a work phone — off means the app cannot open offline after iPhone closes it.</div>
    <div class="hint">The app never stores your password. Let the phone save it (iPhone: Passwords).</div>
    <div class="err hidden" id="lgErr"></div>
    <button class="btn" type="submit">Sign in</button>
    <button class="btn ghost" type="button" data-act="forgot">Forgot password</button>
  </form><div class="muted" style="--i:2">The first sign-in needs internet. After that the app works offline. · ${esc(APP_VERSION)}</div></div></div>`;
}
function viewPending() {
  const blocked = S.role === 'blocked';
  return `<div style="max-width:420px;margin:12vh auto 0"><h1>KORA Field</h1><div class="card">
    <div class="status"><span class="dot ${blocked ? 'r' : 'y'} live"></span><span>${blocked ? 'This account is blocked.' : 'Waiting for approval'}</span></div>${blocked && S.wiped ? '<p class="muted">Company data on this phone has been removed.</p>' : ''}
    <p>Signed in as <b>${esc(S.user.email)}</b>.</p>
    <p class="muted">${blocked ? 'Ask Jun.' : 'Ask Jun to approve this account (Status → Users). Then tap Refresh.'}</p>
    <button class="btn" data-act="roleRefresh">Refresh</button>
    <button class="btn ghost" data-act="signOut">Sign out</button></div></div>`;
}
export function langSeg() { return langSegHtml(); }
// Alert inbox: "✓" hides an alert for today, "💤" for 3 days (this device only). A changed number = a new alert.
const SNZ = 'kfp_snooze';
// snooze key: a stable key when the alert has one (its text carries counts and dates that change), else icon + text
export const alertKey = (a) => a.key || a.ic + '|' + a.t;
export function liveAlerts(m) { const z = lsGet(SNZ, {}); return m.alerts.filter((a) => !(z[alertKey(a)] && z[alertKey(a)] >= m.t)); }
function snoozeAlert(key, days) { const z = lsGet(SNZ, {}); const t = today(); for (const k of Object.keys(z)) if (z[k] < t) delete z[k]; z[key] = R.addDays(t, days - 1); lsSet(SNZ, z); }
export function alertsHtml(m) {
  const s = syncState(); const live = liveAlerts(m); const hidden = m.alerts.length - live.length;
  const list = s.rejected ? [{ lvl: 'bad', ic: '🔴', t: `${s.rejected} record(s) refused by the server — see Status`, report: 'diag' }, ...live] : live;
  const col = { bad: 'var(--bad)', warn: 'var(--warn)', ok: 'var(--ok)', info: 'var(--brand)' };
  const link = (a) => (a.list ? `data-list="${a.list}"` : a.cal ? `data-cal="${a.cal}"` : a.side ? (S.desk ? `data-side="${a.side}"` : '') : `data-report="${a.report}"`);
  const btns = (a) => (S.desk && a.report !== 'diag' ? `<div class="snz" data-stop><button data-snooze="${esc(alertKey(a))}" data-days="1" title="Done for today">✓</button><button data-snooze="${esc(alertKey(a))}" data-days="3" title="Hide for 3 days">💤</button></div>` : '');
  // v0.11.2 (#14) Jun: "카테고리별로 정리" — four groups, a coloured dot only for red
  const CAT = [['money', 'Money', '💰🤝💵✋🧾🏦📅'], ['field', 'Field & customers', '📋🔧🧪📞🚪🛠️⏸️📜🚚🧫⚠️📍🧲🔎'], ['stock', 'Stock & devices', '📦🔩📮'], ['sys', 'System & office', '💾📱🔴🧭📑🏖️']];
  const catOf = (a) => (CAT.find(([, , ics]) => ics.includes(a.ic)) || CAT[3])[0];
  const row = (a) => `<div class="item" ${link(a)}><span class="dot" style="background:${a.lvl === 'bad' ? col.bad : 'var(--line)'}"></span><div class="main"><div class="t" style="white-space:normal;font-weight:${a.lvl === 'bad' ? 600 : 400}">${a.ic} ${esc(a.t)}</div></div>${btns(a)}<div class="r">›</div></div>`;
  return (list.length ? CAT.map(([k, label]) => { const xs = list.filter((a) => catOf(a) === k); return xs.length ? `<div class="sec-mini">${esc(label)} · ${xs.length}</div>${xs.map(row).join('')}` : ''; }).join('') : '<div class="empty">No alerts — all clear ✨</div>')
    + (hidden ? `<div class="muted snz-foot">💤 ${hidden} hidden · <a href="#" data-act="unsnooze">show all</a></div>` : '');
}
export function statusCard() {
  const s = syncState();
  return `<div class="card"><div class="status"><span class="dot live ${s.c}" data-sync-dot></span><span data-sync-text>${esc(s.t)}</span></div>
    <div class="muted" style="margin-top:6px">${navigator.onLine ? 'Online' : 'Offline'} · last server contact ${esc(ago(S.lastServer))}</div></div>`;
}
// v0.11 phone lists (Tara 2026-09-30 "too colourful · too bold"): grouped rows like the iPhone Settings app — a small coloured icon box, plain text, a number, › on the right
export const rowsHtml = (groups) => groups.filter((g) => g.rows.length).map((g) => `${g.title ? `<div class="sec">${esc(g.title)}</div>` : ''}<div class="card flush rows">${g.rows.map((r) => `<button class="rowb ${r.tone || g.tone || ''}" ${r.attr}><span class="ric">${r.ic}</span><span class="rl">${esc(r.l)}${r.s ? `<small>${esc(r.s)}</small>` : ''}</span>${r.n !== undefined && r.n !== '' ? `<span class="rn">${r.n}</span>` : ''}${r.b ? `<span class="rb">${r.b}</span>` : ''}<span class="rc">›</span></button>`).join('')}</div>`).join('');
export const cItem = (x, right) => `<div class="item" data-cust="${esc(x.c.id)}"><span class="dot ${x.dot}"></span><div class="main"><div class="t">${esc(custLabel(x.c))}${x.c._pending ? ' <span class="pill warn">on phone</span>' : ''}</div>
  <div class="s">${esc(toleOf(x.c))} · Ward ${esc(x.c.ward || '–')}</div></div>${right ? `<div class="r">${right}</div>` : x.led.overdue ? `<div class="r"><span class="pill bad">${R.npr(x.led.overdue)} due</span></div>` : '<div class="r">›</div>'}</div>`; /* v0.11.1 (#16): the overdue amount sits in the right cell instead of the end of a clipped line */

function viewToday() {
  const m = model(); const t = m.t;
  const chase = chaseFirst(m); const late = chase.filter((x) => ['call', 'visit'].includes(x.dn.stage)).length; /* v0.9 fix: promised homes wait until their day */
  const reqLate = m.openReq.filter((x) => Date.now() > x.sla.replyBy).length;
  const tiles = [
    ['collections', '💰', 'Collections', chase.length, late ? `${late} need a call/visit` : 'reminders', late ? 'bad' : chase.length ? 'warn' : 'ok'],
    ['visits', '🔧', 'Visits due', m.visitsDue.length, 'by tole', m.visitsDue.length ? 'warn' : 'ok'],
    ['calls', '📞', 'Calls', m.calls.length, 'day-7 calls', m.calls.length ? 'warn' : 'ok'],
    ['requests', '📋', 'Requests', m.openReq.length, reqLate ? `${reqLate} past reply time` : 'open', reqLate ? 'bad' : m.openReq.length ? 'warn' : 'ok'],
    ['tomorrow', '📅', 'Bills tomorrow', m.tomorrowBills.length, 'send reminders', ''],
    ['leads', '🧲', 'Leads to follow', m.leadsDue.length, 'follow-up due', m.leadsDue.length ? 'warn' : ''],
  ];
  const sec = (title, items, empty, list) => `<h2>${title}${list ? `<button class="btn small ghost" style="margin-left:auto" data-list="${list}">All</button>` : ''}</h2><div class="card flush">${items || `<div class="empty">${empty}</div>`}</div>`;
  const s = syncState(); const tones = { collections: 'tone-money', visits: 'tone-field', calls: 'tone-call', requests: 'tone-req', tomorrow: 'tone-bill', leads: 'tone-lead' };
  const hr = new Date().getHours(); const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  // v0.11.1 (Jun 2026-10-01 "원래 그 화면이 우린 좋았음"): the v0.10 look is back — gradient card, three numbers, six tiles; the collections card below keeps its v0.11 shape
  return `<div class="hero">
    <div class="top"><div><div class="hello">${esc(greet)}, ${esc(myName() || 'team')}</div><div class="date">${esc(fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' }))}</div></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">${langSeg()}<span class="syncpill"><span class="dot live ${s.c}" data-sync-dot></span><span data-sync-text>${esc(s.t)}</span></span></div></div>
    <div class="stats"><button data-list="visits"><b>${m.visitsDue.length}</b><span>Visits due</span></button><button data-list="collections"><b>${chase.length}</b><span>${late ? `To collect · ${late} late` : 'To collect'}</span></button><button data-list="calls"><b>${m.calls.length}</b><span>Calls</span></button></div>
    <button class="cta" data-tab-go="route">🗺️ Open today's route</button>
    <button type="button" class="memo-btn${lsGet('kfp_memo', '') ? ' has' : ''}" data-act="memoToggle" title="Memo">📝 Memo${lsGet('kfp_memo', '') ? ' ·' : ''}</button>
    <div id="memoBox" class="memo${lsGet('kfp_memo_open', 0) ? '' : ' hidden'}"><textarea id="memoTa" rows="4" placeholder="Memo — stays on this phone">${esc(lsGet('kfp_memo', ''))}</textarea><div class="muted" id="memoHint">${lsGet('kfp_memo', '') ? 'Saved on this phone' : 'Anything — it is saved as you type'}</div></div>
  </div>
  <div class="grid2 stagger" style="margin-top:12px">${tiles.map(([k, ic, l, n, sub, cls], i) => `<button class="tile ${cls} ${tones[k]}" data-list="${k}" style="--i:${i}"><span class="ic">${ic}</span><span class="n">${n}</span><span>${l}</span><span class="s">${esc(sub)}</span></button>`).join('')}</div>
  ${sec('💰 Chase first', chase.slice(0, 5).map((x) => dunItem(x)).join(''), 'Nobody to chase today 🏖️', 'collections')}
  ${m.watch.some((w) => w.lvl !== 'low') ? sec('⚠️ Look after this week', m.watch.filter((w) => w.lvl !== 'low').slice(0, 3).map((w) => watchItem(w, { max: 2 })).join(''), '', 'watch') : ''}
  ${sec('🔧 Visits due', m.visitsDue.slice(0, 5).map((x) => cItem(x, `<span class="pill ${x.due < t ? 'bad' : 'warn'}">${esc(x.filterOnly ? 'filter' : x.due === t ? 'today' : x.due)}</span>`)).join(''), 'No visits due', 'visits')}
  ${sec('📋 Open requests', m.openReq.slice(0, 4).map(reqItem).join(''), 'No open requests', 'requests')}
  <div class="row" style="margin-top:6px"><button class="btn" data-go-form="visit">🔧 Visit</button><button class="btn" data-go-form="payment">💵 Payment</button></div>`;
}
export function dunItem(x) {
  const d = x.dn; const cls = { reminder: 'blue', due: 'warn', late: 'warn', call: 'orange', visit: 'bad' }[d.stage];
  const when = d.days < 0 ? `in ${-d.days} d` : d.days === 0 ? 'today' : `${d.days} d late`;
  // v0.9 #1: tries since the money went late (or in the last 30 days) + the promise, if any
  const t0 = today(); const tries = (x.chases || []).filter((q) => q.date >= (x.led.overdueSince || R.addDays(t0, -30))); const last = tries[0];
  const pr = x.pr && ['waiting', 'broken'].includes(x.pr.status) ? x.pr : null;
  const prLine = pr ? `<div class="s chase-${pr.status}">${S.desk ? (pr.status === 'broken' ? '🤝❌ ' : '🤝 ') : ''}<span>${esc(pr.status === 'broken' ? `promise broken (${pr.date})` : `promised by ${pr.date}`)}</span>${pr.amount ? ` · ${R.npr(pr.amount)}` : ''}</div>` : '';
  const chLine = tries.length ? `<div class="s chase-tries">${S.desk ? '📞 ' : ''}<span>${esc(`${tries.length} ${tries.length === 1 ? 'try' : 'tries'}`)}</span> · <span>${esc('last: ' + (last.reached || last.channel || '—'))}</span> · <span>${esc(last.date === t0 ? 'today' : `${R.daysBetween(last.date, t0)} d ago`)}</span></div>` : '';
  // v0.11 phone (Tara 2026-09-30): one accent per card (the stage pill), plain text, the three actions on their own line so the text keeps its width
  const rs = remSent(x.c.id); const sentPill = rs ? ` <span class="pill sent">💬 sent ${esc(new Date(rs.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}</span>` : '';
  if (!S.desk) return `<div class="item dun" data-cust="${esc(x.c.id)}"><div class="main"><div class="t">${esc(x.c.name)} <span class="pill ${cls}">${esc(d.short)}</span>${sentPill}</div>
    <div class="s">${R.npr(d.owed)} · ${esc(when)} · ${esc(toleOf(x.c))}</div>${prLine}${chLine}
    <div class="dun-acts"><a class="btn small ghost" href="tel:${esc(x.c.phone)}" data-stop>📞 Call</a><a class="btn small ghost" href="${esc(waLink(x.c.phone, dunText(x)))}" target="_blank" rel="noopener" data-stop data-rem-sent="${esc(x.c.id)}">💬 WhatsApp</a>${canForm('checkin') ? `<button class="btn small ghost" data-go-form="checkin" data-cid="${esc(x.c.id)}" data-kind="${esc(R.CHASE_KIND)}" title="Log a payment chase">📝 Log</button>` : ''}${S.settings.coQr ? `<button class="btn small ghost" data-act="rcBill" data-cid="${esc(x.c.id)}" data-stop title="Bill of the month with the payment QR">🧾 QR</button>` : ''}</div></div></div>`;
  return `<div class="item" data-cust="${esc(x.c.id)}"><span class="dot ${x.dot}"></span><div class="main"><div class="t">${esc(x.c.name)} <span class="pill ${cls}">${esc(d.short)}</span></div>
    <div class="s">${R.npr(d.owed)} · ${esc(when)} · ${esc(toleOf(x.c))}</div>${prLine}${chLine}</div>
    <div class="acts">${canForm('checkin') ? `<button class="icon-btn" data-go-form="checkin" data-cid="${esc(x.c.id)}" data-kind="${esc(R.CHASE_KIND)}" title="Log a payment chase">📝</button>` : ''}<a class="icon-btn" href="${esc(waLink(x.c.phone, dunText(x)))}" target="_blank" rel="noopener" data-stop data-rem-sent="${esc(x.c.id)}">💬</a><a class="icon-btn" href="tel:${esc(x.c.phone)}" data-stop>📞</a></div></div>`;
}
// Last-90-days chasing line (collections list + desk money page)
export function chaseStatsLine(cs) {
  return `<div class="muted" style="margin-top:6px">📞 <span>Last 90 days</span> · <span>${esc(`${cs.tries} ${cs.tries === 1 ? 'try' : 'tries'}`)}</span> · <span>${esc('answered ' + (cs.reachRate === null ? '—' : R.pct(cs.reachRate)))}</span> · <span>${esc(`promises kept ${cs.keptRate === null ? '—' : R.pct(cs.keptRate)} (${cs.kept} of ${cs.kept + cs.late + cs.broken})`)}</span></div>`;
}
// Collections groups (v0.9 #1): broken promises first, then the G-1 §1-3 steps, promised homes last (they wait until their day).
// One contract event row (v0.9 #3): notice · transfer · lost — tap = edit
// v0.9 #4: the verdict of the latest screening for a lead (or a button to screen it)
export function screenPill(l) {
  const sc = R.findScreening(arr('screenings'), l.id, l.phone);
  return sc ? `<span class="pill ${{ Pass: 'ok', Check: 'warn', Hold: 'bad' }[sc.verdict] || 'grey'}">🔎 ${esc('Screening: ' + sc.verdict)}</span>` : ['Signed', 'Rejected'].includes(l.outcome) ? '' : `<button class="btn small ghost" data-go-form="screening" data-lead="${esc(l.id)}">🔎 Screen first</button>`;
}
export function contractItem(e, o) {
  const c = S.D.customers.get(e.customerId) || {}; const ic = { 'Notice to end': '🚪', 'Transfer to a new holder': '🔁', 'Lost or stolen': '🚨' }[e.kind] || '📜';
  const s = e.kind === 'Notice to end' ? `${e.endDate ? 'ending ' + e.endDate : ''}${e.early ? ' · before 36 months' : ''}${e.reasonCode ? ' · ' + e.reasonCode : ''}` : e.kind === 'Transfer to a new holder' ? `${e.oldName || '?'} → ${e.newName || '?'}${e.transferReason ? ' · ' + e.transferReason : ''}` : `${e.lostDate || ''}${e.fault ? ' · ' + e.fault : ''}${R.isDate(e.settledDate) ? ' · settled ' + e.settledDate : ''}`;
  const dot = o ? (o.overdue || o.soon || o.kind === 'lost' ? 'r' : 'y') : 'g';
  return `<div class="item" data-edit="contract" data-id="${esc(e.id)}"><span class="dot ${dot}"></span><div class="main"><div class="t">${ic} ${esc(c.name || '?')} · <span>${esc(e.kind)}</span></div><div class="s">${esc(e.date || '')} · ${esc(s)}</div></div><button class="btn small ghost" data-cust="${esc(e.customerId)}">👤</button></div>`;
}
export const chaseFirst = (m) => m.collections.filter((x) => !(x.pr && x.pr.status === 'waiting')).sort((a, b) => (remSent(a.c.id) ? 1 : 0) - (remSent(b.c.id) ? 1 : 0)); /* v0.11.1 (#3): reminded today → after the others (stable) */
export function collectionGroups(xs) {
  const st = (x) => (x.pr ? x.pr.status : ''); const broken = xs.filter((x) => st(x) === 'broken'); const waiting = xs.filter((x) => st(x) === 'waiting').sort((a, b) => a.pr.date.localeCompare(b.pr.date));
  const rest = xs.filter((x) => !['broken', 'waiting'].includes(st(x)));
  const steps = R.DUNNING.map((d) => ({ key: d.stage, label: d.label, xs: rest.filter((x) => x.dn.stage === d.stage) })).filter((g) => g.xs.length).reverse();
  return [...(broken.length ? [{ key: 'broken', label: 'Promise broken — call or visit now', xs: broken }] : []), ...steps, ...(waiting.length ? [{ key: 'waiting', label: 'Promised — wait until their day', xs: waiting }] : [])];
}
// Filter order dates: when each filter runs out on the shelf and the last day to order (lead time + safety) — settings hold the guesses.
// v0.9 #7 parts on the shelf and with people · tools
export function partsCard(m) {
  const st = m.metrics.stock; const min = Number(S.settings.partsMin) > 0 ? Number(S.settings.partsMin) : R.PARTS_MIN; const ppl = R.partsWithPeople(m.D.stockMoves, m.D.visits);
  const who = Object.keys(ppl).filter((w) => Object.values(ppl[w]).some((n) => n));
  const tools = m.D.tools.slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return `<div class="card"><div class="status" style="font-size:15px">🔩 Parts</div><div class="muted" style="margin:4px 0 8px">Shelf = in − out − issued + returned − used from the shelf. Order more below ${min} (🔴 first guess · Settings). Issue in the morning, return in the evening — both signed.</div>
    <div class="scroll-x"><table class="tbl"><tr><th>Part</th><th class="n">Shelf</th>${who.map((w) => `<th class="n">${esc(w)}</th>`).join('')}<th></th></tr>
    ${partsList().map((p) => { const n = st['Part: ' + p] ?? 0; return `<tr><td>${esc(p)}</td><td class="n">${n}</td>${who.map((w) => { const h = ppl[w][p] || 0; return `<td class="n"${h < 0 ? ' style="color:var(--bad)"' : ''}>${h}</td>`; }).join('')}<td>${n < min ? '<span class="pill warn">order</span>' : ''}</td></tr>`; }).join('')}</table></div>${who.some((w) => Object.values(ppl[w]).some((h) => h < 0)) ? `<div class="hint" style="color:var(--bad)">${esc('A negative number = used from the bag with no issue record — record the morning issue.')}</div>` : ''}</div>
    <div class="card"><div class="status" style="font-size:15px">🧰 Tools</div>${tools.length ? `<div class="scroll-x"><table class="tbl"><tr><th>Tool</th><th>With</th><th>State</th><th>Last check</th><th class="n">Staff pays</th></tr>${tools.map((x) => `<tr data-edit="tool" data-id="${esc(x.id)}" style="cursor:pointer"><td>${esc(x.name)}${x.serial ? ' <span class="muted">' + esc(x.serial) + '</span>' : ''}</td><td>${esc(x.holder || '')}</td><td><span class="pill ${x.status === 'OK' ? 'ok' : x.status === 'Needs repair' ? 'warn' : 'bad'}">${esc(x.status || '')}</span></td><td class="mono">${esc(x.calibrated || '—')}</td><td class="n">${x.staffShare ? R.npr(x.staffShare) : '—'}</td></tr>`).join('')}</table></div>` : '<div class="empty">No tools recorded yet</div>'}</div>`;
}
export function filterOrderCard(m) {
  if (!m.filterPlan) return '';
  const P = m.filterPlan; const o = P.opts; const pill = { late: ['bad', 'order now — late'], soon: ['warn', 'order soon'], ok: ['ok', 'ok'] };
  return `<div class="card"><div class="status" style="font-size:15px">🧪 Filter order dates</div><div class="muted" style="margin:4px 0 8px">Stock minus every home's filter changes (booking intervals) and new homes at ${(Number(m.metrics.avg4w) || 0).toFixed(1)} a week. Order-by = runs out − ${o.leadWeeks} weeks lead time − ${o.safetyWeeks} weeks safety. Quantity covers ${o.coverMonths} months after arrival. 🔴 Lead time is a guess until a real filter order has come in.</div>
    <div class="scroll-x"><table class="tbl"><tr><th>Filter</th><th class="n">On the shelf</th><th class="n">Needed 90 days</th><th class="n">12 months</th><th>Runs out</th><th>Order by</th><th class="n">Order qty</th><th></th></tr>
    ${P.rows.map((r) => `<tr><td><b>${esc(r.type)}</b></td><td class="n">${r.have}</td><td class="n">${Math.round(r.need90)}</td><td class="n">${Math.round(r.need365)}</td><td class="mono">${esc(r.runOut || '—')}</td><td class="mono">${esc(r.orderBy || '—')}</td><td class="n">${r.qty || '—'}</td><td><span class="pill ${pill[r.status][0]}">${esc(pill[r.status][1])}</span></td></tr>`).join('')}</table></div>
    ${S.isAdmin ? '<div class="hint">Change lead time, safety weeks and months to cover in Settings → Filters.</div>' : ''}</div>`;
}
// Watch list row: who, how many points, why (strongest first) and the next thing to do.
const WATCH_ACT = { pay: ['payment', '💵 Payment'], visit: ['visit', '🔧 Visit'], call: ['checkin', '📞 Log call'], request: ['', '📋 See request'], relocation: ['', '🚚 See move'] };
export function watchItem(w, opts = {}) {
  const c = w.x.c; const dot = w.lvl === 'high' ? 'r' : w.lvl === 'watch' ? 'y' : 'b'; const [form, lab] = WATCH_ACT[w.act] || WATCH_ACT.call;
  const who = R.assigneeOf(c, today());
  const reasons = w.why.slice(0, opts.max || 4).map((r) => `<span class="wr wr-${r.cat}">${r.ic} ${esc(r.t)}</span>`).join('') + (w.why.length > (opts.max || 4) ? `<span class="wr">+${w.why.length - (opts.max || 4)}</span>` : '');
  return `<div class="item watch-i lv-${w.lvl}" data-cust="${esc(c.id)}"><span class="dot ${dot}"></span><div class="main"><div class="t">${esc(c.name)} <span class="pill ${w.lvl === 'high' ? 'bad' : w.lvl === 'watch' ? 'warn' : 'blue'}">${w.score} pts</span></div>
    <div class="s">${esc(toleOf(c))}${who ? ' · 👤 ' + esc(who) : ''}</div><div class="wrs">${reasons}</div>
    <div class="wacts">${form && canForm(form) ? `<button class="btn small" data-go-form="${form}" data-cid="${esc(c.id)}"${form === 'checkin' ? ` data-kind="${esc(w.callKind || 'Follow-up call')}"` : ''}>${lab}</button>` : `<button class="btn small ghost" data-cust="${esc(c.id)}">${form ? '👤 Open' : lab}</button>`}<a class="btn small ghost" href="tel:${esc(c.phone)}" data-stop>📞</a><a class="btn small ghost" href="${esc(waLink(c.phone))}" target="_blank" rel="noopener" data-stop>💬</a><button class="btn small ghost" data-watchok="${esc(c.id)}|${w.score}" title="Checked — hide for 7 days unless it gets worse">✓ Checked</button></div></div></div>`;
}
// Message wording follows G-1 §1-3 (3 days before) with the actual amount of this bill.
export function dunText(x) { /* v0.17.0 (9) E3: the company bank QR (Jun 10/3 — no personal wallets) · dates like the cards (AD + BS) · Nepali checked by Tara 10/4 · v0.17.2 (2): the customer's language, no emoji */
  const d = x.dn; const n = (x.c.name || '').split(' ')[0]; const amt = Math.round(d.owed).toLocaleString('en-IN');
  const ref = x.c.code ? ` Please write ${x.c.code} in the payment remark.` : '', refNe = x.c.code ? ` भुक्तानीको रिमार्कमा ${x.c.code} लेख्नुहोस्।` : ''; /* v0.11.1 (#9): the bank CSV match looks for the KC code first */
  const when = (iso) => (R.isDate(iso) ? `${RC.niceDate(iso)} · ${RC.bsText(iso)}` : String(iso || '')); const whenNe = (iso) => (R.isDate(iso) ? RC.bsText(iso) : String(iso || ''));
  const qr = 'scan the KORA CARE QR on your bill picture with any bank app', qrNe = 'बिलको तस्बिरमा भएको KORA CARE को QR जुनसुकै बैंकको एपबाट स्क्यान गर्नुहोस्';
  if (d.stage === 'reminder') return bi(x.c, `Namaste ${n} ji, this is KORA CARE. Your water purifier bill of NPR ${amt} is due on ${when(d.bill.due)}. To pay, ${qr}.${ref} Thank you.`, `नमस्ते ${n} जी, KORA CARE बाट। तपाईंको पानी प्युरिफायरको NPR ${amt} को बिल ${whenNe(d.bill.due)} मा तिर्नुपर्छ। तिर्न ${qrNe}।${refNe} धन्यवाद।`);
  if (d.stage === 'due') return bi(x.c, `Namaste ${n} ji, a friendly reminder from KORA CARE: today's bill of NPR ${amt} is due. To pay, ${qr}.${ref} Thank you.`, `नमस्ते ${n} जी, KORA CARE बाट सम्झना: आज NPR ${amt} को बिल तिर्ने दिन हो। तिर्न ${qrNe}।${refNe} धन्यवाद।`);
  return bi(x.c, `Namaste ${n} ji, this is KORA CARE. We have not received NPR ${amt} (due ${when(x.led.overdueSince)}). Please ${qr}, or call us if something is wrong with the purifier.${ref} Thank you.`, `नमस्ते ${n} जी, KORA CARE बाट। हामीले NPR ${amt} (${whenNe(x.led.overdueSince)} मा तिर्नुपर्ने) अझै पाएका छैनौं। कृपया ${qrNe}, वा प्युरिफायरमा केही समस्या छ भने हामीलाई फोन गर्नुहोस्।${refNe} धन्यवाद।`);
}
export function reqItem(o) {
  const late = Date.now() > o.sla.replyBy, visitLate = Date.now() > o.sla.visitBy, old = Date.now() - (o.r.receivedAtMs || 0) > 3 * 864e5;
  const cls = old || visitLate ? 'bad' : late ? 'orange' : 'blue';
  const txt = old ? '3+ days!' : visitLate ? 'visit overdue' : late ? 'reply overdue' : 'reply by ' + fmtTime(new Date(o.sla.replyBy), { hour: '2-digit', minute: '2-digit' });
  return `<div class="item" data-cust="${esc(o.r.customerId)}"><span class="dot ${o.r.priority === 'Urgent' ? 'r' : 'y'}"></span><div class="main"><div class="t">${esc(o.r.type)} · ${esc(o.c ? o.c.c.name : '?')}</div>
    <div class="s">${esc(o.r.status)} · ${esc(o.r.priority)} · ${esc(String(o.r.description || '').slice(0, 60))}</div></div><div class="r"><span class="pill ${cls}">${esc(txt)}</span></div></div>`;
}
// Which permission each form needs (Jun has all).
export const FORM_PERM = { install: 'install', visit: 'visit', payment: 'pay', request: 'visit', checkin: 'visit', recovery: 'visit', relocation: 'visit', stock: 'stock', device: 'stock', expense: 'expense', customerEdit: 'editCust', event: 'editCust', contract: 'editCust', claim: 'stock', tool: 'stock' };
// money approvals (v0.8 #12): who may OK a discount / deposit refund (Settings; 🔴 default = admin only)
export const isApprover = () => isBoss() || (R.approvalRule(S.settings).who === 'Admin or money right' && can('money'));
// stamp a money record: over the limit → waits for an OK unless the person saving may approve; editing the amount resets it
function withApproval(col, id, data) {
  const need = R.approvalNeeds(col, data, R.approvalRule(S.settings)); const prev = S.D[col] && S.D[col].get(id);
  const key = col === 'payments' ? 'discount' : 'depositRefunded';
  const unchanged = !!prev && Number(prev[key] || 0) === Number(data[key] || 0) && (prev.customerId || '') === (data.customerId || '');
  if (unchanged) return data; // a re-save with the same amount and home keeps its state (never re-opens, never self-approves)
  if (!need.length) return prev && prev.approval ? { ...data, approval: '', approvedBy: '', approvedByUid: '', approvedAt: '', approvedAmount: null } : data;
  // only the admin's own is approved when saved; anyone else's (an approver's own too) waits for someone else
  return S.isAdmin ? { ...data, approval: 'Approved', approvedBy: myName(), approvedByUid: S.user.uid, approvedAt: new Date().toISOString(), approvedAmount: Number(data[key]) } : { ...data, approval: 'Pending', approvedBy: '', approvedByUid: '', approvedAt: '', approvedAmount: null };
}


export const canForm = (f) => (f === 'payPerson' ? isBoss() : f === 'milestone' ? !!S.isAdmin : f === 'training' ? !!S.isAdmin : !FORM_PERM[f] || can(FORM_PERM[f])); /* payroll: Jun and the deputy only · training records: admin accounts only (Jun 2026-09-30 "내 화면에만") */
function viewNew() {
  // v0.11: grouped rows instead of 18 coloured tiles (Tara 2026-09-30) · the group colour is the icon box
  const row = (f, l, s) => (canForm(f) ? [{ attr: `data-go-form="${f}"`, ic: FORMS[f].icon, l, s }] : []);
  return `<h1>New</h1>` + rowsHtml([
    { title: 'Every day', tone: 'tone-field', rows: [...row('visit', 'Visit', 'filters · TDS · flow · repair'), ...row('payment', 'Payment', 'monthly bill · repair'), ...row('install', 'New install', 'customer + device + day-1 payment'), ...row('request', 'Service request', 'breakdown · leak · claim'), ...row('checkin', 'Check-in call', 'day-7 call · follow-up · payment chase')] },
    { title: 'Sales', tone: 'tone-lead', rows: [...row('lead', 'Lead', 'interested household'), ...row('screening', 'Sign-up screening', 'before an install')] },
    { title: 'Sometimes', tone: 'tone-call', rows: [...row('relocation', 'Relocation', 'customer moves house'), ...row('recovery', 'Recovery case', 'customer left — get the device'), ...row('contract', 'Contract event', 'notice · transfer · lost'), ...row('photo', 'Add photos', 'house · device · contract'), ...row('waterTest', 'Raw-water vial', 'P/A check (PoC)')] },
    { title: 'Office', tone: 'tone-bill', rows: [...row('expense', 'Expense', 'bill · receipt · VAT'), ...row('device', 'Device event', 'arrival · check · refurbish'), ...row('stock', 'Stock', 'devices & filters in/out'), ...row('claim', 'Supplier claim', 'defect → replace or credit'), ...row('tool', 'Tool', 'who has it · repairs'), ...row('training', 'Training', 'who learned what')] },
  ]);
}
export function custListHtml(p) {
  const m = model(); const q = String(p.q || '').toLowerCase(); const f = p.f || 'all';
  let list = [...m.cust.values()];
  if (f === 'overdue') list = list.filter((x) => x.led.overdue > 0 && x.status === 'Active');
  if (f === 'visit') list = list.filter((x) => x.nv && x.nv.date <= m.t);
  if (f === 'paused') list = list.filter((x) => x.status === 'Paused');
  if (f === 'churned') list = list.filter((x) => x.status === 'Churned');
  if (f === 'all') list = list.filter((x) => x.status !== 'Churned');
  if (q) list = list.filter((x) => [x.c.name, x.c.code, x.c.phone, toleOf(x.c), x.c.deviceSerial, x.c.notes].some((s) => String(s || '').toLowerCase().includes(q)));
  list.sort((a, b) => String(a.c.name).localeCompare(String(b.c.name)));
  const more = list.length > 200;
  return (list.slice(0, 200).map((x) => cItem(x)).join('') + (more ? `<div class="empty">+${list.length - 200} more — search to narrow</div>` : '')) || '<div class="empty">No customers</div>';
}
function viewCustomers(p) {
  const f = p.f || 'all';
  const segs = [['all', 'All'], ['overdue', 'Overdue'], ['visit', 'Visit due'], ['paused', 'Paused'], ['churned', 'Churned']];
  return `<h1>Customers <span class="pill">${arr('customers').length}</span></h1>
  <input id="custSearch" type="search" placeholder="Search name, KC code, phone, tole, serial" value="${esc(p.q || '')}">
  <div class="seg" style="margin-top:10px">${segs.map(([k, l]) => `<button data-seg="${k}" class="${f === k ? 'on' : ''}">${l}</button>`).join('')}</div>
  <div class="card flush" id="custList">${custListHtml(p)}</div>
  <button class="btn" data-go-form="install">🏠 New install</button>`;
}
function viewDetail(p) {
  const m = model(); const x = m.cust.get(p.id);
  if (!x) return `<button class="back" data-back>‹ Back</button><div class="card">Customer not found on this phone.</div>`;
  const c = x.c, led = x.led, t = m.t;
  const canEdit = can('editCust') || c.createdBy === (S.user && S.user.uid);
  const rels = m.D.relocations.filter((q) => q.customerId === c.id).sort((a, b) => String(b.moveDate).localeCompare(String(a.moveDate)));
  const dev = c.deviceSerial ? m.devices.find((d) => d.serial === R.normSerial(c.deviceSerial)) : null;
  const pays = m.D.payments.filter((q) => q.customerId === c.id).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const reqs = m.D.requests.filter((q) => q.customerId === c.id).sort((a, b) => (b.receivedAtMs || 0) - (a.receivedAtMs || 0));
  const chks = m.D.checkins.filter((q) => q.customerId === c.id).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const recs = m.D.recoveries.filter((q) => q.customerId === c.id);
  const dep = m.deposits.rows.find((r) => r.c.id === c.id);
  const refs = m.referrals.filter((r) => r.who.id === c.id && !r.done);
  const stPill = { Active: 'ok', Paused: 'blue', Churned: 'grey' }[x.status]; const lostOpen = m.contractOpen.some((o) => o.kind === 'lost' && o.e.customerId === c.id); /* v0.19.0 (7) Jun 10/4 "도난 정산 안됨인데 왜 초록 정상표시임" */
  const receipt = p.receipt && m.D.payments.find((q) => q.id === p.receipt);
  const vrep = p.vrep && m.D.visits.find((q) => q.id === p.vrep); /* v0.14 (#7): no auto popup — a button; Tara decides whether the note goes out */
  const inst = p.inst && c.id === p.inst;
  const bills = led.bills.slice(-6); const spans = R.pauseSpans(c, t); /* v0.9 #2 */
  const hasGps = c.gps && Number.isFinite(c.gps.lat) && Number.isFinite(c.gps.lng);
  const dest = hasGps ? `${c.gps.lat.toFixed(6)},${c.gps.lng.toFixed(6)}` : '';
  // ---- what the technician must do here, now (red / orange / green border)
  const todo = [];
  if (x.dn && ['call', 'visit', 'late', 'due'].includes(x.dn.stage)) todo.push({ lvl: x.dn.stage === 'visit' || x.dn.stage === 'call' ? 'bad' : 'warn', ic: '💰', t: `Collect ${R.npr(led.overdue || x.dn.owed)}`, s: `${x.dn.label}${led.overdueSince ? ' · since ' + led.overdueSince : ''}`, a: `<a class="btn small ok" href="${esc(waLink(c.phone, dunText(x)))}" target="_blank" rel="noopener">💬 Remind</a>${canForm('checkin') ? `<button class="btn small ghost" data-go-form="checkin" data-cid="${esc(c.id)}" data-kind="${esc(R.CHASE_KIND)}">📝 Log chase</button>` : ''}<button class="btn small" data-go-form="payment" data-cid="${esc(c.id)}">💵 Pay</button>` });
  if (x.pr && x.pr.status === 'waiting') todo.push({ lvl: 'info', ic: '🤝', t: `promised by ${x.pr.date}`, s: `${x.pr.amount ? R.npr(x.pr.amount) + ' · ' : ''}${x.pr.by ? 'told ' + x.pr.by + ' · ' : ''}${x.pr.madeOn}` });
  else if (x.pr && x.pr.status === 'broken') todo.push({ lvl: 'bad', ic: '🤝', t: `promise broken (${x.pr.date})`, s: `${x.pr.amount ? R.npr(x.pr.amount) + ' promised · ' : ''}${R.npr(x.pr.paid)} paid by then` });
  else if (x.dn && x.dn.stage === 'reminder') todo.push({ lvl: 'info', ic: '💰', t: `Bill ${R.npr(x.dn.owed)} due ${x.dn.bill.due}`, s: 'Send the reminder 3 days before', a: `<a class="btn small ghost" href="${esc(waLink(c.phone, dunText(x)))}" target="_blank" rel="noopener">💬 Remind</a>` });
  const fo = x.fb && x.fb.date <= t ? x.fd.filter((f) => x.fb.types.includes(f.type)) : x.fd.filter((f) => f.status === 'overdue'); /* v0.15: together = every filter in the batch */
  if (x.c.installDate && x.c.installDate > t && c.phone) todo.push({ lvl: 'info', ic: '📅', t: `Installation booked ${x.c.installDate}`, s: R.daysBetween(t, x.c.installDate) <= 3 ? 'confirm with the customer' : 'confirm 3 days before', a: `<a class="btn small ghost" href="${esc(waLink(c.phone, confText(c, x.c.installDate)))}" target="_blank" rel="noopener">💬 Confirm date</a>` }); /* v0.14 (#4): a booked install gets a 3-day confirm */
  const ns = x.nv && x.nv.noShow; // 🚪 nobody home on the last try (v0.8 #7)
  if (ns && String(ns.date).slice(0, 10) === t) todo.push({ lvl: 'warn', ic: '🚪', t: 'Nobody home today', s: `${ns.noShowReason || 'Nobody home'} · trying again ${ns.retryDate}`, a: c.phone ? `<a class="btn small ghost" href="${esc(waLink(c.phone, missText(c, ns)))}" target="_blank" rel="noopener">💬 Sorry we missed you</a>` : '' });
  if (x.nv && x.nv.date <= t) todo.push({ lvl: x.nv.date < t ? 'bad' : 'warn', ic: '🔧', t: `Visit due ${x.nv.date === t ? 'today' : x.nv.date}`, s: x.nv.source, a: `${can('visit') ? omwBtn(c, 'btn small ghost') : ''}<button class="btn small" data-go-form="visit" data-cid="${esc(c.id)}">🔧 Visit</button>` });
  if (fo.length) todo.push({ lvl: 'bad', ic: '🧪', t: `Filters to change: ${fo.map((f) => f.type).join(', ')}`, s: fo.map((f) => f.why).join(' · '), a: x.nv && x.nv.date <= t ? '' : `<button class="btn small" data-go-form="visit" data-cid="${esc(c.id)}">🔧 Visit</button>` });
  const open = m.openReq.filter((o) => o.r.customerId === c.id);
  for (const o of open) { const late = Date.now() > o.sla.replyBy; todo.push({ lvl: late || o.r.priority === 'Urgent' ? 'bad' : 'warn', ic: '📋', t: `${o.r.type} · ${o.r.status}`, s: `${String(o.r.description || '').slice(0, 80)} · ${late ? 'reply overdue' : 'reply by ' + fmtTime(new Date(o.sla.replyBy), { hour: '2-digit', minute: '2-digit' })}`, a: `<button class="btn small" data-edit="request" data-id="${esc(o.r.id)}">Update</button>` }); }
  for (const o of x.ob.filter((q) => q.status === 'due' || q.status === 'overdue')) todo.push({ lvl: o.status === 'overdue' ? 'warn' : 'info', ic: '📞', t: o.label, s: `due ${o.due}`, a: `<button class="btn small ghost" data-go-form="checkin" data-cid="${esc(c.id)}" data-kind="${esc(o.k === 'Q' ? 'Quarterly call' : o.k)}">📞 Log call</button>` });
  for (const wt of m.vials.waiting.filter((q) => q.customerId === c.id)) todo.push({ lvl: 'info', ic: '🧫', t: 'Read the water vial', s: `filled ${wt.sampledDate || '?'}`, a: `<button class="btn small ghost" data-edit="waterTest" data-id="${esc(wt.id)}">🧫 Read</button>` });
  if (led.contractEnded) todo.push({ lvl: 'warn', ic: '📝', t: 'Contract ended — renew', s: `${R.PRICES.contractMonths} months since ${c.installDate}` });
  for (const o of m.contractOpen.filter((q) => q.e.customerId === c.id)) todo.push(o.kind === 'notice' ? { lvl: o.overdue || o.soon ? 'bad' : 'warn', ic: '📜', t: `ending on ${o.e.endDate || '?'} — book the recovery`, s: o.e.early ? `before 36 months · deposit paid ${R.npr(o.e.depositPaid || 0)} is kept (draft §2.2)` : 'after 36 months · deposit back with the unit (draft §2.2)', a: can('visit') ? `<button class="btn small" data-go-form="recovery" data-cid="${esc(c.id)}">📦 Start recovery</button>` : '' } : { lvl: 'warn', ic: '📜', t: 'device lost or stolen — not settled', s: `${o.e.fault || ''}${o.lateNotice ? ' · told us late (draft §2.5(b))' : ''}`, a: `${can('pay') ? (() => { const LS = R.lostSettlement(c, led, o.e.lostDate || o.e.date); const amt = Number(o.e.settleAmount) > 0 ? Number(o.e.settleAmount) : Math.max(0, LS.total); return `<button class="btn small" data-go-form="payment" data-cid="${esc(c.id)}" data-type="Lost device settlement" data-amount="${amt}" data-lost="${esc(o.e.id)}">💵 Settle · ${R.npr(amt)}</button>`; })() : ''}${canForm('contract') ? `<button class="btn small ghost" data-edit="contract" data-id="${esc(o.e.id)}">Edit</button>` : ''}` }); /* v0.19.0 (8): Settle = take the money (the event closes itself) · Edit = the event */
  for (const r of refs.filter((q) => q.ready)) todo.push({ lvl: 'info', ic: '🎁', t: `Brought ${esc((S.D.customers.get(r.forId) || {}).name || 'a new home')} — referrer's 50% off a bill`, s: '3 months after their install · apply once', a: isBoss() ? `<a href="#" class="btn small ghost" data-refcredit="${esc(r.who.id)}|${esc(r.forId)}">Apply</a>` : '' });
  const worst = todo.some((q) => q.lvl === 'bad') ? 'bad' : todo.some((q) => q.lvl === 'warn') ? 'warn' : todo.length ? 'info' : 'ok';
  const nowCard = x.status === 'Churned' ? `<div class="card now lv-info"><div class="now-h">⚫ Customer has left${c.churnDate ? ` <span class="muted">${esc(c.churnDate)}</span>` : ''}</div>${recs.length ? '' : `<div class="now-i lv-warn"><span class="ic">📦</span><div class="main"><div class="t">No recovery case yet</div><div class="s">get the device back and settle the deposit</div></div><div class="acts"><button class="btn small" data-go-form="recovery" data-cid="${esc(c.id)}">📦 Start</button></div></div>`}<div class="now-i lv-info"><span class="ic">👋</span><div class="main"><div class="t">Thank-you card</div><div class="s">why they left · the unit back · the deposit · see you again</div></div><div class="acts"><button class="btn small ghost" data-act="rcEnd" data-cid="${esc(c.id)}">👋 Card</button></div></div></div>`
    : `<div class="card now lv-${worst}"><div class="now-h">${worst === 'ok' ? '✅ Nothing due here' : '⚡ Do now'}<span class="sp"></span>${worst === 'ok' ? `<span class="muted">${x.nv ? `next visit ${esc(x.nv.date)} · ` : ''}${led.nextBill ? 'next bill ' + esc(led.nextBill.due) : ''}</span>` : ''}</div>
    ${todo.map((q) => `<div class="now-i lv-${q.lvl}"><span class="ic">${q.ic}</span><div class="main"><div class="t">${esc(q.t)}</div><div class="s">${esc(q.s || '')}</div></div>${q.a ? `<div class="acts">${q.a}</div>` : ''}</div>`).join('')}</div>`;
  const kv = (rows) => `<div class="kv">${rows.filter(([, v]) => v !== undefined).map(([k, v, raw]) => `<div class="k">${esc(k)}</div><div class="v">${raw ? v : esc(v ?? '–') || '–'}</div>`).join('')}</div>`;
  return `<button class="back" data-back>‹ Back</button>
  <div class="det-h"><span class="dot ${lostOpen ? 'y' : x.dot}" style="width:16px;height:16px"></span><h1 style="margin:0">${esc(c.name)}</h1></div>
  <div class="muted">${esc(c.code)} · ${esc(toleOf(c))} · Ward ${esc(c.ward || '–')} · <span class="pill ${stPill}">${esc(x.status)}</span>${lostOpen ? ' <span class="pill warn">Lost · not settled</span>' : ''}${c._pending ? ' <span class="pill warn">on phone</span>' : ''}</div>
  ${assignLine(c, t)}
  <div class="links${S.desk ? '' : ' top3'}">
    <a href="tel:${esc(c.phone)}">📞 Call</a><a href="${esc(waLink(c.phone))}" target="_blank" rel="noopener">💬 WhatsApp</a>
    ${can('pay') ? `<button data-go-form="payment" data-cid="${esc(c.id)}">💵 Pay</button>` : ''}${can('visit') ? `<button data-go-form="visit" data-cid="${esc(c.id)}">🔧 Visit</button>` : ''}
  </div>
  <div class="links more${S.desk ? '' : ' hidden'}" id="moreLinks">
    ${hasGps ? `<a href="${esc(G.dirUrl(dest))}" data-nav="${esc(dest)}" target="_blank" rel="noopener">🧭 Navigate</a>` : ''}
    ${can('visit') ? `<button data-go-form="request" data-cid="${esc(c.id)}">📋 Request</button>` : ''}
    ${can('visit') && x.status !== 'Churned' ? omwBtn(c) : ''}
    ${canEdit ? `<button data-go-form="customerEdit" data-id="${esc(c.id)}">✏️ Edit</button>` : ''}${canForm('contract') ? `<button data-go-form="contract" data-cid="${esc(c.id)}">📜 Contract</button>` : ''}
    ${x.status === 'Active' && referralOn() ? `<button data-act="rcRef" data-cid="${esc(c.id)}">🎁 Referral card</button>` : ''}${(() => { const lv = [...m.D.visits.values()].filter((q) => q.customerId === c.id && String(q.status).includes('Completed')).sort((p, q) => String(q.date).localeCompare(String(p.date)))[0]; return lv ? `<button data-act="rcVisit" data-vid="${esc(lv.id)}">📨 Visit note</button>` : ''; })()}${x.status === 'Active' ? `<button data-act="rcInst" data-cid="${esc(c.id)}">🏠 Installed card</button>` : ''}${x.status === 'Active' && S.settings.coQr && (x.dn || (x.led && x.led.nextBill)) ? `<button data-act="rcBill" data-cid="${esc(c.id)}">🧾 Bill + QR</button>` : ''}
    ${S.isAdmin ? `<button data-act="delCust" data-cid="${esc(c.id)}" style="color:var(--bad)">🗑️ Delete (test)</button>` : ''}
  </div>
  <div id="delSlot"></div>
  ${S.desk ? '' : '<button class="btn ghost small" data-act="moreLinks" style="margin-top:6px">⋯ More</button>'}
  ${can('visit') && x.status !== 'Churned' ? omwChips(c) : ''}
  ${receipt ? receiptCard(x, receipt) : ''}
  ${vrep ? `<div class="card" style="border-color:var(--ok)"><div class="status">🔧 Visit saved · ${esc(vrep.date)}</div><button type="button" class="btn ok" style="display:block;width:100%;margin-top:10px" data-act="rcVisit" data-vid="${esc(vrep.id)}">📨 Visit note → WhatsApp</button></div>` : ''}
  ${inst ? `<div class="card" style="border-color:var(--ok)"><div class="status">🎉 Installed</div><button type="button" class="btn ok" style="display:block;width:100%;margin-top:10px" data-act="rcInst" data-cid="${esc(c.id)}">🏠 Installed card → WhatsApp</button><div class="muted" style="margin-top:6px;font-size:12px">Then the receipt below.</div></div>` : ''}
  <div id="rcBox" class="hidden"></div>
  ${nowCard}
  <div class="sec">Location</div>
  <div class="card where">
    ${hasGps ? `<div class="minimap" id="miniMap" data-id="${esc(c.id)}" data-lat="${c.gps.lat}" data-lng="${c.gps.lng}" data-label="${esc((c.name || '').split(' ')[0])}"></div><div class="mini-foot"><span class="muted" data-mini-dist>📍 Tap the pin button on the map to see how far you are</span><a class="btn small" href="${esc(G.dirUrl(dest))}" data-nav="${esc(dest)}" target="_blank" rel="noopener">🧭 Navigate from here</a></div>`
      : `<div class="empty">📍 No location saved for this house yet.${can('visit') && x.status !== 'Churned' ? `<div style="margin-top:8px"><button class="btn small" data-act="gpsHere" data-cid="${esc(c.id)}">📍 Save my location as this house</button></div>` : ''}</div>`}
    ${kv([['Find the house', c.houseDetail], ['Tole · ward · zone', `${toleOf(c)} · Ward ${c.ward || '–'} · ${c.zone || '–'}`], ['Phone', `<a href="tel:${esc(c.phone)}">${esc(c.phone || '–')}</a>`, 1]])}
  </div>
  <div class="sec">Customer</div>
  <div class="card">${kv([['Household', c.householdSize], ['Water before', c.prevWater], ['Water source', c.waterSource], ['Plan', c.plan], ['Signed up', c.signUpDate], ['Screening', (() => { const sc = R.findScreening(m.D.screenings, c.leadId, c.phone); return sc ? `${sc.verdict} · ${sc.decision || ''} · ${sc.date || ''}` : undefined; })()], ['Heard via', (c.referral || '') + (c.referrerName ? ' — ' + c.referrerName : '') + (c.referrerId && S.D.customers.get(c.referrerId) ? ' — ' + S.D.customers.get(c.referrerId).name : '')], ...(c.buyerPan ? [['Buyer PAN', c.buyerPan]] : []), ['Special comment', c.notes]])}</div>
  ${isBoss() ? `<div class="card"><label for="privNotes">🔒 Private notes</label><textarea id="privNotes" placeholder="loading…"></textarea><button class="btn ghost" data-act="privSave" data-cid="${esc(c.id)}">Save private notes</button></div>` : ''}
  ${isBoss() ? (() => { const atOf = (a) => (a.createdAt && a.createdAt.toMillis ? new Date(a.createdAt.toMillis()).toISOString() : String(a.at || '')); const ch = arr('audit').filter((a) => a.customerId === c.id).map((a) => ({ ...a, at: atOf(a), by: userName(a.createdBy, a.createdBy ? '' : a.by) })).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 15); return ch.length ? `<div class="sec">🕵️ Changes to this home</div><div class="card">${ch.map((a) => `<div class="muted" style="margin:4px 0" data-noi18n><b>${esc(String(a.at || '').slice(0, 16).replace('T', ' '))}</b> · ${esc(a.by || '—')} · ${esc(a.col)} — ${(a.fields || []).map((f) => `${esc(f)}: ${esc((a.before || {})[f] || '—')} → ${esc((a.after || {})[f] || '—')}`).join(' · ')}</div>`).join('')}</div>` : ''; })() : ''}
  <div class="sec">Device & filters</div>
  <div class="card">
    <div class="kv"><div class="k">Serial</div><div class="v mono">${c.deviceSerial ? `<a href="#" data-report="device" data-serial="${esc(R.normSerial(c.deviceSerial))}">${esc(c.deviceSerial)}</a>${dev ? ` <span class="pill ${dev.status === 'At a customer' ? 'ok' : 'warn'}">${esc(dev.status)}</span>` : ''}` : '–'}</div><div class="k">Installed</div><div class="v">${esc(c.installDate || '–')} · ${esc(c.agent || '')}</div>
      <div class="k">Water</div><div class="v">raw TDS ${esc(c.rawTds ?? '–')} → ${esc(c.purifiedTds ?? '–')}</div><div class="k">Flow · pressure</div><div class="v">${esc(c.flow ?? '–')} L/min · ${esc(c.pressurePsi ?? '–')} PSI</div>
      <div class="k">Next visit</div><div class="v">${x.nv ? `${esc(x.nv.date)} <span class="muted">(${esc(x.nv.source)})</span>` : '–'}</div></div>
    <div class="scroll-x"><table class="tbl" style="margin-top:10px"><tr><th>Filter</th><th>Last</th><th>Due</th><th></th></tr>
      ${x.fd.map((f) => `<tr><td class="nw">${esc(f.type)}</td><td class="nw">${esc(f.lastIsInstall ? 'install' : f.last)}</td><td class="nw">${esc(f.due || '—')}</td><td>${f.status === 'none' ? '<span class="pill grey">observe</span>' : `<span class="pill ${f.status === 'overdue' ? 'bad' : f.status === 'soon' ? 'warn' : 'ok'}" title="${esc(f.why)}">${f.status}</span>`}</td></tr>`).join('')}</table></div>
  </div>
  ${tdsChart(x.vs, c)}
  <div class="sec">Money</div>
  <div class="card">
    <div class="bigstat"><span class="v" style="color:${led.overdue ? 'var(--bad)' : 'var(--ok)'}">${led.overdue ? R.npr(led.overdue) : 'Paid up'}</span><span class="muted">${led.overdue ? `overdue since ${esc(led.overdueSince)} · ${led.daysOverdue} days` : `through bill ${led.paidThrough}`}</span></div>
    <div class="kv" style="margin-top:10px"><div class="k">Next bill</div><div class="v">${led.nextBill ? `#${led.nextBill.k} · ${R.npr(led.nextBill.amount - led.nextBill.paid)} on ${esc(led.nextBill.due)}` : 'none — has left'}</div>${led.prepaidAfterLeave > 0.5 ? `<div class="k">Paid ahead after leaving</div><div class="v" style="color:var(--warn)">${R.npr(led.prepaidAfterLeave)} — to pay back</div>` : ''}
      <div class="k">Deposit held</div><div class="v">${R.npr(dep ? dep.held : 0)} <span class="muted">of ${R.npr(R.PRICES.depositTotal)}</span></div>
      <div class="k">Month of contract</div><div class="v">${Math.max(1, R.monthsBetween(c.installDate, m.t) + 1 - (led.skipped || []).filter((d) => d <= m.t).length)} / ${R.PRICES.contractMonths}${led.contractEnded ? ' · <span class="pill warn">contract ended — renew</span>' : ''}</div></div>
    <div class="scroll-x" style="margin-top:10px"><table class="tbl"><tr><th>#</th><th>Due</th><th class="n">Amount</th><th class="n">Paid</th><th>Status</th></tr>
      ${bills.map((b) => `<tr><td>${b.k}</td><td>${esc(b.due)}</td><td class="n">${Math.round(b.amount).toLocaleString('en-IN')}</td><td class="n">${Math.round(b.paid).toLocaleString('en-IN')}</td><td><span class="pill ${b.status === 'paid' ? 'ok' : b.status === 'future' ? 'grey' : 'bad'}">${b.status}</span>${R.inPause(spans, b.due) ? ' <span class="pill blue">⏸ paused</span>' : ''}</td></tr>`).join('')}</table></div>
    ${(led.skipped || []).length ? `<div class="muted" style="margin-top:6px">${esc('⏸️ Skipped bill days (paused): ' + led.skipped.join(' · '))}</div>` : ''}
    ${spans.length ? `<div class="sec-mini">⏸️ Pauses (${spans.length})</div>${spans.slice().reverse().map((p) => `<div class="muted" style="margin:3px 0">${esc(p.from || '?')} → <span>${esc(p.to || (p.until ? 'until ' + p.until : 'still paused'))}</span>${p.days !== null ? ` · <span>${esc(p.days + ' days')}</span>` : ''}${esc(p.reason ? ' · ' + p.reason : '')}${p.endedAs === 'Churned' ? ' · <span class="pill grey">left</span>' : ''}${p.late ? ' · <span class="pill bad">restart day passed</span>' : ''}${p.by ? ' · ' + esc(p.by) : ''}</div>`).join('')}` : ''}
    ${x.chases && x.chases.length ? `<div class="sec-mini">📞 Payment contacts (${x.chases.length})</div>${x.chases.slice(0, 8).map((q) => { const pq = R.isDate(q.promiseDate) ? R.promiseOf([q], pays, t) : null; return `<div class="muted" style="margin:3px 0">${esc(q.date)} · ${esc(q.channel || '')} · <span>${esc(q.reached || '—')}</span>${q.by ? ' · ' + esc(q.by) : ''}${pq ? ` · 🤝 <span>${esc(`promised by ${pq.date}`)}</span>${pq.amount ? ' ' + R.npr(pq.amount) : ''} <span class="pill ${{ kept: 'ok', late: 'warn', broken: 'bad', waiting: 'blue' }[pq.status]}">${esc({ kept: 'kept', late: 'paid late', broken: 'broken', waiting: 'waiting' }[pq.status])}</span>` : ''}${q.lateReason ? ' · ' + esc(q.lateReason) : ''}${q.notes ? ` · “${esc(q.notes)}”` : ''}</div>`; }).join('')}` : ''}
    ${refs.length ? `<div class="note">🎁 Referral reward: ${refs.map((r) => `${'50% off a bill (referrer)'} ${r.ready ? `— <a href="#" data-refcredit="${esc(r.who.id)}|${esc(r.forId)}">apply</a>` : `(${esc(r.waiting)})`}`).join(' · ')}</div>` : ''}
  </div>
  <details class="card tl" style="padding:10px 14px"><summary class="sec" style="margin:0;cursor:pointer">🗂️ Photo timeline <span class="muted">(ours · not sent)</span></summary><div class="thumbs" id="photoBox"><span class="muted">Loading…</span></div></details><div class="card"><div class="row"><button class="btn ghost small" data-go-form="photo" data-cid="${esc(c.id)}">📷 Add photos</button>${DEMO ? '' : `<button class="btn ghost small" data-act="photosNet" data-cid="${esc(c.id)}">☁️ Load from server</button>`}</div></div>
  ${rels.length ? `<div class="sec">Relocations (${rels.length})</div><div class="card flush">${rels.map((r) => `<div class="item" data-edit="relocation" data-id="${esc(r.id)}"><div class="main"><div class="t">${esc(r.moveDate || '')} · ${esc(r.status)}</div><div class="s">${esc(r.oldTole === 'Other' ? r.oldToleOther : r.oldTole || '?')} → ${esc(r.newTole === 'Other' ? r.newToleOther : r.newTole || '?')}${r.newSerial ? ' · new device ' + esc(r.newSerial) : ''}</div></div><div class="r">›</div></div>`).join('')}</div>` : ''}
  <div class="sec">Visits (${x.vs.length})</div>
  <div class="card">${x.vs.length ? `<div class="timeline">${x.vs.slice().reverse().map((v) => `<div class="ev"><b>${esc(v.date)}</b> · ${esc(v.visitType || 'Visit')} <span class="pill ${isDone(v.status) ? 'ok' : 'grey'}">${esc(String(v.status || '').replace(/^\S+\s/, ''))}</span>${v.signed ? ' ✍️' : ''}${v._pending ? ' <span class="pill warn">on phone</span>' : ''}<div class="muted">${esc((v.filters || []).join(', ') || 'no filter')} · PP ${esc(v.ppColor || '–')} · TDS ${esc(v.tdsBefore ?? '–')}→${esc(v.tdsAfter ?? '–')} · flow ${esc(v.flow ?? '–')} · ${esc(v.technician || '')}</div>${v.notes ? `<div class="muted">“${esc(v.notes)}”</div>` : ''}</div>`).join('')}</div>` : '<div class="empty">No visits yet</div>'}</div>
  <div class="sec">Payments (${pays.length})</div>
  <div class="card flush">${pays.map((q) => `<div class="item" data-receipt="${esc(q.id)}" data-cid="${esc(c.id)}"><div class="main"><div class="t">${R.npr(q.amount)} · ${esc(q.type)}</div><div class="s">${esc(q.date)} · ${esc(q.method || '')} ${q.ref ? '· ' + esc(q.ref) : ''}${q.billNo ? ' · bill ' + esc(q.billNo) : q.type !== 'Referral credit' ? ' · <span style="color:var(--warn)">no bill no.</span>' : ''}${q._pending ? ' · on phone' : ''}</div></div><div class="r">🧾</div></div>`).join('') || '<div class="empty">No payments yet</div>'}</div>
  ${reqs.length ? `<div class="sec">Requests</div><div class="card flush">${reqs.map((r) => `<div class="item" data-edit="request" data-id="${esc(r.id)}"><div class="main"><div class="t">${esc(r.type)} · ${esc(r.status)}</div><div class="s">${esc(String(r.receivedAt || '').replace('T', ' '))} · ${esc(String(r.description || '').slice(0, 70))}</div></div><div class="r">›</div></div>`).join('')}</div>` : ''}
  <div class="sec">Onboarding & calls</div>
  <div class="card"><div class="progress-steps" style="margin-bottom:10px">${x.ob.slice(0, 4).map((o) => `<i class="${o.status === 'done' ? 'on' : ''}" title="${esc(o.label)}"></i>`).join('')}</div>
    ${x.ob.map((o) => `<div class="item" data-go-form="checkin" data-cid="${esc(c.id)}" data-kind="${esc(o.k)}"><div class="main"><div class="t">${esc(o.label)}</div><div class="s">${esc(o.due)}${o.done ? ' · ' + esc(o.done.result) + ' by ' + esc(o.done.by) : ''}</div></div><div class="r"><span class="pill ${o.status === 'done' ? 'ok' : o.status === 'overdue' ? 'bad' : o.status === 'due' ? 'warn' : 'grey'}">${o.status}</span></div></div>`).join('')}
    ${chks.filter((q) => !['D7', R.CHASE_KIND].includes(q.kind)).map((q) => `<div class="muted">📞 ${esc(q.date)} ${esc(q.kind)} · ${esc(q.result)}${q.satisfaction ? ' · ' + '★'.repeat(Math.max(0, Math.min(5, Math.round(Number(q.satisfaction) || 0)))) : ''}</div>`).join('')}</div>
  ${(() => { const ce = arr('contractEvents').filter((e) => e.customerId === c.id).sort((a, b) => String(b.date).localeCompare(String(a.date))); return ce.length ? `<div class="sec">📜 Contract events (${ce.length})</div><div class="card flush">${ce.map(contractItem).join('')}</div>` : ''; })()}
  ${recs.length ? `<div class="sec">Recovery</div><div class="card flush">${recs.map((r) => `<div class="item" data-edit="recovery" data-id="${esc(r.id)}"><div class="main"><div class="t">${esc(r.outcome)}</div><div class="s">started ${esc(r.startedDate)} · attempts ${esc(r.attempts ?? '–')}${r.daysToClose !== null && r.daysToClose !== undefined ? ' · ' + r.daysToClose + ' days' : ''}</div></div><div class="r">›</div></div>`).join('')}</div>` : ''}
  ${custTimeline(c, m)}
  ${x.status !== 'Churned' && can('visit') ? `<div class="row"><button class="btn ghost" data-go-form="relocation" data-cid="${esc(c.id)}">🚚 Moving house</button><button class="btn ghost" data-go-form="recovery" data-cid="${esc(c.id)}">📦 Leaving → recovery</button></div>` : ''}`;
}
// Who goes to this home (dispatch). Jun changes it here or on the desk Dispatch page.
function assignLine(c, t) {
  const who = R.assigneeOf(c, t); const cov = !!(c.cover && c.cover.to && c.cover.until >= t);
  if (!S.isAdmin) return who ? `<div class="assign muted">👤 ${esc(who)}</div>` : '';
  return `<div class="assign"><span>👤 Goes to</span><select data-assign="${esc(c.id)}"><option value="">— nobody yet</option>${techNames().map((n) => `<option value="${esc(n)}"${n === (c.assignee || '') ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>${cov ? `<span class="pill warn">now ${esc(c.cover.to)} · until ${esc(c.cover.until)}</span><button class="btn small ghost" data-uncover="${esc(c.id)}">end cover</button>` : ''}</div>`;
}
// Everything that happened at this home on one line each, newest first (who did it, when).
function custTimeline(c, m) {
  const ev = []; const add = (d, ic, t, s, attrs = '') => { if (R.isDate(d)) ev.push({ d: String(d).slice(0, 10), ic, t, s, attrs }); };
  add(c.signUpDate, '✍️', 'Signed up', c.referral || '');
  add(c.installDate, '🏠', 'Installed', `${c.deviceSerial || ''}${c.agent ? ' · ' + c.agent : ''}`);
  for (const q of m.D.payments) if (q.customerId === c.id) add(q.date, '💵', `${R.npr(q.amount)} · ${q.type}`, `${q.method || ''}${q.by ? ' · ' + q.by : ''}`, `data-receipt="${esc(q.id)}" data-cid="${esc(c.id)}"`);
  for (const v of m.D.visits) if (v.customerId === c.id) add(v.date, '🔧', `${v.visitType || 'Visit'} · ${String(v.status || '').replace(/^\S+\s/, '')}`, `${(v.filters || []).length ? 'filters ' + v.filters.join(', ') + ' · ' : ''}${v.technician || ''}`, `data-edit="visit" data-id="${esc(v.id)}"`);
  for (const r of m.D.requests) if (r.customerId === c.id) add(String(r.receivedAt || '').slice(0, 10), '📋', `${r.type} · ${r.status}`, String(r.description || '').slice(0, 60), `data-edit="request" data-id="${esc(r.id)}"`);
  for (const q of m.D.checkins) if (q.customerId === c.id) add(q.date, '📞', `${q.kind} · ${q.result || ''}`, q.by || '');
  for (const r of m.D.relocations) if (r.customerId === c.id) add(r.moveDate, '🚚', `Relocation · ${r.status}`, `${r.oldTole || ''} → ${r.newTole === 'Other' ? r.newToleOther : r.newTole || ''}`, `data-edit="relocation" data-id="${esc(r.id)}"`);
  for (const r of m.D.recoveries) if (r.customerId === c.id) add(r.startedDate, '📦', `Recovery · ${r.outcome}`, '', `data-edit="recovery" data-id="${esc(r.id)}"`);
  for (const e of m.D.events) if (e.customerId === c.id) add(e.date, '🗓️', e.title || e.kind, e.kind || '');
  if (c.status === 'Churned') add(c.churnDate, '⚫', 'Left', '');
  if (!ev.length) return '';
  ev.sort((a, b) => b.d.localeCompare(a.d));
  return `<div class="sec">Everything here (${ev.length})</div><div class="card"><div class="timeline tl360">${ev.map((e) => `<div class="ev" ${e.attrs}><span class="tl-d mono">${esc(e.d)}</span><span class="tl-i">${e.ic}</span><span class="tl-t"><b>${esc(e.t)}</b>${e.s ? ` <span class="muted">${esc(e.s)}</span>` : ''}</span></div>`).join('')}</div></div>`;
}
// TDS after each completed visit (plan: "TDS 그래프") — a rising line = filters getting tired.
function tdsChart(vs, c) {
  const pts = [[c.installDate, c.purifiedTds], ...vs.filter((v) => isDone(v.status) && Number.isFinite(v.tdsAfter)).map((v) => [v.date, v.tdsAfter])].filter(([d, y]) => R.isDate(d) && Number.isFinite(Number(y)) && y !== null);
  if (pts.length < 2) return '';
  const w = 320, h = 90, ys = pts.map((p) => Number(p[1])), max = Math.max(...ys) * 1.15 || 1, min = 0;
  const t0 = R.parseD(pts[0][0]).getTime(), t1 = R.parseD(pts[pts.length - 1][0]).getTime() || t0 + 1;
  const X = (d) => 8 + ((R.parseD(d).getTime() - t0) / Math.max(1, t1 - t0)) * (w - 16), Y = (y) => h - 14 - ((y - min) / (max - min)) * (h - 26);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(Number(p[1])).toFixed(1)).join(' ');
  return `<div class="sec">Purified TDS over time</div><div class="card chart"><svg viewBox="0 0 ${w} ${h}"><path d="${path}" class="line" stroke="var(--brand)"/>${pts.map((p) => `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(Number(p[1])).toFixed(1)}" r="3.5" fill="var(--brand)"><title>${esc(p[0])}: ${esc(p[1])}</title></circle>`).join('')}
    <text class="ax" x="8" y="${h - 2}">${esc(pts[0][0])}</text><text class="ax" x="${w - 8}" y="${h - 2}" text-anchor="end">${esc(pts[pts.length - 1][0])}</text><text class="ax" x="${w - 8}" y="10" text-anchor="end">max ${Math.max(...ys)}</text></svg></div>`;
}
// Receipt: deposit and subscription on separate lines (G-1 §1-2 · lawyer R3 D2(c)).
function receiptCard(x, pay) { /* v0.14 (Jun 10/3 #6): the picture is the receipt — the text version is gone */
  return `<div class="card" style="border-color:var(--ok)"><div class="status">🧾 Receipt saved · ${esc(RC.receiptNo(pay))}</div>
    <button type="button" class="btn ok" style="display:block;width:100%;margin-top:10px" data-act="rcImg" data-pid="${esc(pay.id)}">🧾 Receipt → WhatsApp</button></div>`;
}
/* v0.12 image receipt (Jun 2026-10-01 "이거로 하자"): the picture version of the same payment, drawn on this phone (receipt.js),
   then the share sheet → WhatsApp → the customer. Falls back to "save the image" where the share sheet cannot take files. */
/* v0.12 image receipt (Jun 2026-10-01 "이거로 하자") + v0.13 referral card · visit report (Jun 10/2 "뭐 할거 더 없어?") — all drawn on this phone
   (receipt.js) then the share sheet → WhatsApp → the customer. Falls back to "save the image" where the share sheet cannot take files. */
export async function visitPhotos(parent) { /* v0.14: the first two photos saved with a record (phone copies first, then the cache) → Image objects for the canvas */
  const out = []; const toImg = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  /* v0.17.3 (1) Jun 10/4 "여전히 사진 3장 업로드해도 안된다": a sent photo has no copy here any more (dropped once the server has it) — photoGet now says so
     instead of true, so the server is asked. The record's own photos (install · visit · repair) by their number; never the signature (same parent) */
  const add = (src, role) => { if (typeof src === 'string' && src.startsWith('data:image/') && out.length < 8 && !out.some((o) => o.src === src)) out.push({ src, role: role || '' }); }; /* v0.18.3: cards draw the thumbnail (new docs) or the picture (old docs) · v0.19.0 (4): with the role */
  const own = (x) => (['install', 'visit', 'repair'].includes(x.kind) ? 0 : 1);
  const take = (xs) => xs.filter((x) => x && x.kind !== 'Signature').sort((a, b) => own(a) - own(b) || (Number(a.n) || 0) - (Number(b.n) || 0)).forEach((x) => add(photoSrc(x), x.role));
  const enough = () => out.some((o) => o.role === 'before') && out.some((o) => o.role === 'after');
  const loc = []; for (const e of myJournal().filter((e) => e.photo && e.data && e.data.parent === parent)) { const img = await photoGet(e.id); if (img) loc.push({ ...e.data, img }); } take(loc);
  if (!enough() && !DEMO) { const q = query(collection(db, 'photos'), where('parent', '==', parent), qLimit(12)); const docs = (snap) => snap.docs.map((d) => d.data());
    try { take(docs(await getDocsFromCache(q))); } catch (e) {}
    if (!enough() && navigator.onLine) { try { take(docs(await getDocs(q))); } catch (e) {} } }
  /* "before" / "after" by label; a record without labels (older visits · installs) = the first two by order */
  const pick = (role, idx) => { const byRole = out.find((o) => o.role === role); const rest = out.filter((o) => !['before', 'after'].includes(o.role) || o.role === role); return byRole || rest[idx] || null; };
  const b = pick('before', 0), a = pick('after', b && !b.role ? 1 : 0);
  const im = async (o) => (o ? await toImg(o.src) : null);
  return { before: await im(b), after: a && a !== b ? await im(a) : null };
}
// ---- v0.17.3 (6) Jun 10/4 "나 (준 관리자 권한 딱 나만)나 전용으로 고객 삭제버튼 이런거 넣어봐 테스트 여러게하고 삭제하게": Jun only (the rules say the same) ·
// the customer and every record that points at them (payments · visits · photos · requests …) · the code typed to confirm · online only (half a customer is worse).
// The change log keeps its entries (append-only) and gets one more: who deleted which customer and how many records.
const DEL_COLS = ['visits', 'payments', 'requests', 'leads', 'recoveries', 'trainings', 'checkins', 'stockMoves', 'deviceEvents', 'relocations', 'contractEvents', 'screenings', 'claims', 'tools', 'waterTests'];
export function custRefs(id) { const out = [`customers/${id}`]; for (const col of DEL_COLS) { const m = S.D[col]; if (m) for (const [did, x] of m) if (x && x.customerId === id) out.push(`${col}/${did}`); } return out; }
export async function deleteCustomer(id) {
  const x = S.D.customers.get(id); if (!S.isAdmin) return { ok: false, msg: 'Only Jun can delete' }; if (!x) return { ok: false, msg: 'Customer not found' };
  const refs = custRefs(id);
  if (!DEMO) {
    if (!navigator.onLine) return { ok: false, msg: 'Offline — deleting needs the internet' };
    const stPaths = []; try { (await getDocs(query(collection(db, 'photos'), where('customerId', '==', id)))).forEach((d) => { refs.push(`photos/${d.id}`); const st = d.get('st'); if (st) stPaths.push(st); }); } catch (e) { return { ok: false, msg: 'Photos could not be listed: ' + (e.code || e.message) }; }
    await Promise.allSettled(stPaths.map((p) => deleteObject(sRef(storage, p)))); /* v0.18.3 (B3): the files in Storage go too (best effort) */
    const all = [...refs, `customers/${id}/private/main`];
    try { for (let i = 0; i < all.length; i += 400) { const b = writeBatch(db); for (const p of all.slice(i, i + 400)) b.delete(doc(db, p)); await b.commit(); } }
    catch (e) { return { ok: false, msg: e && e.code === 'permission-denied' ? 'The server refused — publish the new rules first (Firebase → Firestore → Rules)' : 'Not deleted: ' + (e.code || e.message) }; }
  }
  for (const p of refs) { const [col, did] = p.split('/'); if (S.D[col]) S.D[col].delete(did); }
  const keep = []; for (const e of jLoad()) { const d = e.data || {}; if (d.customerId === id || e.path === `customers/${id}` || String(e.path || '').startsWith(`customers/${id}/`)) { if (e.photo) photoDel(e.id); } else keep.push(e); } jSave(keep); /* a copy still waiting to be sent would bring them back */
  save(`audit/${newId('audit')}`, { col: 'customers', docId: id, customerId: '', fields: ['deleted'], before: { deleted: `${x.code || ''} ${x.name || ''}`.trim() }, after: { deleted: `${refs.length} records` }, by: myName(), at: new Date().toISOString() }, true);
  bump(); return { ok: true, n: refs.length };
}
function delAsk(id) {
  const slot = $('#drawer #delSlot') || $('#delSlot'); const x = S.D.customers.get(id); if (!slot || !x || !S.isAdmin) return;
  const refs = custRefs(id); const per = {}; for (const p of refs.slice(1)) { const k = p.split('/')[0]; per[k] = (per[k] || 0) + 1; }
  slot.innerHTML = `<form class="card delbox" id="delForm" autocomplete="off"><div class="status">🗑️ Delete this test customer for good?</div>
    <div class="muted"><span data-noi18n>${esc(custLabel(x))}</span> · <span>${refs.length} records</span>${Object.keys(per).length ? ` <span data-noi18n>(${esc(Object.entries(per).map(([k, n]) => `${k} ${n}`).join(' · '))})</span>` : ''} <span>and their photos.</span></div>
    <div class="muted">It cannot be undone. Only for test customers — a real customer's bills are tax records.</div>
    <label for="delCode">Type the code to confirm</label><input id="delCode" placeholder="${esc(x.code || '')}" data-noi18n>
    <div class="row"><button type="button" class="btn bad" data-act="delCustGo" data-cid="${esc(id)}">🗑️ Delete for good</button><button type="button" class="btn ghost" data-act="delCustNo">Cancel</button></div></form>`;
  const inp = $('#delCode'); if (inp) inp.focus();
}
async function delGo(id) {
  const x = S.D.customers.get(id); const inp = $('#delCode'); if (!x || !S.isAdmin) return;
  if (!inp || inp.value.trim().toUpperCase() !== String(x.code || '').trim().toUpperCase()) { toast('Type the code exactly'); if (inp) inp.focus(); return; }
  const b = $('[data-act="delCustGo"]'); if (b) b.disabled = true;
  const r = await deleteCustomer(id); if (!r.ok) { toast(r.msg, 7000); if (b) b.disabled = false; return; }
  toast(`🗑️ Deleted — ${r.n} records`); if (S.drawer) closeDrawer(); go('customers', 'customers', {});
}
// v0.15: who is on the card — full name + photo from the Staff page (users.fullName / users.photo); own profile on a staff phone; the name alone otherwise
export async function staffWho(name) {
  const n = String(name || '').trim(); if (!n) return {};
  if (isBoss() && !S.usersCache && !DEMO) { try { S.usersCache = await fetchUsers(); } catch (e) {} } /* Jun / the deputy can read every staff card */
  const us = [...(S.usersCache || []), ...(S.demoUsers || [])]; let u = us.find((q) => q.name === n || q.fullName === n);
  if (!u && S.profile && (S.profile.name === n || S.profile.fullName === n || myName() === n)) u = S.profile;
  const out = { name: (u && u.fullName) || n };
  if (u && u.photo) out.photo = await new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = u.photo; });
  return out;
}
// v0.16: the company payment QR lives in Settings (uploaded picture, never in the code)
function qrImage() { const src = S.settings.coQr; if (!src) return Promise.resolve(null); return new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }); }
// v0.16 #4 (optimisation, Jun 10/3 "최적화를 하자"): a customer picture is drawn once and kept. Right after a payment, visit or
// install is saved, its card is drawn in the background, so the WhatsApp button shows it at once. The key is the card's content
// (photos counted by size), so a change — a payment, a setting, a new photo — draws it again instead of showing an old picture.
const RC_CACHE = new Map(); const RC_MAX = 4; /* the PNG is kept, not the canvas — a 1440 × 2800 canvas is ~16 MB of phone memory */
const imgKey = (k, v) => (v && typeof v === 'object' && typeof v.src === 'string' && 'naturalWidth' in v ? 'img:' + v.src.length : v);
export const rcCacheKeys = () => [...RC_CACHE.keys()];
// ---- v0.16.0 (5) · Jun 10/3 "일단 내가 하는거로. 맥으로": the customer cards go out from the desk for now (WhatsApp Web = the company account in Chrome).
// Which cards are sent is kept on THIS computer only (localStorage) — no server field, no rules change · 60 days, then forgotten.
const CARDS_SENT = 'kfp_cards_sent';
export function cardsSent() { try { const v = JSON.parse(localStorage.getItem(CARDS_SENT) || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch (e) { return {}; } }
export function markCardSent(key, on) {
  const s = cardsSent(); if (on) s[key] = today(); else delete s[key];
  const cut = R.addDays(today(), -60); for (const k of Object.keys(s)) if (!R.isDate(s[k]) || s[k] < cut) delete s[k];
  try { localStorage.setItem(CARDS_SENT, JSON.stringify(s)); } catch (e) {}
  return !!s[key];
}
// practice/demo: the numbers are made up ('+97798' + 8 random digits) and may belong to real people — never open their chat
// v0.17.4: a WhatsApp web link → the same chat in the app (wa.me/977…?text= · api / web …/send?phone=&text=)
export function toAppUrl(href) {
  if (String(href).startsWith('whatsapp:')) return href; let u; try { u = new URL(href); } catch (e) { return 'whatsapp://send'; }
  const ph = u.searchParams.get('phone') || (u.hostname === 'wa.me' ? u.pathname.replace(/\D/g, '') : ''); const tx = u.searchParams.get('text') || '';
  return waUrl(ph, tx, { computer: true, app: true });
}
export function waWebOpen(phone) { /* the customer's chat in the WhatsApp app (v0.17.3 (5) one fixed place · the web tab is gone) */
  try { WA.open(waUrl(phone, '', { demo: DEMO, computer: true, app: true })); return true; } catch (e) { return null; }
}
function csLayout() { /* v0.16.0 (7): 8 rows on screen, the rest behind "+N more" · counts follow the rows */
  const L = document.querySelector('.cs-list'); if (!L) return;
  const rows = [...L.querySelectorAll('.cs-i')]; const open = L.classList.contains('cs-open');
  rows.forEach((r, i) => r.classList.toggle('hidden', !open && i >= 8));
  const total = Number(L.dataset.csTotal) || rows.length; /* v0.18.1 (B5): only 8 rows are in the DOM until "+N more" */
  const mb = document.querySelector('[data-act="cardsMore"]'); if (mb) { if (!open && total > 8) mb.textContent = `+${total - 8} more`; else mb.remove(); }
  const n = document.querySelector('[data-cards-todo]'); if (n) { n.textContent = `${rows.length} to send`; n.classList.toggle('warn', rows.length > 0); n.classList.toggle('ok', !rows.length); }
  if (!rows.length && !L.querySelector('.empty')) L.insertAdjacentHTML('beforeend', '<div class="empty">Nothing to send</div>');
}
const sentLabel = (on) => (on ? '✓ Sent · ↩ undo' : '✓ Sent — take it off the list'); /* v0.17.0 (1) (2): Jun "mark as sent가 뭐야" — say what the button does */
function syncSentUi(key, on) { /* in place — re-rendering the modal would drop the picture */
  for (const b of document.querySelectorAll('#rcBox [data-act="cardSent"]')) if (b.dataset.key === key) { b.textContent = sentLabel(on); b.classList.toggle('on', !!on); }
  if (on) {
    let gone = 0; for (const r of document.querySelectorAll('[data-cardrow]')) if (r.dataset.cardrow === key) { r.remove(); gone++; }
    const sp = document.querySelector('[data-cards-sent]'); if (gone && sp) { const k = (Number(sp.dataset.cardsSent) || 0) + 1; sp.dataset.cardsSent = String(k); sp.textContent = `${k} sent`; }
    csLayout();
  } else S.staleDesk = true; /* un-marked in the card window: the row comes back when the window closes and the desk redraws */
}
async function cardSpec(kind, id) {
  const co = { name: S.settings.coName || 'Kora Care Private Limited', nameNe: S.settings.coNameNe || '', pan: S.settings.coPan || '', ward: S.settings.coAddress || 'Pokhara-13', phone: S.settings.coPhone || '', bankLine: S.settings.coBankLine || '' };
  let x, d, draw, name, alt, noteWait = false;
  if (kind === 'receipt') { const pay = S.D.payments.get(id); if (!pay) return null; x = model().cust.get(pay.customerId); if (!x) return { err: 'Customer not found' }; d = RC.receiptData(x, pay, co, [...S.D.payments.values()].filter((q) => q.customerId === pay.customerId), today()); draw = () => RC.drawReceipt(d); name = `${d.no}.png`; alt = 'receipt'; }
  else if (kind === 'referral') { x = model().cust.get(id); if (!x) return null; d = RC.referralData(x, co); draw = () => RC.drawReferralCard(d); name = `KORA-referral-${d.code || 'card'}.png`; alt = 'referral card'; }
  else if (kind === 'visit') { const v = S.D.visits.get(id); if (!v) return null; x = model().cust.get(v.customerId); if (!x) return null; const ph = R.isNoShow(v) ? {} : await visitPhotos(`visits/${id}`); d = RC.visitData(x, v, co, ph, await staffWho(v.technician)); /* v0.19.0 (4)(5): photos on every completed visit (not only PP) · none on a missed one */ draw = () => RC.drawVisitReport(d); name = `KORA-visit-${v.date}-${d.code || ''}.png`; alt = 'visit note'; noteWait = !!(d.note && d.note.waiting);
    if (noteWait && !DEMO && !(S.trAsk || (S.trAsk = {}))[id]) { S.trAsk[id] = 1; getDocFromServer(doc(db, 'visits', id)).then((sn) => { const tr = sn.exists() ? sn.get('custNoteTr') : null; const cur = S.D.visits.get(id); if (tr && typeof tr === 'object' && cur) { S.D.visits.set(id, { ...cur, custNoteTr: tr }); bump(); } }).catch(() => { delete S.trAsk[id]; }); } /* v0.17.2 (4): the server adds custNoteTr without a new updatedAt → a phone restarted right after saving never got it */ }
  else if (kind === 'bill') { x = model().cust.get(id); if (!x) return null; d = RC.billData(x, co, await qrImage(), today()); if (!d) return { err: 'No bill to show for this home' }; draw = () => RC.drawBillCard(d); name = `KORA-bill-${d.code || ''}-${today()}.png`; alt = 'bill with QR'; } /* v0.16 #7 */
  else if (kind === 'ended') { x = model().cust.get(id); if (!x) return null; const rec = [...S.D.recoveries.values()].filter((r) => r.customerId === id).sort((p, q) => String(q.startedDate || q.churnDate || '').localeCompare(String(p.startedDate || p.churnDate || '')))[0] || null; d = RC.endedData(x, co, rec, await staffWho(x.c.agent || myName())); draw = () => RC.drawEndedCard(d); name = `KORA-thankyou-${d.code || ''}.png`; alt = 'thank-you card'; } /* v0.19.0 (10) */
  else if (kind === 'install') { x = model().cust.get(id); if (!x) return null; const ph = await visitPhotos(`customers/${id}`); d = RC.installData(x, co, ph.before || ph.after || null, await staffWho(x.c.agent || myName())); draw = () => RC.drawInstallCard(d); name = `KORA-installed-${d.code || ''}.png`; alt = 'installed card'; }
  else return null;
  return { kind, d, draw, name, alt, key: kind + '|' + id + '|' + JSON.stringify(d, imgKey), phone: (x && x.c && x.c.phone) || '', sentKey: ['receipt', 'visit', 'install', 'ended'].includes(kind) ? kind + ':' + id : '', noteWait }; /* v0.16.0 (5): phone + sent key for the desk */
}
async function cardImage(sp) {
  const hit = RC_CACHE.get(sp.key); if (hit) { RC_CACHE.delete(sp.key); RC_CACHE.set(sp.key, hit); return { ...hit, cached: true }; }
  const cv = await sp.draw(); const blob = await RC.canvasBlob(cv); const e = { w: cv.width, h: cv.height, blob, url: URL.createObjectURL(blob), name: sp.name, alt: sp.alt };
  cv.width = cv.height = 0; /* free the canvas memory at once (iOS keeps it otherwise) */
  RC_CACHE.set(sp.key, e);
  while (RC_CACHE.size > RC_MAX) { const [k0, e0] = RC_CACHE.entries().next().value; RC_CACHE.delete(k0); if (e0.url !== S.rcUrl) { try { URL.revokeObjectURL(e0.url); } catch (err) {} } }
  return { ...e, cached: false };
}
// draw in the background after a save — idle time, never in the way of the screen that just opened
function prerenderCard(kind, id, delay = 700) {
  const go1 = async () => { try { const sp = await cardSpec(kind, id); if (sp && !sp.err) await cardImage(sp); } catch (e) {} };
  setTimeout(() => (window.requestIdleCallback ? window.requestIdleCallback(go1, { timeout: 2500 }) : go1()), delay);
}
async function imageCard(kind, id) {
  const box = $('#rcBox'); if (!box) return;
  box.classList.remove('hidden'); const slow = setTimeout(() => { box.innerHTML = '<div class="muted" style="margin-top:8px">Making the picture…</div>'; }, 120);
  try {
    const sp = await cardSpec(kind, id); if (!sp || sp.err) { clearTimeout(slow); if (sp && sp.err) toast(sp.err); box.classList.add('hidden'); return; }
    const r = await cardImage(sp); clearTimeout(slow);
    S.rcCanvas = { width: r.w, height: r.h }; S.rcKind = kind; /* the size only — the picture itself is the PNG */ S.rcBlob = r.blob; S.rcUrl = r.url; S.rcName = r.name; S.rcFromCache = r.cached; S.rcPhone = sp.phone || ''; S.rcSentKey = sp.sentKey || '';
    const can = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [new File([r.blob], S.rcName, { type: 'image/png' })] }));
    const web = !!S.desk && /^\d{8,15}$/.test(String(S.rcPhone || '').replace(/\D/g, '')); /* v0.16.0 (5) ④ the desk sends through WhatsApp Web (the company account in Chrome) */
    const sk = S.desk ? S.rcSentKey : ''; /* ⑥ sent mark — desk only */
    const hint = web ? 'Copies the picture and opens the customer chat → press ⌘V in the chat, then send' : can && !S.desk ? 'Share → choose WA Business → the customer' : 'Save, then send it from WhatsApp';
    if (S.desk) { /* v0.17.0 (1) A2: picture left · buttons right — stacked under the picture they sat below a 990-px screen (y 1103 · 1225) */
      box.innerHTML = `<div class="rc-desk"><img class="rc-img" src="${esc(S.rcUrl)}" alt="${esc(r.alt)}"><div class="rc-side">
        ${web ? `<button type="button" class="btn ok" data-act="rcWaWeb">💬 WhatsApp app</button>` : ''}
        <a class="btn ghost rc-save" href="${esc(S.rcUrl)}" download="${esc(S.rcName)}">⬇️ Save image</a>
        ${sk ? `<button type="button" class="btn ghost rc-sent${cardsSent()[sk] ? ' on' : ''}" data-act="cardSent" data-key="${esc(sk)}">${sentLabel(!!cardsSent()[sk])}</button>` : ''}
        <div class="muted rc-hint">${hint}</div>${sk ? '<div class="muted rc-hint">✓ = it leaves 📨 Cards to send (this computer only)</div>' : ''}${sp.noteWait ? '<div class="warn rc-hint">📝 The note is not translated yet — it is added once the visit reaches the server. Open the card again in a minute.</div>' : ''}</div></div>`;
      box.scrollIntoView({ block: 'start', behavior: 'smooth' }); return;
    }
    box.innerHTML = `<img class="rc-img" src="${esc(S.rcUrl)}" alt="${esc(r.alt)}">
      ${web ? `<button type="button" class="btn ok" style="display:block;width:100%" data-act="rcWaWeb">💬 WhatsApp app</button>` : ''}
      ${can && !S.desk ? `<button type="button" class="btn ok" style="display:block;width:100%" data-act="rcShare">📤 Share → WhatsApp</button>` : ''}${/* desk: no 📤 — the Mac share menu's WhatsApp may not be the company account */ ''}
      <a class="btn ghost" style="display:flex;align-items:center;justify-content:center;width:100%;text-decoration:none;margin-top:8px" href="${esc(S.rcUrl)}" download="${esc(S.rcName)}">⬇️ Save image</a>
      ${sk ? `<button type="button" class="btn ghost" style="display:block;width:100%;margin-top:8px" data-act="cardSent" data-key="${esc(sk)}">${sentLabel(!!cardsSent()[sk])}</button>` : ''}
      <div class="muted" style="margin-top:6px;font-size:12px">${hint}</div>`;
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  } catch (e) { clearTimeout(slow); box.innerHTML = `<div class="muted">Could not make the image · ${esc(e && e.message || e)}</div>`; }
}
async function loadPrivate(id) {
  const ta = $('#drawer #privNotes') || $('#privNotes'); if (!ta || !isBoss()) return;
  if (DEMO) { ta.value = (S.privCache && S.privCache[id]) || ''; ta.placeholder = 'Only admin sees this'; return; }
  try { const s = await getDoc(doc(db, 'customers', id, 'private', 'main')); ta.value = s.exists() ? (s.get('notes') || '') : ''; (S.privCache = S.privCache || {})[id] = ta.value; } catch (e) { ta.value = ''; }
  ta.placeholder = 'Only admin sees this';
}
// Photos: server/cache copies + anything still waiting on this phone (our own copy).
async function loadPhotos(cid, parent, net = false) { /* v0.11.1 (#2): the server copy only when asked (📷 Load from server) and at most 12 — a customer page used to pull every photo of the house every time */
  const box = $('#drawer #photoBox') || $('#photoBox'); if (!box) return;
  const seen = new Map();
  const show = () => {
    const b = $('#drawer #photoBox') || $('#photoBox'); if (!b) return;
    const list = [...seen.values()].filter((x) => (typeof photoSrc(x) === 'string' && (photoSrc(x).startsWith('data:image/') || isPdf(photoSrc(x)))) || (x.st && String(x.st).endsWith('.pdf'))).sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))); /* v0.14 (#5): a timeline — oldest first · v0.18.3: thumbnail + Storage path */
    const stage = (x) => String(x.parent || '').startsWith('visits/') ? (x.kind === 'repair' ? '🛠️ repair' : '🔧 visit') : String(x.parent || '').startsWith('customers/') ? '🏠 install' : esc(x.kind || '');
    b.innerHTML = list.map((x) => figOf(x, `${stage(x)} · ${esc(x.date || '')}${x.local ? ' · 🟡' : ''}`)).join('') || '<span class="muted">No photos yet</span>';
  };
  const mine = (d) => (parent ? d.parent === parent : d.customerId === cid);
  for (const e of myJournal().filter((e) => e.photo && mine(e.data) && e.state !== 'done')) { const img = await photoGet(e.id); if (img) seen.set(e.id, { ...e.data, img, local: true }); }
  show();
  if (DEMO) return;
  const q = parent ? query(collection(db, 'photos'), where('parent', '==', parent), qLimit(40)) : query(collection(db, 'photos'), where('customerId', '==', cid), qLimit(40)); /* v0.19.0: 40 (was 12) — the strip scrolls sideways */
  try { (await getDocsFromCache(q)).forEach((d) => seen.set(d.id, { ...d.data(), local: d.metadata.hasPendingWrites })); show(); } catch (e) {}
  if (net && navigator.onLine) { try { (await getDocs(q)).forEach((d) => seen.set(d.id, { ...d.data(), local: false })); show(); } catch (e) {} }
}
const isPdf = (x) => typeof x === 'string' && x.startsWith('data:application/pdf');
const thumb = (img) => (isPdf(img) ? `<div class="pdf-tile" data-pdf="1">📄<span>PDF</span></div>` : `<img src="${esc(img)}" alt="" data-full="1">`);
const figOf = (x, cap) => { const src = photoSrc(x); const pdf = isPdf(src) || (!src && x.st && String(x.st).endsWith('.pdf')); return `<figure${isPdf(src) ? ` data-src="${esc(src)}"` : ''}${x.st ? ` data-st="${esc(x.st)}"` : ''}>${pdf ? `<div class="pdf-tile" data-pdf="1">📄<span>PDF</span></div>` : thumb(src)}<figcaption>${cap}${x.st ? ' <button type="button" class="a" data-act="photoFull">⤓ full size</button>' : ''}</figcaption></figure>`; }; /* v0.18.3 (B3): the full picture lives in Storage */
export const PHOTO_ROLES = { before: 'Before · old filter / fault', after: 'After · new filter / fixed', tds: 'TDS meter', other: 'Other' }; /* v0.19.0 (4): the technician labels each photo; the card draws "before" and "after" by label, not by order */
const thumbRoles = () => { const t = $('#drawer #thumbs') || $('#thumbs'); return t && t.dataset.roles ? t.dataset.roles.split('|') : null; };
function renderThumbs() {
  const t = $('#drawer #thumbs') || $('#thumbs'); if (!t) return; const roles = thumbRoles();
  t.innerHTML = S.formPhotos.map((p, i) => `<figure>${isPdf(p.img) ? '<div class="pdf-tile">📄<span>PDF</span></div>' : `<img src="${p.img}" alt="">`}<button type="button" class="rm" data-rmphoto="${i}">✕</button>${roles ? `<select class="prole" data-prole="${i}">${roles.map((r) => `<option value="${esc(r)}"${(p.role || '') === r ? ' selected' : ''}>${esc(PHOTO_ROLES[r] || r)}</option>`).join('')}</select>` : ''}</figure>`).join('');
}
// PDF bills (e.g. online receipts) are kept as they are if small enough for one Firestore document (1 MiB).
function readPdf(f) {
  return new Promise((res, rej) => { if (f.size > 700 * 1024) { rej(new Error('PDF too big (max 700 KB) — take a photo instead')); return; } const r = new FileReader(); r.onload = () => res({ img: r.result, w: 0, h: 0, chars: r.result.length, pdf: true }); r.onerror = () => rej(new Error('could not read the PDF')); r.readAsDataURL(f); });
}
export async function addFormPhotos(files) {
  for (const f of files) {
    if (S.formPhotos.length >= MAX_PHOTOS) { toast(`Max ${MAX_PHOTOS} photos`); break; }
    try { const ph = f.type === 'application/pdf' ? await readPdf(f) : await shrinkPhoto(f); const roles = thumbRoles(); if (roles) { const used = new Set(S.formPhotos.map((q) => q.role)); ph.role = roles.find((r) => r !== 'other' && !used.has(r)) || 'other'; } S.formPhotos.push(ph); } catch (e) { toast('Photo failed: ' + e.message); } /* v0.19.0 (4): the first free role (before → after → TDS), the rest "other" — the technician can change it */
  }
  renderThumbs();
}

// One day = one area: open Google Maps with every house of the group as a stop (max 10 stops per link).
// ---------- 💾 backup: everything in one go (Excel for reading + JSON for a full restore copy) ----------
const flat = (v) => (v === null || v === undefined ? '' : v.toMillis ? new Date(v.toMillis()).toISOString() : Array.isArray(v) ? v.join('; ') : typeof v === 'object' ? (Number.isFinite(v.lat) ? `${v.lat},${v.lng}` : JSON.stringify(v)) : v);
export async function fullBackup(withPhotos) {
  const XL = await loadXlsx(); const wb = XL.utils.book_new(); const stamp = today();
  const out = { app: 'KORA Field', version: APP_VERSION, exportedAt: new Date().toISOString(), by: myName(), settings: S.settings };
  const counts = {};
  for (const c of COLS) {
    const rows = arr(c).map(({ _pending, _localT, ...x }) => x); out[c] = rows; counts[c] = rows.length;
    const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    XL.utils.book_append_sheet(wb, XL.utils.aoa_to_sheet(R.sheetSafe([keys, ...rows.map((r) => keys.map((k) => flat(r[k])))])), c.slice(0, 31));
  }
  if (isBoss()) { try { out.users = (await fetchUsers()).map(({ lastSeenAt, ...u }) => u); counts.users = out.users.length; } catch (e) {} }
  if (withPhotos && !DEMO) { try { const snap = await getDocs(collection(db, 'photos')); out.photos = snap.docs.map((d) => ({ id: d.id, ...d.data() })); counts.photos = out.photos.length; } catch (e) { toast('Photos could not be read: ' + (e.code || e.message)); } }
  const sum = [['KORA Field backup', stamp], ['version', APP_VERSION], ['by', myName()], [], ['table', 'records'], ...Object.entries(counts)];
  XL.utils.book_append_sheet(wb, XL.utils.aoa_to_sheet(R.sheetSafe(sum)), 'README');
  XL.writeFile(wb, `KORA_Backup_${stamp}.xlsx`);
  download(`KORA_Backup_${stamp}.json`, JSON.stringify(out, (k, v) => (v && v.toMillis ? new Date(v.toMillis()).toISOString() : v)), 'application/json');
  if (isBoss()) { save('settings/app', { lastBackupAt: stamp, lastBackupBy: myName() }, false); S.settings = { ...S.settings, lastBackupAt: stamp, lastBackupBy: myName() }; bump(); }
  return counts;
}
function backupHtml() {
  const last = S.settings.lastBackupAt; const age = last ? R.daysBetween(last, today()) : null;
  return `<div class="sumgrid"><div><span>Last backup</span><b class="num">${last ? esc(last) : '—'}</b></div><div><span>Days ago</span><b class="num" style="color:${age === null || age > 7 ? 'var(--bad)' : 'var(--ok)'}">${age === null ? 'never' : age}</b></div><div><span>Records now</span><b class="num">${COLS.reduce((n, c) => n + S.D[c].size, 0)}</b></div><div><span>Done by</span><b>${esc(S.settings.lastBackupBy || '—')}</b></div></div>
    <div class="card"><div class="status" style="font-size:15px">💾 Back up everything now</div><div class="muted" style="margin:6px 0 10px">One Excel file (a sheet per table, easy to read) + one JSON file (the complete copy). Both go to the Downloads folder of this computer — keep them in the vault / Google Drive. The bell reminds you after 7 days.</div>
      <label class="chk-line"><input type="checkbox" id="bkPhotos"> <span>include photos (bigger file)</span></label><button class="btn" data-act="backupNow">💾 Back up now</button></div>
    <div class="card"><div class="status" style="font-size:15px">📂 Check a backup file</div><div class="muted" style="margin:6px 0 10px">Opens a JSON backup and compares its record counts with today — nothing is written back.</div><label class="btn small ghost" style="display:inline-flex;align-items:center;cursor:pointer">📂 Choose a backup file (.json)<input type="file" accept=".json,application/json" id="bkCheck" hidden></label><div id="bkCheckBox"></div></div>
    <div class="card"><div class="status" style="font-size:15px">🛡️ Server-side backup (recommended too)</div><div class="muted" style="margin-top:6px">Firestore can take its own scheduled backups (daily or weekly, kept up to 14 weeks) and point-in-time recovery for 7 days — this needs the Blaze plan and is switched on in the Firebase console (Firestore → Disaster recovery / Backups). The file backup above works on any plan.</div></div>`;
}
function checkBackupFile(file) {
  const box = $('#drawer #bkCheckBox') || $('#bkCheckBox'); const rd = new FileReader();
  rd.onload = () => { try { const j = JSON.parse(rd.result); box.innerHTML = `<table class="tbl" style="margin-top:10px"><tr><th>Table</th><th class="n">In the file</th><th class="n">Now</th></tr>${COLS.map((c) => `<tr><td>${esc(c)}</td><td class="n">${(Array.isArray(j[c]) ? j[c].length : 0)}</td><td class="n">${S.D[c].size}</td></tr>`).join('')}</table><div class="muted">File made ${esc(j.exportedAt || '?')} by ${esc(j.by || '?')} · ${esc(j.version || '')}</div>`; } catch (e) { box.textContent = 'Not a KORA backup file: ' + e.message; } };
  rd.readAsText(file);
}
// ---------- centre window ("open in the middle", like Notion's centre peek) ----------
export function peek(html, cls = '') {
  closePeek(true);
  const el = document.createElement('div'); el.id = 'peek'; el.className = 'peek-bg';
  el.innerHTML = `<div class="peek ${cls}" role="dialog"><button class="x" data-act="closePeek" title="Close (Esc)">✕</button><div class="peek-body">${html}</div></div>`;
  document.body.appendChild(el); return el.querySelector('.peek-body');
}
export function closePeek() { const el = document.getElementById('peek'); if (el) el.remove(); }
// ---------- location: ask on purpose + explain exactly what to switch on ----------
export function locHelp(why) {
  const site = `<h3>1 · Allow it for this site</h3><div class="muted">Click the lock / ⓘ at the left of the address bar → <b>Location</b> → <b>Allow</b> → reload the page.</div>`;
  const os = `<h3>2 · Allow the browser on the Mac</h3><div class="muted">Apple menu → System Settings → Privacy &amp; Security → <b>Location Services</b> → turn it on → switch on <b>Whale</b> (or Chrome) in the list → quit and reopen the browser.</div>`;
  const body = why === 'site' ? site + os : why === 'os' ? os + site : why === 'unavailable' ? `<div class="muted">The browser is allowed but could not find the position. A Mac finds itself through <b>Wi-Fi</b> — turn Wi-Fi on (even if you use a cable) and try again.</div>` + os : `<div class="muted">It took too long. Try again next to a window or with Wi-Fi on.</div>`;
  peek(`<h2>📍 Location is off</h2><div class="muted" style="margin-bottom:10px">${why === 'os' ? 'This site is not blocked — the computer is blocking the browser.' : why === 'site' ? 'This site is blocked in the browser.' : ''}</div>${body}<button class="btn" data-act="locAsk">📍 Try again</button>`, 'small');
}
export async function locAsk() {
  toast('📍 Asking the browser for your location…', 2500);
  const r = await G.askLocation();
  if (r.ok) { closePeek(); toast(`📍 Location on (±${r.p.acc || '?'} m)`); try { localStorage.setItem('kfp_loc_ok', '1'); } catch (e) {} if (deskMod && S.desk) deskMod.showMe(); refreshLocBtn(); return true; }
  locHelp(r.why); refreshLocBtn(); return false;
}
export async function refreshLocBtn() {
  const st = await G.locState(); document.querySelectorAll('[data-locstate]').forEach((b) => { b.dataset.locstate = st; b.title = st === 'granted' ? 'Location on' : st === 'denied' ? 'Location blocked — click for help' : 'Allow location'; });
  const ban = document.getElementById('locBanner'); if (ban) ban.classList.toggle('hidden', st === 'granted');
}
// Starts from where you stand (origin = your position, asked for on the click).
export function routeLink(xs) {
  const pts = xs.map((x) => x.c.gps).filter((g) => g && Number.isFinite(g.lat)).slice(0, 10).map((g) => `${g.lat.toFixed(6)},${g.lng.toFixed(6)}`);
  if (!pts.length) return '';
  const dest = pts[pts.length - 1], way = pts.slice(0, -1).join('|');
  return `<a class="btn small ghost" style="margin-left:auto;text-decoration:none;display:inline-flex;align-items:center" target="_blank" rel="noopener" href="${esc(G.dirUrl(dest, way))}" data-nav="${esc(dest)}" data-way="${esc(way)}">🧭 Route (${pts.length})</a>`;
}
// When the position had to be asked for, the browser may no longer allow a new window → show a real link to tap.
export function offerLink(url, origin) {
  let el = document.getElementById('navOffer'); if (el) el.remove();
  el = document.createElement('div'); el.id = 'navOffer'; el.className = 'nav-offer';
  el.innerHTML = `<div class="main"><b>🧭 Directions ready</b><span>${origin ? `from your location (±${esc(origin.acc || '?')} m)` : 'start: Google will guess — location is off'}</span></div><a class="btn small ok" href="${esc(url)}" target="_blank" rel="noopener" data-offer-go>Open Google Maps</a><button class="x" data-offer-x>✕</button>`;
  document.body.appendChild(el);
}
// ---------- work lists ----------
function viewList(p) {
  const m = model(); const t = m.t; const k = p.list;
  const head = (title, sub) => `<button class="back" data-back>‹ Back</button><h1>${title}</h1>${sub ? `<div class="muted">${sub}</div>` : ''}`;
  if (k === 'collections') {
    const groups = collectionGroups(m.collections); const cs = R.chaseStats(m.D.checkins, m.D.payments, R.addDays(t, -90), t);
    return head('Collections', 'Reminder 3 days before · on the day · 3 days late: Tara calls · 7 days late: home visit') +
      (groups.map((g) => `<h2>${esc(g.label)} <span class="pill">${g.xs.length}</span></h2><div class="card flush">${g.xs.map((x) => dunItem(x)).join('')}</div>`).join('') || '<div class="card empty">Nobody to chase 🏖️</div>') +
      `<div class="hint">📝 = log a call or visit about the money (who answered, the day they will pay). A home that gave a day waits in “Promised” until then.</div>${chaseStatsLine(cs)}`;
  }
  if (k === 'visits') {
    const byTole = {}; for (const x of m.visitsDue) (byTole[toleOf(x.c)] = byTole[toleOf(x.c)] || []).push(x);
    const toles = Object.entries(byTole).sort((a, b) => b[1].length - a[1].length);
    return head('Visits due', 'Grouped by tole so one day covers one area. Monthly for 6 months after install, then every 3 months; filter dues pull a visit earlier.') +
      (toles.map(([tole, xs]) => `<h2>📍 ${esc(tole)} <span class="pill">${xs.length}</span>${routeLink(xs)}</h2><div class="card flush">${xs.map((x) => cItem(x, `<span class="pill ${x.due < t ? 'bad' : 'warn'}">${esc(x.filterOnly ? 'filter ' + x.due : x.due)}</span>`)).join('')}</div>`).join('') || '<div class="card empty">No visits due</div>');
  }
  if (k === 'calls') {
    return head('Calls', 'One call 7 days after the install: is the water fine, anything to fix, would a neighbour like a demo?') +
      `<div class="card flush">${m.calls.map((x) => `<div class="item" data-go-form="checkin" data-cid="${esc(x.c.id)}" data-kind="${esc(x.o.k)}"><span class="dot ${x.o.status === 'overdue' ? 'r' : 'y'}"></span><div class="main"><div class="t">${esc(x.c.name)} · ${esc(x.o.label)}</div><div class="s">due ${esc(x.o.due)} · ${esc(x.c.phone)}</div></div><div class="acts"><a class="icon-btn" href="tel:${esc(x.c.phone)}" data-stop>📞</a></div></div>`).join('') || '<div class="empty">No calls due</div>'}</div>
      <button class="btn ghost" data-go-form="checkin">📞 Log a call</button>`;
  }
  if (k === 'watch') {
    const g = [['high', '🔴 Look after first'], ['watch', '🟠 Keep an eye on'], ['low', '🔵 Small signs']];
    return head('⚠️ Look after this week', 'Points from signs in the records (late bills, open problems, unhappy calls, first 90 days, moving…). It orders who to call first — it is not a forecast.')
      + g.map(([lv, l]) => { const xs = m.watch.filter((w) => w.lvl === lv); return xs.length ? `<h2>${l} <span class="pill">${xs.length}</span></h2><div class="card flush">${xs.map((w) => watchItem(w)).join('')}</div>` : ''; }).join('')
      + (m.watch.length ? '' : '<div class="card empty">Nobody to worry about 🏖️</div>') + (m.watchChecked ? `<div class="muted" style="margin-top:8px">✓ ${m.watchChecked} checked this week · <a href="#" data-act="watchShowAll">show again</a></div>` : '');
  }
  if (k === 'requests') return head('Open requests', 'Reply within 2 hours in office hours · 3+ days = red') + `<div class="card flush">${m.openReq.map(reqItem).join('') || '<div class="empty">No open requests</div>'}</div><button class="btn" data-go-form="request">📋 New request</button>`;
  if (k === 'tomorrow') {
    const byTole = {}; for (const x of m.tomorrowBills) (byTole[toleOf(x.c)] = byTole[toleOf(x.c)] || []).push(x);
    return head('Bills due tomorrow', R.addDays(t, 1) + ' · the reminder goes out 3 days before — this is the last easy chance') + (Object.entries(byTole).map(([tole, xs]) => `<h2>📍 ${esc(tole)}</h2><div class="card flush">${xs.map((x) => (x.dn ? dunItem(x) : cItem(x, R.npr(x.led.nextBill.amount - x.led.nextBill.paid)))).join('')}</div>`).join('') || '<div class="card empty">No bills tomorrow</div>');
  }
  if (k === 'leads') {
    const groups = OPT.leadOutcome.map((o) => ({ o, xs: m.D.leads.filter((l) => (l.outcome || 'New') === o) }));
    const F = R.funnelDays(m.D.leads, m.D.customers, m.D.payments, m.t, m.t, m.t); const inStage = new Map(F.open.map((o) => [o.l.id, o.days]));
    const right = (l) => { const cid = l.customerId || F.linked.get(l.id); if (cid && S.D.customers.has(cid)) return `<button class="btn small ghost" data-cust="${esc(cid)}">✓ Customer</button>`; if (l.outcome === 'Signed') return `<button class="btn small" data-convert="${esc(l.id)}">Install</button>`; const d = inStage.get(l.id); return d !== undefined && d !== null ? `<span class="pill ${d >= R.FUNNEL.stuckDays ? 'warn' : 'grey'}">${d} d</span>` : '<div class="r">›</div>'; };
    return head('🧲 Leads', `${m.D.leads.length} leads · ${m.D.leads.filter((l) => l.outcome === 'Signed').length} signed`) +
      groups.filter((g) => g.xs.length).map((g) => `<h2>${esc(g.o === 'New' ? 'New lead' : g.o)} <span class="pill">${g.xs.length}</span></h2><div class="card flush">${g.xs.map((l) => `<div class="item" data-edit="lead" data-id="${esc(l.id)}"><div class="main"><div class="t">${esc(l.name)} ${screenPill(l)}</div><div class="s">${esc(l.tole || '')} · ${esc(l.channel || '')}${l.followUpDate ? ' · follow up ' + esc(l.followUpDate) : ''}</div></div>${right(l)}</div>`).join('')}</div>`).join('') + '<div class="hint">Grey / yellow pill = days in this stage (yellow = stuck 14+ days).</div><button class="btn" data-go-form="lead">🧲 New lead</button>';
  }
  if (k === 'recoveries') return head('📦 Recovery cases', 'Recovered / failed / days / cost / why it failed') + `<div class="card flush">${m.D.recoveries.map((r) => { const c = S.D.customers.get(r.customerId); return `<div class="item" data-edit="recovery" data-id="${esc(r.id)}"><span class="dot ${r.outcome === 'Recovered' ? 'g' : String(r.outcome).startsWith('Failed') ? 'r' : 'y'}"></span><div class="main"><div class="t">${esc(c ? c.name : '?')} · ${esc(r.outcome)}</div><div class="s">started ${esc(r.startedDate)} · attempts ${esc(r.attempts ?? '–')}${r.failReason ? ' · ' + esc(r.failReason) : ''}</div></div><div class="r">›</div></div>`; }).join('') || '<div class="empty">No recovery cases</div>'}</div>`;
  if (k === 'filters') {
    const rows = m.filtersAll.filter((f) => f.status !== 'ok').sort((a, b) => String(a.due).localeCompare(String(b.due)));
    return head('Filter status', 'Booking intervals (PP 4 / monsoon 3 · CTO 8 · UV 12 · UF 24 months · sanitise 3) — the verdict is what you see on site') +
      `<div class="card flush">${rows.map((f) => `<div class="item" data-cust="${esc(f.x.c.id)}"><span class="dot ${f.status === 'overdue' ? 'r' : 'y'}"></span><div class="main"><div class="t">${esc(f.type)} · ${esc(f.x.c.name)}</div><div class="s">${esc(f.why)}</div></div><div class="r"><span class="pill ${f.status === 'overdue' ? 'bad' : 'warn'}">${esc(f.due)}</span></div></div>`).join('') || '<div class="empty">All filters on schedule</div>'}</div>`;
  }
  if (k === 'approvals') {
    const A = m.approvals; const rule = R.approvalRule(S.settings); const me = isApprover(); const cn = (id) => (S.D.customers.get(id) || {}).name || '?';
    ensureUsers(() => (S.drawer ? refreshDrawer() : scheduleRender()));
    const who = (x) => userName(x.createdBy, x.by);
    const lbl = { Pending: 'Waiting', Approved: 'Approved', Rejected: 'Not approved' };
    const item = (r, acts) => `<div class="item appr"><span class="dot ${r.state === 'Pending' ? 'y' : r.state === 'Approved' ? 'g' : 'r'}"></span><div class="main"><div class="t">${r.kind === 'discount' ? '🏷️ Discount' : '🏦 Deposit refund'} ${R.npr(r.amount)} · ${esc(cn(r.x.customerId))}</div>
      <div class="s">${esc(String(r.x.date || r.x.closedDate || r.x.startedDate || '').slice(0, 10))} · by ${esc(who(r.x))}${r.x.discountReason ? ' · ' + esc(r.x.discountReason) : ''}${r.state !== 'Pending' ? ` · ${esc(lbl[r.state] || r.state)} by ${esc(userName(r.x.approvedByUid, r.x.approvedBy))} ${esc(String(r.x.approvedAt || '').slice(0, 10))}` : ''}</div></div>
      ${acts && me && r.state === 'Pending' ? `<div class="wacts" data-stop><button class="btn small ok" data-appr="${esc(r.col)}|${esc(r.x.id)}|Approved">✓ OK</button><button class="btn small ghost" data-appr="${esc(r.col)}|${esc(r.x.id)}|Rejected">✕ No</button></div>` : `<span class="pill ${r.state === 'Pending' ? 'warn' : r.state === 'Approved' ? 'ok' : 'bad'}">${esc(lbl[r.state] || r.state)}</span>`}</div>`;
    return head('✋ Money approvals', `Rules (Settings → Money approvals · 🔴 first guesses): discount over ${R.npr(rule.discountOver)} and deposit refund over ${R.npr(rule.refundOver)} need an OK from ${rule.who === 'Admin only' ? 'Jun (admin)' : 'Jun or anyone with the money right'}. Until then the discount does not reduce the bill and the refund does not leave the deposit book.`) +
      `<h2>Waiting · ${A.pending.length}</h2><div class="card flush">${A.pending.map((r) => item(r, true)).join('') || '<div class="empty">Nothing waiting 🏖️</div>'}</div>
      <h2>Decided · last 30</h2><div class="card flush">${A.done.slice(0, 30).map((r) => item(r, false)).join('') || '<div class="empty">Nothing yet</div>'}</div>`;
  }
  if (k === 'relocations') return head('🚚 Relocations', 'Customers moving house: new address, new pin, device moved or swapped.') + `<div class="card flush">${m.D.relocations.slice().sort((a, b) => String(b.moveDate).localeCompare(String(a.moveDate))).map((r) => { const c = S.D.customers.get(r.customerId); return `<div class="item" data-edit="relocation" data-id="${esc(r.id)}"><span class="dot ${r.status === 'Done' ? 'g' : r.status === 'Cancelled' ? 'k' : 'y'}"></span><div class="main"><div class="t">${esc(c ? c.name : '?')} · ${esc(r.status)}</div><div class="s">${esc(r.moveDate || '')} · ${esc(r.oldTole === 'Other' ? r.oldToleOther : r.oldTole || '?')} → ${esc(r.newTole === 'Other' ? r.newToleOther : r.newTole || '?')}</div></div><div class="r">›</div></div>`; }).join('') || '<div class="empty">No relocations</div>'}</div>${can('visit') ? '<button class="btn" data-go-form="relocation">🚚 New relocation</button>' : ''}`;
  if (k === 'water') {
    const V = m.vials; const tgt = Number(S.settings.vialTarget) > 0 ? Number(S.settings.vialTarget) : R.VIAL.target; const pc = (x) => (x === null ? '—' : R.pct(x));
    const grp = (g) => `<div class="scroll-x"><table class="tbl"><tr><th></th><th class="n">Read so far</th><th class="n">E. coli</th><th class="n">Share</th></tr>${Object.entries(g).sort((a, b) => b[1].n - a[1].n).map(([k2, r]) => `<tr><td>${esc(k2)}</td><td class="n">${r.n}</td><td class="n">${r.pos}</td><td class="n">${pc(r.pos / r.n)}${r.n < 5 ? ' <span class="pill grey">few</span>' : ''}</td></tr>`).join('')}</table></div>`;
    const cn = (id) => esc((S.D.customers.get(id) || {}).name || '?');
    return head('🧫 Raw-water vials', '🚨 Our own check only — never tell a customer the water is safe or unsafe from it; only a lab result is said out loud. Every second install in the PoC (about 25 homes).') +
      `<div class="card"><div class="kv"><div class="k">Vials filled</div><div class="v num">${V.started} / ${tgt}</div><div class="k">Read so far</div><div class="v num">${V.n}</div><div class="k">Turned black</div><div class="v num">${V.pos} · ${pc(V.rate)}${V.ci ? ` <span class="muted">(${esc(`95% range ${R.pct(V.ci[0])}–${R.pct(V.ci[1])}`)})</span>` : ''}</div><div class="k">Waiting to be read</div><div class="v num">${V.waiting.length}</div></div>
        <div class="muted" style="margin-top:6px">${esc('Dry-season results — the monsoon can differ. Areas with fewer than 5 read vials cannot be compared.')}</div>
        <div class="hint" style="margin-top:6px">${esc('🛑 Stop at 2–3 black vials — that is enough to pick the ENPHO test home. If none turn black, test anyway: it then shows only that the water out meets the standard.')}</div></div>
      <h2>🔬 ENPHO test candidates <span class="pill">${V.enpho.length}</span></h2><div class="card flush">${V.enpho.map((x) => `<div class="item" data-cust="${esc(x.c.id)}"><span class="dot g"></span><div class="main"><div class="t">${esc(x.c.name)}</div><div class="s">${esc(x.c.installDate)} · <span>${esc('test by ' + x.until)}</span> · ${esc(x.c.tole || '')}</div></div></div>`).join('') || `<div class="empty">${esc('None yet — needs blue (E. coli), municipal water and an install within 30 days (PI condition 4).')}</div>`}</div>
      <div class="card"><div class="sec-mini">By water source</div>${grp(V.bySource)}<div class="sec-mini">By area</div>${grp(V.byTole)}</div>
      <h2>Vials <span class="pill">${m.D.waterTests.length}</span></h2><div class="card flush">${m.D.waterTests.slice().sort((a, b) => String(b.sampledDate).localeCompare(String(a.sampledDate))).map((w) => `<div class="item" data-edit="waterTest" data-id="${esc(w.id)}"><span class="dot ${w.result === R.VIAL_RESULTS[0] ? 'r' : w.result === R.VIAL_RESULTS[2] ? 'y' : w.result ? 'g' : 'b'}"></span><div class="main"><div class="t">${cn(w.customerId)} · <span>${esc(w.result || 'not read yet')}</span></div><div class="s">${esc(w.sampledDate || '')}${w.readDate ? ' → ' + esc(w.readDate) : ''}</div></div><div class="r">›</div></div>`).join('') || '<div class="empty">No vials yet</div>'}</div>
      <button class="btn" data-go-form="waterTest">🧫 New vial</button>`;
  }
  if (k === 'claims') {
    const C = m.claimsSt; const pill = { Waiting: 'warn', Replaced: 'ok', Credited: 'ok', Refused: 'bad' };
    const row = (x) => `<div class="item" data-edit="claim" data-id="${esc(x.c.id)}"><span class="dot ${x.notSentLate ? 'r' : x.open ? 'y' : 'g'}"></span><div class="main"><div class="t">${esc(x.c.what === 'Device' ? x.c.serial : x.c.part || '?')} · <span>${esc(x.c.problem || '')}</span> <span class="pill ${pill[x.c.result || 'Waiting']}">${esc(x.c.result || 'Waiting')}</span></div><div class="s">${esc(x.c.supplier || '')} · ${esc(x.c.foundDate || '')}${x.by ? ' · ' + esc('claim by ' + x.by) : ''}${x.c.sentDate ? ' · ' + esc('sent ' + x.c.sentDate) : x.notSentLate ? ' · ' + esc('not sent — deadline passed') : ''}${x.c.result === 'Credited' ? ' · ' + esc(`credit USD ${x.c.creditUsd || 0}`) : ''}</div></div><div class="r">›</div></div>`;
    return head('📮 Supplier claims', 'PI TQ-PI-20260808: condition 7 — inspect within 14 days of arrival · condition 4 — faulty within 30 days of install = replaced or credited.') +
      `<div class="card"><div class="kv"><div class="k">Open claims</div><div class="v num">${C.open.length}</div><div class="k">Credit to take off the next order</div><div class="v num">USD ${C.creditOpen.toFixed(2)}</div>${Object.entries(C.byResult).map(([k2, n]) => `<div class="k">${esc(k2)}</div><div class="v num">${n}</div>`).join('')}</div></div>
      <h2>Open claims <span class="pill">${C.open.length}</span></h2><div class="card flush">${C.open.map(row).join('') || '<div class="empty">Nothing open 🏖️</div>'}</div>
      <h2>All <span class="pill">${C.all.length}</span></h2><div class="card flush">${C.all.map(row).join('') || '<div class="empty">No claims yet</div>'}</div>${canForm('claim') ? '<button class="btn" data-go-form="claim">📮 New claim</button>' : ''}`;
  }
  if (k === 'proof') {
    const Pv = R.proofStats(m.D, R.addDays(t, -30), t); const pc = (x) => (x === null ? '—' : R.pct(x)); const cn = (id) => esc((S.D.customers.get(id) || {}).name || '?');
    return head('✍️ Proof of visit', 'Last 30 days · finished visits and installs · signed = the customer signed on the phone (saved like a photo) · 📍 = the saved spot.') +
      `<div class="card"><div class="kv"><div class="k">Jobs</div><div class="v num">${Pv.n}</div><div class="k">Customer signed</div><div class="v num">${Pv.signed} · ${pc(Pv.rate)}</div><div class="k">With a saved spot</div><div class="v num">${pc(Pv.spotRate)}</div><div class="k">No signature, no reason</div><div class="v num"${Pv.noReason ? ' style="color:var(--warn)"' : ''}>${Pv.noReason}</div></div>
        ${Object.keys(Pv.reasons).length ? `<div class="sec-mini">No signature — why</div>${Object.entries(Pv.reasons).sort((a, b) => b[1] - a[1]).map(([r2, n]) => `<div class="muted">${esc(r2)} · ${n}</div>`).join('')}` : ''}
        ${Pv.people.length ? `<div class="sec-mini">By person</div>${Pv.people.map((p2) => `<div class="muted">${esc(p2.who)} · <span>${esc(`${p2.signed} of ${p2.jobs} signed`)}</span></div>`).join('')}` : ''}</div>
      <div class="card flush">${Pv.jobs.slice(0, 60).map((j) => `<div class="item" data-cust="${esc(j.cid)}"><span class="dot ${j.signed ? 'g' : j.x.noSign ? 'y' : 'r'}"></span><div class="main"><div class="t">${cn(j.cid)} · <span>${esc(j.kind === 'install' ? 'Install' : j.x.visitType || 'Visit')}</span></div><div class="s">${esc(j.date)} · ${esc(j.who)}${j.spot ? ' · 📍' : ''}${j.signed ? '' : ' · ' + esc(j.x.noSign || 'no reason')}</div></div><div class="r">${j.signed ? '✍️' : '—'}</div></div>`).join('') || '<div class="empty">No finished jobs in 30 days</div>'}</div>`;
  }
  if (k === 'screenings') {
    const all = m.D.screenings.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))); const O = R.screenOutcomes(m.D.screenings, m.D.customers, m.ledgers);
    const pc = (a, b) => (b ? R.pct(a / b) : '—'); const pill = { Pass: 'ok', Check: 'warn', Hold: 'bad' };
    return head('🔎 Sign-up screenings', '🔴 First-guess rules (G-1 has none yet) — the verdict advises, the person decides. Tap one to edit.') +
      `<div class="card"><div class="scroll-x"><table class="tbl"><tr><th>Verdict</th><th class="n">Screened</th><th class="n">Became customers</th><th class="n">Ever 7+ days late</th><th class="n">Left</th></tr>${O.map((r) => `<tr><td><span class="pill ${pill[r.v]}">${esc(r.v)}</span></td><td class="n">${r.screened}</td><td class="n">${r.customers}</td><td class="n">${r.late7} · ${pc(r.late7, r.customers)}</td><td class="n">${r.left} · ${pc(r.left, r.customers)}</td></tr>`).join('')}</table></div>
        ${O.reduce((s2, r) => s2 + r.customers, 0) < 30 ? '<div class="hint">🔴 Fewer than 30 screened customers — too early to say whether the rules pick the right homes.</div>' : ''}</div>
      <div class="card flush">${all.map((s2) => `<div class="item" data-edit="screening" data-id="${esc(s2.id)}"><span class="dot ${s2.verdict === 'Pass' ? 'g' : s2.verdict === 'Check' ? 'y' : 'r'}"></span><div class="main"><div class="t">${esc(s2.name)} <span class="pill ${pill[s2.verdict] || 'grey'}">${esc(s2.verdict || '')}</span></div><div class="s">${esc(s2.date || '')} · ${esc(s2.decision || '')}${(s2.verdictWhy || []).length ? ' · ' + esc(s2.verdictWhy.join(' · ')) : ''}</div></div><div class="r">›</div></div>`).join('') || '<div class="empty">No screenings yet</div>'}</div>
      <button class="btn" data-go-form="screening">🔎 New screening</button>`;
  }
  if (k === 'contract') {
    const open = m.contractOpen; const all = m.D.contractEvents.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return head('📜 Contract events', 'Notice to end · transfer to a new holder · lost or stolen — following the customer agreement working draft (2026-09-03, still with the lawyer).') +
      `<h2>To do <span class="pill">${open.length}</span></h2><div class="card flush">${open.map((o) => contractItem(o.e, o)).join('') || '<div class="empty">Nothing open 🏖️</div>'}</div>
      <h2>All <span class="pill">${all.length}</span></h2><div class="card flush">${all.slice(0, 60).map((e) => contractItem(e)).join('') || '<div class="empty">No contract events yet</div>'}</div>${canForm('contract') ? '<button class="btn" data-go-form="contract">📜 New contract event</button>' : ''}`;
  }
  if (k === 'repairs') {
    const xs = m.repairCr.slice().sort((a, b) => Number(a.given) - Number(b.given) || b.c.days - a.c.days); const cn = (id) => esc((S.D.customers.get(id) || {}).name || '?');
    return head('🛠️ Late repairs', 'Jun 2026-09-29: billing goes on; a breakdown, leak or water-quality problem not fixed within 7 days of the report → every day from the report comes off the next bill (1,100 ÷ 30 a day). Not our fault (power, water supply, the customer) → nothing.') +
      `<div class="card flush">${xs.map((x) => `<div class="item" data-cust="${esc(x.r.customerId)}"><span class="dot ${x.given ? 'g' : x.c.done ? 'r' : 'y'}"></span><div class="main"><div class="t">${cn(x.r.customerId)} · <span>${esc(x.r.type)}</span></div><div class="s"><span>${esc(x.c.days + ' days')}</span> · ${R.npr(x.c.amount)}${x.given ? ' · <span>given</span>' : ''} · ${esc(x.c.from)} → <span>${esc(x.c.done ? x.c.to : 'still open')}</span></div></div>${x.c.done && !x.given && isBoss() ? `<div class="acts"><button class="btn small" data-svccredit="${esc(x.r.id)}">Give ${R.npr(x.c.amount)}</button></div>` : ''}</div>`).join('') || '<div class="empty">No late repairs</div>'}</div>`;
  }
  if (k === 'paused') {
    const P = R.pauseStats(m.D.customers, t, R.addDays(t, -365)); const px = [...m.cust.values()].filter((x) => x.status === 'Paused'); const cn = (c) => esc(c.name || '?');
    const right = (x) => { const sp = R.pauseSpans(x.c, t).find((p) => p.open) || {}; return `<div class="r" style="text-align:right">${sp.days !== null && sp.days !== undefined ? `<span class="pill ${sp.late ? 'bad' : 'blue'}">${esc(sp.days + ' days')}</span>` : ''}<div class="muted" style="font-size:12px">${sp.from ? esc('since ' + sp.from) : ''}${sp.until ? '<br>' + esc((sp.late ? 'restart day passed ' : 'restart ') + sp.until) : ''}</div></div>`; };
    return head('⏸️ Paused', 'Each pause is one line in the home\'s history (customer → ✏️ Edit → status). The first bill day after the start is skipped (one month) · back within 15 days → that bill is charged · rules: Jun 2026-09-29.') +
      `<div class="card flush">${px.map((x) => cItem(x, right(x))).join('') || '<div class="empty">Nobody paused</div>'}</div>
      <div class="card"><div class="kv"><div class="k">Paused now</div><div class="v num">${P.now.length}</div><div class="k">Past the restart day</div><div class="v num"${P.late.length ? ' style="color:var(--bad)"' : ''}>${P.late.length}</div>
        <div class="k">Pauses ended · 12 months</div><div class="v num">${P.closed.length}</div><div class="k">Days paused · average / median</div><div class="v num">${P.avgDays === null ? '—' : Math.round(P.avgDays)} / ${P.medianDays === null ? '—' : Math.round(P.medianDays)}</div>
        <div class="k">Ended by leaving</div><div class="v num">${P.toLeft === null ? '—' : R.pct(P.toLeft)}</div></div>
        ${Object.keys(P.byReason).length ? `<div class="sec-mini">Why</div>${Object.entries(P.byReason).sort((a, b) => b[1] - a[1]).map(([r2, n]) => `<div class="muted">${esc(r2)} · ${n}</div>`).join('')}` : ''}</div>
      ${P.closed.length ? `<h2>Ended pauses · 12 months</h2><div class="card flush">${P.closed.slice(0, 30).map((p) => `<div class="item" data-cust="${esc(p.c.id)}"><div class="main"><div class="t">${cn(p.c)}</div><div class="s">${esc(p.from || '?')} → ${esc(p.to)} · <span>${esc((p.days === null ? '?' : p.days) + ' days')}</span>${esc(p.reason ? ' · ' + p.reason : '')}</div></div><span class="pill ${p.endedAs === 'Churned' ? 'grey' : 'ok'}">${esc(p.endedAs === 'Churned' ? 'left' : 'restarted')}</span></div>`).join('')}</div>` : ''}`;
  }
  if (k === 'map') return head('🗺️ Map', 'Green = OK · yellow = overdue · red = 7+ days · grey = left. The map picture needs internet; dots always show.') + `<div id="mapBox" class="mapbox tall"></div>`;
  return head('List', '') + '<div class="card">Unknown list</div>';
}

// ---------- status & reports ----------
function viewStatus() {
  const m = model(); const M = m.metrics;
  const j = myJournal(); const pend = j.filter((e) => e.state === 'pending'), rej = j.filter((e) => e.state === 'rejected');
  // v0.11: grouped rows (iPhone Settings style) instead of 37 tiles in one block (Tara 2026-09-30 "too bold · like Instagram settings" · Jun keeps the icon colours)
  const rep = (r, ic, l, s, ok = true) => (ok ? [{ attr: `data-report="${r}"`, ic, l, s }] : []);
  const lst = (r, ic, l, s, ok = true) => (ok ? [{ attr: `data-list="${r}"`, ic, l, s }] : []);
  const money = can('money');
  return `<h1>Status</h1>${statusCard()}
  <div class="card lang-card"><div class="status" style="font-size:15px;justify-content:space-between"><span data-noi18n>🌐 Language · 언어 · भाषा</span> ${langSeg()}</div>${!S.desk && window.innerWidth >= 600 ? '<div class="muted" style="margin-top:6px">🖥️ The command centre opens when this window is at least 960 px wide — make the browser window wider (or full screen).</div>' : ''}</div>
  <h2>🔔 Alerts <span class="pill ${m.alerts.length ? 'bad' : 'ok'}">${m.alerts.length}</span></h2><div class="card flush">${alertsHtml(m)}</div>
  ${S.swWaiting ? '<button class="btn" data-act="swReload">⬆️ New version ready — tap to update</button>' : ''}
  <div class="card"><div class="grid2">
    <div><div class="muted">Active households</div><div class="bigstat"><span class="v">${M.active}</span></div></div>
    <div><div class="muted">Collection (bills paid)</div><div class="bigstat"><span class="v">${R.pct(M.collection)}</span><span class="muted">${M.billsPaid}/${M.billsDue}</span></div></div>
    <div><div class="muted">Overdue</div><div class="bigstat"><span class="v" style="color:${M.overdueAmt ? 'var(--bad)' : 'inherit'}">${R.npr(M.overdueAmt)}</span></div></div>
    <div><div class="muted">Deposit held (not ours)</div><div class="bigstat"><span class="v">${R.npr(m.deposits.total.held)}</span></div></div>
  </div></div>
  <div class="card"><div class="status" style="font-size:15px">Records on this phone</div>
    <div class="muted" style="margin-top:6px">Waiting ${pend.length} · Refused ${rej.length} · Sent (14 days) ${j.filter((e) => e.state === 'done').length}</div>
    ${rej.map((e) => `<div class="warn">Refused: ${esc(e.path)} (${esc(e.err)}) — the data is kept on this phone. Tell Jun.</div>`).join('')}
    <div class="row"><button class="btn ghost" data-act="sync">↻ Send now</button><button class="btn ghost" data-act="full">⟳ Reload all</button></div>
    <button class="btn ghost" data-act="persist">🛡️ Protect phone storage</button></div>
  ${rowsHtml([
    { title: 'Money', tone: 'tone-money', rows: [...rep('payments', '💵', 'Payments', 'all money in', money), ...rep('vat', '🧾', 'VAT by month', 'export CSV', money), ...rep('capack', '🧾', 'CA pack', 'IRD sales book · Excel', money), ...rep('expenses', '🧾', 'Expenses', 'bills · input VAT', can('expense') || money), ...rep('deposits', '🏦', 'Deposit book', 'what we hold', money), ...rep('billing', '🌊', 'Billing moves', 'new · left · month 14', money), ...lst('approvals', '✋', 'Money approvals', m.approvals.pending.length ? m.approvals.pending.length + ' waiting' : 'discounts · refunds', !!(m.approvals.pending.length || isApprover())), ...rep('bank', '🏧', 'Bank CSV match', 'statement → payments', !!S.isAdmin)] },
    { title: 'Customers', tone: 'tone-field', rows: [...lst('map', '🗺️', 'Map', 'all customers'), ...lst('leads', '🧲', 'Leads', 'pipeline'), ...lst('screenings', '🔎', 'Screenings', 'sign-up checks'), ...lst('contract', '📜', 'Contract events', m.contractOpen.length ? m.contractOpen.length + ' to do' : 'notice · transfer · lost'), ...lst('relocations', '🚚', 'Relocations', 'moving house'), ...lst('recoveries', '📦', 'Recoveries', 'devices back'), ...rep('referrals', '🎁', 'Referrals', 'rewards due', referralOn()), ...rep('leavers', '🚪', 'Leavers', 'why homes left')] },
    { title: 'Field work', tone: 'tone-call', rows: [...rep('calendar', '🗓️', 'Calendar', 'days off · the homes of each day'), ...lst('filters', '🧪', 'Filter status', 'due & overdue'), ...lst('proof', '✍️', 'Proof of visit', 'signatures · 30 days'), ...rep('callbacks', '🔁', 'Callbacks', 'problems soon after a job'), ...rep('noshows', '🚪', 'Wasted trips', 'nobody home'), ...rep('capacity', '👷', 'Field capacity', 'jobs vs hands', !!m.capacity), ...lst('water', '🧫', 'Raw-water vials', `${m.vials.started} filled · PoC`), ...rep('learning', '🧪', 'Filter learning', 'real intervals')] },
    { title: 'Devices & stock', tone: 'tone-dev', rows: [...rep('devices', '📦', 'Devices', 'every serial'), ...rep('stock', '📦', 'Stock & FCL', 'order signal', can('stock')), ...lst('claims', '📮', 'Supplier claims', m.claimsSt.open.length ? m.claimsSt.open.length + ' open' : 'defects → PI', can('stock'))] },
    { title: 'Reports', tone: 'tone-rep', rows: [...rep('gate', '🧭', 'Direction gate', 'churn · retention · collection', money), ...rep('funnel', '⏳', 'Sales stage days', 'lead → first payment'), ...rep('perform', '📑', 'Grant KPIs', 'PAYGo PERFORM', money), ...rep('quality', '🩺', 'Data to fix', 'missing GPS · bill no.')] },
    { title: 'Company', tone: 'tone-co', rows: [...rep('users', '🪪', 'Staff & permissions', 'who can do what', !!S.isAdmin), ...rep('settings', '⚙️', 'Settings', 'company · calendar · techs', !!S.isAdmin), ...rep('payroll', '💼', 'Payroll', 'SSF · TDS · payslips', isBoss()), ...rep('handover', '🆘', 'If Jun cannot work', 'handover page', isBoss()), ...rep('trainings', '🎓', 'Trainings', 'records', !!S.isAdmin), ...rep('export', '💾', 'Export all data', 'backup', can('export'))] },
    { title: 'Help', tone: 'tone-co', rows: [...rep('help', '❓', 'How to use', 'one page for staff')] },
  ])}
  <div class="card"><div class="row"><button class="btn ghost" data-act="theme">🌓 Theme</button>${window.innerWidth >= 960 ? '<button class="btn ghost" data-act="deskOn">🖥️ Command centre</button>' : ''}</div></div>
  <details class="card diagbox"><summary class="status" style="font-size:15px;cursor:pointer">Diagnostics</summary><div class="diag" id="diag">…</div></details>
  <button class="btn ghost" data-act="signOut">Sign out</button>`;
}
// v0.17.4 (D2) Jun 10/4 "pc에만있는데 일반 요원 기준에서 필요하거나 있으면 더 효율올라가는 기능": the calendar on a phone — days off (gazette), company events,
// the homes of a day (same data as the desk calendar: cal.js). Tap a day → its list below; ‹ › = month.
const PC_KINDS = [['ev', '📌', 'Company & own events'], ['visit', '🔧', 'Visits'], ['filter', '🧪', 'Filters'], ['call', '📞', 'Calls'], ['bill', '💵', 'Bills due'], ['lead', '🧲', 'Leads & demos'], ['move', '🚚', 'Moves'], ['arrive', '📦', 'Devices in'], ['check', '🔍', 'Arrival checks'], ['paid', '💰', 'Cash in'], ['done', '✅', 'Done']];
const PC_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function phoneCal(m, p) {
  const t = m.t; const mo = /^\d{4}-\d{2}$/.test(p.mo || '') ? p.mo : t.slice(0, 7);
  const from = mo + '-01'; const to = R.addDays(R.addMonths(from, 1), -1); const days = CAL.gridDays(from, to); const g0 = days[0], g1 = days[days.length - 1];
  const by = {}; const put = (d, x) => (by[d] = by[d] || []).push(x);
  for (const x of CAL.ownEvents(m.D.events, g0, g1)) put(x.d, { kind: 'ev', t: x.ev.title || x.ev.kind, sub: [x.ev.kind, x.ev.time, x.ev.status === 'Done' ? 'done' : ''].filter(Boolean).join(' · '), cid: x.ev.customerId || '' });
  for (const [d, xs] of Object.entries(CAL.customerDays(m, g0, g1))) for (const x of xs) put(d, x);
  const sel = R.isDate(p.d) && p.d >= g0 && p.d <= g1 ? p.d : t >= from && t <= to ? t : from;
  const off = (d) => (m.hm[d] || []).some((h) => h.kind === 'all');
  const cell = (d) => { const xs = by[d] || []; const cnt = {}; for (const x of xs) cnt[x.kind] = (cnt[x.kind] || 0) + 1; const bs = B.adToBs(d); const wd = new Date(d + 'T00:00:00').getDay();
    const marks = PC_KINDS.filter(([k]) => cnt[k] && !['paid', 'done'].includes(k)).slice(0, 2).map(([k, ic]) => `<i>${ic}${cnt[k]}</i>`).join('');
    return `<button type="button" class="pc-c${d < from || d > to ? ' out' : ''}${off(d) ? ' off' : ''}${wd === 6 ? ' sat' : ''}${d === t ? ' today' : ''}${d === sel ? ' sel' : ''}" data-pcal="${d}"><b>${Number(d.slice(8))}</b><small data-noi18n>${bs ? bs.d : ''}</small><span class="pc-m" data-noi18n>${marks}</span></button>`; };
  const a = B.adToBs(from), z = B.adToBs(to); const bsR = a && z ? (a.m === z.m ? B.bsLabel(a.y, a.m) : `${B.bsLabel(a.y, a.m)} – ${B.bsLabel(z.y, z.m)}`) : '';
  const wd = new Date(sel + 'T00:00:00').getDay(); const hol = m.hm[sel] || []; const xs = by[sel] || []; const sb = B.adToBs(sel); const dayOff = wd === 6 || hol.some((h) => h.kind === 'all');
  const holR = hol.map((h) => `<div class="item"><div class="main"><div class="t">${h.kind === 'all' ? '🏖️' : '·'} <span>${esc(h.n)}</span>${h.ne ? ` <span class="muted" data-noi18n>${esc(h.ne)}</span>` : ''}</div><div class="s">${h.kind === 'all' ? '<span>office closed</span>' : esc(h.who || 'some people only')}</div></div></div>`).join('');
  const groups = PC_KINDS.map(([k, ic, l]) => { const g = xs.filter((x) => x.kind === k); if (!g.length) return ''; const tot = k === 'bill' ? ` · ${R.npr(g.reduce((s2, x) => s2 + (x.amt || 0), 0))}` : '';
    return `<h2>${ic} <span>${l}</span> <span class="pill">${g.length}${tot}</span></h2><div class="card flush">${g.slice(0, 40).map((x) => `<div class="item${x.late ? ' late' : ''}"${x.cid ? ` data-cust="${esc(x.cid)}"` : ''}><div class="main"><div class="t"${x.cid || x.kind === 'ev' ? ' data-noi18n' : ''}>${esc(x.t)}</div><div class="s">${esc(x.sub || '')}${x.tole ? ` · <span data-noi18n>${esc(x.tole)}</span>` : ''}</div></div></div>`).join('')}${g.length > 40 ? `<div class="muted">+${g.length - 40}</div>` : ''}</div>`; }).join('');
  return `<div class="pcal"><div class="pc-top"><button type="button" class="btn small ghost" data-pcalmo="${R.addMonths(from, -1).slice(0, 7)}">‹</button><div class="pc-ttl"><b>${PC_MON[Number(mo.slice(5)) - 1]} ${mo.slice(0, 4)}</b><span class="muted" data-noi18n>${esc(bsR)}</span></div><button type="button" class="btn small ghost" data-pcalmo="${R.addMonths(from, 1).slice(0, 7)}">›</button><button type="button" class="btn small ghost" data-pcal="${t}">Today</button></div>
    <div class="pc-grid">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w, i) => `<div class="pc-wd${i === 6 ? ' sat' : ''}">${w}</div>`).join('')}${days.map(cell).join('')}</div>
    <div class="legend pc-leg"><span><i class="sw off"></i>office closed</span><span>🔧 visits</span><span>🧪 filters</span><span>💵 bills</span><span>📞 calls</span><span>📌 events</span></div>
    <div class="pc-day"><div class="eyebrow">${dayOff ? '🏖️ Day off' : 'Working day'}</div><h2 class="pc-dh" data-noi18n>${esc(sel)}${sb ? ` · ${esc(B.bsLabel(sb.y, sb.m))} ${sb.d}` : ''}</h2>${holR ? `<div class="card flush">${holR}</div>` : ''}${groups || (holR ? '' : '<div class="card empty">Nothing on this day</div>')}</div></div>`;
}
const REPORT_PERM = { payroll: 'admin', handover: 'admin', backup: 'admin', payments: 'money', vat: 'money', capack: 'money', deposits: 'money', gate: 'money', billing: 'money', perform: 'money', expenses: 'expenseOrMoney', stock: 'stock', bank: 'admin', users: 'admin', settings: 'admin', export: 'export', trainings: 'adminOnly' };
export function viewReport(p) {
  const m = model(); const k = p.r;
  const need2 = REPORT_PERM[k]; const allowed = !need2 || (need2 === 'admin' ? isBoss() : need2 === 'adminOnly' ? !!S.isAdmin : need2 === 'expenseOrMoney' ? can('expense') || can('money') : can(need2));
  if (!allowed) return `<button class="back" data-back>‹ Back</button><div class="card empty">Nothing here.</div>`; // staff must not learn what exists beyond their rights
  const head = (t, s) => `<button class="back" data-back>‹ Back</button><h1>${t}</h1>${s ? `<div class="muted">${s}</div>` : ''}`;
  const custName = (id) => { const c = S.D.customers.get(id); return c ? c.name : '?'; };
  if (k === 'calendar') return head('🗓️ Calendar', 'Days off · company days · the homes of each day') + phoneCal(m, p); /* v0.17.4 (D2) */
  if (k === 'payments') {
    const ps = m.D.payments.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return head('💵 Payments', `${ps.length} records`) + `<button class="btn ghost" data-csv="payments">⬇️ Download CSV</button><div class="card scroll-x"><table class="tbl"><tr><th>Date</th><th>Customer</th><th>Type</th><th class="n">NPR</th><th>Method</th></tr>${ps.slice(0, 300).map((q) => `<tr data-cust="${esc(q.customerId)}" style="cursor:pointer"><td>${esc(q.date)}</td><td>${esc(custName(q.customerId))}</td><td>${esc(q.type)}</td><td class="n">${Math.round(q.amount).toLocaleString('en-IN')}</td><td>${esc(q.method || '')}</td></tr>`).join('')}</table></div>`;
  }
  if (k === 'vat') return head('🧾 VAT by month', 'Taxable = install + subscription + repair (cash). Deposit is not revenue until forfeited (lawyer R3 D2(c)). Penalty shown apart — confirm with the CA. Cash basis by payment date — confirm with the CA.') +
    `<div class="row wrap"><button class="btn" data-report="capack">🧾 CA pack — IRD sales book (Nepali month)</button><button class="btn ghost" data-csv="vat">⬇️ Download CSV</button></div><div class="card scroll-x"><table class="tbl"><tr><th>Month</th><th class="n">Cash in</th><th class="n">Taxable</th><th class="n">Deposit</th><th class="n">Forfeits</th><th class="n">VAT 13%</th><th class="n">Net</th></tr>${m.vat.map((r) => `<tr><td>${esc(r.month)}</td><td class="n">${Math.round(r.cash).toLocaleString('en-IN')}</td><td class="n">${Math.round(r.taxable).toLocaleString('en-IN')}</td><td class="n">${Math.round(r.deposit).toLocaleString('en-IN')}</td><td class="n">${Math.round(r.forfeits).toLocaleString('en-IN')}</td><td class="n"><b>${r.vat.toFixed(2)}</b></td><td class="n">${Math.round(r.net).toLocaleString('en-IN')}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">No payments yet</td></tr>'}</table></div>`;
  if (k === 'capack') return head('🧾 CA pack', '') + CA.capackHtml(p);
  if (k === 'expenses') return head('🧾 Expenses', 'What the company paid. VAT bills give input VAT back — they fill the purchase book (खरिद खाता) in the CA pack.') + expensesHtml(m, p);
  if (k === 'devices') return head('📦 Devices by serial', 'Every purifier: where it is now and everything that happened to it. Installs, recoveries and relocation swaps are added by themselves.') + devicesHtml(m, p);
  if (k === 'device') return deviceHtml(m, p);
  if (k === 'quality') return head('🩺 Data to fix', 'Things that make reports wrong or visits slow. Tap a row to fix it.') + qualityHtml(m);
  if (k === 'deposits') return head('🏦 Deposit book', `Held for customers (a liability, not our money): <b>${R.npr(m.deposits.total.held)}</b>`) +
    `<button class="btn ghost" data-csv="deposits">⬇️ Download CSV</button><div class="card scroll-x"><table class="tbl"><tr><th>Customer</th><th class="n">Collected</th><th class="n">Refunded</th><th class="n">Forfeited</th><th class="n">Held</th></tr>${m.deposits.rows.filter((r) => r.collected || r.refunded || r.forfeited).map((r) => `<tr data-cust="${esc(r.c.id)}" style="cursor:pointer"><td>${esc(custLabel(r.c))}</td><td class="n">${r.collected}</td><td class="n">${r.refunded}</td><td class="n">${r.forfeited}</td><td class="n"><b>${r.held}</b></td></tr>`).join('') || '<tr><td colspan="5" class="muted">No deposit collected yet</td></tr>'}
    <tr><td><b>Total</b></td><td class="n">${m.deposits.total.collected}</td><td class="n">${m.deposits.total.refunded}</td><td class="n">${m.deposits.total.forfeited}</td><td class="n"><b>${m.deposits.total.held}</b></td></tr></table></div>`;
  if (k === 'gate') return head('🧭 Direction gate', 'Triggers: churn > 3.5%/month · 90-day retention < 85% · collection < 50%. Each needs its own sample before it can be judged.') + gateCards(m.metrics);
  if (k === 'stock') {
    const F = m.metrics.fcl; const st = m.metrics.stock;
    return head('📦 Stock & FCL signal', `FCL#1 = the later of: stock ≤ 4-week average installs × lead time (${F.leadTimeWeeks} weeks) · 30+ bills + collection not in the 50% zone + no repeated defect`) +
      `<div class="card"><div class="kv">${['Device', ...R.FILTER_TYPES].map((i) => `<div class="k">${esc(i)}</div><div class="v mono">${st[i] ?? 0}</div>`).join('')}</div></div>` + fclCard(F) + filterOrderCard(m) + partsCard(m) +
      (can('stock') ? '<div class="row wrap"><button class="btn" data-go-form="stock">📦 Record stock movement</button><button class="btn ghost" data-go-form="tool">🧰 Add a tool</button></div>' : '') +
      `<h2>Movements</h2><div class="card flush">${m.D.stockMoves.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).map((s) => `<div class="item" data-edit="stock" data-id="${esc(s.id)}"><div class="main"><div class="t">${esc(s.type)} ${esc(s.qty)} × ${esc(s.item)}</div><div class="s">${esc(s.date)} · ${esc(s.ref || '')}</div></div></div>`).join('') || '<div class="empty">No movements yet</div>'}</div>`;
  }
  if (k === 'learning') return head('🧪 Filter learning', 'Real days between changes, across all households. The booking intervals are first values; PoC data decides the final ones.') +
    `<div class="card scroll-x"><table class="tbl"><tr><th>Filter</th><th class="n">Booking</th><th class="n">Observed</th><th class="n">Samples</th></tr>${m.learning.map((l) => `<tr><td>${esc(l.type)}</td><td class="n">${l.bookingMonths ? l.bookingMonths + ' mo' : '—'}</td><td class="n">${l.avgMonths ? l.avgMonths.toFixed(1) + ' mo' : '—'}</td><td class="n">${l.n}</td></tr>`).join('')}</table></div>`;
  if (k === 'trainings') return head('🎓 Training records', 'name · date · topic · trainer · signed sheet') + `<div class="card flush">${m.D.trainings.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).map((q) => `<div class="item" data-edit="training" data-id="${esc(q.id)}"><div class="main"><div class="t">${esc(q.person)} · ${esc((q.topic || []).join(', '))}</div><div class="s">${esc(q.date)} · by ${esc(q.trainer)}${q.durationMin ? ' · ' + q.durationMin + ' min' : ''}</div></div></div>`).join('') || '<div class="empty">No training records</div>'}</div><button class="btn" data-go-form="training">🎓 New record</button>`;
  if (k === 'perform') {
    if (!can('money')) return head('📑 Grant KPIs', '') + '<div class="card"><div class="empty">Money rights needed.</div></div>';
    const pp = p.pp || 'q'; const per = performPeriod(pp, m.t); const P = R.performKpis(m.D, m.ledgers, per.from, per.to, m.t, { back: R.billingMoves(m.D.customers, m.D.recoveries, [], m.t).back });
    const fv = (r) => (r.value === null || r.value === undefined ? '—' : r.fmt === 'pct' ? R.pct(r.value, 1) : r.fmt === 'npr' ? 'NPR ' + Math.round(r.value).toLocaleString('en-IN') : r.fmt === 'days' ? `${Math.round(r.value)} days` : r.fmt === 'nps' ? String(r.value) : Math.round(r.value).toLocaleString('en-IN'));
    const groups = [...new Set(P.rows.map((r) => r.group))];
    return head('📑 Grant KPIs (PAYGo PERFORM)', 'The industry KPI set of CGAP · GOGLA · IFC ("PAYGo PERFORM KPIs: Definitions at a Glance"), counted from our records. KORA is a rental, so each line says how we read it: 🟢 CGAP formula on our records · 🟡 CGAP formula on a KORA reading · 🔴 approximation · n/a does not apply.') +
      `<div class="seg">${PERFORM_PERIODS.map(([k2, l]) => `<button data-pp="${k2}" class="${pp === k2 ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>
      <div class="muted" style="margin:4px 0 10px">${esc(per.from)} → ${esc(per.to)}${per.fy ? ` · FY ${esc(per.fy)}` : ''} · ${P.sold} homes installed · cash NPR ${Math.round(P.cash).toLocaleString('en-IN')}</div>
      ${groups.map((g) => `<h2>${esc(g)}</h2><div class="card scroll-x"><table class="tbl perform"><tr><th>KPI</th><th class="n">Value</th><th>Grade</th><th>How we count it</th></tr>${P.rows.filter((r) => r.group === g).map((r) => `<tr><td><b>${esc(r.name)}</b></td><td class="n mono">${esc(fv(r))}</td><td>${esc(r.grade)}</td><td class="muted">${esc(r.how)}</td></tr>`).join('')}</table></div>`).join('')}
      <h2>Installs by channel</h2><div class="card"><div class="kv">${Object.entries(P.byChannel).sort((a, b) => b[1] - a[1]).map(([k2, v]) => `<div class="k">${esc(k2)}</div><div class="v num">${v} · ${R.pct(v / (P.sold || 1), 0)}</div>`).join('') || '<div class="empty">No installs in the period</div>'}</div></div>
      <button class="btn ghost" data-csv="perform:${esc(per.from)}:${esc(per.to)}">⬇️ KPI table (CSV) for the grant report</button>
      <div class="hint">Expense lines are mapped to CGAP cost lines as a first guess (🔴) — check with the CA before sending: goods = ${esc(R.PERFORM_COSTS.cogs.join(', '))} · servicing = ${esc(R.PERFORM_COSTS.service.join(', '))} · sales = ${esc(R.PERFORM_COSTS.sales.join(', '))}.</div>`;
  }
  if (k === 'funnel') {
    const F = R.funnelDays(m.D.leads, m.D.customers, m.D.payments, R.addDays(m.t, -365), m.t, m.t); const dd = (d) => (d === null ? '—' : `${Math.round(d * 10) / 10} d`);
    return head('⏳ Sales stage days', 'How long homes take from first contact to the first payment (installs of the last 12 months). A home is matched to its lead by the convert button or the same phone number. Targets are first guesses (🔴).') +
      `<div class="card"><div class="kv"><div class="k">Lead → first payment</div><div class="v num">${dd(F.totalMedian)} <span class="muted">median</span></div><div class="k">Homes with a lead</div><div class="v num">${F.matched} of ${F.journeys.length}</div><div class="k">Paid on install day</div><div class="v num">${F.paidOnInstall} of ${F.journeys.length}</div></div></div>
      <div class="card scroll-x"><table class="tbl"><tr><th>Step</th><th class="n">Homes</th><th class="n">Median</th><th class="n">Slowest</th><th class="n">Over target</th></tr>${F.steps.map((q) => `<tr><td>${esc(q.label)}</td><td class="n">${q.n}</td><td class="n">${dd(q.median)}</td><td class="n">${dd(q.max)}</td><td class="n">${q.slow || '·'} <span class="muted">(${q.target} d)</span></td></tr>`).join('')}</table></div>
      <h2>Leads stuck · ${F.stuck.length}</h2><div class="card flush">${F.stuck.map((o) => `<div class="item" data-edit="lead" data-id="${esc(o.l.id)}"><span class="dot ${o.days > 30 ? 'r' : 'y'}"></span><div class="main"><div class="t">${esc(o.l.name || '?')} · ${esc(o.stage === 'New' ? 'New lead' : o.stage)}</div><div class="s">${o.days} days in this stage${o.l.followUpDate ? ' · follow up ' + esc(o.l.followUpDate) : ''}</div></div></div>`).join('') || '<div class="empty">No lead is stuck 🏖️</div>'}</div>`;
  }
  if (k === 'billing') {
    if (!can('money')) return head('🌊 Billing moves', '') + '<div class="card"><div class="empty">Money rights needed.</div></div>';
    const mks = Array.from({ length: 12 }, (_, i) => R.monthKey(R.addMonths(m.t.slice(0, 7) + '-01', i - 11)));
    const BM = R.billingMoves(m.D.customers, m.D.recoveries, mks, m.t); const n = (v) => Math.round(v).toLocaleString('en-IN');
    return head('🌊 Billing moves', 'Recurring billing each month (VAT incl.) and why it moved: new homes, homes that came back (same phone as a home that left), homes that left, and the month-14 step (1,400 → 1,100 when the 300 deposit part ends — planned, not lost).') +
      `<div class="card scroll-x"><table class="tbl"><tr><th>Month</th><th class="n">Start</th><th class="n">+ New</th><th class="n">+ Came back</th><th class="n">+ Deposit starts</th><th class="n">− Left</th><th class="n">− Month 14</th><th class="n">End</th><th class="n">Net change</th></tr>
      ${BM.rows.slice().reverse().map((r) => `<tr><td class="mono">${esc(r.month)}</td><td class="n">${n(r.start)}</td><td class="n">${r.newAmt ? `${n(r.newAmt)} <span class="muted">(${r.newN})</span>` : '·'}</td><td class="n">${r.backAmt ? `${n(r.backAmt)} <span class="muted">(${r.backN})</span>` : '·'}</td><td class="n">${r.upAmt ? `${n(r.upAmt)} <span class="muted">(${r.upN})</span>` : '·'}</td><td class="n">${r.leftAmt ? `${n(r.leftAmt)} <span class="muted">(${r.leftN})</span>` : '·'}</td><td class="n">${r.stepAmt ? `${n(r.stepAmt)} <span class="muted">(${r.stepN})</span>` : '·'}</td><td class="n"><b>${n(r.end)}</b></td><td class="n"><span class="pill ${r.net < 0 ? 'bad' : r.net > 0 ? 'ok' : 'grey'}">${r.net > 0 ? '+' : ''}${n(r.net)}</span></td></tr>`).join('')}</table>
      <div class="hint">Start + new + came back + deposit starts − left − month 14 = end. Install month = 1,100 (inside the 4,900), bills 2–13 = 1,400, then 1,100. The deposit part is held, not earned.</div></div>
      <h2>Month-14 steps coming</h2><div class="card"><div class="kv">${BM.ahead.map((a) => `<div class="k">${esc(a.month)}</div><div class="v num">${a.n ? `${a.n} homes · −${n(a.amt)}` : '—'}</div>`).join('')}</div></div>`;
  }
  if (k === 'noshows') {
    const N = R.noShowStats(m.D, R.addDays(m.t, -90), m.t); const pc = (x) => (x === null ? '—' : R.pct(x, 1)); const cn = (id) => (S.D.customers.get(id) || {}).name || '?';
    const who = Object.entries(N.byWho).sort((a, b) => b[1].trips - a[1].trips);
    return head('🚪 Wasted trips', 'Last 90 days. A trip = a completed visit or "nobody home". "On my way" = the WhatsApp was sent before leaving (🛵 on the customer page or the route) — it is saved with the visit.') +
      `<div class="card"><div class="kv"><div class="k">Trips</div><div class="v num">${N.trips}</div><div class="k">Nobody home</div><div class="v num">${N.noShows} · ${pc(N.rate)}</div>
        <div class="k">🛵 Message sent</div><div class="v num">${pc(N.withMsg.rate)} of ${N.withMsg.trips} trips</div><div class="k">No message</div><div class="v num">${pc(N.noMsg.rate)} of ${N.noMsg.trips} trips</div>
        <div class="k">Minutes waited</div><div class="v num">${N.waited}</div></div>${N.withMsg.trips < 30 || N.noMsg.trips < 30 ? '<div class="hint">🔴 Fewer than 30 trips on one side — too early to say whether the message helps.</div>' : ''}</div>
      <h2>What happened</h2><div class="card"><div class="kv">${Object.entries(N.byReason).sort((a, b) => b[1] - a[1]).map(([k2, v]) => `<div class="k">${esc(k2)}</div><div class="v num">${v}</div>`).join('') || '<div class="empty">Nobody-home trips: none 🏖️</div>'}</div></div>
      <h2>Homes missed twice or more · ${N.repeat.length}</h2><div class="card flush">${N.repeat.map((r) => (r.c ? `<div class="item" data-cust="${esc(r.id)}"><span class="dot r"></span><div class="main"><div class="t">${esc(r.c.name)}</div><div class="s">${r.n} times · last ${esc(r.last)} · ${esc(toleOf(r.c))}</div></div></div>` : '')).join('') || '<div class="empty">None</div>'}</div>
      <h2>By person</h2><div class="card scroll-x"><table class="tbl"><tr><th>Who</th><th class="n">Trips</th><th class="n">Nobody home</th><th class="n">Rate</th></tr>${who.map(([n, r]) => `<tr><td><b>${esc(n)}</b></td><td class="n">${r.trips}</td><td class="n">${r.ns}</td><td class="n">${pc(r.trips ? r.ns / r.trips : null)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">No trips</td></tr>'}</table></div>
      <h2>Latest nobody-home trips</h2><div class="card flush">${N.list.slice(0, 25).map((v) => `<div class="item" data-cust="${esc(v.customerId)}"><span class="dot y"></span><div class="main"><div class="t">${esc(cn(v.customerId))} · ${esc(v.noShowReason || 'Nobody home')}</div><div class="s">${esc(String(v.date).slice(0, 10))} · ${esc(v.technician || '—')}${v.omwAt ? ' · 🛵 message sent' : ''}${v.retryDate ? ' · try again ' + esc(v.retryDate) : ''}</div></div></div>`).join('') || '<div class="empty">None 🏖️</div>'}</div>`;
  }
  if (k === 'callbacks') {
    const days = Number(S.settings.callbackDays) || R.CALLBACK.days; const C = R.callbackStats(m.D, R.addDays(m.t, -90), m.t, days);
    const lastTrain = {}; for (const q of m.D.trainings) if (q.person && (!lastTrain[q.person] || q.date > lastTrain[q.person])) lastTrain[q.person] = q.date;
    const cn = (id) => (S.D.customers.get(id) || {}).name || '?';
    return head('🔁 Callbacks', `A breakdown, leak or water-quality request within ${days} days after a visit or install at the same home counts against whoever did that job. Last 90 days of jobs.`) +
      `<div class="card scroll-x"><table class="tbl"><tr><th>Who</th><th class="n">Jobs</th><th class="n">Visits</th><th class="n">Installs</th><th class="n">Callbacks</th><th class="n">Rate</th>${S.isAdmin ? '<th>Last training</th>' : ''}</tr>
      ${C.people.map((p) => `<tr><td><b>${esc(p.name)}</b></td><td class="n">${p.jobs}</td><td class="n">${p.visits}</td><td class="n">${p.installs}</td><td class="n">${p.callbacks}</td><td class="n">${p.rate === null ? '—' : `<span class="pill ${p.rate > 0.1 ? 'bad' : p.rate > 0.05 ? 'warn' : 'ok'}">${R.pct(p.rate, 1)}</span>`}</td>${S.isAdmin ? `<td class="mono">${esc(lastTrain[p.name] || '—')}</td>` : ''}</tr>`).join('') || '<tr><td colspan="7" class="muted">No jobs in 90 days</td></tr>'}</table>
      <div class="hint">Few jobs = the rate jumps around; read it with the numbers next to it. Colours: over 10 % red · over 5 % orange (🔴 first guess).</div></div>
      <h2>Callbacks · ${C.callbacks.length}</h2><div class="card flush">${C.callbacks.map((x) => `<div class="item" data-edit="request" data-id="${esc(x.r.id)}"><span class="dot ${x.days <= 7 ? 'r' : 'y'}"></span><div class="main"><div class="t">${esc(cn(x.r.customerId))} · ${esc(x.r.type)}</div><div class="s">${x.days} days after ${esc(x.job.what)} on ${esc(x.job.date)} by ${esc(x.who)}${x.r.description ? ' · ' + esc(String(x.r.description).slice(0, 60)) : ''}</div></div></div>`).join('') || '<div class="empty">No callbacks 🏖️</div>'}</div>`;
  }
  if (k === 'capacity') {
    if (!m.capacity) return head('👷 Field capacity', '') + '<div class="card"><div class="empty">Only for people who see every customer.</div></div>';
    const C = m.capacity; const o = C.opts; const pc = (x) => (Number.isFinite(x) ? Math.round(x * 100) + '%' : '—');
    const w0 = C.weeks[0]; const byP = {}; for (const id of w0.ids) { const x = m.cust.get(id); const a = (x && R.assigneeOf(x.c, m.t)) || 'Nobody yet'; byP[a] = (byP[a] || 0) + 1; }
    return head('👷 Field capacity', `Next ${o.weeks} weeks: homes to visit + repairs + installs, against ${C.people} ${C.people === 1 ? 'person' : 'people'} × ${o.jobsPerDay} homes a day × working days (Saturdays and closed days off). One install ≈ ${o.installSlots} visit slots.`) +
      `<div class="card scroll-x"><table class="tbl"><tr><th>Week</th><th class="n">Work days</th><th class="n">Homes</th><th class="n">Repairs</th><th class="n">Installs</th><th class="n">From before</th><th class="n">Jobs</th><th class="n">Slots</th><th class="n">Load</th></tr>
      ${C.weeks.map((w) => `<tr><td class="mono">${esc(w.from.slice(5))} → ${esc(w.to.slice(5))}</td><td class="n">${w.work}${w.off > 1 ? ` <span class="pill grey">${w.off - 1} holiday${w.off > 2 ? 's' : ''}</span>` : ''}</td><td class="n">${w.homes}${w.newVisits >= 0.5 ? ` <span class="muted">+${Math.round(w.newVisits)} new</span>` : ''}</td><td class="n">${w.repairs.toFixed(1)}</td><td class="n">${w.installs.toFixed(1)}</td><td class="n">${w.carryIn ? Math.round(w.carryIn) : '—'}</td><td class="n">${Math.round(w.demand)}</td><td class="n">${w.cap}</td><td class="n">${w.closed ? '<span class="pill grey">closed</span>' : `<span class="pill ${w.load > 1 ? 'bad' : w.load > o.busy ? 'warn' : 'ok'}">${pc(w.load)}</span>`}</td></tr>`).join('')}</table>${C.backlog ? `<div class="hint">≈ ${Math.round(C.backlog)} jobs still waiting after week ${o.weeks}.</div>` : ''}</div>
      <h2>👤 This week by person</h2><div class="card"><div class="kv">${Object.entries(byP).sort((a, b) => b[1] - a[1]).map(([n, v]) => `<div class="k">${esc(n)}</div><div class="v num">${v} homes · ${o.jobsPerDay * w0.work} slots</div>`).join('') || '<div class="empty">No homes due this week</div>'}</div><div class="hint">Assign homes on the Dispatch page. Repairs and installs are not split by person.</div></div>
      ${S.isAdmin ? '<div class="hint">People in the field, homes a day, install slots and hiring lead time are in Settings → Field capacity.</div>' : ''}`;
  }
  if (k === 'leavers') {
    const L = R.leaverStats(m.D.customers, m.D.recoveries, m.t); const lateN = R.lateReasonStats(m.D.payments, m.D.checkins, R.addDays(m.t, -365));
    const noCase = L.rows.filter((x) => !x.r); const rc = R.recoveryCost(m.D.recoveries);
    return head('🚪 Leavers', 'Why homes left and what it cost. The reason is the main reason on the recovery case. Lost monthly = subscription price (VAT incl.) · lost contract = months left of 36 × price.') +
      `<div class="card"><div class="kv"><div class="k">Getting the devices back · cost</div><div class="v num">${R.npr(rc.total)}</div><div class="k">Recovery cases · device back</div><div class="v num">${rc.cases} · ${rc.back}</div></div></div>` + /* v0.16 (#20): the cost typed on each case */
      (noCase.length ? `<div class="card note-warn"><b>${noCase.length} leaver(s) without a recovery case</b> — no reason recorded, device and deposit not tracked.<div class="mini-list" style="margin-top:6px">${noCase.map((x) => `<div class="item"><div class="main"><div class="t">${esc(x.c.name)}</div><div class="s">left ${esc(x.end)} · ${x.tenure} months</div></div>${canForm('recovery') ? `<button class="btn small" data-go-form="recovery" data-cid="${esc(x.c.id)}">📦 Record</button>` : ''}</div>`).join('')}</div></div>` : '') +
      `<div class="card scroll-x"><table class="tbl"><tr><th>Left on</th><th>Customer</th><th class="n">Months</th><th>Main reason</th><th>In their words</th><th>Device back</th><th class="n">Contract lost</th></tr>
      ${L.rows.map((x) => `<tr ${x.r ? `data-edit="recovery" data-id="${esc(x.r.id)}"` : `data-cust="${esc(x.c.id)}"`} style="cursor:pointer"><td class="mono">${esc(x.end)}</td><td><b>${esc(x.c.name)}</b></td><td class="n">${x.tenure}</td><td>${x.reason === 'Not recorded' ? '<span class="pill warn">Not recorded</span>' : esc(x.reason)}</td><td class="muted">${esc(x.detail)}</td><td>${esc(x.outcome || '—')}</td><td class="n">${R.npr(x.lostContract)}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">Nobody has left 🏖️</td></tr>'}</table></div>
      <h2>⏰ Why payments were late · last 12 months</h2><div class="card">${Object.keys(lateN).length ? `<div class="kv">${R.LATE_REASONS.filter((k2) => lateN[k2]).map((k2) => `<div class="k">${esc(k2)}</div><div class="v num">${lateN[k2].total}</div>`).join('')}</div>` : '<div class="empty">No late reasons recorded yet</div>'}<div class="hint">Asked when a late home pays or on a follow-up call. "Money not come in yet" → move the bill day to when money arrives · "No money this month" → a different talk.</div></div>`;
  }
  if (k === 'referrals') return head('🎁 Referral rewards', 'Only during a campaign (Settings) · the referrer gets 50% off a bill, 3 months after the new home signed up, only after install + fee paid · the new home gets nothing · no cash') +
    `<div class="card flush">${m.referrals.map((r) => `<div class="item"><div class="main"><div class="t">${esc(r.who.name)} · ${r.role === 'referee' ? 'new customer' : 'referrer'}</div><div class="s">${R.npr(r.amount)} · ${r.done ? 'applied ✅' : r.ready ? 'ready' : esc(r.waiting)}</div></div>${!r.done && r.ready && isBoss() ? `<button class="btn small" data-refcredit="${esc(r.who.id)}|${esc(r.forId)}">Apply</button>` : ''}</div>`).join('') || '<div class="empty">No referrals yet</div>'}</div>`;
  if (k === 'bank') return head('🏧 Bank statement match', 'Upload the bank/Fonepay CSV → match rows to customers by KC code, phone, or a unique amount → create payments. Nothing is saved until you tap Create.') +
    `<div class="card"><input type="file" accept=".csv,text/csv,.xls,.xlsx" id="bankFile"><div id="bankBox" class="hint">The bank / Fonepay export format is not known yet — any CSV or Excel file with date, amount and description columns works. Send Jun one real file to tune the matching.</div></div>`;
  if (k === 'backup') return head('💾 Backup', 'Everything in one go: customers, visits, payments, expenses, devices… as Excel + JSON.') + backupHtml();
  if (k === 'export') return head('💾 Export all data', 'Backup to this computer (Firestore scheduled backups need the Blaze plan).') +
    `<div class="card">${COLS.filter((c) => ((c !== 'audit' && c !== 'payroll') || isBoss()) && (c !== 'milestones' || S.isAdmin)).map((c) => `<button class="btn ghost" data-csv="col:${c}">⬇️ ${esc(c)} (${S.D[c].size}) CSV</button>`).join('')}<button class="btn" data-act="exportJson">⬇️ Everything as one JSON file</button></div>`;
  if (k === 'users') return head('🪪 Staff & permissions', 'Admin (Jun) has every right and cannot be changed. Everyone else: pick a preset, then switch single rights. Areas only tidy their screens — they are not a security wall. The server checks who may write money, expenses, new customers and approvals — but every staff account can read the shared records (rights and areas decide what the screens show).') + '<div id="usersBox" class="card">Loading… (needs internet)</div>';
  if (k === 'payroll') {
    if (S.settings.payroll === 'No') return head('💼 Payroll', '') + `<div class="card"><div class="empty">${esc('Payroll is off (Settings → Staff on payroll?). No salaries before the work permit.')}</div></div>`;
    const b0 = B.adToBs(m.t); const [py, pm] = p.pm ? p.pm.split('-').map(Number) : [b0.y, b0.m]; const key = `${py}-${String(pm).padStart(2, '0')}`;
    const { rows, rg, dashain } = payrollRows(m, key); const prev = B.addBsMonths(py, pm, -1), next = B.addBsMonths(py, pm, 1);
    const T = rows.reduce((s2, r) => { for (const k2 of ['gross', 'ssfE', 'ssfR', 'net', 'cost']) s2[k2] += r.P[k2]; s2.tds += r.P.tds || 0; return s2; }, { gross: 0, ssfE: 0, ssfR: 0, net: 0, cost: 0, tds: 0 });
    const n = (x) => (x === null || x === undefined ? '—' : Math.round(x).toLocaleString('en-IN')); const unsaved = rows.filter((r) => !r.sv).length;
    return head('💼 Payroll', 'Nepali month · 🟢 SSF 11% + 20% on the basic salary (SSF procedure §25) · 🟢 TDS from the Inland Revenue 2083/84 table unless the CA\'s is in Settings · a payslip is not a tax filing — the CA checks.') +
      `<div class="row wrap" style="align-items:center"><button class="btn small ghost" data-report="payroll" data-pm="${prev.y}-${prev.m}">‹</button><b>${esc(B.bsLabel(py, pm))}</b><span class="muted">${esc(rg.from)} → ${esc(rg.to)}</span><button class="btn small ghost" data-report="payroll" data-pm="${next.y}-${next.m}">›</button>${dashain ? '<span class="pill warn">🏖️ Dashain month — bonus suggested</span>' : ''}</div>
      ${rows.some((r) => !r.sv && r.P.taxMissing) ? `<div class="card" style="border-color:var(--warn)"><div class="warn">${esc('🔴 No tax table yet — ask the CA for this year\'s TDS table and type it in Settings → Payroll. TDS shows as —.')}</div></div>` : ''}
      ${rows.some((r) => !r.sv && r.P.taxDefault) ? `<div class="card"><div class="hint">${esc('🟢 Tax = the Inland Revenue table for 2083/84 (single = couple) · SSF members pay no 1% band · the CA can replace it in Settings.')}</div></div>` : ''}
      ${rows.some((r) => !r.sv && r.P.noRest) ? `<div class="card" style="border-color:var(--bad)"><div class="warn">${esc('🔴 The tax table has no "rest" line — income above the last bracket would be taxed at 0. Add the last line from the CA.')}</div></div>` : ''}
      ${rows.some((r) => r.P.belowMin) ? `<div class="card" style="border-color:var(--warn)"><div class="warn">${esc(`🟡 Someone is below the minimum wage NPR ${R.PAY.minWage.toLocaleString('en-IN')} (Embassy seminar slides — check the current figure). G-1 §5-2 says ${R.PAY.g1Low.toLocaleString('en-IN')}–${R.PAY.g1High.toLocaleString('en-IN')} for field staff — [conflict], Jun decides.`)}</div></div>` : ''}
      <div class="card"><div class="scroll-x"><table class="tbl"><tr><th>Name</th><th class="n">Basic</th><th class="n">Allowance</th><th class="n">Bonus</th><th class="n">Gross</th><th class="n">SSF 11%</th><th class="n">TDS</th><th class="n">Net pay</th><th class="n">SSF 20% (company)</th><th class="n">Company cost</th><th></th></tr>
        ${rows.map((r) => `<tr><td>${r.pe.id ? `<a href="#" data-edit="payPerson" data-id="${esc(r.pe.id)}">${esc(r.pe.name)}</a>` : esc(r.pe.name)}${r.P.belowMin ? ' <span class="pill warn">min</span>' : ''}</td><td class="n">${n(r.P.basic)}</td><td class="n">${n(r.P.allow)}</td><td class="n">${n(r.P.bonus)}</td><td class="n">${n(r.P.gross)}</td><td class="n">${n(r.P.ssfE)}</td><td class="n">${n(r.P.tds)}</td><td class="n"><b>${n(r.P.net)}</b></td><td class="n">${n(r.P.ssfR)}</td><td class="n">${n(r.P.cost)}</td><td>${r.sv ? '<span class="pill ok">saved</span>' : ''}</td></tr>`).join('')}
        <tr><td><b>Total</b></td><td></td><td></td><td></td><td class="n"><b>${n(T.gross)}</b></td><td class="n">${n(T.ssfE)}</td><td class="n">${rows.every((r) => r.P.tds === null) ? '—' : n(T.tds)}</td><td class="n"><b>${n(T.net)}</b></td><td class="n">${n(T.ssfR)}</td><td class="n"><b>${n(T.cost)}</b></td><td></td></tr></table></div>
        ${rows.length ? `<div class="hint">${esc('Saved lines keep the numbers they were saved with (a later pay change does not rewrite them).')}</div>` : '<div class="empty">No staff pay yet — add a person below.</div>'}</div>
      <div class="row wrap">${rows.length ? `<button class="btn${unsaved ? '' : ' ghost'}" data-payrun="${esc(key)}">💾 Save this month + expenses</button><button class="btn ghost" data-paycsv="${esc(key)}">⬇️ Payroll CSV (for the CA)</button><button class="btn ghost" data-print>🖨️ Print payslips</button>` : ''}<button class="btn ghost" data-go-form="payPerson">＋ Add a person</button></div>`;
  }
  if (k === 'handover') {
    ensureUsers(() => (S.drawer ? refreshDrawer() : scheduleRender()));
    const users = S.usersCache || S.demoUsers || []; const dep = users.find((u) => u.deputy); const lb = S.settings.lastBackupAt;
    const depTxt = dep ? esc((dep.name || '') + ' · ' + (dep.email || '')) : '<span style="color:var(--warn)">none yet — Staff page → ⭐ Make deputy admin</span>';
    const dl = CAL.deadlines(m.t, R.addDays(m.t, 60), S.settings); const sec = (n, title, body) => `<div class="card handover"><div class="status" style="font-size:15px">${n}. <span>${esc(title)}</span></div>${body}</div>`;
    return head('🆘 If Jun cannot work', 'One page to print and keep with the paper vault. No passwords in this app — they are on paper.') +
      sec(1, 'Who runs the app', `<div class="kv"><div class="k">Admin</div><div class="v">Jun · ${esc(ADMIN_EMAIL)}</div><div class="k">Deputy admin</div><div class="v">${depTxt}</div></div>
        <div class="muted" style="margin-top:6px">${esc('The deputy has every right: money OKs (not their own), staff accounts (not the deputy), the change log, backups, dispatch. Only Jun: settings and choosing the deputy.')}</div>`) +
      sec(2, 'Backups', `<div class="kv"><div class="k">Last backup</div><div class="v">${lb ? esc(lb + (S.settings.lastBackupBy ? ' · ' + S.settings.lastBackupBy : '')) : '<span style="color:var(--bad)">never</span>'}</div></div><div class="muted" style="margin-top:6px">${esc('Backup page → Excel + JSON (photos optional). Keep one copy off this computer.')}</div>`) +
      sec(3, 'The server (Firebase)', `<div class="kv"><div class="k">Project</div><div class="v mono">${esc(firebaseConfig.projectId)}</div></div><div class="muted" style="margin-top:6px">${esc('While Jun can: Firebase console → Project settings → Users and permissions → add the deputy’s Google account as Owner. Without that nobody else can change the server rules or the billing account.')}</div>`) +
      sec(4, 'Website and code', `<div class="muted">${esc('Domain koracarenepal.com — the renewal date is in the calendar. The app code and its history are backed up on Jun’s Mac (Documents → kora-care → product → software).')}</div>`) +
      sec(5, 'People to call', S.settings.handoverContacts ? `<div style="white-space:pre-wrap">${esc(S.settings.handoverContacts)}</div>` : `<div class="muted">${esc('Jun: add the CA, lawyer, supplier and bank contacts in Settings → Handover.')}</div>`) +
      sec(6, 'Coming deadlines · 60 days', dl.length ? dl.map((d2) => `<div class="muted">${esc(d2.d)} · ${esc(d2.t)}</div>`).join('') : '<div class="muted">—</div>') +
      sec(7, 'Passwords', `<div class="muted">${esc('Never typed into this app or into a chat. Jun keeps them on paper in his vault — ask him where, now, while he can answer.')}</div>`) +
      (S.settings.handoverNotes ? sec(8, 'Jun’s notes', `<div style="white-space:pre-wrap">${esc(S.settings.handoverNotes)}</div>`) : '') +
      `<div class="card"><div class="kv"><div class="k">Handover checked</div><div class="v">${esc(S.settings.handoverCheckedAt || 'never')}</div></div><div class="row wrap">${S.isAdmin ? '<button class="btn ghost" data-handoverok>✅ Checked today</button>' : ''}<button class="btn ghost" data-print>🖨️ Print</button></div></div>`;
  }
  if (k === 'settings') return head('⚙️ Settings', 'Prices are fixed by the contract (2026-09-03) and shown for reference.') +
    `<form class="card" id="settingsForm"><label>FCL lead time (weeks)</label><input name="leadTimeWeeks" type="number" value="${esc(S.settings.leadTimeWeeks || R.FCL.leadTimeWeeks)}"><div class="hint">Default 13 = the "25 units" rule (8/month × 13 weeks).</div>
      <label>Extra technician names (comma separated)</label><input name="techNames" value="${esc(S.settings.techNames || '')}" placeholder="e.g. Laxmi, Staff A">
      <label>Extra days the office is closed (YYYY-MM-DD, comma separated)</label><textarea name="holidays" placeholder="e.g. 2026-10-12, 2026-10-13">${esc(S.settings.holidays || '')}</textarea><div class="hint">Saturdays and the official 2083 public holidays (Home Ministry + Gandaki notices) are already in the calendar. Add only your own extra days off. Used for the calendar and the breakdown reply clock.</div>
      <h3>🎁 Referral campaign</h3>
      <label>Referral campaign on?</label><select name="referralCampaign"><option value="No"${referralOn() ? '' : ' selected'}>No — no card, no rewards, no tree (the usual state)</option><option value="Yes"${referralOn() ? ' selected' : ''}>Yes — referrer gets 50% off a bill (switch on when installs slow down)</option></select><div class="hint">Switch on only when installs slow down. NPR ${R.referralAmount()} per neighbour who stays past month 3.</div>
      <h3>🧪 Filters (order dates)</h3>
      <label>Filter changes</label><select name="filterMode"><option value="Together"${S.settings.filterMode === 'Separate' ? '' : ' selected'}>Together — one visit changes every filter that falls due before the next change</option><option value="Separate"${S.settings.filterMode === 'Separate' ? ' selected' : ''}>Separate — each filter on its own date</option></select><div class="hint">Together: the next change is the earliest due filter; the visit takes every filter due before the one after it.</div>
      <label>Filter interval from real data</label><select name="learnFilters"><option value="Yes" ${S.settings.learnFilters !== 'No' ? 'selected' : ''}>Yes — once a filter has 5+ real changes, use the observed average</option><option value="No" ${S.settings.learnFilters === 'No' ? 'selected' : ''}>No — always the E-2 booking interval</option></select>
      <div class="muted" style="margin:-4px 0 10px"><span>Now:</span> ${(() => { const fl = R.filterLearning([...S.D.customers.values()], [...S.D.visits.values()]); return R.FILTER_TYPES.filter((t2) => R.FILTER_MONTHS[t2]).map((t2) => { const r = fl.find((q) => q.type === t2) || {}; return `<span>${esc(`${t2} ${R.FILTER_MONTHS[t2]}mo${r.n >= R.LEARN_MIN && r.avgMonths ? ' → ' + Math.round(r.avgMonths) + 'mo (' + r.n + ' changes)' : ' (' + (r.n || 0) + ' changes)'}`)}</span>`; }).join(' · '); })()}</div>
      <label>Filter lead time — order to shelf (weeks)</label><input name="filterLeadWeeks" type="number" min="0" value="${esc(S.settings.filterLeadWeeks ?? '')}" placeholder="${R.FILTER_ORDER.leadWeeks} (guess)"><div class="hint">🔴 Filters may come from China or India — put the real number after the first order.</div>
      <label>Safety weeks before running out</label><input name="filterSafetyWeeks" type="number" min="0" value="${esc(S.settings.filterSafetyWeeks ?? '')}" placeholder="${R.FILTER_ORDER.safetyWeeks}">
      <label>Months one order should cover</label><input name="filterCoverMonths" type="number" min="1" value="${esc(S.settings.filterCoverMonths ?? '')}" placeholder="${R.FILTER_ORDER.coverMonths}">
      <h3>👷 Field capacity</h3>
      <label>People doing field work</label><input name="capPeople" type="number" min="0" value="${esc(S.settings.capPeople ?? '')}" placeholder="${Math.max(1, techNames().filter((n) => n !== 'Jun').length)} (technician names without Jun)">
      <label>Homes one person can do a day</label><input name="capJobsPerDay" type="number" min="1" value="${esc(S.settings.capJobsPerDay ?? '')}" placeholder="${R.CAPACITY.jobsPerDay}"><div class="hint">🔴 6 = Coway-style benchmark (rough); 4 is the careful case.</div>
      <label>Visit slots one install takes</label><input name="capInstallSlots" type="number" min="1" value="${esc(S.settings.capInstallSlots ?? '')}" placeholder="${R.CAPACITY.installSlots}">
      <label>Weeks to find and train a technician</label><input name="hireLeadWeeks" type="number" min="0" value="${esc(S.settings.hireLeadWeeks ?? '')}" placeholder="${R.CAPACITY.hireLeadWeeks} (guess)">
      <label>Callback window — days after a job</label><input name="callbackDays" type="number" min="1" value="${esc(S.settings.callbackDays ?? '')}" placeholder="${R.CALLBACK.days} (guess)">
      <h3>🔎 Sign-up screening</h3>
      <label>Warn when an install has no screening?</label><select name="screenWarn"><option value="No"${S.settings.screenWarn === 'Yes' ? '' : ' selected'}>No — screening is optional</option><option value="Yes"${S.settings.screenWarn === 'Yes' ? ' selected' : ''}>Yes — warn before saving the install</option></select><div class="hint">🔴 The screening rules are first guesses (G-1 has none yet) — they only advise.</div>
      <h3>🆘 Handover (if Jun cannot work)</h3>
      <label>People to call (one per line)</label><textarea name="handoverContacts" rows="4" data-noi18n placeholder="CA — name · phone&#10;Lawyer — name · phone&#10;Supplier — Frank · WhatsApp&#10;Bank — branch · phone">${esc(S.settings.handoverContacts || '')}</textarea>
      <label>Notes for the deputy</label><textarea name="handoverNotes" rows="3">${esc(S.settings.handoverNotes || '')}</textarea><div class="hint">🚫 No passwords here — they stay on paper.</div>
      <h3>🔩 Parts</h3>
      <label>Parts list (one per line)</label><textarea name="partsList" rows="6" data-noi18n placeholder="${esc(R.PARTS_DEFAULT.join('\n'))}">${esc(S.settings.partsList || '')}</textarea><div class="hint">Empty = the PI spare lines (🟡 TQ-PI-20260808). A renamed part starts a new stock line.</div>
      <label>Order more when the shelf has fewer than</label><input name="partsMin" type="number" min="0" value="${esc(S.settings.partsMin ?? '')}" placeholder="${R.PARTS_MIN} (guess)">
      <h3>🧫 Raw-water vials</h3>
      <label>How many homes to test in the PoC</label><input name="vialTarget" type="number" min="1" value="${esc(S.settings.vialTarget ?? '')}" placeholder="${R.VIAL.target} (every second install)">
      <h3>✍️ Proof of visit</h3>
      <label>Ask for a signature before saving a finished visit?</label><select name="signAsk"><option value="No"${S.settings.signAsk === 'Yes' ? '' : ' selected'}>No — the signature is optional</option><option value="Yes"${S.settings.signAsk === 'Yes' ? ' selected' : ''}>Yes — warn when there is no signature and no reason</option></select><div class="hint">🔴 First guess — decide after Tara has tried it on real visits.</div>
      <h3>💰 Collections</h3>
      <label>A promise to pay can be at most (days after the call)</label><input name="promiseMaxDays" type="number" min="1" value="${esc(S.settings.promiseMaxDays ?? '')}" placeholder="${R.PROMISE.maxDays} (guess)"><div class="hint">🔴 A later day only gets a warning — the call still saves. G-1 has no rule for this yet.</div>
      <h3>✋ Money approvals</h3>
      <div class="hint">A discount or a deposit refund above these amounts waits for an OK; until then it does not count. 0 = every one needs an OK. 🔴 First guesses — set your own.</div>
      <label>Discount needs an OK above (NPR)</label><input name="apprDiscountOver" type="number" min="0" value="${esc(S.settings.apprDiscountOver ?? '')}" placeholder="${R.APPROVAL.discountOver} (every discount)">
      <label>Deposit refund needs an OK above (NPR)</label><input name="apprRefundOver" type="number" min="0" value="${esc(S.settings.apprRefundOver ?? '')}" placeholder="${R.APPROVAL.refundOver} (every refund)">
      <label>Who can give the OK</label><select name="apprWho">${['Admin only', 'Admin or money right'].map((o) => `<option value="${o}"${(S.settings.apprWho || R.APPROVAL.who) === o ? ' selected' : ''}>${o}</option>`).join('')}</select>
      <h3>📝 Visit note</h3>
      <label>Buttons on the visit form (one per line: English | नेपाली)</label><textarea name="visitLines" rows="7" data-noi18n placeholder="${esc(VISIT_LINES_DEFAULT.join('\n'))}">${esc(S.settings.visitLines || '')}</textarea><div class="hint">Empty = the six default lines. The Nepali was checked by Tara (10/4). A visit keeps the words it was saved with.</div>
      <h3>💬 WhatsApp messages</h3>
      <div class="hint">Words in {braces} are filled in: {name} first name · {tech} who is going · {eta} minutes · {time} when you were there · {retry} next try. Empty = the default text. The Nepali was checked by Tara (10/4).</div>
      <label>Language of the messages (customers without their own choice)</label><select name="msgLang">${MSG_LANGS.map((o) => `<option value="${o}"${msgLang(null) === o ? ' selected' : ''}>${o}</option>`).join('')}</select>
      <label>On a computer, 💬 opens</label><div class="hint wa-fixed">The WhatsApp app — always (not a browser). Put the company account in it: the company phone → WhatsApp → Linked devices → Link a device → scan the code in the Mac app. 🚨 While your personal account is in the app, 💬 opens your personal WhatsApp.</div>
      ${[['omwEn', '🛵 On my way — English'], ['omwNe', '🛵 On my way — Nepali'], ['missEn', '🚪 Sorry we missed you — English'], ['missNe', '🚪 Sorry we missed you — Nepali']].map(([k2, l]) => `<label>${esc(l)}</label><textarea name="${k2}" rows="3" data-noi18n placeholder="${esc(MSG_DEFAULTS[k2])}">${esc(S.settings[k2] || '')}</textarea>`).join('')}
      <h3>💱 Exchange rate (for ₩ on the money charts)</h3>
      <label>NPR per KRW 100 (Nepal Rastra Bank)</label><input name="fxKrw100" inputmode="decimal" value="${esc(S.settings.fxKrw100 ?? '')}" placeholder="11.30 (NRB · 2 Oct 2026)"><div class="hint">Only for the ₩ shown when you point at a money bar. Empty = 11.30 (NRB, 2 Oct 2026). Update it from nrb.org.np when it moves.</div>
      <h3>🗓️ Calendar</h3>
      <label>Payday — day of the Nepali month</label><input name="payday" value="${esc(S.settings.payday ?? '')}" placeholder="empty = last day · e.g. 1 · off"><div class="hint">Shown in the company calendar. Empty = the last day of each Nepali month. Type "off" to hide it.</div>
      <label>TDS table from the CA (one line per bracket: yearly amount up to, rate %; last line: rest, rate %)</label><textarea name="taxTable" rows="4" data-noi18n placeholder="${esc(R.TAX_DEFAULT.replace(/\n/g, ' · '))}">${esc(S.settings.taxTable || '')}</textarea><div class="hint">Empty = the Inland Revenue table for 2083/84 (🟢, single = couple). SSF members pay no 1% band. Type the CA's table here to replace it.</div>
      <label>Staff on payroll?</label><select name="payroll"><option value="No"${S.settings.payroll === 'No' ? ' selected' : ''}>No — no salaries yet</option><option value="Yes"${S.settings.payroll === 'No' ? '' : ' selected'}>Yes — show TDS and SSF deadlines</option></select>
      <h3>🧾 Company (for the CA pack)</h3>
      <label>Legal company name</label><input name="coName" value="${esc(S.settings.coName || '')}" placeholder="Kora Care Private Limited (as on the PAN / VAT certificate)"><div class="hint">The first line of every customer picture, in capitals.</div>
      <label>Legal name in Nepali</label><input name="coNameNe" value="${esc(S.settings.coNameNe || '')}" data-noi18n placeholder="कोरा केयर प्राइभेट लिमिटेड"><div class="hint">Empty = the registered name (OCR certificate).</div>
      <label>Company PAN (VAT)</label><input name="coPan" value="${esc(S.settings.coPan || '')}" inputmode="numeric" placeholder="9 digits">
      <label>Address</label><input name="coAddress" value="${esc(S.settings.coAddress || '')}" placeholder="e.g. Pokhara-13, Kaski">
      <label>Company WhatsApp number</label><input name="coPhone" value="${esc(S.settings.coPhone || '')}" placeholder="+977 9xx-xxxxxxx" hint="on the image receipt">
      <label>Company payment QR (bank account QR)</label><div class="row" style="align-items:center;gap:10px;margin:2px 0 8px"><span class="qr-prev">${S.settings.coQr ? `<img src="${esc(S.settings.coQr)}" alt="QR">` : '<span class="muted">none yet</span>'}</span><label class="btn small ghost" style="margin:0">📷 Upload QR<input type="file" id="coQrIn" accept="image/*" hidden></label>${S.settings.coQr ? '<button type="button" class="btn small ghost" data-coqr-remove>Remove</button>' : ''}</div><div class="hint">The picture the customer scans from their gallery (bill + QR card). Saved the moment you pick it — the QR is never written into the app code.</div>
      <label>Bank line under the QR</label><input name="coBankLine" value="${esc(S.settings.coBankLine || '')}" placeholder="bank · account name · account number"><div class="hint">For customers whose app cannot read the QR — type the transfer details.</div>
      <label>Nepali calendar fix (only if the CA says a month length is wrong)</label><textarea name="bsOverride" placeholder="2084: 31,32,31,32,31,30,30,30,29,29,30,31">${esc(S.settings.bsOverride || '')}</textarea><div class="hint">Years 2080–2083 are checked against 3 sources. From 2084 the sources disagree — put the official month lengths here when the calendar is out.</div>
      ${S.isAdmin ? '<button class="btn" type="submit">Save settings</button>' : '<div class="hint">Only Jun (admin) changes settings — the deputy can read them.</div>'}</form>
    <div class="card"><div class="kv"><div class="k">Day 1</div><div class="v">${R.npr(R.PRICES.installFee)}</div><div class="k">Months 2–13</div><div class="v">${R.npr(R.PRICES.monthly + R.PRICES.depositMonthly)} (incl. deposit ${R.PRICES.depositMonthly})</div><div class="k">Months 14–36</div><div class="v">${R.npr(R.PRICES.monthly)}</div><div class="k">Deposit</div><div class="v">${R.npr(R.PRICES.depositTotal)}</div></div></div>`;
  if (k === 'diag') return head('Diagnostics', '') + '<div class="card"><div class="diag" id="diag">…</div></div>';
  if (k === 'help') return head('❓ How to use KORA Field', 'One page for Tara and technicians') + `
    <div class="card"><h3>The dot at the top</h3><div class="kv"><div class="k"><span class="dot g"></span></div><div class="v">Everything is on the server.</div><div class="k"><span class="dot y"></span></div><div class="v">Saved on this phone. It sends by itself when there is internet — keep working.</div><div class="k"><span class="dot r"></span></div><div class="v">Something is wrong. Write it on paper and tell Jun.</div></div></div>
    <div class="card"><h3>No internet? No problem</h3>• Every save goes to the phone first, twice (two stores).<br>• Photos too — they upload later.<br>• Open the app from the <b>home-screen icon</b>, not a Safari tab.<br>• 🚨 <b>Never clear Safari history / website data</b> on this phone while records are waiting.<br>• Tap <b>Status → Protect phone storage</b> once.</div>
    <div class="card"><h3>New install</h3>1. Measure raw TDS and pressure first.<br>2. Install, leak test twice, pump quiet, UV lamp on.<br>3. Measure purified TDS and flow (UV: 1.2 L/min or less).<br>4. Tick all checks · take the 3 photos (device, TDS meter, signed contract).<br>5. Day-1 payment NPR 4,900 by QR — the install is not finished before it is confirmed.</div>
    <div class="card"><h3>Visits</h3>• Look at the PP filter: brown or black → replace now.<br>• One old filter back for every new one.<br>• A completed visit needs photos, TDS after, and the next visit date.<br>• Sanitise pipes every 3 months — tick it on the visit.</div>
    <div class="card"><h3>The day-7 call</h3>One call 7 days after every install — Tara calls or WhatsApps the home.<br>• Is the water fine? Anything to fix? (a fault found early is a cheap one)<br>• The home feels looked after — that is what keeps it with us.<br>• Would a neighbour or relative like a demo?<br>Log it under New → Check-in call. No other routine calls: the monthly visits cover the rest. A late bill is chased from Collections, not from here.</div>
    <div class="card"><h3>Money</h3>• Bill = same day each month as the install day. Months 2–13: 1,400 (1,100 + 300 deposit). From month 14: 1,100.<br>• 3 days before → WhatsApp reminder · due day → remind again · +3 days → Tara calls · +7 days → home visit.<br>• Only Tara takes cash. Everyone else: Khalti / eSewa / Fonepay QR.<br>• Send the receipt from the customer page — the deposit is on its own line.</div>
    <div class="card"><h3>Breakdowns</h3>Office hours → reply within 2 hours, visit today or tomorrow. After 17:00 → reply today, visit tomorrow. Saturday → reply next morning. 3+ days = red.</div>`;
  return head('Report', '') + '<div class="card">Unknown report</div>';
}
// Missing data that breaks reports or slows the field (plan: data you can trust before PoC numbers are read).
export function dataQuality(m) {
  const since = R.addDays(m.t, -120);
  const live = [...m.cust.values()].filter((x) => x.status !== 'Churned');
  return [
    { k: 'gps', ic: '📍', t: 'Houses without GPS', why: 'no pin on the map, no route, no directions', xs: live.filter((x) => !(x.c.gps && Number.isFinite(x.c.gps.lat))).map((x) => ({ id: x.c.id, t: x.c.name, s: toleOf(x.c) })) },
    { k: 'house', ic: '🏠', t: 'No “how to find the house”', why: 'new technicians get lost', xs: live.filter((x) => !String(x.c.houseDetail || '').trim()).map((x) => ({ id: x.c.id, t: x.c.name, s: toleOf(x.c) })) },
    { k: 'bill', ic: '🧾', t: 'Payments without a VAT bill no. (last 120 days)', why: 'the CA sales book needs it', xs: m.D.payments.filter((q) => !R.isNonCash(q) && q.date >= since && !String(q.billNo || '').trim()).sort((a, b) => String(b.date).localeCompare(String(a.date))).map((q) => ({ id: q.customerId, pay: q.id, t: `${R.npr(q.amount)} · ${(S.D.customers.get(q.customerId) || {}).name || '?'}`, s: `${q.date} · ${q.type}` })) },
    { k: 'tds', ic: '💧', t: 'Completed visits without TDS after', why: 'the TDS line and filter learning need it', xs: m.D.visits.filter((v) => isDone(v.status) && !Number.isFinite(v.tdsAfter)).map((v) => ({ id: v.customerId, t: (S.D.customers.get(v.customerId) || {}).name || '?', s: `${v.date} · ${v.visitType || 'Visit'}` })) },
    { k: 'lead', ic: '🧲', t: 'Open leads without a follow-up date', why: 'they are forgotten', xs: m.D.leads.filter((l) => !['Signed', 'Rejected'].includes(l.outcome) && !R.isDate(l.followUpDate)).map((l) => ({ lead: l.id, t: l.name, s: l.tole || '' })) },
  ];
}
function qualityHtml(m) {
  return dataQuality(m).map((g) => `<h2>${g.ic} ${esc(g.t)} <span class="pill ${g.xs.length ? 'warn' : 'ok'}">${g.xs.length}</span></h2><div class="muted">${esc(g.why)}</div>
    <div class="card flush">${g.xs.slice(0, 60).map((x) => `<div class="item" ${x.pay ? `data-edit="payment" data-id="${esc(x.pay)}"` : x.lead ? `data-edit="lead" data-id="${esc(x.lead)}"` : `data-cust="${esc(x.id)}"`}><div class="main"><div class="t">${esc(x.t)}</div><div class="s">${esc(x.s)}</div></div><div class="r">›</div></div>`).join('') || '<div class="empty">All good ✨</div>'}${g.xs.length > 60 ? `<div class="empty">+${g.xs.length - 60} more</div>` : ''}</div>`).join('');
}
const nf = (x) => Math.round(Number(x) || 0).toLocaleString('en-IN');
export function expensesHtml(m, p) {
  const mk = p.m || R.monthKey(m.t); const months = Object.keys(m.expMonths).sort().reverse(); if (!months.includes(mk)) months.unshift(mk);
  const xs = m.D.expenses.filter((x) => R.monthKey(x.date || '') === mk).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const cur = m.expMonths[mk] || { paid: 0, vat: 0, net: 0, byCat: {} };
  const jun = m.D.expenses.filter((x) => String(x.paidFrom).startsWith('Jun') && x.reimbursed !== 'Yes');
  return `<div class="bs-chips">${months.slice(0, 12).map((k) => `<button data-expm="${k}" class="${k === mk ? 'on' : ''}">${esc(k)}</button>`).join('')}</div>
    <div class="sumgrid"><div><span>Paid this month</span><b class="num">${nf(cur.paid)}</b></div><div><span>Input VAT (VAT bills)</span><b class="num">${cur.vat.toFixed(2)}</b></div><div><span>Cost without VAT</span><b class="num">${nf(cur.net)}</b></div><div><span>Owed to Jun (not paid back)</span><b class="num">${nf(jun.reduce((s2, x) => s2 + (Number(x.amount) || 0), 0))}</b></div></div>
    <div class="card">${Object.entries(cur.byCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => `<div class="kv"><div class="k">${esc(c)}</div><div class="v num">${nf(v)}</div></div>`).join('') || '<div class="empty">No expenses this month</div>'}</div>
    ${can('expense') ? '<button class="btn" data-go-form="expense">🧾 New expense</button>' : ''}
    <div class="card flush">${xs.map((x) => `<div class="item" data-edit="expense" data-id="${esc(x.id)}"><span class="dot ${x.vatBill === 'Yes' ? (x.billNo ? 'g' : 'y') : 'k'}"></span><div class="main"><div class="t">${R.npr(x.amount)} · ${esc(x.category || '')}</div><div class="s">${esc(x.date)} · ${esc(x.supplier || '')}${x.description ? ' · ' + esc(x.description) : ''}${x.vatBill === 'Yes' ? ` · VAT ${R.expVat(x).toFixed(2)}${x.billNo ? ' · bill ' + esc(x.billNo) : ' · <span style="color:var(--warn)">no bill no.</span>'}` : ' · no VAT bill'}${String(x.paidFrom).startsWith('Jun') ? (x.reimbursed === 'Yes' ? ' · Jun, paid back' : ' · Jun, to pay back') : ''}</div></div><div class="r">›</div></div>`).join('') || '<div class="empty">No expenses this month</div>'}</div>
    ${can('export') ? `<button class="btn ghost" data-csv="col:expenses">⬇️ Expenses CSV (all)</button>` : ''}`;
}
const DEV_PILL = { 'In stock': 'ok', 'At a customer': 'blue', 'Back — check it': 'warn', 'At refurbish': 'orange', 'Defect — claim': 'bad', Scrapped: 'grey', Lost: 'bad' };
export function devicesHtml(m, p) {
  const f = p.f || 'all'; const q = String(p.q || '').toUpperCase();
  const counts = Object.fromEntries(R.DEVICE_STATES.map((st) => [st, m.devices.filter((d) => d.status === st).length]));
  let list = m.devices; if (f !== 'all') list = list.filter((d) => d.status === f); if (q) list = list.filter((d) => d.serial.includes(q));
  const cname = (id) => { const c = S.D.customers.get(id); return c ? c.name : ''; };
  const checks = m.devices.filter((d) => d.checkDue); const doa = m.devices.filter((d) => d.doaUntil && d.doaUntil >= m.t && d.status === 'At a customer');
  return `<div class="bs-chips"><button data-devf="all" class="${f === 'all' ? 'on' : ''}">All ${m.devices.length}</button>${R.DEVICE_STATES.map((st) => `<button data-devf="${esc(st)}" class="${f === st ? 'on' : ''}">${esc(st)} ${counts[st]}</button>`).join('')}</div>
    ${checks.length ? `<div class="warn">📦 ${checks.length} device(s) not checked yet — PI terms: inspect within 14 days of arrival (${esc(checks.map((d) => d.checkDue).sort()[0])} is the first deadline).</div>` : ''}
    ${doa.length ? `<div class="muted">🛡️ ${doa.length} installed device(s) still inside the 30-day dead-on-arrival claim window.</div>` : ''}
    <div class="muted"><span>Stock by count (stock movements):</span> <b>${m.metrics.stock.Device ?? 0}</b> · <span>In stock by serial:</span> <b>${counts['In stock']}</b>${(m.metrics.stock.Device ?? 0) !== counts['In stock'] ? ' <span>— different: register the serials of the shipment (Device event → Received).</span>' : ''}</div>
    ${can('stock') ? '<button class="btn" data-go-form="device">📦 Device event (arrival · check · refurbish)</button>' : ''}
    <div class="card scroll-x"><table class="tbl"><tr><th>Serial</th><th>Now</th><th>Location</th><th>Last</th><th class="n">Installs</th><th>Batch</th></tr>
      ${list.slice(0, 400).map((d) => `<tr data-report="device" data-serial="${esc(d.serial)}" style="cursor:pointer"><td class="mono"><b>${esc(d.serial)}</b></td><td><span class="pill ${DEV_PILL[d.status] || 'grey'}">${esc(d.status)}</span></td><td>${d.customerId ? esc(cname(d.customerId)) : '—'}</td><td>${esc(d.last.event)} · ${esc(d.last.date || '')}</td><td class="n">${d.installs}</td><td class="mono">${esc(d.batch)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">No devices yet</td></tr>'}</table></div>`;
}
export function deviceHtml(m, p) {
  const s2 = R.normSerial(p.serial); const d = m.devices.find((x) => x.serial === s2);
  const head2 = `<button class="back" data-back>‹ Back</button><h1>📦 <span class="mono">${esc(s2)}</span></h1>`;
  if (!d) return head2 + '<div class="card">No history for this serial yet.</div>';
  const cname = (id) => { const c = S.D.customers.get(id); return c ? c.name : ''; };
  return head2 + `<div class="muted"><span class="pill ${DEV_PILL[d.status] || 'grey'}">${esc(d.status)}</span>${d.customerId ? ` at <a href="#" data-cust="${esc(d.customerId)}">${esc(cname(d.customerId))}</a>` : ''}${d.batch ? ' · batch ' + esc(d.batch) : ''}${d.cost ? ' · landed ' + R.npr(d.cost) : ''}</div>
    ${d.checkDue ? `<div class="card" style="border-color:var(--warn)"><div class="warn">Arrival check due by ${esc(d.checkDue)} (PI: 14 days).</div></div>` : ''}${d.doaUntil && d.doaUntil >= m.t ? `<div class="muted">🛡️ Dead-on-arrival claim window until ${esc(d.doaUntil)}.</div>` : ''}
    <div class="card"><div class="timeline">${d.events.slice().reverse().map((e) => `<div class="ev"><b>${esc(e.date || '')}</b> · ${esc(e.event)}${e.customerId ? ` · <a href="#" data-cust="${esc(e.customerId)}">${esc(cname(e.customerId))}</a>` : ''} <span class="muted">(${esc({ install: 'install form', recovery: 'recovery case', relocation: 'relocation', manual: 'device event' }[e.src] || e.src)})</span>${e.notes ? `<div class="muted">“${esc(e.notes)}”</div>` : ''}</div>`).join('')}</div></div>
    ${can('stock') ? `<div class="row wrap"><button class="btn ghost" data-go-form="claim" data-serial="${esc(s2)}">📮 Claim to supplier</button><button class="btn ghost" data-go-form="device" data-serial="${esc(s2)}" data-kind="Sent to refurbish">🔧 Send to refurbish</button><button class="btn ghost" data-go-form="device" data-serial="${esc(s2)}" data-kind="Refurbished — ready">✅ Refurbished — ready</button><button class="btn ghost" data-go-form="device" data-serial="${esc(s2)}" data-kind="Scrapped">🗑️ Scrap</button></div>` : ''}`;
}
export function gateCards(M) {
  const G = M.gate;
  const one = (t, g, fmt, extra) => `<div class="card"><div class="status" style="font-size:15px">${t} <span class="pill ${!g.judgeable ? 'grey' : g.bad ? 'bad' : 'ok'}">${!g.judgeable ? 'not judgeable yet' : g.bad ? 'TRIGGERED' : 'OK'}</span></div>
    <div class="bigstat" style="margin-top:8px"><span class="v">${fmt(g.value)}</span><span class="muted">trigger ${fmt(g.trigger)}</span></div>
    <div class="bar" style="margin-top:8px"><i style="width:${Math.min(100, ((g.exposure ?? g.n) / g.need) * 100)}%;background:${g.judgeable ? 'var(--ok)' : 'var(--warn)'}"></i></div>
    <div class="muted" style="margin-top:6px">sample ${Math.round(g.exposure ?? g.n)} / ${g.need} ${extra}</div></div>`;
  return one('Churn per month', G.churn, (x) => R.pct(x, 1), 'household-months (2% vs 4% needs ~600)') + one('90-day retention', G.retention, (x) => R.pct(x), 'households installed 90+ days ago (our threshold for "enough")') + one('Collection (bills paid)', G.collection, (x) => R.pct(x), 'bills due (~220 separates 90% from 50%)');
}
export function fclCard(F) {
  const row = (ok, t) => `<div class="signal ${ok ? 'on' : 'off'}"><span class="tick ${ok ? 'y' : 'n'}">${ok ? '✓' : '·'}</span><span>${t}</span></div>`;
  return `<div class="card"><div class="status" style="font-size:15px">FCL#1 signal <span class="pill ${F.ready ? 'ok' : 'grey'}">${F.ready ? 'ORDER NOW' : 'not yet'}</span></div>
    ${row(F.stockSignal, `Stock ${F.stockDevices} ≤ ${F.threshold.toFixed(1)} (avg ${F.avg4w.toFixed(2)}/week × ${F.leadTimeWeeks} weeks)`)}${row(F.billsOk, '30+ bills issued')}${row(F.collectionOk, 'Collection ≥ 60% (not the 50% disaster zone)')}${row(F.defectsOk, F.defectsOk ? 'No repeated defect (3+ same type in 90 days)' : 'Repeated: ' + F.repeat.map((r) => `${r.type} ×${r.n}`).join(', '))}</div>`;
}
// ---------- 🪪 staff & permissions (admin only) ----------
// who a uid is — from the account list, never from a name the record carries (records can be written with any "by")
export function userName(uid, fallback) {
  if (!uid) return fallback || '—'; if (S.user && uid === S.user.uid) return myName();
  const u = [...(S.usersCache || []), ...(S.demoUsers || [])].find((q) => q.uid === uid); return (u && (u.name || u.email)) || fallback || '—';
}
export function ensureUsers(then) { if (!isBoss() || S.usersCache || S.usersLoading) return; S.usersLoading = true; fetchUsers().then((r) => { S.usersCache = r; S.usersLoading = false; if (then) then(); }).catch(() => { S.usersLoading = false; }); }
async function fetchUsers() {
  if (DEMO) return S.demoUsers || [];
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}
function staffActivity(uid, mk) {
  const inM = (d) => R.monthKey(d || '') === mk; const mine = (x) => x.createdBy === uid;
  const pays = arr('payments').filter((x) => mine(x) && inM(x.date) && !R.isNonCash(x));
  const all = COLS.flatMap((col) => arr(col).filter(mine).map((x) => ({ col, x, t: (x.updatedAt && x.updatedAt.toMillis ? x.updatedAt.toMillis() : x._localT) || 0 }))).sort((a, b) => b.t - a.t);
  return { installs: arr('customers').filter((x) => mine(x) && inM(x.installDate)).length, visits: arr('visits').filter((x) => mine(x) && inM(x.date) && isDone(x.status)).length,
    payN: pays.length, paySum: pays.reduce((sum, x) => sum + (Number(x.amount) || 0), 0), reqDone: arr('requests').filter((x) => mine(x) && x.status === 'Done' && inM(x.doneDate)).length,
    expenses: arr('expenses').filter((x) => mine(x) && inM(x.date)).length, last: all.slice(0, 6), total: all.length };
}
const COL_LABEL = { customers: 'Install / customer', visits: 'Visit', payments: 'Payment', requests: 'Request', leads: 'Lead', recoveries: 'Recovery', trainings: 'Training', checkins: 'Call', stockMoves: 'Stock', expenses: 'Expense', deviceEvents: 'Device', relocations: 'Relocation' };
function staffCard(u, mk) {
  const perms = u.perms || (u.role === 'staff' ? PRESETS.office.perms : PRESETS.technician.perms);
  const act = staffActivity(u.uid, mk); const toles = new Set(u.toles || []);
  const seen = u.lastSeenAt && u.lastSeenAt.toMillis ? ago(u.lastSeenAt.toMillis()) : u.lastSeenAt ? String(u.lastSeenAt) : '—';
  const pill = { staff: 'ok', pending: 'warn', blocked: 'grey' }[u.role] || 'grey'; const own = !!(S.user && u.uid === S.user.uid && !S.isAdmin);
  return `<div class="card staff" data-staff="${esc(u.uid)}">
    <div class="st-h"><span class="avatar">${esc((u.name || u.email || '?').slice(0, 1).toUpperCase())}</span><div class="main"><b>${esc(u.name || '(no name yet)')}</b><div class="muted">${esc(u.email || u.uid)} · last seen ${esc(seen)}${u.appVersion ? ' · ' + esc(u.appVersion) : ''}</div></div><span class="pill ${pill}">${esc(u.role === 'staff' ? 'active' : u.role || '?')}</span></div>
    <label>Name (shown on records)</label><input data-uname value="${esc(u.name || '')}" placeholder="e.g. Tara">
    <label>Full name (on the visit note / installed card)</label><input data-ufull value="${esc(u.fullName || '')}" placeholder="e.g. Tara Sherpa">
    <div class="row" style="align-items:center;gap:10px;margin:4px 0 8px"><span class="avatar photo" data-uav>${u.photo ? `<img src="${esc(u.photo)}" alt="">` : esc((u.name || u.email || '?').slice(0, 1).toUpperCase())}</span><label class="btn small ghost" style="margin:0">📷 Photo<input type="file" accept="image/*" data-uphoto="${esc(u.uid)}" hidden></label><span class="muted">round photo on the customer cards · face, good light</span></div>
    <div class="lbl">Preset</div><div class="tgl-row">${Object.entries(PRESETS).map(([k, pr]) => `<button type="button" class="tgl ${u.preset === k ? 'on' : ''}" data-preset="${k}">${esc(pr.label)}</button>`).join('')}</div>
    <div class="lbl">Rights</div><div class="perm-grid">${PERMS.map(([k, l, h]) => `<button type="button" class="tgl perm ${perms[k] ? 'on' : ''}" data-perm="${k}" title="${esc(h || '')}"><span class="ck">${perms[k] ? '✓' : ''}</span>${esc(l)}</button>`).join('')}</div>
    <div class="lbl">Areas (only if “See every customer” is off)</div><div class="tgl-row">${OPT.tole.map((t) => `<button type="button" class="tgl small ${toles.has(t) ? 'on' : ''}" data-area="${esc(t)}">${esc(t)}</button>`).join('')}</div>
    <div class="st-act"><span>🏠 ${act.installs}</span><span>🔧 ${act.visits}</span><span>💵 ${act.payN} · ${R.npr(act.paySum)}</span><span>📋 ${act.reqDone}</span><span>🧾 ${act.expenses}</span><span class="muted">this month</span></div>
    ${act.last.length ? `<div class="muted st-last">${act.last.map((r) => `${esc(COL_LABEL[r.col] || r.col)} ${esc(r.x.date || r.x.installDate || r.x.receivedDate || '')}`).join(' · ')}</div>` : ''}
    ${u.deputy ? '<div class="note">⭐ <b>Deputy admin</b> — every right; runs things when Jun cannot (Emergency handover page). Cannot approve their own money actions.</div>' : ''}
    ${S.isAdmin && u.role === 'staff' ? `<div class="row"><button class="btn ghost" data-deputy="${esc(u.uid)}|${u.deputy ? '0' : '1'}">${u.deputy ? '⭐ Remove deputy admin' : '⭐ Make deputy admin'}</button></div>` : ''}
    ${own ? '<div class="hint">Your own account — Jun changes it.</div>' : ''}<div class="row wrap"${own ? ' hidden' : ''}>${u.role === 'staff' ? `<button class="btn" data-staffsave="${esc(u.uid)}">Save rights</button>${u.email ? `<button class="btn ghost" data-staffreset="${esc(u.email)}">📧 Password link</button>` : ''}<button class="btn ghost" data-staffrole="blocked" data-uid="${esc(u.uid)}">Block</button>` : u.role === 'blocked' ? `<button class="btn ghost" data-staffrole="staff" data-uid="${esc(u.uid)}">Unblock</button>` : `<button class="btn ok" data-staffsave="${esc(u.uid)}" data-approve="1">Approve with these rights</button><button class="btn ghost" data-staffrole="blocked" data-uid="${esc(u.uid)}">Block</button>`}</div>
  </div>`;
}
export function staffMatrix(users, admins = [], sel = '') {
  const act = users.filter((u) => u.role === 'staff'); const me = String((S.user && S.user.email) || '').toLowerCase();
  const pick = (id) => (sel ? ` data-staffpick="${esc(id)}"${id === sel ? ' class="sel"' : ''}` : ''); /* v0.17.0 (3) B2: a row picks that person's card (desk) */
  const adminRow = (nm, mine) => `<tr${mine ? pick('me') : ''}><td><b>${esc(nm)}</b> <span class="pill blue">admin</span></td>${PERMS.map(() => '<td class="y">✓</td>').join('')}<td>all</td></tr>`;
  return `<div class="scroll-x"><table class="tbl matrix"><tr><th>Who</th>${PERMS.map(([k, l]) => `<th title="${esc(l)}">${esc(PERM_SHORT[k])}</th>`).join('')}<th>Areas</th></tr>
    ${adminRow(myName(), true)}${admins.filter((u) => String(u.email || '').toLowerCase() !== me).map((u) => adminRow(u.name || u.email)).join('')}
    ${act.map((u) => { const pr = u.perms || PRESETS.office.perms; return `<tr${pick(u.uid)}><td><b>${esc(u.name || u.email)}</b></td>${PERMS.map(([k]) => `<td class="${pr[k] ? 'y' : 'n'}">${pr[k] ? '✓' : '·'}</td>`).join('')}<td>${pr.seeAll ? 'all' : esc((u.toles || []).join(', ') || '—')}</td></tr>`; }).join('')}</table></div>`;
}
async function loadUsers() {
  const box = $('#drawer #usersBox') || $('#usersBox'); if (!box) return;
  if (!isBoss()) { box.textContent = 'Only Jun and the deputy manage accounts.'; return; }
  try {
    const all = await fetchUsers(); const adm = await Promise.all(all.map((u) => isAdminEmail(u.email)));
    const admins = all.filter((u, i) => adm[i]); /* v0.9.5: admin accounts (the backup address) show as admin rows — no rights card, they have every right */
    const rows = all.filter((u, i) => !adm[i]).sort((a, b) => ({ pending: 0, staff: 1, blocked: 2 }[a.role] ?? 3) - ({ pending: 0, staff: 1, blocked: 2 }[b.role] ?? 3));
    S.usersCache = rows; const mk = R.monthKey(today());
    const box2 = $('#drawer #usersBox') || $('#usersBox'); if (!box2) return;
    if (S.desk) { box2.innerHTML = staffDeskHtml(rows, admins, mk); return; }
    box2.innerHTML = newStaffHtml() + myCardHtml() + `<div class="card"><div class="status" style="font-size:15px">Who can do what</div>${staffMatrix(rows, admins)}</div>`
      + (rows.map((u) => staffCard(u, mk)).join('') || '<div class="card empty">No staff yet. Someone signs in with their email → they appear here as pending.</div>');
  } catch (e) { box.textContent = 'Could not load users: ' + (e.code || e.message); }
}
function staffDeskHtml(rows, admins, mk) { /* v0.17.0 (3) B2 · (6): one long phone column with 1,354-px buttons → new account on one line · pick a person on the left · their card on the right */
  const others = rows.filter((u) => u.role !== 'staff'); /* pending · blocked: not in the rights table, picked from their own list */
  const ids = ['me', ...rows.map((u) => u.uid)]; const first = (rows.find((u) => u.role === 'pending') || rows.find((u) => u.role === 'staff') || { uid: 'me' }).uid;
  const sel = ids.includes(S.staffSel) ? S.staffSel : first; S.staffSel = sel;
  const cards = myCardHtml().replace('class="card staff my"', `class="card staff my${sel === 'me' ? ' sel' : ''}"`) + rows.map((u) => staffCard(u, mk).replace('<div class="card staff"', `<div class="card staff${u.uid === sel ? ' sel' : ''}"`)).join('');
  return `<div class="staff-desk"><div class="sd-top">${newStaffHtml()}</div>
    <div class="sd-left"><div class="card"><div class="status" style="font-size:15px">Who can do what <span class="muted" style="font-weight:500;font-size:13px">· pick a person</span></div>${staffMatrix(rows, admins, sel)}</div>${others.length ? `<div class="card"><div class="status" style="font-size:15px">Waiting · blocked</div><div class="mini-list">${others.map((u) => `<div class="item${u.uid === sel ? ' sel' : ''}" data-staffpick="${esc(u.uid)}"><span class="dot ${u.role === 'pending' ? 'y' : 'k'}"></span><div class="main"><div class="t">${esc(u.name || '(no name yet)')}</div><div class="s">${esc(u.email || u.uid)} · ${esc(u.role)}</div></div></div>`).join('')}</div></div>` : ''}${rows.length ? '' : '<div class="card empty">No staff yet. Someone signs in with their email → they appear here as pending.</div>'}</div>
    <div class="sd-right">${cards}</div></div>`;
}
export function staffPick(id) { S.staffSel = id; for (const c of document.querySelectorAll('.staff-desk .card.staff')) c.classList.toggle('sel', c.dataset.staff === id); for (const r of document.querySelectorAll('.staff-desk [data-staffpick]')) r.classList.toggle('sel', r.dataset.staffpick === id); }
function readStaffCard(card) {
  const perms = {}; card.querySelectorAll('[data-perm]').forEach((b) => { perms[b.dataset.perm] = b.classList.contains('on') ? 1 : 0; });
  const toles = [...card.querySelectorAll('[data-area].on')].map((b) => b.dataset.area);
  const pre = card.querySelector('[data-preset].on');
  const d = { name: card.querySelector('[data-uname]').value.trim(), fullName: (card.querySelector('[data-ufull]') || { value: '' }).value.trim().slice(0, 80), perms, toles, preset: pre ? pre.dataset.preset : 'custom' };
  if (card.dataset.photo) d.photo = card.dataset.photo; /* v0.15: a new photo picked on this card */
  return d;
}
// New staff account made by Jun: a second Firebase app signs the new person up (Jun stays signed in),
// with a random password nobody sees — the staff member gets an email to set their own password, then stays signed in on their phone.
// v0.16 #3: the admin's own card — full name + photo for the visit note / installed card (users/{uid}.fullName · .photo; the profile on this phone)
function myCardHtml() {
  const p = S.profile || {}; const init = (myName() || '?').slice(0, 1).toUpperCase();
  return `<div class="card staff my" data-staff="me"><div class="st-h"><span class="avatar photo" data-uav>${p.photo ? `<img src="${esc(p.photo)}" alt="">` : esc(init)}</span><div class="main"><b>${esc(myName())} <span>(you)</span></b><div class="muted">${S.isAdmin ? 'admin' : 'staff'} · what the customer cards show when you did the visit</div></div><span class="pill blue">${S.isAdmin ? 'admin' : 'me'}</span></div>
    <label>Full name (on the visit note / installed card)</label><input data-ufull value="${esc(p.fullName || '')}" placeholder="your full name">
    <div class="row" style="align-items:center;gap:10px;margin:4px 0 8px"><label class="btn small ghost" style="margin:0">📷 Photo<input type="file" accept="image/*" data-uphoto="me" hidden></label><span class="muted">round photo on the customer cards · face, good light</span></div>
    <div class="row"><button type="button" class="btn" data-mysave>Save my card</button></div></div>`;
}
function newStaffHtml() {
  return `<div class="card staff-new"><div class="status" style="font-size:15px">➕ New staff account</div>
    <div class="muted">They get an email to set their own password. After they sign in once, the phone stays signed in.</div>
    <div class="grid2"><div><label>Name</label><input id="nsName" placeholder="e.g. Laxmi"></div><div><label>Email</label><input id="nsEmail" type="email" inputmode="email" placeholder="their own email"></div></div>
    <div class="lbl">Preset</div><div class="tgl-row" id="nsPreset">${Object.entries(PRESETS).map(([k, pr]) => `<button type="button" class="tgl ${k === 'technician' ? 'on' : ''}" data-nspreset="${k}">${esc(pr.label)}</button>`).join('')}</div>
    <button class="btn" data-act="staffCreate">Create account &amp; send the email</button><div class="hint" id="nsOut"></div></div>`;
}
const randomPw = () => { const a = new Uint8Array(18); crypto.getRandomValues(a); return [...a].map((x) => 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!#%'[x % 59]).join(''); };
async function createStaff(name, email, preset) {
  const data = { role: 'staff', email, name, preset, perms: { ...PRESETS[preset].perms }, toles: [] };
  if (DEMO) { S.demoUsers = S.demoUsers || []; S.demoUsers.push({ uid: 'demo-' + Date.now().toString(36), ...data }); return; }
  const sec = initializeApp(firebaseConfig, 'kf-staff-' + Date.now());
  try {
    const sa = initializeAuth(sec, { persistence: inMemoryPersistence });
    const cred = await createUserWithEmailAndPassword(sa, email, randomPw());
    await setDoc(doc(db, 'users', cred.user.uid), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: S.user.uid });
    await signOut(sa).catch(() => {});
    await sendPasswordResetEmail(auth, email);
  } finally { deleteApp(sec).catch(() => {}); }
}
async function writeUser(uid, data) {
  if (DEMO) { const u = (S.demoUsers || []).find((x) => x.uid === uid); if (u) Object.assign(u, data); return; }
  await setDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp(), updatedBy: S.user.uid }, { merge: true });
}
// ---------- 📱 phone heartbeat: every device tells the office its sync state (no location, no record contents) ----------
// devices/{deviceId}: who, app version, records waiting / refused, oldest waiting, last server contact, home-screen app, storage protected.
// Written at start, every 10 minutes while open, when the connection comes back, back in the app, and a few seconds after sending. Admin reads (rules v0.8).
// One id per account on this browser: rules let each account update only its own device doc, so two accounts must not share one id.
const devKey = () => 'kfp_device_id_' + ((S.user && S.user.uid) || 'none');
export const deviceId = () => { const DEVICE_KEY = devKey(); let id = lsGet(DEVICE_KEY, ''); if (!id) { const a = new Uint8Array(9); crypto.getRandomValues(a); id = 'dv_' + [...a].map((x) => x.toString(16).padStart(2, '0')).join(''); lsSet(DEVICE_KEY, id); } return id; };
const shortUa = () => { const u = navigator.userAgent; const os = /iPhone|iPad/.test(u) ? (u.match(/OS (\d+)[_.](\d+)/) ? `iOS ${RegExp.$1}.${RegExp.$2}` : 'iOS') : /Android/.test(u) ? 'Android' : /Mac OS X/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows' : 'other'; const br = /Whale/.test(u) ? 'Whale' : /CriOS|Chrome/.test(u) ? 'Chrome' : /Safari/.test(u) ? 'Safari' : /Firefox/.test(u) ? 'Firefox' : ''; return `${os}${br ? ' · ' + br : ''}`; };
let hbLast = 0, hbTimer = 0;
export async function heartbeat(force) {
  if (!S.user || !(S.role === 'staff' || S.role === 'admin') || S.wiped) return null;
  if (!force && Date.now() - hbLast < 9.5 * 60e3) return null; hbLast = Date.now();
  const j = myJournal(); const pend = j.filter((e) => e.state === 'pending');
  let persisted = null; try { persisted = await lim(navigator.storage.persisted(), 1500); } catch (e) {}
  const data = { uid: S.user.uid, email: S.user.email || '', name: myName(), appVersion: APP_VERSION, ua: shortUa(), desk: !!S.desk, lang: getLang(),
    pending: pend.length, rejected: j.filter((e) => e.state === 'rejected').length, oldestPendingAt: pend.length ? Math.min(...pend.map((e) => e.t)) : null,
    lastServerAt: S.lastServer || null, online: navigator.onLine, storageOk: !!S.storageOk, persisted, standalone: !!(navigator.standalone || matchMedia('(display-mode: standalone)').matches), seenAtMs: Date.now(),
    errors: errQ.slice(-ERR_MAX), errLast: errQ.length ? errQ[errQ.length - 1].t : null }; /* v0.18.0 (A-4) */
  if (DEMO) { S.demoDevices = S.demoDevices || []; const i = S.demoDevices.findIndex((d) => d.id === deviceId()); const row = { id: deviceId(), ...data, seenAt: { toMillis: () => data.seenAtMs } }; if (i >= 0) S.demoDevices[i] = row; else S.demoDevices.push(row); return row; }
  setDoc(doc(db, 'devices', deviceId()), { ...data, seenAt: serverTimestamp() }, { merge: true }).catch(() => {});
  return data;
}
function startHeartbeat() { clearInterval(hbTimer); heartbeat(true); hbTimer = setInterval(() => heartbeat(false), 10 * 60e3); }
// after sends / sync / coming back: one fresh report a few seconds after the last change (a burst of saves = one write)
let hbSoonT = 0; export function hbSoon() { clearTimeout(hbSoonT); hbSoonT = setTimeout(() => heartbeat(true), 5000); }
export async function fetchDevices() {
  if (DEMO) return S.demoDevices || [];
  const snap = await getDocs(collection(db, 'devices'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
// A device needs a look when: records refused · records waiting > 1 day · not seen for 3 days · old app version · storage not protected on a phone.
export function deviceIssues(d, now = Date.now()) {
  const seen = d.seenAt && d.seenAt.toMillis ? d.seenAt.toMillis() : Number(d.seenAtMs) || 0; const out = [];
  if (d.rejected) out.push(['bad', `${d.rejected} refused by the server`]);
  if (d.pending && d.oldestPendingAt && now - d.oldestPendingAt > 864e5) out.push(['bad', `${d.pending} waiting for ${Math.round((now - d.oldestPendingAt) / 864e5)} days`]);
  else if (d.pending) out.push(['warn', `${d.pending} waiting to send`]);
  if (seen && now - seen > 3 * 864e5) out.push(['warn', `not opened for ${Math.round((now - seen) / 864e5)} days`]);
  if (d.appVersion && d.appVersion !== APP_VERSION) out.push(['warn', 'old app version — open it on Wi-Fi to update']);
  if (!d.desk && d.persisted === false) out.push(['warn', 'storage not protected — Status → Protect phone storage']);
  if (!d.desk && d.standalone === false && /iOS/.test(d.ua || '')) out.push(['warn', 'opened in Safari, not the home-screen app']);
  if (d.storageOk === false) out.push(['bad', 'phone storage failing']);
  const errs = Array.isArray(d.errors) ? d.errors : []; const e24 = errs.filter((e) => e && now - (Number(e.t) || 0) < 864e5).length; if (e24) out.push(['bad', `${e24} app error(s) in 24 h — ${String(errs[errs.length - 1].m || '').slice(0, 60)}`]); /* v0.18.0 (A-4) */
  return { seen, out, lvl: out.some((x) => x[0] === 'bad') ? 'bad' : out.length ? 'warn' : 'ok' };
}
async function fillDiag() {
  const el = $('#drawer #diag') || $('#diag'); if (!el || !S.user) return;
  const lim2 = (p) => Promise.race([p, sleep(1500).then(() => { throw new Error('timeout'); })]);
  let persisted = '?', est = '?', fsIdb = '?';
  try { persisted = String(await lim2(navigator.storage.persisted())); } catch (e) {}
  try { const q = await lim2(navigator.storage.estimate()); est = `${Math.round(q.usage / 1024)} KB / ${Math.round(q.quota / 1048576)} MB`; } catch (e) {}
  try { if (indexedDB.databases) fsIdb = String((await lim2(indexedDB.databases())).some((d) => (d.name || '').includes('firestore'))); } catch (e) {}
  const j = myJournal();
  el.textContent = [`version: ${APP_VERSION}${DEMO ? ' · DEMO' : ''}`, `user: ${S.user.email}${S.isAdmin ? ` · role ${S.role}` : ''} · name ${myName()}`,
    `standalone: ${!!(navigator.standalone || matchMedia('(display-mode: standalone)').matches)} · desk: ${S.desk}`,
    `online: ${navigator.onLine} · persisted: ${persisted} · storage: ${est}`, `firestore cache db: ${fsIdb} · journal ok: ${S.storageOk}`,
    COLS.map((c) => `${c} ${S.D[c].size}`).join(' · '), `journal: pending ${j.filter((e) => e.state === 'pending').length} · refused ${j.filter((e) => e.state === 'rejected').length} · done ${j.filter((e) => e.state === 'done').length}`,
    `last server: ${S.lastServer ? new Date(S.lastServer).toISOString() : '-'} · listen error: ${S.listenErr || '-'}`, `ua: ${navigator.userAgent}`].join('\n');
}
function download(name, text, type = 'text/csv') {
  const b = new Blob([text], { type: type + ';charset=utf-8' }); const a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
// grant-report periods (PAYGo PERFORM KPIs, v0.8 #10)
export const PERFORM_PERIODS = [['m1', 'Last month'], ['q', 'Last 3 months'], ['y', 'Last 12 months'], ['fy', 'This Nepali fiscal year'], ['mtd', 'This month so far']];
export function performPeriod(key, t) {
  const m0 = t.slice(0, 7) + '-01'; const endPrev = R.addDays(m0, -1);
  if (key === 'm1') return { from: R.addMonths(m0, -1), to: endPrev };
  if (key === 'y') return { from: R.addMonths(m0, -12), to: endPrev };
  if (key === 'mtd') return { from: m0, to: t };
  if (key === 'fy') { const b = B.adToBs(t); const y = b ? (b.m >= 4 ? b.y : b.y - 1) : null; const from = y ? B.bsToAd(y, 4, 1) : null; return { from: from || R.addMonths(m0, -12), to: t, fy: y ? B.fiscalYear(y, 4) : '' }; }
  return { from: R.addMonths(m0, -3), to: endPrev };
}
export function csvFor(kind) {
  const m = model(); const name = (id) => { const c = S.D.customers.get(id); return c ? c.name : ''; }; const code = (id) => { const c = S.D.customers.get(id); return c ? c.code : ''; };
  const sp = (r) => (m.ledgers.get(r.customerId) || { splits: {} }).splits[r.id] || {};
  if (kind === 'payments') return R.toCSV(m.D.payments.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))), [
    { key: 'date' }, { label: 'code', get: (r) => code(r.customerId) }, { label: 'customer', get: (r) => name(r.customerId) }, { key: 'type' }, { key: 'amount' }, { key: 'method' }, { key: 'ref' },
    { label: 'install', get: (r) => (sp(r).install || 0).toFixed(2) }, { label: 'subscription', get: (r) => (sp(r).subscription || 0).toFixed(2) },
    { label: 'deposit', get: (r) => (sp(r).deposit || 0).toFixed(2) }, { key: 'discount' }, { key: 'by' }]);
  if (kind === 'vat') return R.toCSV(m.vat, [{ key: 'month' }, { key: 'cash' }, { key: 'taxable' }, { key: 'deposit' }, { key: 'penalty' }, { key: 'forfeits' }, { key: 'credits' }, { label: 'vat', get: (r) => r.vat.toFixed(2) }, { label: 'net', get: (r) => r.net.toFixed(2) }]);
  if (kind === 'deposits') return R.toCSV(m.deposits.rows, [{ label: 'code', get: (r) => r.c.code }, { label: 'customer', get: (r) => r.c.name }, { key: 'collected' }, { key: 'refunded' }, { key: 'forfeited' }, { key: 'held' }]);
  if (kind.startsWith('perform:')) { const [, from, to] = kind.split(':'); const P = R.performKpis(m.D, m.ledgers, from, to, m.t, { back: R.billingMoves(m.D.customers, m.D.recoveries, [], m.t).back });
    return R.toCSV(P.rows, [{ label: 'period_from', get: () => from }, { label: 'period_to', get: () => to }, { key: 'group' }, { label: 'kpi', get: (r) => r.name }, { label: 'value', get: (r) => (r.value === null || r.value === undefined ? '' : r.fmt === 'pct' ? (r.value * 100).toFixed(1) + '%' : Math.round(r.value)) }, { key: 'grade' }, { label: 'how_counted', get: (r) => r.how }]); }
  if (kind.startsWith('col:')) { const col = kind.slice(4); const rows = arr(col).map(({ _pending, _localT, ...x }) => x); const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => k !== 'img'); return R.toCSV(rows, keys.map((k) => ({ key: k, get: (r) => (r[k] && r[k].toMillis ? new Date(r[k].toMillis()).toISOString() : r[k]) }))); }
  return '';
}
// Excel files are converted with SheetJS (vendored, loaded only here).
function loadXlsx() { return window.XLSX ? Promise.resolve(window.XLSX) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = './vendor/xlsx.full.min.js'; s.onload = () => res(window.XLSX); s.onerror = rej; document.head.appendChild(s); }); }
function bankUpload(file) {
  const box = $('#drawer #bankBox') || $('#bankBox');
  if (/\.xlsx?$/i.test(file.name)) {
    box.textContent = 'Reading Excel…';
    loadXlsx().then((X) => file.arrayBuffer().then((buf) => { const wb = X.read(buf, { type: 'array' }); const csv = X.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]); bankRows(R.parseCSV(csv), box); })).catch((e) => { box.textContent = 'Could not read the Excel file: ' + e.message; });
    return;
  }
  const rd = new FileReader();
  rd.onload = () => bankRows(R.parseCSV(rd.result), box);
  rd.readAsText(file);
}
function bankRows(rows, box) {
  {
    if (rows.length < 2) { box.textContent = 'No rows found.'; return; }
    const hdr = rows[0]; const guess = (re) => Math.max(0, hdr.findIndex((h) => re.test(String(h))));
    const opt = (sel) => hdr.map((h, i) => `<option value="${i}"${i === sel ? ' selected' : ''}>${esc(h || 'column ' + (i + 1))}</option>`).join('');
    S.bankRows = rows.slice(1);
    box.innerHTML = `<div class="row"><div><label>Date</label><select id="bmDate">${opt(guess(/date|miti/i))}</select></div><div><label>Amount</label><select id="bmAmt">${opt(guess(/amount|credit|cr|deposit/i))}</select></div></div>
      <label>Description</label><select id="bmDesc">${opt(guess(/desc|narr|remark|detail|particular/i))}</select><button class="btn ghost" data-act="bankMatch" type="button">Match ${rows.length - 1} rows</button><div id="bankRes"></div>`;
  }
}
function bankMatch() {
  const g = (id) => $('#drawer #' + id) || $('#' + id);
  const map = { date: Number(g('bmDate').value), amount: Number(g('bmAmt').value), desc: Number(g('bmDesc').value) };
  const res = R.matchBankRows(S.bankRows || [], map, arr('customers'), model().ledgers, arr('payments')).filter((r) => r.amount > 0);
  S.bankMatches = res;
  const out = g('bankRes');
  out.innerHTML = `<table class="tbl" style="margin-top:10px"><tr><th></th><th>Date</th><th class="n">NPR</th><th>Match</th></tr>${res.map((r) => `<tr><td><input type="checkbox" data-bank="${r.i}" ${r.customer && !r.dup ? 'checked' : r.customer ? '' : 'disabled'} style="min-height:auto;width:auto"></td><td>${esc(r.date)}</td><td class="n">${r.amount}</td><td>${r.customer ? `${esc(custLabel(r.customer))} <span class="pill blue">${esc(r.how)}</span>${r.dup ? ' <span class="pill warn">already recorded</span>' : ''}` : `<span class="muted">${esc(r.desc.slice(0, 40))}</span>`}</td></tr>`).join('')}</table>
    <button class="btn" data-act="bankCreate" type="button">Create ${res.filter((r) => r.customer).length} payments</button>`;
}

// ================= events =================
document.addEventListener('click', async (ev) => {
  const t = ev.target;
  const nv = t.closest('[data-nav]'); if (nv) { ev.preventDefault(); ev.stopPropagation(); G.openDirections(nv.dataset.nav, nv.dataset.way || '', { note: (m) => toast(m, 4000), offer: offerLink }); return; }
  if (t.closest('[data-offer-go]')) { setTimeout(() => { const o = $('#navOffer'); if (o) o.remove(); }, 300); return; }
  if (t.closest('[data-offer-x]')) { const o = $('#navOffer'); if (o) o.remove(); return; }
  if (t.id === 'peek') { closePeek(); return; }
  const sz = t.closest('[data-snooze]'); if (sz) { ev.preventDefault(); snoozeAlert(sz.dataset.snooze, Number(sz.dataset.days) || 1); bump(); scheduleRender(); const bb = $('#bellBox'); if (bb && deskMod) setTimeout(() => { const b2 = $('#bellBox'); if (b2) b2.classList.remove('hidden'); }, 60); return; }
  const clp = t.closest('[data-cal]'); if (clp && !S.desk) { ev.preventDefault(); nav('status', 'report', { r: 'calendar', d: clp.dataset.cal, mo: clp.dataset.cal.slice(0, 7) }); return; } /* v0.17.4 (D2): the phone has a calendar now */
  const cl = t.closest('[data-cal]'); if (cl && S.desk) { ev.preventDefault(); const bb = $('#bellBox'); if (bb) bb.classList.add('hidden'); go('calendar', 'calendar', { d: cl.dataset.cal, mo: cl.dataset.cal.slice(0, 7) }); return; }
  const wo = t.closest('[data-watchok]'); if (wo) { ev.preventDefault(); const [cid, sc] = wo.dataset.watchok.split('|'); watchCheck(cid, Number(sc)); toast('✓ Checked — hidden for 7 days unless it gets worse'); scheduleRender(); return; }
  const spk = t.closest('[data-staffpick]'); if (spk) { ev.preventDefault(); staffPick(spk.dataset.staffpick); return; } /* v0.17.0 (3) B2 */
  const om = t.closest('[data-omw]'); if (om) { ev.preventDefault(); const box = document.getElementById('omw_' + om.dataset.omw); if (box) { box.classList.toggle('hidden'); if (!box.classList.contains('hidden')) box.scrollIntoView({ block: 'nearest' }); } return; }
  const rms = t.closest('[data-rem-sent]'); if (rms) { remMark(rms.dataset.remSent); setTimeout(() => scheduleRender(), 400); } /* the link still opens WhatsApp */
  const oms = t.closest('[data-omw-sent]'); if (oms) { omwMark(oms.dataset.omwSent, oms.dataset.eta); setTimeout(() => { const b = document.getElementById('omw_' + oms.dataset.omwSent); if (b) b.classList.add('hidden'); toast('🛵 Marked "on my way" — it is saved with the visit'); }, 50); return; }
  const apb = t.closest('[data-appr]'); if (apb) { ev.preventDefault(); if (!isApprover()) { toast('Only an approver can do this'); return; }
    const [col, id, st] = apb.dataset.appr.split('|'); const x = S.D[col] && S.D[col].get(id); if (!x || x.approval !== 'Pending') return;
    if ((x.createdBy === S.user.uid || x.updatedBy === S.user.uid) && !S.isAdmin) { toast('Someone else has to OK your own'); return; }
    save(`${col}/${id}`, { approval: st, approvedBy: myName(), approvedByUid: S.user.uid, approvedAt: new Date().toISOString(), approvedAmount: Number(x[col === 'payments' ? 'discount' : 'depositRefunded']) || 0 }, false); /* the rules check the amount */ toast(st === 'Approved' ? '✓ Approved' : '✕ Not approved'); bump(); if (S.drawer) refreshDrawer(); else scheduleRender(); return; }
  if (t.closest('[data-stop]')) return; // links inside list rows
  const chip = t.closest('.chip');
  if (chip && chip.parentElement && chip.parentElement.dataset.group) {
    const g = chip.parentElement; const multi = g.dataset.multi === '1';
    if (multi) chip.classList.toggle('on');
    else { const was = chip.classList.contains('on'); g.querySelectorAll('.chip').forEach((b) => b.classList.remove('on')); if (!was) chip.classList.add('on'); }
    const f = chip.closest('form'); if (f && f.id === 'theForm') { refreshConditional(f, g.dataset.group); draftSave(f); unconfirm(f); }
    return;
  }
  const lg = t.closest('[data-lang]'); if (lg) { setLang(lg.dataset.lang); render(true); if (S.drawer) refreshDrawer(); if (deskMod) deskMod.paletteClose(); return; }
  const ppb = t.closest('[data-pp]'); if (ppb) { const tgt = S.drawer || S.route; tgt.params.pp = ppb.dataset.pp; if (S.drawer) refreshDrawer(); else render(false); return; }
  const ef = t.closest('[data-expm], [data-devf]'); if (ef) { const tgt = S.drawer || S.route; if (ef.dataset.expm) tgt.params.m = ef.dataset.expm; else tgt.params.f = ef.dataset.devf; if (S.drawer) refreshDrawer(); else render(false); return; }
  const cp = t.closest('[data-capack]'); if (cp) { const [y, mo, n] = cp.dataset.capack.split('|').map(Number); const tgt = S.drawer && S.drawer.params.r === 'capack' ? S.drawer : S.route.params.r === 'capack' ? S.route : null; if (tgt) { Object.assign(tgt.params, { y, m: mo, n }); if (S.drawer) refreshDrawer(); else render(false); } return; }
  const tg = t.closest('[data-tab-go]'); if (tg) { history_.length = 0; go(tg.dataset.tabGo, tg.dataset.tabGo, {}, true); return; }
  const navb = t.closest('nav.tabs button'); if (navb) { history_.length = 0; go(navb.dataset.tab, navb.dataset.tab, {}, true); return; }
  const sideb = t.closest('[data-side]'); if (sideb) { history_.length = 0; closeDrawer(true); go(sideb.dataset.side, sideb.dataset.side, {}, true); return; }
  const md = t.closest('[data-msdone], [data-msreopen]'); if (md) { /* v0.15 boards */
    ev.preventDefault(); ev.stopPropagation(); if (!S.isAdmin) return; const done = md.dataset.msdone !== undefined; const id = done ? md.dataset.msdone : md.dataset.msreopen; const x = S.D.milestones.get(id); if (!x) return;
    auditLog('milestones', id, x, { state: done ? 'Done' : 'Waiting' }); save(`milestones/${id}`, done ? { state: 'Done', doneDate: today(), impAt: null } : { state: 'Waiting', doneDate: '', since: today(), impAt: null }, false); toast(done ? `✅ ${x.title}` : `↩ ${x.title} is open again`); scheduleRender(); return;
  }
  const qrm = t.closest('[data-coqr-remove]'); if (qrm) { ev.preventDefault(); if (!S.isAdmin) return; save('settings/app', { coQr: '' }, false); S.settings = { ...S.settings, coQr: '' }; bump(); toast('QR removed'); scheduleRender(); return; }
  const mx = t.closest('[data-msexport]'); if (mx) { ev.preventDefault(); const b = mx.dataset.msexport; const rows = arr('milestones').filter((x) => !b || (x.board || 'Board') === b).map(({ id, createdAt, updatedAt, createdBy, updatedBy, by, ...rest }) => rest); download(`kora-board-${(b || 'all').replace(/[^\w]+/g, '_')}-${today()}.json`, JSON.stringify(rows, null, 2)); return; }
  const gf = t.closest('[data-go-form]'); if (gf && !canForm(gf.dataset.goForm)) return; // hidden rights stay hidden (no message)
  if (gf) { ev.preventDefault(); nav(S.route.tab === 'customers' || S.route.screen === 'detail' ? 'customers' : 'new', 'form', { form: gf.dataset.goForm, cid: gf.dataset.cid, id: gf.dataset.id, lead: gf.dataset.lead, kind: gf.dataset.kind, serial: gf.dataset.serial, event: gf.dataset.kind, date: gf.dataset.date, lane: gf.dataset.lane, board: gf.dataset.board, type: gf.dataset.type, amount: gf.dataset.amount ? Number(gf.dataset.amount) : undefined, lost: gf.dataset.lost }); return; }
  const cv = t.closest('[data-convert]'); if (cv) { nav('new', 'form', { form: 'install', lead: cv.dataset.convert }); return; } /* v0.11: the install form prefills itself from the lead + its screening */
  const cb = t.closest('button[data-cust]'); if (cb && cb.dataset.cust) { nav('customers', 'detail', { id: cb.dataset.cust }); return; } // a button inside an edit row
  const ed = t.closest('[data-edit]'); if (ed) { nav(S.route.tab, 'form', { form: ed.dataset.edit, id: ed.dataset.id }); return; }
  const rc = t.closest('[data-receipt]'); if (rc) { nav('customers', 'detail', { id: rc.dataset.cid, receipt: rc.dataset.receipt }); return; }
  const sc = t.closest('[data-svccredit]'); if (sc) { /* before [data-cust]: the button sits inside the customer row */
    if (!isBoss()) return; const x = model().repairCr.find((y) => y.r.id === sc.dataset.svccredit); if (!x || x.given || !x.c.done) return;
    save(`payments/${x.id}`, { customerId: x.r.customerId, date: today(), type: 'Service credit', amount: x.c.amount, method: '', notes: `Repair late ${x.c.days} days (${x.c.from} → ${x.c.to}) · request ${x.r.id}`, by: myName() }, !S.D.payments.has(x.id));
    toast(`🛠️ ${R.npr(x.c.amount)} comes off the next bill`); scheduleRender(); if (S.drawer) refreshDrawer(); return;
  }
  const c = t.closest('[data-cust]'); if (c && c.dataset.cust) { nav('customers', 'detail', { id: c.dataset.cust }); return; }
  const pcd = t.closest('[data-pcal]'); if (pcd) { S.route.params = { ...(S.route.params || {}), d: pcd.dataset.pcal, mo: pcd.dataset.pcal.slice(0, 7) }; render(false); return; } /* v0.17.4 (D2) */
  const pcm = t.closest('[data-pcalmo]'); if (pcm) { S.route.params = { ...(S.route.params || {}), mo: pcm.dataset.pcalmo, d: '' }; render(false); return; }
  const ls = t.closest('[data-list]'); if (ls) { nav(S.route.tab, 'list', { list: ls.dataset.list }); return; }
  const rp = t.closest('[data-report]'); if (rp) { ev.preventDefault(); nav('status', 'report', { r: rp.dataset.report, ...(rp.dataset.serial ? { serial: rp.dataset.serial } : {}), ...(rp.dataset.uid ? { uid: rp.dataset.uid } : {}), ...(rp.dataset.pm ? { pm: rp.dataset.pm } : {}) }); return; }
  const sg = t.closest('[data-seg]'); if (sg) { S.route.params.f = sg.dataset.seg; render(false); return; }
  const csv = t.closest('[data-csv]'); if (csv) { const k = csv.dataset.csv; download(`kora-${k.replace('col:', '')}-${today()}.csv`, csvFor(k)); return; }
  const rf = t.closest('[data-refcredit]'); if (rf) {
    ev.preventDefault(); if (!isBoss()) { toast('Only admin applies credits'); return; }
    const [cid, forId] = rf.dataset.refcredit.split('|');
    save(`payments/${newId('payments')}`, { customerId: cid, date: today(), type: 'Referral credit', amount: R.referralAmount(), referralFor: forId, method: '', notes: 'Referral reward', by: myName() }, true);
    toast('🎁 Referral credit applied'); scheduleRender(); return;
  }
  if (t.closest('[data-back]')) { backClick(); return; }
  if (t.id === 'drawerBg') { closeDrawer(); return; }
  if (t.dataset.rmphoto !== undefined) { S.formPhotos.splice(Number(t.dataset.rmphoto), 1); renderThumbs(); return; }
  if (t.dataset.prole !== undefined) return; /* the role select — handled on change */
  if (t.dataset.full) { const o = $('#viewer'); o.querySelector('img').src = t.src; o.style.display = 'flex'; return; }
  const pdf = t.closest('[data-pdf]'); if (pdf) { const fig = pdf.closest('figure'); const src = fig && fig.dataset.src; if (src) { const bin = atob(src.split(',')[1]); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); window.open(URL.createObjectURL(new Blob([u8], { type: 'application/pdf' })), '_blank'); } return; }
  if (t.closest('#viewer')) { $('#viewer').style.display = 'none'; return; }
  const stg = t.closest('.staff [data-perm], .staff [data-area]'); if (stg) { stg.classList.toggle('on'); const ck = stg.querySelector('.ck'); if (ck) ck.textContent = stg.classList.contains('on') ? '✓' : ''; const card = stg.closest('.staff'); if (stg.dataset.perm) card.querySelectorAll('[data-preset]').forEach((b) => b.classList.remove('on')); return; }
  const pz = t.closest('.staff [data-preset]'); if (pz) { const card = pz.closest('.staff'); const pr = PRESETS[pz.dataset.preset].perms; card.querySelectorAll('[data-preset]').forEach((b) => b.classList.toggle('on', b === pz)); card.querySelectorAll('[data-perm]').forEach((b) => { const on = !!pr[b.dataset.perm]; b.classList.toggle('on', on); b.querySelector('.ck').textContent = on ? '✓' : ''; }); return; }
  const my = t.closest('[data-mysave]'); if (my) { /* v0.16 #3 */
    const card = my.closest('.staff'); const d = { fullName: card.querySelector('[data-ufull]').value.trim().slice(0, 80) }; if (card.dataset.photo) d.photo = card.dataset.photo;
    if (S.isAdmin) d.name = myName(); /* other phones find the admin's card by the name on the visit */
    try { if (!DEMO) await setDoc(doc(db, 'users', S.user.uid), d, { merge: true }); /* no stamps: staff may change only fullName / photo on their own doc */
      S.profile = { ...(S.profile || {}), ...d }; lsSet('kfp_prof_' + S.user.uid, S.profile); toast('✅ Your card is saved'); loadUsers(); } catch (e) { toast('Failed: ' + (e.code || e.message)); }
    return;
  }
  const ss = t.closest('[data-staffsave]'); if (ss) {
    const uid = ss.dataset.staffsave; const card = ss.closest('.staff'); const d = readStaffCard(card);
    if (!d.name) { toast('Write their name first'); card.querySelector('[data-uname]').focus(); return; }
    try {
      await writeUser(uid, { ...d, role: 'staff' });
      const names = String(S.settings.techNames || '').split(',').map((x) => x.trim()).filter(Boolean);
      if (!names.includes(d.name) && d.perms.visit && S.isAdmin) { const tn = [...names, d.name].join(', '); save('settings/app', { techNames: tn }, false); S.settings = { ...S.settings, techNames: tn }; }
      toast(ss.dataset.approve ? `✅ ${d.name} approved` : `✅ Rights saved for ${d.name}`); loadUsers();
    } catch (e) { toast('Failed: ' + (e.code || e.message)); }
    return;
  }
  const dp = t.closest('[data-deputy]'); if (dp) { if (!S.isAdmin) { toast('Only Jun picks the deputy'); return; } const [duid, on] = dp.dataset.deputy.split('|'); try { if (on === '1') for (const o of (await fetchUsers()).filter((q) => q.deputy && q.uid !== duid)) await writeUser(o.uid, { deputy: false }); await writeUser(duid, { deputy: on === '1' }); S.usersCache = null; toast(on === '1' ? '⭐ Deputy admin set' : 'Deputy removed'); loadUsers(); } catch (e) { toast('Failed: ' + (e.code || e.message)); } return; }
  const prt = t.closest('[data-print]'); if (prt) { window.print(); return; }
  const pr = t.closest('[data-payrun], [data-paycsv]'); if (pr) {
    if (!isBoss()) return; const key = pr.dataset.payrun || pr.dataset.paycsv; const { rows, rg } = payrollRows(model(), key);
    if (pr.dataset.paycsv) { download(`payroll_${key}.csv`, R.toCSV(rows.map((r) => ({ month: key, name: r.pe.name, job: r.pe.job || '', basic: r.P.basic, allowance: r.P.allow, bonus: r.P.bonus, gross: r.P.gross, ssf_employee_11: r.P.ssfE, tds: r.P.tds ?? '', net_pay: r.P.net, ssf_company_20: r.P.ssfR, company_cost: r.P.cost, saved: r.sv ? 'yes' : 'no' })), ['month', 'name', 'job', 'basic', 'allowance', 'bonus', 'gross', 'ssf_employee_11', 'tds', 'net_pay', 'ssf_company_20', 'company_cost', 'saved'].map((k2) => ({ key: k2 })))); return; }
    const todo = rows.filter((r) => !r.sv); /* saved lines are never rewritten */
    for (const r of todo) {
      const rid = `run_${key}_${r.pe.id}`; save(`payroll/${rid}`, { kind: 'run', month: key, personId: r.pe.id, name: r.pe.name, job: r.pe.job || '', from: rg.from, to: rg.to, ...r.P, by: myName() }, true);
      const eid = `exp_pay_${key}_${r.pe.id}`; save(`expenses/${eid}`, { date: rg.to, category: 'Salaries & wages', description: `Salary ${key} — ${r.pe.name} (gross ${r.P.gross} + company SSF ${r.P.ssfR})`, amount: r.P.cost, supplier: r.pe.name, vatBill: 'No', import: 'No', capital: 'No', paidFrom: 'Company bank', method: 'Bank transfer', notes: 'from Payroll', by: myName() }, !S.D.expenses.has(eid));
    }
    toast(todo.length ? `💼 ${todo.length} payslip(s) saved + expenses` : 'Already saved — saved payslips are not rewritten'); scheduleRender(); if (S.drawer) refreshDrawer(); return;
  }
  const hc = t.closest('[data-handoverok]'); if (hc) { if (!S.isAdmin) return; const d = today(); save('settings/app', { handoverCheckedAt: d }, false); S.settings = { ...S.settings, handoverCheckedAt: d }; toast('Handover checked today'); scheduleRender(); if (S.drawer) refreshDrawer(); return; }
  const uc = t.closest('[data-uncover]'); if (uc && isBoss()) { save(`customers/${uc.dataset.uncover}`, { cover: null }, false); toast('Cover ended'); scheduleRender(); return; }
  const nsp = t.closest('[data-nspreset]'); if (nsp) { nsp.parentElement.querySelectorAll('[data-nspreset]').forEach((b) => b.classList.toggle('on', b === nsp)); return; }
  const rs = t.closest('[data-staffreset]'); if (rs) { if (DEMO) { toast('📧 Password link sent (demo)'); return; } try { await sendPasswordResetEmail(auth, rs.dataset.staffreset); toast('📧 Password link sent to ' + rs.dataset.staffreset); } catch (e) { toast('Failed: ' + (e.code || e.message)); } return; }
  const sr0 = t.closest('[data-staffrole="blocked"]'); if (sr0 && !sr0.dataset.armed) { sr0.dataset.armed = '1'; sr0.textContent = 'Tap again to block — their phone is wiped the next time it opens online'; sr0.classList.add('bad'); setTimeout(() => { if (sr0.isConnected) { delete sr0.dataset.armed; sr0.textContent = 'Block'; sr0.classList.remove('bad'); } }, 4000); return; }
  const sr = t.closest('[data-staffrole]'); if (sr) { try { const uu = (S.usersCache || []).find((q) => q.uid === sr.dataset.uid) || {}; const role = sr.dataset.staffrole === 'staff' && !uu.perms ? 'pending' : sr.dataset.staffrole; await writeUser(sr.dataset.uid, { role }); toast(sr.dataset.staffrole === 'blocked' ? '⛔ Blocked' : '✅ Unblocked'); loadUsers(); } catch (e) { toast('Failed: ' + (e.code || e.message)); } return; }
  const a = t.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act;
  if (act === 'closeDrawer') closeDrawer();
  else if (act === 'drawerFull') { const dr = $('#drawer'); if (dr) { dr.classList.toggle('full'); if (dr.classList.contains('full')) dr.classList.remove('wide'); else if (S.drawer && ['list', 'report'].includes(S.drawer.screen)) dr.classList.add('wide'); } } /* v0.15 */
  else if (act === 'memoToggle') { ev.preventDefault(); const b = $('#memoBox'); if (!b) return; b.classList.toggle('hidden'); lsSet('kfp_memo_open', b.classList.contains('hidden') ? 0 : 1); if (!b.classList.contains('hidden')) { const ta = $('#memoTa'); if (ta) ta.focus(); } }
  else if (act === 'rcImg') { ev.preventDefault(); imageCard('receipt', a.dataset.pid); }
  else if (act === 'rcRef') { ev.preventDefault(); imageCard('referral', a.dataset.cid); }
  else if (act === 'rcVisit') { ev.preventDefault(); imageCard('visit', a.dataset.vid); }
  else if (act === 'rcInst') { ev.preventDefault(); imageCard('install', a.dataset.cid); }
  else if (act === 'rcEnd') { ev.preventDefault(); imageCard('ended', a.dataset.cid); } /* v0.19.0 (10) Jun 10/4 "해지완료했으면 … 잘가라" */
  else if (act === 'rcBill') { ev.preventDefault(); ev.stopPropagation(); const cid = a.dataset.cid; if ($('#rcBox')) imageCard('bill', cid); else { nav('customers', 'detail', { id: cid }); setTimeout(() => imageCard('bill', cid), 450); } } /* v0.16 #7: from a list → open the home, then draw */
  else if (act === 'serialNext') { ev.preventDefault(); const f = a.closest('form'); const el = f && f.elements[a.dataset.for]; if (el) { el.value = nextSerials(1)[0]; el.dispatchEvent(new Event('input', { bubbles: true })); } } /* v0.17.2 (6) */
  else if (act === 'serialGen') { ev.preventDefault(); const f = a.closest('form'); const ta = f && f.elements[a.dataset.for]; const n = Number((f.querySelector('#sgN') || {}).value) || 1;
    if (ta) { const have = String(ta.value || '').split(/[\n,;]+/).map(R.normSerial).filter(Boolean); ta.value = [...have, ...nextSerials(n, today(), have)].join('\n'); ta.dispatchEvent(new Event('input', { bubbles: true })); } } /* v0.17.2 (6) */
  else if (act === 'rcShare') { ev.preventDefault(); if (!S.rcBlob) return; const r = await RC.shareImage(S.rcBlob, S.rcName || 'receipt.png'); toast(r === 'shared' ? '✅ Shared' : r === 'unsupported' ? 'Sharing not available here — save the image' : 'Share cancelled'); }
  else if (act === 'rcWaWeb') { ev.preventDefault(); if (!S.rcUrl) return; /* v0.16.0 (5) ④ · v0.17.2 (2) Jun 10/4 "일부러 이미지 직접 다운하고 넣게 설정한거임?": the picture goes to the clipboard → ⌘V in the chat (a web page cannot attach a file to WhatsApp) */
    let cp = null; try { if (S.rcBlob && navigator.clipboard && window.ClipboardItem) cp = navigator.clipboard.write([new ClipboardItem({ 'image/png': S.rcBlob })]); } catch (e) { cp = null; }
    const w = waWebOpen(S.rcPhone); let copied = false; if (cp) { try { await cp; copied = true; } catch (e) {} }
    if (!copied) { const dl = document.createElement('a'); dl.href = S.rcUrl; dl.download = S.rcName || 'kora-card.png'; document.body.appendChild(dl); dl.click(); dl.remove(); }
    toast(!w ? 'Pop-up blocked — allow pop-ups for this site, then tap again' : DEMO ? 'Practice: made-up numbers, so no chat was opened' : copied ? '📋 Copied · in the chat press ⌘V, then send' : '⬇️ Saved · drag the picture into the chat'); }
  else if (act === 'cardOpen') { ev.preventDefault(); const k = a.dataset.kind, id = a.dataset.id, cid = a.dataset.cid; if (!k || !id || !cid) return; nav('customers', 'detail', k === 'receipt' ? { id: cid, receipt: id } : k === 'visit' ? { id: cid, vrep: id } : { id: cid, inst: cid }); setTimeout(() => imageCard(k, id), 450); } /* ⑥ from the desk list: the home opens with the card drawn */
  else if (act === 'cardsMore') { ev.preventDefault(); const L = document.querySelector('.cs-list'); if (L) { if (deskMod && deskMod.cardsToSend) { const have = new Set([...L.querySelectorAll('.cs-i')].map((r) => r.dataset.cardrow)); const more = deskMod.cardsToSend(model(), 1).filter((e) => !e.sent && !have.has(e.key)); L.insertAdjacentHTML('beforeend', more.map((e, i) => deskMod.cardRowHtml(e, i + have.size)).join('')); } L.classList.add('cs-open'); csLayout(); } } /* v0.16.0 (7) · v0.18.1 (B5): the rows beyond 8 are built only now */
  else if (act === 'cardSent') { ev.preventDefault(); const k = a.dataset.key; if (!k) return; const on = markCardSent(k, !cardsSent()[k]); syncSentUi(k, on); toast(on ? '✓ Marked as sent' : 'Marked as not sent'); } /* ⑥ */
  else if (act === 'demoWho') { if (DEMO) demoWho(); }
  else if (act === 'demoAs') { if (DEMO) demoAs(a.dataset.as || ''); }
  else if (act === 'demoReset') { if (!DEMO || !DEMO_KEEP) return; if (a.dataset.armed !== '1') { a.dataset.armed = '1'; a.textContent = 'Tap again — delete every practice record'; a.classList.add('danger'); return; } location.href = location.pathname + '?reset=1'; }
  else if (act === 'staffCreate') {
    const name = ($('#nsName') || {}).value?.trim() || ''; const email = (($('#nsEmail') || {}).value || '').trim().toLowerCase(); const pre = document.querySelector('[data-nspreset].on'); const out = $('#nsOut');
    if (!name) { toast('Write their name first'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast('Check the email'); return; }
    a.disabled = true; out.textContent = 'Creating…';
    try {
      await createStaff(name, email, pre ? pre.dataset.nspreset : 'technician');
      const names = String(S.settings.techNames || '').split(',').map((x) => x.trim()).filter(Boolean);
      if (!names.includes(name) && S.isAdmin) { const tn = [...names, name].join(', '); save('settings/app', { techNames: tn }, false); S.settings = { ...S.settings, techNames: tn }; bump(); } else if (!names.includes(name)) toast('Ask Jun to add the name to Settings → technician names');
      toast(`✅ ${name}: account made — the password email is on its way`); loadUsers();
    } catch (e) {
      const msg = { 'auth/email-already-in-use': 'This email already has an account — ask them to sign in; they appear below as pending.', 'auth/invalid-email': 'Check the email.', 'auth/operation-not-allowed': 'Email sign-in is switched off in Firebase.', 'auth/network-request-failed': 'No internet.' }[e.code];
      out.textContent = msg || 'Failed: ' + (e.code || e.message); a.disabled = false;
    }
  }
  else if (act === 'unsnooze') { ev.preventDefault(); lsSet(SNZ, {}); bump(); scheduleRender(); }
  else if (act === 'watchShowAll') { ev.preventDefault(); watchUncheckAll(); scheduleRender(); }
  else if (act === 'closePeek') closePeek();
  else if (act === 'locAsk') locAsk();
  else if (act === 'gps') captureGps(a.closest('form'));
  else if (act === 'cam' || act === 'gal') { const ins = a.closest('.fld').querySelectorAll('.photoIn'); (act === 'cam' ? ins[0] : ins[1]).click(); }
  else if (act === 'pwShow') { const p = $('#lg_pw'); const show = p.type === 'password'; p.type = show ? 'text' : 'password'; a.textContent = show ? '🙈' : '👁'; a.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); p.focus(); }
  else if (act === 'lgClear') { const el = document.getElementById(a.dataset.for); if (el) { el.value = ''; el.focus(); } }
  else if (act === 'forgot') {
    const email = $('#lg_email').value.trim(); const e = $('#lgErr');
    if (!email) { e.textContent = 'Type your email first.'; e.classList.remove('hidden'); return; }
    try { await sendPasswordResetEmail(auth, email); e.textContent = 'Reset email sent (if the account exists).'; } catch (err) { e.textContent = 'Could not send: ' + err.code; }
    e.classList.remove('hidden');
  } else if (act === 'roleRefresh') { if (S.wiped) { location.reload(); return; } await refreshRole(); if (S.role === 'staff') await startData(false); render(); }
  else if (act === 'signOut') {
    const n = myJournal().filter((e) => e.state === 'pending').length;
    if (n && a.dataset.sure !== '1') { a.dataset.sure = '1'; a.textContent = `⚠️ ${n} record(s) not sent yet — they will be deleted from this phone. Tap again to sign out anyway`; return; }
    if (DEMO) { toast('Demo mode'); return; }
    // signing out also removes the company data kept on this device (cache, journal, photos) — a shared phone keeps nothing
    await wipePhone(); await signOut(auth); location.reload();
  } else if (act === 'draftClear') { const f = a.closest('form'); if (f) { draftClear(f.dataset.form); if (S.drawer) refreshDrawer(); else render(false); toast('Draft removed'); } }
  else if (act === 'gpsHere') { gpsHere(a.dataset.cid, a); }
  else if (act === 'photosNet') { a.disabled = true; a.textContent = 'Loading…'; loadPhotos(a.dataset.cid, '', true).then(() => { a.textContent = 'Loaded'; }); }
  else if (act === 'moreLinks') { const m = $('#moreLinks'); if (m) { m.classList.toggle('hidden'); a.textContent = m.classList.contains('hidden') ? '⋯ More' : '⋯ Less'; } }
  else if (act === 'sync') { toast('Checking…'); await reconcile(true); toast(syncState().t); }
  else if (act === 'full') { if (navigator.onLine && !DEMO) { await startData(true); toast('Reloading from server…'); } else toast('Needs internet'); }
  else if (act === 'persist') { let r = false; try { r = await navigator.storage.persist(); } catch (e) {} toast('Storage protection: ' + (r ? 'ON' : 'not granted')); fillDiag(); }
  else if (act === 'swReload' && S.swWaiting) S.swWaiting.postMessage('skipWaiting');
  else if (act === 'photoFull') { const fg = a.closest('figure'); const st = fg && fg.dataset.st; if (st) { a.disabled = true; try { const url = await getDownloadURL(sRef(storage, st)); window.open(url, '_blank', 'noopener'); } catch (e) { toast('Could not open: ' + (e.code || e.message)); } a.disabled = false; } } /* v0.18.3 (B3) */
  else if (act === 'delCust') delAsk(a.dataset.cid); /* v0.17.3 (6) */
  else if (act === 'delCustNo') { const s0 = $('#delSlot'); if (s0) s0.innerHTML = ''; }
  else if (act === 'delCustGo') await delGo(a.dataset.cid);
  else if (act === 'privSave') { const ok = save(`customers/${a.dataset.cid}/private/main`, { notes: ($('#drawer #privNotes') || $('#privNotes')).value.trim() }, false); toast(ok ? 'Private notes saved' : '🔴 Could not save on phone'); }
  else if (act === 'theme') { const k = 'kfp_theme_' + (S.desk ? 'desk' : 'phone'); const nx = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; lsSet(k, nx); render(true); }
  else if (act === 'deskOn') { lsSet('kfp_desk', true); S.route = { tab: 'command', screen: 'command', params: {} }; render(true); }
  else if (act === 'deskOff') { lsSet('kfp_desk', false); closeDrawer(true); S.route = { tab: 'today', screen: 'today', params: {} }; render(true); }
  else if (act === 'exportJson') { const out = { exportedAt: new Date().toISOString(), version: APP_VERSION }; for (const c of COLS) out[c] = arr(c).map(({ _pending, _localT, ...x }) => x); download(`kora-backup-${today()}.json`, JSON.stringify(out, (k, v) => (v && v.toMillis ? new Date(v.toMillis()).toISOString() : v), 1), 'application/json'); }
  else if (act === 'bankMatch') bankMatch();
  else if (act === 'backupNow') { const ph = ($('#drawer #bkPhotos') || $('#bkPhotos') || {}).checked; toast('💾 Making the backup…'); fullBackup(ph).then((c) => { toast(`💾 Backup saved · ${Object.values(c).reduce((a, b) => a + b, 0)} records`); scheduleRender(); }).catch((e) => toast('Backup failed: ' + e.message)); }
  else if (act.startsWith('capack')) {
    const tgt = S.drawer && S.drawer.params.r === 'capack' ? S.drawer : S.route; const dp = CA.defaultPeriod(today());
    const X = CA.buildPack({ y: tgt.params.y || dp.y, m: tgt.params.m || dp.m, n: tgt.params.n || 1 }); if (!X) return;
    if (act === 'capackXlsx') { toast('Making the Excel file…'); CA.packXlsx(X).then(() => toast('⬇️ ' + CA.fileBase(X) + '.xlsx')).catch((e) => toast('Excel failed: ' + e.message)); }
    else if (act === 'capackCsv') download(CA.fileBase(X) + '.csv', CA.packCsv(X));
    else if (act === 'capackPrint') { if (!CA.packPrint(X)) toast('Allow pop-ups for printing'); }
    else if (act === 'capackMsg') { const box = $('#drawer #capackMsgBox') || $('#capackMsgBox'); if (box) box.innerHTML = `<div class="card"><div class="muted">Copy, attach the Excel file, send to the CA:</div><pre class="diag" style="color:var(--ink);white-space:pre-wrap">${esc(CA.packMessage(X))}</pre><button class="btn ghost small" data-act="capackCopy">📋 Copy</button></div>`; }
    else if (act === 'capackCopy') { try { navigator.clipboard.writeText(CA.packMessage(X)); toast('Copied'); } catch (e) { toast('Copy failed — select the text'); } }
  }
  else if (act === 'bankCreate') {
    const picked = [...document.querySelectorAll('[data-bank]:checked')].map((b) => Number(b.dataset.bank)); let n = 0;
    for (const r of S.bankMatches || []) if (picked.includes(r.i) && r.customer) { const led = model().ledgers.get(r.customer.id); save(`payments/${newId('payments')}`, { customerId: r.customer.id, date: r.date || today(), type: led && led.paidThrough < 1 ? 'Installation fee (4,900)' : 'Monthly subscription', amount: r.amount, method: 'Fonepay QR', ref: r.desc.slice(0, 80), point: 'Digital', notes: 'bank CSV match: ' + r.how, by: myName() }, true); n++; }
    toast(`Created ${n} payments`); closeDrawer(true); nav('status', 'report', { r: 'payments' });
  }
});
document.addEventListener('change', (ev) => {
  if (ev.target.classList.contains('photoIn')) { addFormPhotos([...ev.target.files]); ev.target.value = ''; return; }
  if (ev.target.dataset && ev.target.dataset.prole !== undefined) { const p = S.formPhotos[Number(ev.target.dataset.prole)]; if (p) p.role = ev.target.value; return; } /* v0.19.0 (4) */
  if (ev.target.id === 'bankFile' && ev.target.files[0]) { bankUpload(ev.target.files[0]); return; }
  if (ev.target.id === 'bkCheck' && ev.target.files[0]) { checkBackupFile(ev.target.files[0]); return; }
  if (ev.target.id === 'msImport' && ev.target.files[0]) { /* v0.15: a board from a JSON file (the real items are kept outside the public code) */
    const file = ev.target.files[0]; ev.target.value = ''; if (!S.isAdmin) return;
    const rd = new FileReader(); rd.onload = () => { try {
      const j = JSON.parse(rd.result); const rows = Array.isArray(j) ? j : Array.isArray(j.items) ? j.items : [];
      /* v0.17.4 Jun 10/4 "왤케 별로없냐?" → the full board file. Same title (any board) = the same item, updated (it may move board) by a NEWER file:
         an item still as a file left it (impAt set) → when this file's asOf is later than that file's · an item made or touched in the app (✓ · ↩ · the form clear impAt)
         → only when this file is newer than its last change. A file without asOf only adds. */
      const asOf = j && !Array.isArray(j) && j.asOf ? Date.parse(j.asOf) : NaN; const tk = (q) => String(q || '').trim().toLowerCase();
      const byTitle = new Map(arr('milestones').map((x) => [tk(x.title), x])); let n = 0, up = 0, skip = 0;
      const lastCh = (x) => { const u = x.updatedAt; return Math.max(Number(x._localT) || 0, u && u.toMillis ? u.toMillis() : typeof u === 'string' ? Date.parse(u) || 0 : 0); };
      for (const r0 of rows) { const r = { board: String(r0.board || '').trim().slice(0, 60), title: String(r0.title || '').trim().slice(0, 160), who: MS_WHO.includes(r0.who) ? r0.who : 'Other', whoName: String(r0.whoName || '').slice(0, 80), state: MS_STATE.includes(r0.state) ? r0.state : 'Todo', since: R.isDate(r0.since) ? r0.since : '', due: R.isDate(r0.due) ? r0.due : '', grade: MS_GRADE.includes(r0.grade) ? r0.grade : MS_GRADE[2], src: String(r0.src || '').slice(0, 300), note: String(r0.note || '').slice(0, 600), order: Number(r0.order) || 0, doneDate: R.isDate(r0.doneDate) ? r0.doneDate : '', by: myName() };
        if (!r.board || !r.title) { skip++; continue; }
        const stamp = { impAt: Date.now(), impAsOf: Number.isFinite(asOf) ? asOf : 0 };
        const was = byTitle.get(tk(r.title)); if (was) { const newer = Number.isFinite(asOf) && (was.impAt ? (Number(was.impAsOf) || 0) < asOf : lastCh(was) < asOf);
          if (newer) { const { by, ...ch } = r; save(`milestones/${was.id}`, { ...ch, ...stamp }, false); up++; } else skip++; continue; }
        byTitle.set(tk(r.title), r); save(`milestones/${newId('milestones')}`, { ...r, ...stamp }, true); n++; }
      toast(`📥 ${n} item(s) added${up ? ` · ${up} updated` : ''}${skip ? ` · ${skip} skipped (empty or already there)` : ''}`); scheduleRender();
    } catch (e) { toast('Not a board file: ' + (e.message || e)); } }; rd.readAsText(file); return;
  }
  if (ev.target.id === 'coQrIn' && ev.target.files[0]) { /* v0.16 #7: the company QR → 320px square PNG in settings/app.coQr */
    const file = ev.target.files[0]; ev.target.value = ''; if (!S.isAdmin) { toast('Only Jun changes settings'); return; }
    shrinkQr(file).then((url) => { save('settings/app', { coQr: url }, false); S.settings = { ...S.settings, coQr: url }; bump(); toast('✅ QR saved — it goes on the bill card'); scheduleRender(); }).catch((e) => toast('Cannot read this picture: ' + (e.message || e)));
    return;
  }
  if (ev.target.dataset && ev.target.dataset.uphoto !== undefined && ev.target.files[0]) { /* v0.15: staff photo → 160px square → saved with the rights card */
    const card = ev.target.closest('.staff'); const file = ev.target.files[0]; ev.target.value = '';
    shrinkAvatar(file).then((url) => { card.dataset.photo = url; const av = card.querySelector('[data-uav]'); if (av) av.innerHTML = `<img src="${esc(url)}" alt="">`; toast('Photo ready — press Save rights to keep it'); }).catch((e) => toast('Cannot read this photo: ' + (e.message || e)));
    return;
  }
  const as = ev.target.closest && ev.target.closest('[data-assign]'); if (as && isBoss()) { save(`customers/${as.dataset.assign}`, { assignee: as.value, cover: null }, false); toast(as.value ? `👤 Now goes to ${as.value}` : '👤 Nobody assigned'); scheduleRender(); return; }
  const f = ev.target.closest && ev.target.closest('#theForm'); if (f) { refreshConditional(f); draftSave(f); unconfirm(f); }
});
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'custSearch') { S.route.params.q = ev.target.value; const l = $('#custList'); if (l) l.innerHTML = custListHtml(S.route.params); return; }
  if (ev.target.id === 'deskSearch' && deskMod) { deskMod.onSearch(ev.target.value); return; }
  const f = ev.target.closest && ev.target.closest('#theForm'); if (f) { if (ev.target.tagName === 'SELECT') refreshConditional(f); draftSave(f); unconfirm(f); }
  const cp = ev.target.classList && ev.target.classList.contains('custpick') ? ev.target : null; if (cp) custPickFilter(cp);
});
// v0.11.1 (#6): once a value changes, the yellow notes must be checked again — "Save anyway" goes back to "Save"
// v0.11.1 (#8): the search box rebuilds the customer wheel with matches only (the chosen one stays)
function custPickFilter(inp) {
  const sel = document.getElementById(inp.dataset.for); if (!sel) return; const q = inp.value.trim().toLowerCase(); const cur = sel.value;
  const list = arr('customers').filter((c) => (c.status !== 'Churned' || c.id === cur) && (!q || [c.name, c.code, c.phone, toleOf(c)].some((s) => String(s || '').toLowerCase().includes(q)))).sort((a, b) => String(a.name).localeCompare(String(b.name))).slice(0, q ? 40 : 2000);
  sel.innerHTML = `<option value="">— choose customer —</option>${list.map((c) => `<option value="${esc(c.id)}"${c.id === cur ? ' selected' : ''}>${esc(custLabel(c))} · ${esc(toleOf(c))}</option>`).join('')}`;
  if (q && list.length === 1) { sel.value = list[0].id; const f = sel.closest('form'); if (f) refreshConditional(f); }
}
function unconfirm(f) { if (f.dataset.confirmed === '1') { delete f.dataset.confirmed; const b = f.querySelector('#saveBtn'); if (b) b.textContent = 'Save'; } }
document.addEventListener('submit', async (ev) => {
  ev.preventDefault(); const f = ev.target; if (f.id !== 'settingsForm') delete f.dataset.dirty; /* v0.17.2 (1): saved → the page may redraw again */
  if (f.id === 'delForm') { const b = f.querySelector('[data-act="delCustGo"]'); if (b) await delGo(b.dataset.cid); return; } /* v0.17.3 (6): Enter in the code box */
  if (f.id === 'loginForm') {
    const e = $('#lgErr'); e.classList.add('hidden');
    const email = f.elements.email.value.trim(); const rem = !!($('#lg_remember') || {}).checked; const keep = ($('#lg_keep') || { checked: true }).checked;
    lsSet('kfp_login_remember', rem); lsSet('kfp_login_keep', keep); lsSet('kfp_login_email', rem ? email : '');
    try { await setPersistence(auth, keep ? indexedDBLocalPersistence : browserSessionPersistence); } catch (err) { /* keep the default (stay signed in) */ }
    try { await signInWithEmailAndPassword(auth, email, f.elements.pw.value); }
    catch (err) {
      const m = { 'auth/invalid-credential': 'Wrong email or password.', 'auth/network-request-failed': 'No internet. The first sign-in needs internet.', 'auth/too-many-requests': 'Too many tries. Wait a few minutes.' };
      e.textContent = m[err.code] || ('Sign-in failed: ' + err.code); e.classList.remove('hidden');
    }
    return;
  }
  if (f.id === 'theForm') { submitForm(f); return; }
  if (f.id === 'settingsForm') {
    if (!S.isAdmin) { toast('Only Jun changes settings'); return; }
    const e = f.elements; const pan = e.coPan.value.replace(/\s/g, '');
    if (pan && !/^\d{9}$/.test(pan)) { toast('Company PAN has 9 digits'); return; }
    delete f.dataset.dirty; /* v0.17.2 (1) */
    const data = { leadTimeWeeks: Number(e.leadTimeWeeks.value) || R.FCL.leadTimeWeeks, techNames: e.techNames.value.trim(), holidays: e.holidays.value.trim(), coName: e.coName.value.trim(), coPan: pan, coAddress: e.coAddress.value.trim(), coPhone: e.coPhone.value.trim().slice(0, 40), coNameNe: e.coNameNe.value.trim().slice(0, 80), coBankLine: e.coBankLine.value.trim().slice(0, 120), referralCampaign: e.referralCampaign.value, filterMode: e.filterMode.value, bsOverride: e.bsOverride.value.trim(), payday: e.payday.value.trim(), payroll: e.payroll.value, filterLeadWeeks: e.filterLeadWeeks.value.trim(), filterSafetyWeeks: e.filterSafetyWeeks.value.trim(), filterCoverMonths: e.filterCoverMonths.value.trim(), capPeople: e.capPeople.value.trim(), capJobsPerDay: e.capJobsPerDay.value.trim(), capInstallSlots: e.capInstallSlots.value.trim(), hireLeadWeeks: e.hireLeadWeeks.value.trim(), callbackDays: e.callbackDays.value.trim(), promiseMaxDays: e.promiseMaxDays.value.trim(), screenWarn: e.screenWarn.value, signAsk: e.signAsk.value, partsList: e.partsList.value.trim().slice(0, 2000), partsMin: e.partsMin.value.trim(), vialTarget: e.vialTarget.value.trim(), learnFilters: e.learnFilters.value, handoverContacts: e.handoverContacts.value.trim().slice(0, 2000), taxTable: e.taxTable.value.trim().slice(0, 1000), handoverNotes: e.handoverNotes.value.trim().slice(0, 2000), omwEn: e.omwEn.value.trim().slice(0, 600), omwNe: e.omwNe.value.trim().slice(0, 600), missEn: e.missEn.value.trim().slice(0, 600), missNe: e.missNe.value.trim().slice(0, 600), fxKrw100: Number(e.fxKrw100.value) > 0 ? Number(e.fxKrw100.value) : null, msgLang: MSG_LANGS.includes(e.msgLang.value) ? e.msgLang.value : 'Nepali',
      apprDiscountOver: e.apprDiscountOver.value.trim() === '' ? null : Math.max(0, Number(e.apprDiscountOver.value) || 0), apprRefundOver: e.apprRefundOver.value.trim() === '' ? null : Math.max(0, Number(e.apprRefundOver.value) || 0), apprWho: e.apprWho.value, visitLines: e.visitLines.value.trim().slice(0, 2000) }; // numbers: the rules compare them
    auditLog('settings', 'app', S.settings, data); save('settings/app', data, false); S.settings = { ...S.settings, ...data }; B.setOverrides(data.bsOverride); bump(); toast('Settings saved'); goBack();
  }
});
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Escape' || document.getElementById('palette') || document.getElementById('story')) return;
  if (document.getElementById('peek')) { closePeek(); return; }
  if (S.drawer) closeDrawer();
});
// v0.11.1 (#4): a technician at the door saves the pin without the edit right (rules already allow the gps field for the visit right)
function gpsHere(cid, btn) {
  if (!navigator.geolocation) { toast('This phone cannot give location'); return; }
  if (btn) btn.textContent = 'Getting location…';
  navigator.geolocation.getCurrentPosition((p) => {
    const acc = Math.round(p.coords.accuracy); if (acc > 150 && btn && btn.dataset.sure !== '1') { btn.dataset.sure = '1'; btn.textContent = `±${acc} m — stand outside and tap again to save anyway`; return; }
    save(`customers/${cid}`, { gps: { lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)), acc } }, false);
    toast(`📍 Location saved (±${acc} m)`); if (S.drawer) refreshDrawer(); else scheduleRender();
  }, (e) => { toast('Could not get location: ' + e.message); if (btn) btn.textContent = '📍 Save my location as this house'; }, { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 });
}
function captureGps(form) {
  const out = form.querySelector('#gpsOut');
  if (!navigator.geolocation) { out.textContent = 'This phone cannot give location.'; return; }
  out.textContent = 'Getting location… (stand outside if slow)';
  navigator.geolocation.getCurrentPosition((p) => {
    form.elements.gpsLat.value = p.coords.latitude.toFixed(6); form.elements.gpsLng.value = p.coords.longitude.toFixed(6); form.elements.gpsAcc.value = Math.round(p.coords.accuracy);
    out.textContent = `✅ ${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)} (±${Math.round(p.coords.accuracy)} m)`;
  }, (e) => { out.textContent = 'Could not get location: ' + e.message; }, { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 });
}

// ---------- triggers ----------
window.addEventListener('online', () => { reconcile(false); refreshChrome(); setTimeout(() => heartbeat(true), 8000); });
window.addEventListener('offline', () => refreshChrome());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { reconcile(false); scheduleRender(); hbSoon(); } });
let lastW = window.innerWidth;
window.addEventListener('resize', () => { const w = window.innerWidth; if ((lastW >= 960) !== (w >= 960)) { lastW = w; closeDrawer(true); S.route = w >= 960 ? { tab: 'command', screen: 'command', params: {} } : { tab: 'today', screen: 'today', params: {} }; render(true); } lastW = w; });
setInterval(() => { reconcile(false); }, 30000);

// ---------- service worker (offline app shell) ----------
if ('serviceWorker' in navigator && !DEMO) {
  Promise.reject(new Error('practice: no service worker')).then((reg) => {
    const watch = (w) => w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) { S.swWaiting = w; toast('New version ready — Status → update'); scheduleRender(); } });
    if (reg.waiting && navigator.serviceWorker.controller) S.swWaiting = reg.waiting;
    reg.addEventListener('updatefound', () => watch(reg.installing));
    reg.update().catch(() => {});
  }).catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (S.swWaiting && !reloaded) { reloaded = true; location.reload(); } });
}

initLang(DEMO ? (new URLSearchParams(location.search).get('lang') || 'ko') : 'ko');
if (DEMO && new URLSearchParams(location.search).get('lang')) setLang(new URLSearchParams(location.search).get('lang'), true);
// v0.10.1 (Jun 2026-09-29 "쉽게 버튼을"): demo / practice — switch who you are with the 👤 button, no link to type
const DEMO_WHO = { '': ['👑', 'Jun', 'Admin — everything'], office: ['⭐', 'Tara', 'Deputy admin · office — every home, money OKs, service credits (not the settings)'], technician: ['🔧', 'Laxmi', 'Technician — only her homes and today\'s route · visits, installs, cash'] };
function demoWho() {
  const cur = S.isAdmin ? '' : (S.profile && S.profile.preset) || '';
  peek(`<h3>👤 Practise as</h3><div class="muted">One set of data for all three — what one saves, the others see (like the real server).</div>
    <div class="who-list">${Object.entries(DEMO_WHO).map(([k, w]) => `<button class="who-btn${k === cur ? ' on' : ''}" data-act="demoAs" data-as="${k}"><b>${w[0]} ${esc(w[1])}</b><span>${esc(w[2])}</span></button>`).join('')}</div>
    ${DEMO_KEEP ? `<div class="sec-mini">🗑️ Start over</div><div class="muted">Fake data made again from today · every practice record deleted.</div><button class="btn ghost" data-act="demoReset" style="margin-top:8px">Start over</button>` : ''}`);
}
function demoAs(as) {
  if (DEMO_KEEP) lsSet('kfp_demo_as', as || '');
  const u = new URL(location.href); if (as) u.searchParams.set('as', as); else u.searchParams.delete('as'); u.searchParams.set('lang', getLang()); location.href = u.toString();
}
// PRACTICE: the fake world is made once for the first practice day and kept (same records every day) · every practice save is replayed on top
function practiceDay() { let d = lsGet('kfp_demo_day', ''); if (!R.isDate(d) || d > today()) { d = today(); lsSet('kfp_demo_day', d); } return d; }
function practiceReplay() {
  for (const e of jLoad().slice().sort((a, b) => a.t - b.t)) {
    const parts = String(e.path || '').split('/'); if (parts.length !== 2) continue; const [col, id] = parts;
    if (col === 'settings') { S.settings = { ...S.settings, ...e.data }; if (e.data.bsOverride) B.setOverrides(S.settings.bsOverride); continue; }
    if (!S.D[col]) continue; const prev = S.D[col].get(id) || {};
    S.D[col].set(id, { ...prev, ...e.data, id, createdBy: prev.createdBy || e.uid, updatedBy: e.uid, _localT: e.t });
  }
}
// the world keeps living: customers pay, new requests and leads come in (demo.js liveWorld) — at start and every 3 minutes
function practiceLive(d, first) {
  let got = []; try { got = d.liveWorld(S, practiceDay(), Date.now()); } catch (e) { console.warn('practice live', e); return; } if (!got.length) return;
  const n = (col) => got.filter((g) => g.col === col).length;
  bump(); if (!first) scheduleRender(); toast(`${first ? 'Since you last looked' : 'Just now'}: payments ${n('payments')} · repair requests ${n('requests')} · new leads ${n('leads')}`, 6000);
}
if (DEMO) {
  S.user = { uid: 'demo-uid', email: 'demo@local' }; S.isAdmin = true; S.role = 'admin';
  const asRole = new URLSearchParams(location.search).get('as') || (DEMO_KEEP ? lsGet('kfp_demo_as', '') : ''); // ?as=technician|office|viewer → see the app as that staff member (or the 👤 button)
  if (asRole && PRESETS[asRole]) { S.isAdmin = false; S.role = 'staff'; S.profile = { name: asRole === 'office' ? 'Tara' : asRole === 'technician' ? 'Laxmi' : 'Viewer', preset: asRole, perms: { ...PRESETS[asRole].perms, ...(asRole === 'technician' ? { seeAll: 0 } : {}) }, toles: asRole === 'technician' ? ['Lakeside', 'Baidam'] : [] };
    // v0.10.1: signed in as that person's own account (what they save carries their id) · Tara = the deputy admin (Jun 2026-09-29)
    S.user = { uid: asRole === 'office' ? 'demo-tara' : asRole === 'technician' ? 'demo-ram' : 'demo-viewer', email: asRole === 'office' ? 'tara@example.com' : asRole === 'technician' ? 'laxmi@example.com' : 'viewer@example.com' };
    if (asRole === 'office') { S.profile.deputy = true; S.isDeputy = true; } }
  window.__kf = { S, jLoad, syncState, go, nav, addFormPhotos, photoGet, model, closeDrawer, FORMS, render, setLang, getLang, G, CA, B, can, PRESETS, R , CAL, liveAlerts, techNames, closePeek, save, rcCacheKeys, toAppUrl, msBoards, rerenderSoon: scheduleRender };
  const who = DEMO_WHO[asRole && PRESETS[asRole] ? asRole : ''] || DEMO_WHO[''];
  const flag = document.createElement('button'); flag.type = 'button'; flag.className = 'demo-flag'; flag.dataset.act = 'demoWho'; flag.title = 'Change who you are';
  flag.innerHTML = `<span>${DEMO_LABEL}</span> · ${who[0]} ${who[1]} ▾`; document.body.appendChild(flag); document.body.classList.add('has-flag'); /* v0.11: the page starts below the badge */
  if (!location.search.includes('empty')) import('./demo.js').then((d) => { d.loadDemo(S, practiceDay()); practiceReplay(); practiceLive(d, true); setInterval(() => practiceLive(d, false), 180000); bump(); heartbeat(true); render(true); }).catch((e) => console.warn('demo', e));
}
if (EMU) { /* v0.18.0 (A-1): the self-test drives the real sign-in → save → server → read-back path */
  window.__kf = { S, jLoad, syncState, go, nav, addFormPhotos, photoGet, model, closeDrawer, FORMS, render, setLang, getLang, G, CA, B, can, PRESETS, R, CAL, liveAlerts, techNames, closePeek, save, rcCacheKeys, toAppUrl, msBoards, rerenderSoon: scheduleRender, noteError, errList, deviceIssues, heartbeat };
  window.__emu = {
    signUp: async (email, pw) => { const r = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emu', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw, returnSecureToken: true }) }); return (await r.json()).localId; },
    signIn: (email, pw) => signInWithEmailAndPassword(auth, email, pw), signOut: () => signOut(auth),
    serverGet: async (path) => { const s = await getDocFromServer(doc(db, path)); return s.exists() ? s.data() : null; },
    serverSet: (path, data, merge) => setDoc(doc(db, path), data, { merge: !!merge }),
    serverList: async (col, field, value) => (await getDocs(query(collection(db, col), where(field, '==', value)))).docs.map((d) => ({ id: d.id, ...d.data() })),
    offline: () => disableNetwork(db), online: () => enableNetwork(db), deleteCustomer, visitPhotos, serverTimestamp, liveSweep, liveSweepPlan, storageMeta: (p) => getMetadata(sRef(storage, p)),
  };
}
render(true);
