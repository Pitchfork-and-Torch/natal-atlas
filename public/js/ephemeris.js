/* Apparent geocentric tropical longitudes via Astronomy Engine.
   Houses: Porphyry from ASC and MC. Mean north node (Meeus). */

import {
  Body,
  MakeTime,
  GeoVector,
  Ecliptic,
  EclipticGeoMoon,
  SiderealTime,
  e_tilt,
} from "../vendor/astronomy-engine.js";

export const SIGNS = [
  { id: "aries", name: "Aries", glyph: "♈", element: "fire", modality: "cardinal", start: 0 },
  { id: "taurus", name: "Taurus", glyph: "♉", element: "earth", modality: "fixed", start: 30 },
  { id: "gemini", name: "Gemini", glyph: "♊", element: "air", modality: "mutable", start: 60 },
  { id: "cancer", name: "Cancer", glyph: "♋", element: "water", modality: "cardinal", start: 90 },
  { id: "leo", name: "Leo", glyph: "♌", element: "fire", modality: "fixed", start: 120 },
  { id: "virgo", name: "Virgo", glyph: "♍", element: "earth", modality: "mutable", start: 150 },
  { id: "libra", name: "Libra", glyph: "♎", element: "air", modality: "cardinal", start: 180 },
  { id: "scorpio", name: "Scorpio", glyph: "♏", element: "water", modality: "fixed", start: 210 },
  { id: "sagittarius", name: "Sagittarius", glyph: "♐", element: "fire", modality: "mutable", start: 240 },
  { id: "capricorn", name: "Capricorn", glyph: "♑", element: "earth", modality: "cardinal", start: 270 },
  { id: "aquarius", name: "Aquarius", glyph: "♒", element: "air", modality: "fixed", start: 300 },
  { id: "pisces", name: "Pisces", glyph: "♓", element: "water", modality: "mutable", start: 330 },
];

export const PLANET_META = [
  { id: "sun", name: "Sun", glyph: "☉", body: Body.Sun, kind: "personal" },
  { id: "moon", name: "Moon", glyph: "☽", body: Body.Moon, kind: "personal" },
  { id: "mercury", name: "Mercury", glyph: "☿", body: Body.Mercury, kind: "personal" },
  { id: "venus", name: "Venus", glyph: "♀", body: Body.Venus, kind: "personal" },
  { id: "mars", name: "Mars", glyph: "♂", body: Body.Mars, kind: "personal" },
  { id: "jupiter", name: "Jupiter", glyph: "♃", body: Body.Jupiter, kind: "social" },
  { id: "saturn", name: "Saturn", glyph: "♄", body: Body.Saturn, kind: "outer" },
  { id: "uranus", name: "Uranus", glyph: "♅", body: Body.Uranus, kind: "outer" },
  { id: "neptune", name: "Neptune", glyph: "♆", body: Body.Neptune, kind: "outer" },
  { id: "pluto", name: "Pluto", glyph: "♇", body: Body.Pluto, kind: "outer" },
];

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export function norm(deg) {
  return ((deg % 360) + 360) % 360;
}

export function sep(a, b) {
  const d = Math.abs(norm(a) - norm(b));
  return d > 180 ? 360 - d : d;
}

export function lonParts(lon) {
  const raw = Number(lon);
  const x = Number.isFinite(raw) ? norm(raw) : 0;
  let s = Math.floor(x / 30) % 12;
  if (!Number.isFinite(s)) s = 0;
  const d = x - s * 30;
  let deg = Math.floor(d);
  let min = Math.round((d - deg) * 60);
  let sign = s;
  if (min === 60) {
    deg += 1;
    min = 0;
    if (deg === 30) {
      deg = 0;
      sign = (sign + 1) % 12;
    }
  }
  sign = ((sign % 12) + 12) % 12;
  const meta = SIGNS[sign] || SIGNS[0];
  return { lon: x, deg, min, signIndex: sign, sign: meta.name, signId: meta.id };
}

export function fmtLon(lon) {
  const p = lonParts(lon);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(p.deg)}\u00B0${pad(p.min)}' ${p.sign}`;
}

