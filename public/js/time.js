/* Transit scrub window, returns, secondary progressions. */

import { SearchSunLongitude, Body } from "../vendor/astronomy-engine.js";
import { geoEclipticLon, chironLon, meanNorthNode, PLANET_META } from "./ephemeris.js?v=1.2.8";
import { transitsToNatal, castChart } from "./cast.js?v=1.2.8";

export const DAY = 86400000;
export const HOUR = 3600000;
const YEAR_DAYS = 365.24219;
const WINDOW_MONTHS = 18;

export const SCALES = [
  { id: "hour", label: "Hour", span: 48 * HOUR, step: HOUR, sample: 15 * 60 * 1000 },
  { id: "day", label: "Day", span: 14 * DAY, step: DAY, sample: HOUR },
  { id: "month", label: "Month", span: 62 * DAY, step: DAY, sample: 4 * HOUR },
  { id: "year", label: "Year", span: 366 * DAY, step: DAY, sample: 8 * HOUR },
  { id: "decade", label: "Decade", span: 10 * YEAR_DAYS * DAY, step: 30 * DAY, sample: DAY },
];

export function addMonths(date, n) {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + n);
  return d;
}

export function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function isoDate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function scrubWindow(center = new Date()) {
  const min = addMonths(center, -WINDOW_MONTHS);
  const max = addMonths(center, WINDOW_MONTHS);
  const days = Math.max(1, Math.round((max - min) / DAY));
  return { min, max, days };
}

export function dateFromScrub(min, index) {
  return new Date(min.getTime() + Number(index) * DAY);
}

export function scrubIndex(min, date) {
  return Math.round((date.getTime() - min.getTime()) / DAY);
}

export function natalPool(chart) {
  return (chart.planets || []).concat(
    chart.angles?.ascendant ? [chart.angles.ascendant] : [],
    chart.angles?.mc ? [chart.angles.mc] : [],
  );
}

export function monthMarks(chart, year, month) {
  const focus = natalPool(chart).filter((b) => b.id === "sun" || b.id === "moon" || b.id === "asc");
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const marks = [];
  for (let day = 1; day <= last; day++) {
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const pack = transitsToNatal(focus, date);
    const tight = (pack.hits || []).filter((h) => h.orb <= 1.2);
    if (tight.length) marks.push({ day, hits: tight.slice(0, 3) });
  }
  return marks;
}

export function nextSolarReturnDate(natalSunLon, fromDate = new Date(), natalIsoDate = "") {
  let month = 6;
  let day = 21;
  if (natalIsoDate && /^\d{4}-\d{2}-\d{2}/.test(natalIsoDate)) {
    const p = natalIsoDate.split("-").map(Number);
    month = p[1];
    day = p[2];
  }
  let year = fromDate.getUTCFullYear();
  let guess = new Date(Date.UTC(year, month - 1, Math.min(day, 28)));
  if (guess.getTime() < fromDate.getTime() - 2 * DAY) {
    guess = new Date(Date.UTC(year + 1, month - 1, Math.min(day, 28)));
  }
  const start = new Date(guess.getTime() - 6 * DAY);
  const hit = SearchSunLongitude(natalSunLon, start, 18);
  if (hit && hit.date) return hit.date;
  let best = null;
  let bestErr = 99;
  for (let i = 0; i < 20; i++) {
    const t = new Date(start.getTime() + i * DAY);
    let err = geoEclipticLon(Body.Sun, t) - natalSunLon;
    if (err > 180) err -= 360;
    if (err < -180) err += 360;
    const a = Math.abs(err);
    if (a < bestErr) {
      bestErr = a;
      best = t;
    }
  }
  return best;
}

export function solarReturnChart(chart, fromDate = new Date()) {
  const sun = chart.planets?.find((p) => p.id === "sun");
  const birth = chart.meta?.birth || {};
  if (!sun || !Number.isFinite(birth.lat)) throw new Error("Cast a natal first.");
  const when = nextSolarReturnDate(sun.lon, fromDate, birth.date);
  if (!when) throw new Error("Could not find the next solar return.");
  const year = when.getUTCFullYear();
  return castChart({
    name: `${chart.meta.subject} solar return ${year}`,
    year,
    month: when.getUTCMonth() + 1,
    day: when.getUTCDate(),
    hour: when.getUTCHours(),
    minute: when.getUTCMinutes(),
    timeUnknown: false,
    timeZone: "UTC",
    lat: birth.lat,
    lon: birth.lon,
    place: `${birth.place || "natal place"} (solar return)`,
    houseSystem: chart.meta.houseSystemId || "porphyry",
  });
}

export function wrap180(deg) {
  let x = deg % 360;
  if (x > 180) x -= 360;
  if (x < -180) x += 360;
  return x;
}

export function scaleById(id) {
  return SCALES.find((s) => s.id === id) || SCALES[3];
}

export function chronoWindow(scaleId, center = new Date()) {
  const scale = scaleById(scaleId);
  const mid = center.getTime();
  const min = new Date(mid - scale.span / 2);
  const max = new Date(mid + scale.span / 2);
  return { min, max, scale, center: new Date(mid) };
}

export function stepDate(date, scaleId, dir) {
  const scale = scaleById(scaleId);
  return new Date(date.getTime() + dir * scale.step);
}

export function clampDate(date, min, max) {
  const t = date.getTime();
  if (t < min.getTime()) return new Date(min.getTime());
  if (t > max.getTime()) return new Date(max.getTime());
  return date;
}

