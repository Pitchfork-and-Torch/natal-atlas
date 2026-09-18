/* Exact-hit engine and chapter-ring for the Now chronograph. */

import { PLANET_META, lonParts, chironLon, meanNorthNode, geoEclipticLon } from "./ephemeris.js?v=1.2.8";
import { Body } from "../vendor/astronomy-engine.js";
import { transitsToNatal } from "./cast.js?v=1.2.8";
import {
  natalPool,
  wrap180,
  chronoWindow,
  scaleById,
  natalUtc,
  progressedInstant,
  bisectZero,
  bodyGetter,
} from "./time.js?v=1.2.8";

const DAY = 86400000;

export const TRANSIT_IDS = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter",
  "saturn", "uranus", "neptune", "pluto", "chiron", "northNode",
];

const GLYPH = Object.fromEntries(PLANET_META.map((p) => [p.id, p.glyph]));
GLYPH.northNode = "☊";
GLYPH.chiron = "⚷";
GLYPH.asc = "AC";
GLYPH.mc = "MC";

const NAME = Object.fromEntries(PLANET_META.map((p) => [p.id, p.name]));
NAME.northNode = "Node";
NAME.chiron = "Chiron";
NAME.asc = "Ascendant";
NAME.mc = "Midheaven";

const ASPECTS = [
  { type: "conjunction", angle: 0, soft: true },
  { type: "sextile", angle: 60, soft: true },
  { type: "square", angle: 90, soft: false },
  { type: "trine", angle: 120, soft: true },
  { type: "opposition", angle: 180, soft: false },
  { type: "quincunx", angle: 150, soft: false },
];

const HARD = new Set(["square", "opposition", "quincunx"]);

function lonOf(id, date) {
  const get = bodyGetter(id);
  if (get) return get(date);
  if (id === "chiron") return chironLon(date);
  if (id === "northNode") return meanNorthNode(date);
  const meta = PLANET_META.find((p) => p.id === id);
  return meta ? geoEclipticLon(meta.body, date) : 0;
}

function sampleTimes(min, max, sampleMs) {
  const out = [];
  const span = Math.max(sampleMs, max.getTime() - min.getTime());
  const n = Math.max(8, Math.min(420, Math.round(span / sampleMs)));
  for (let i = 0; i <= n; i++) out.push(new Date(min.getTime() + (span * i) / n));
  return out;
}

function cacheLons(times) {
  const cache = new Map();
  for (const t of times) {
    const row = {};
    for (const id of TRANSIT_IDS) row[id] = lonOf(id, t);
    cache.set(t.getTime(), row);
  }
  return cache;
}

function speedSign(a, b) {
  return wrap180(b - a) >= 0 ? 1 : -1;
}

export function scanExactHits(chart, window) {
  const natal = natalPool(chart).filter((b) => b && Number.isFinite(b.lon));
  const times = sampleTimes(window.min, window.max, window.scale.sample);
  const cache = cacheLons(times);
  const hits = [];
  const stations = [];

  for (let i = 1; i < times.length; i++) {
    const t0 = times[i - 1];
    const t1 = times[i];
    const a = cache.get(t0.getTime());
    const b = cache.get(t1.getTime());
    for (const id of TRANSIT_IDS) {
      if (id === "sun" || id === "moon" || id === "northNode") continue;
      const s0 = speedSign(a[id], b[id]);
      if (i > 1) {
        const prev = cache.get(times[i - 2].getTime());
        const sPrev = speedSign(prev[id], a[id]);
        if (sPrev !== s0) stations.push({ date: t0, tId: id });
      }
    }
    for (const id of TRANSIT_IDS) {
      for (const n of natal) {
        for (const asp of ASPECTS) {
          if (asp.type === "quincunx") {
            /* keep only if the crossing is truly tight; exact is ~0 */
          }
          const e0 = wrap180(a[id] - n.lon - asp.angle);
          const e1 = wrap180(b[id] - n.lon - asp.angle);
          if (e0 * e1 > 0) continue;
          if (Math.abs(e0) + Math.abs(e1) > 180) continue;
          const when = bisectZero((d) => wrap180(lonOf(id, d) - n.lon - asp.angle), t0, t1);
          const kind = asp.type === "conjunction" && id === n.id ? "return" : "transit";
          hits.push({
            date: when,
            tId: id,
            nId: n.id,
            type: asp.type,
            orb: 0,
            phase: "exact",
            station: false,
            kind,
            soft: asp.soft,
          });
        }
      }
    }
  }

  for (const h of hits) {
    const day0 = h.date.getTime() - DAY / 2;
    const day1 = h.date.getTime() + DAY / 2;
    h.station = stations.some((s) => s.tId === h.tId && s.date.getTime() >= day0 && s.date.getTime() <= day1);
  }

  hits.sort((x, y) => x.date - y.date);
  return { hits, stations };
}