/** Civil time in an IANA zone -> UTC Date, using the browser ICU tz database. */
export function zonedCivilToUtc(year, month, day, hour, minute, timeZone) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  if (!timeZone || timeZone === "UTC") return new Date(utcGuess);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const asUtcMs = (ms) => {
    const parts = {};
    for (const p of dtf.formatToParts(new Date(ms))) parts[p.type] = p.value;
    const hh = parts.hour === "24" ? 0 : Number(parts.hour);
    return Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      hh,
      Number(parts.minute),
      Number(parts.second),
    );
  };
  return new Date(utcGuess - (asUtcMs(utcGuess) - utcGuess));
}

export function geoEclipticLon(body, date) {
  if (body === Body.Moon) return norm(EclipticGeoMoon(date).lon);
  const vec = GeoVector(body, date, true);
  return norm(Ecliptic(vec).elon);
}

export function isRetrograde(body, date) {
  if (body === Body.Sun || body === Body.Moon) return false;
  const lon0 = geoEclipticLon(body, date);
  const later = new Date(date.getTime() + 86400000);
  const lon1 = geoEclipticLon(body, later);
  let d = lon1 - lon0;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d < 0;
}

export function meanNorthNode(date) {
  const time = MakeTime(date);
  const jd = 2451545.0 + time.ut;
  const T = (jd - 2451545.0) / 36525.0;
  return norm(
    125.0445479
      - 1934.1362891 * T
      + 0.0020754 * T * T
      + (T * T * T) / 467441
      - (T * T * T * T) / 60616000,
  );
}