export function civilLabel(date) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function clockLabel(date) {
  const h = date.getUTCHours();
  const m = String(date.getUTCMinutes()).padStart(2, "0");
  return `${String(h).padStart(2, "0")}:${m} UTC`;
}

function bodyGetter(id) {
  if (id === "moon") return (d) => geoEclipticLon(Body.Moon, d);
  if (id === "sun") return (d) => geoEclipticLon(Body.Sun, d);
  if (id === "jupiter") return (d) => geoEclipticLon(Body.Jupiter, d);
  if (id === "saturn") return (d) => geoEclipticLon(Body.Saturn, d);
  const meta = PLANET_META.find((p) => p.id === id);
  if (meta) return (d) => geoEclipticLon(meta.body, d);
  if (id === "chiron") return (d) => chironLon(d);
  if (id === "northNode") return (d) => meanNorthNode(d);
  return null;
}

function bisectZero(getErr, t0, t1, n = 22) {
  let a = t0;
  let b = t1;
  let ea = getErr(a);
  let eb = getErr(b);
  for (let i = 0; i < n; i++) {
    const m = new Date((a.getTime() + b.getTime()) / 2);
    const em = getErr(m);
    if (ea * em <= 0) {
      b = m;
      eb = em;
    } else {
      a = m;
      ea = em;
    }
  }
  return Math.abs(ea) <= Math.abs(eb) ? a : b;
}

export function searchLongitude(getLon, target, start, windowDays, samples = 64) {
  const span = windowDays * DAY;
  let prev = null;
  let prevT = null;
  let best = null;
  let bestAbs = 99;
  for (let i = 0; i <= samples; i++) {
    const t = new Date(start.getTime() + (span * i) / samples);
    const err = wrap180(getLon(t) - target);
    const a = Math.abs(err);
    if (a < bestAbs) {
      bestAbs = a;
      best = t;
    }
    if (prev != null && prev * err <= 0 && Math.abs(prev) + Math.abs(err) < 180) {
      const hit = bisectZero((d) => wrap180(getLon(d) - target), prevT, t);
      if (hit.getTime() >= start.getTime() + 2 * DAY) return hit;
    }
    prev = err;
    prevT = t;
  }
  return bestAbs < 1.2 ? best : null;
}

export function nextLunarReturnDate(natalMoonLon, fromDate = new Date()) {
  const get = bodyGetter("moon");
  const start = new Date(fromDate.getTime() + 18 * HOUR);
  return searchLongitude(get, natalMoonLon, start, 32, 96);
}

export function nextJupiterReturnDate(natalLon, fromDate = new Date()) {
  const get = bodyGetter("jupiter");
  const start = new Date(fromDate.getTime() + 90 * DAY);
  return searchLongitude(get, natalLon, start, 13 * 365.25, 80);
}

export function nextSaturnReturnDate(natalLon, fromDate = new Date()) {
  const get = bodyGetter("saturn");
  const start = new Date(fromDate.getTime() + 180 * DAY);
  return searchLongitude(get, natalLon, start, 31 * 365.25, 120);
}

function returnChart(chart, when, kind) {
  const birth = chart.meta?.birth || {};
  if (!when || !Number.isFinite(birth.lat)) throw new Error("Cast a natal first.");
  return castChart({
    name: `${chart.meta.subject} ${kind} return ${when.getUTCFullYear()}`,
    year: when.getUTCFullYear(),
    month: when.getUTCMonth() + 1,
    day: when.getUTCDate(),
    hour: when.getUTCHours(),
    minute: when.getUTCMinutes(),
    timeUnknown: false,
    timeZone: "UTC",
    lat: birth.lat,
    lon: birth.lon,
    place: `${birth.place || "natal place"} (${kind} return)`,
    houseSystem: chart.meta.houseSystemId || "porphyry",
  });
}

export function lunarReturnChart(chart, fromDate = new Date()) {
  const moon = chart.planets?.find((p) => p.id === "moon");
  if (!moon) throw new Error("Cast a natal first.");
  const when = nextLunarReturnDate(moon.lon, fromDate);
  if (!when) throw new Error("Could not find the next lunar return.");
  return returnChart(chart, when, "lunar");
}

export function jupiterReturnChart(chart, fromDate = new Date()) {
  const body = chart.planets?.find((p) => p.id === "jupiter");
  if (!body) throw new Error("Cast a natal first.");
  const when = nextJupiterReturnDate(body.lon, fromDate);
  if (!when) throw new Error("Could not find the next Jupiter return.");
  return returnChart(chart, when, "jupiter");
}

export function saturnReturnChart(chart, fromDate = new Date()) {
  const body = chart.planets?.find((p) => p.id === "saturn");
  if (!body) throw new Error("Cast a natal first.");
  const when = nextSaturnReturnDate(body.lon, fromDate);
  if (!when) throw new Error("Could not find the next Saturn return.");
  return returnChart(chart, when, "saturn");
}

export function natalUtc(chart) {
  const iso = chart?.meta?.utc;
  const d = iso ? new Date(iso) : null;
  return d && Number.isFinite(d.getTime()) ? d : new Date();
}

export function progressedInstant(natalUtcDate, targetUtc) {
  const delta = targetUtc.getTime() - natalUtcDate.getTime();
  return new Date(natalUtcDate.getTime() + delta / YEAR_DAYS);
}

export { bisectZero, bodyGetter };
