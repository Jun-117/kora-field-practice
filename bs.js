// Bikram Sambat (BS) — Nepal's official calendar. VAT periods, the IRD sales book and the CA all work in BS months.
// Month lengths cannot be computed; they are published each year. Source check (2026-09-28):
//   2080–2083: three independent open-source tables agree — nepali-date-converter 3.4.0 · nepali-datetime 2.0.0 · bikram-sambat 1.8.1.
//   2084+: the tables disagree → PROVISIONAL (values below = nepali-date-converter). Fix them in Settings when the official calendar is out.
// Anchor: 2080-01-01 BS = 2023-04-14 AD (all three tables give 2083-01-01 = 2026-04-14).
const TABLE = {
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2084: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2085: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2086: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
};
const FIRST = 2080, LAST = 2090, CONFIRMED_UNTIL = 2083;
const EPOCH = Date.UTC(2023, 3, 14); // 2080-01-01 BS
export const BS_MONTHS = ['Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Aswin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
export const BS_MONTHS_NE = ['बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत'];

let over = {};
// Settings text, one year per line: "2084: 31,32,31,32,31,30,30,30,29,29,30,31"
export function setOverrides(text) {
  over = {};
  for (const line of String(text || '').split(/\n|;/)) {
    const m = line.match(/^\s*(\d{4})\s*[:=]\s*([\d,\s]+)$/); if (!m) continue;
    const xs = m[2].split(/[,\s]+/).filter(Boolean).map(Number);
    if (xs.length === 12 && xs.every((x) => x >= 29 && x <= 32)) over[Number(m[1])] = xs;
  }
  return Object.keys(over).map(Number);
}
const months = (y) => over[y] || TABLE[y];
export const isProvisional = (y) => y > CONFIRMED_UNTIL && !over[y];
export const inRange = (y) => y >= FIRST && y <= LAST;
const yearLen = (y) => months(y).reduce((s, x) => s + x, 0);
const isoOf = (ms) => new Date(ms).toISOString().slice(0, 10);
const msOf = (iso) => { const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d); };

// AD 'YYYY-MM-DD' → { y, m (1–12), d } or null outside 2080–2090
export function adToBs(iso) {
  let off = Math.round((msOf(iso) - EPOCH) / 864e5); if (!(off >= 0)) return null;
  let y = FIRST;
  while (y <= LAST && off >= yearLen(y)) { off -= yearLen(y); y++; }
  if (y > LAST) return null;
  const ml = months(y); let m = 0;
  while (off >= ml[m]) { off -= ml[m]; m++; }
  return { y, m: m + 1, d: off + 1 };
}
export function bsToAd(y, m, d = 1) {
  if (!inRange(y)) return null;
  let off = 0; for (let k = FIRST; k < y; k++) off += yearLen(k);
  const ml = months(y); for (let k = 0; k < m - 1; k++) off += ml[k];
  return isoOf(EPOCH + (off + d - 1) * 864e5);
}
export const daysInMonth = (y, m) => months(y)[m - 1];
// AD range covered by one BS month (inclusive)
export function bsMonthRange(y, m) { return { from: bsToAd(y, m, 1), to: bsToAd(y, m, daysInMonth(y, m)) }; }
export const addBsMonths = (y, m, n) => { const k = y * 12 + (m - 1) + n; return { y: Math.floor(k / 12), m: (k % 12) + 1 }; };
const p2 = (n) => String(n).padStart(2, '0');
export const fmtBs = (b, sep = '.') => (b ? `${b.y}${sep}${p2(b.m)}${sep}${p2(b.d)}` : '');
export const bsLabel = (y, m, ne) => `${(ne ? BS_MONTHS_NE : BS_MONTHS)[m - 1]} ${y}`;
// Nepal's fiscal year starts on Shrawan 1.
export const fiscalYear = (y, m) => (m >= 4 ? `${y}/${p2((y + 1) % 100)}` : `${y - 1}/${p2(y % 100)}`);