function keplerE(M, e) {
  let E = M;
  for (let i = 0; i < 12; i++) {
    const d = (M - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
    E += d;
    if (Math.abs(d) < 1e-9) break;
  }
  return E;
}

/** Chiron, Kepler from J2000 mean elements. Good to about a degree across late 20th / early 21st century. */
export function chironLon(date) {
  const time = MakeTime(date);
  const d = time.ut;
  const a = 13.670;
  const e = 0.382;
  const n = 0.9856076686 / Math.pow(a, 1.5);
  const M = (89.3 + n * d) * DEG;
  const E = keplerE(((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), e);
  const v = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  const peri = 339.66 * DEG;
  const node = 209.38 * DEG;
  const i = 6.93 * DEG;
  const u = peri + v;
  const x = Math.cos(node) * Math.cos(u) - Math.sin(node) * Math.sin(u) * Math.cos(i);
  const y = Math.sin(node) * Math.cos(u) + Math.cos(node) * Math.sin(u) * Math.cos(i);
  return norm(Math.atan2(y, x) * RAD);
}

export function anglesFrom(date, lat, lonEast) {
  const time = MakeTime(date);
  const gastH = SiderealTime(date);
  const ramc = norm(gastH * 15 + lonEast);
  const eps = e_tilt(time).tobl * DEG;
  const ramcR = ramc * DEG;
  const latR = lat * DEG;
  const mc = norm(Math.atan2(Math.sin(ramcR) * Math.cos(eps), Math.cos(ramcR)) * RAD);
  const num = Math.cos(ramcR);
  const den = -(Math.sin(ramcR) * Math.cos(eps) + Math.tan(latR) * Math.sin(eps));
  const asc = norm(Math.atan2(num, den) * RAD);
  return { ramc, asc, mc, dsc: norm(asc + 180), ic: norm(mc + 180) };
}

export function porphyryHouses(asc, mc) {
  const cusps = new Array(13);
  cusps[1] = asc;
  cusps[10] = mc;
  cusps[7] = norm(asc + 180);
  cusps[4] = norm(mc + 180);
  const q4 = (asc - mc + 360) % 360;
  cusps[11] = norm(mc + q4 / 3);
  cusps[12] = norm(mc + (2 * q4) / 3);
  const q1 = (cusps[4] - asc + 360) % 360;
  cusps[2] = norm(asc + q1 / 3);
  cusps[3] = norm(asc + (2 * q1) / 3);
  const q2 = (cusps[7] - cusps[4] + 360) % 360;
  cusps[5] = norm(cusps[4] + q2 / 3);
  cusps[6] = norm(cusps[4] + (2 * q2) / 3);
  const q3 = (mc - cusps[7] + 360) % 360;
  cusps[8] = norm(cusps[7] + q3 / 3);
  cusps[9] = norm(cusps[7] + (2 * q3) / 3);
  return Array.from({ length: 12 }, (_, i) => {
    const id = i + 1;
    const p = lonParts(cusps[id]);
    return { id, lon: p.lon, sign: p.sign, label: fmtLon(p.lon) };
  });
}

export function equalHouses(asc) {
  return Array.from({ length: 12 }, (_, i) => {
    const lon = norm(asc + i * 30);
    const p = lonParts(lon);
    return { id: i + 1, lon: p.lon, sign: p.sign, label: fmtLon(p.lon) };
  });
}

export function wholeSignHouses(asc) {
  const start = Math.floor(norm(asc) / 30) * 30;
  return equalHouses(start);
}

export const HOUSE_SYSTEMS = [
  { id: "porphyry", label: "Porphyry" },
  { id: "whole", label: "Whole sign" },
  { id: "equal", label: "Equal" },
];

export function housesFor(system, asc, mc) {
  if (system === "whole") return wholeSignHouses(asc);
  if (system === "equal") return equalHouses(asc);
  return porphyryHouses(asc, mc);
}

export function houseSystemLabel(system, timeUnknown) {
  if (timeUnknown) return "Solar (sun on the ascendant). Birth time unknown.";
  if (system === "whole") return "Whole sign houses";
  if (system === "equal") return "Equal houses from the ascendant";
  return "Porphyry (quadrants trisected from ASC and MC)";
}

export function houseOf(lon, houses) {
  for (let i = 0; i < 12; i++) {
    const a = houses[i].lon;
    const b = houses[(i + 1) % 12].lon;
    const span = (b - a + 360) % 360;
    const off = (lon - a + 360) % 360;
    if (off < span) return houses[i].id;
  }
  return 12;
}

export function waitingChart() {
  const houses = equalHouses(0);
  return {
    meta: {
      title: "Natal Atlas",
      kicker: "Natal atlas",
      subject: "Cast a nativity",
      waiting: true,
      birth: {
        date: "",
        dateLabel: "",
        time: "",
        timeLabel: "",
        timezone: "",
        timezoneNote: "",
        place: "",
        lat: null,
        lon: null,
      },
      houseSystem: "",
      privacy: "computed locally in the browser. nothing is uploaded.",
      copyPolicy: "Interpretive copy is original to this atlas.",
    },
    signs: SIGNS.map((s) => ({ ...s })),
    angles: {
      ascendant: { id: "asc", name: "Ascendant", sign: "Aries", deg: 0, min: 0, lon: 0, house: 1, headline: "", body: "" },
      mc: { id: "mc", name: "Midheaven", sign: "Capricorn", deg: 0, min: 0, lon: 270, house: 10, headline: "", body: "" },
      descendant: { id: "dsc", name: "Descendant", lon: 180, sign: "Libra", deg: 0, min: 0, house: 7 },
      ic: { id: "ic", name: "Imum Coeli", lon: 90, sign: "Cancer", deg: 0, min: 0, house: 4 },
    },
    houses,
    planets: [],
    aspects: [],
    patterns: [],
    themes: [],
  };
}

export function planetLongitudes(date) {
  const out = {};
  for (const p of PLANET_META) out[p.id] = geoEclipticLon(p.body, date);
  out.northNode = meanNorthNode(date);
  out.chiron = chironLon(date);
  return out;
}

export function planetMotions(date) {
  const out = {};
  for (const p of PLANET_META) {
    out[p.id] = {
      lon: geoEclipticLon(p.body, date),
      retro: isRetrograde(p.body, date),
    };
  }
  out.northNode = { lon: meanNorthNode(date), retro: true };
  return out;
}