export function decorateHits(hits, current, natalBodies, transits) {
  const nowT = current.getTime();
  const tBy = new Map((transits || []).map((t) => [t.id, t]));
  const nBy = new Map((natalBodies || []).map((n) => [n.id, n]));
  return hits.map((h) => {
    const t = tBy.get(h.tId);
    const n = nBy.get(h.nId);
    let orb = 0;
    let phase = "exact";
    if (t && n) {
      const asp = ASPECTS.find((a) => a.type === h.type);
      const err = Math.abs(wrap180(t.lon - n.lon - (asp ? asp.angle : 0)));
      orb = Math.round(err * 10) / 10;
      if (h.date.getTime() < nowT - 20 * 60 * 1000) phase = "separating";
      else if (h.date.getTime() > nowT + 20 * 60 * 1000) phase = "applying";
      else phase = "exact";
    } else if (h.date.getTime() < nowT) phase = "separating";
    else if (h.date.getTime() > nowT) phase = "applying";
    return { ...h, orb, phase };
  });
}

export function strongestHits(hits, current, limit = 24) {
  const t = current.getTime();
  return hits
    .slice()
    .sort((a, b) => Math.abs(a.date.getTime() - t) - Math.abs(b.date.getTime() - t) || a.date - b.date)
    .slice(0, limit)
    .sort((a, b) => a.orb - b.orb || a.date - b.date);
}

export function jewelKind(hit) {
  if (hit.station) return "station";
  if (HARD.has(hit.type)) return "hard";
  return "soft";
}

export function hitLabel(hit) {
  const t = NAME[hit.tId] || hit.tId;
  const n = NAME[hit.nId] || hit.nId;
  const tg = GLYPH[hit.tId] || "";
  const ng = GLYPH[hit.nId] || "";
  return { t, n, tg, ng, type: hit.type };
}

export function progressedPack(chart, target) {
  const natal = natalUtc(chart);
  const at = progressedInstant(natal, target);
  const longs = {};
  for (const id of TRANSIT_IDS) longs[id] = lonOf(id, at);
  const planets = TRANSIT_IDS.map((id) => {
    const part = lonParts(longs[id]);
    return {
      id,
      name: NAME[id] || id,
      glyph: GLYPH[id] || "",
      lon: part.lon,
      sign: part.sign,
      deg: part.deg,
      min: part.min,
    };
  });
  const natalBodies = natalPool(chart);
  // One ephemeris day earlier on the progressed clock distinguishes applying vs separating.
  const atPrev = new Date(at.getTime() - DAY);
  const prevLongs = {};
  for (const id of TRANSIT_IDS) prevLongs[id] = lonOf(id, atPrev);
  const hits = [];
  for (const p of planets) {
    for (const n of natalBodies) {
      for (const asp of ASPECTS) {
        if (asp.type === "quincunx") continue;
        const signed = wrap180(p.lon - n.lon - asp.angle);
        const err = Math.abs(signed);
        const orbLimit = asp.type === "conjunction" || asp.type === "opposition" || asp.type === "trine" ? 8 : 6;
        if (err > orbLimit) continue;
        let phase = "exact";
        if (err >= 0.15) {
          const signedPrev = wrap180(prevLongs[p.id] - n.lon - asp.angle);
          phase = err < Math.abs(signedPrev) ? "applying" : "separating";
        }
        hits.push({
          date: target,
          tId: p.id,
          nId: n.id,
          type: asp.type,
          orb: Math.round(err * 10) / 10,
          phase,
          station: false,
          kind: "progression",
          soft: asp.soft,
        });
      }
    }
  }
  hits.sort((a, b) => a.orb - b.orb);
  return { at, planets, hits: hits.slice(0, 24) };
}

export function currentSky(chart, date) {
  const pack = transitsToNatal(natalPool(chart), date);
  pack.at = date.toISOString();
  return pack;
}

export function drawChapterRing(canvas, state) {
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 320;
  const h = canvas.clientHeight || 48;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const pad = 18;
  const x0 = pad;
  const x1 = w - pad;
  const y = h * 0.58;
  const { min, max, date, hits } = state;
  const span = Math.max(1, max.getTime() - min.getTime());
  const xAt = (t) => x0 + ((t - min.getTime()) / span) * (x1 - x0);

  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.strokeStyle = "oklch(0.93 0.02 85 / 0.28)";
  ctx.lineWidth = 1;
  ctx.stroke();

  const scale = state.scale || scaleById("year");
  const hour = 3600000;
  const ticks = scale.id === "hour"
    ? [
      { every: 15 * 60 * 1000, len: 5, gold: false },
      { every: hour, len: 10, gold: false },
      { every: 6 * hour, len: 14, gold: true },
    ]
    : [
      { every: scale.step, len: 6, gold: false },
      { every: scale.step * 5, len: 10, gold: false },
      { every: scale.step * 10, len: 14, gold: true },
    ];
  const start = min.getTime();
  const stop = max.getTime();
  for (const tick of ticks) {
    ctx.beginPath();
    const first = Math.ceil(start / tick.every) * tick.every;
    for (let t = first; t <= stop + 1; t += tick.every) {
      const x = xAt(t);
      ctx.moveTo(x, y - tick.len);
      ctx.lineTo(x, y + tick.len * 0.35);
    }
    ctx.strokeStyle = tick.gold ? "oklch(0.78 0.12 80 / 0.72)" : "oklch(0.93 0.02 85 / 0.28)";
    ctx.lineWidth = tick.gold ? 1.2 : 1;
    ctx.stroke();
  }

  for (const hit of hits || []) {
    const x = xAt(hit.date.getTime());
    if (x < x0 - 2 || x > x1 + 2) continue;
    const kind = jewelKind(hit);
    ctx.beginPath();
    ctx.arc(x, y - 1, kind === "station" ? 3.2 : 2.4, 0, Math.PI * 2);
    ctx.fillStyle = kind === "hard"
      ? "oklch(0.68 0.18 45 / 0.95)"
      : kind === "station"
        ? "oklch(0.72 0.03 240 / 0.95)"
        : "oklch(0.78 0.12 80 / 0.95)";
    ctx.fill();
  }

  const cx = xAt(date.getTime());
  ctx.beginPath();
  ctx.moveTo(cx, 6);
  ctx.lineTo(cx, h - 6);
  ctx.strokeStyle = "oklch(0.78 0.12 80 / 0.9)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

export function ringDateAt(canvas, clientX, min, max) {
  const rect = canvas.getBoundingClientRect();
  const pad = 18;
  const x0 = rect.left + pad;
  const x1 = rect.right - pad;
  const u = Math.max(0, Math.min(1, (clientX - x0) / Math.max(1, x1 - x0)));
  return new Date(min.getTime() + u * (max.getTime() - min.getTime()));
}

export { GLYPH, NAME, ASPECTS, HARD };
