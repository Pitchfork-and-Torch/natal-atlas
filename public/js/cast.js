/* Build a chart object from civil birth data. */

import {
  SIGNS,
  PLANET_META,
  zonedCivilToUtc,
  planetLongitudes,
  planetMotions,
  anglesFrom,
  equalHouses,
  housesFor,
  houseSystemLabel,
  houseOf,
  lonParts,
  fmtLon,
  sep,
  norm,
  chironLon,
} from "./ephemeris.js?v=1.2.8";
import {
  bodyHeadline,
  bodyReading,
  aspectNote,
  stelliumCopy,
  tsquareCopy,
  grandTrineCopy,
  kiteCopy,
  yodCopy,
  themeSunrise,
  themeNight,
  themeTwoLights,
  themeVocation,
  themeUnknownTime,
} from "./lexicon.js?v=1.2.8";

export const ASPECT_DEFS = [
  { type: "conjunction", angle: 0, orb: 8 },
  { type: "sextile", angle: 60, orb: 6 },
  { type: "square", angle: 90, orb: 7 },
  { type: "trine", angle: 120, orb: 8 },
  { type: "quincunx", angle: 150, orb: 3 },
  { type: "opposition", angle: 180, orb: 8 },
];

const COLORS = {
  sun: "#E8B14A",
  moon: "#C9D4DC",
  mercury: "#F2D48A",
  venus: "#E27A3A",
  mars: "#D94A2A",
  jupiter: "#C9842A",
  saturn: "#8B7355",
  uranus: "#7EC8D9",
  neptune: "#6B8CAE",
  pluto: "#6E3A4A",
  northNode: "#F0C36A",
  chiron: "#A7B6C2",
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

function dateLabel(y, m, d) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${d} ${months[m - 1]} ${y}`;
}

function timeLabel(h, min) {
  const am = h < 12;
  const hh = h % 12 || 12;
  return `${hh}:${pad2(min)} ${am ? "AM" : "PM"}`;
}

function classifyPair(a, b) {
  const d = sep(a.lon, b.lon);
  const lum = a.id === "sun" || a.id === "moon" || b.id === "sun" || b.id === "moon" || a.id === "asc" || b.id === "asc";
  let best = null;
  for (const def of ASPECT_DEFS) {
    const orb = def.orb + (lum ? 1 : 0);
    const err = Math.abs(d - def.angle);
    if (err <= orb && (!best || err < best.err)) best = { type: def.type, orb: err, angle: def.angle };
  }
  return best;
}

function placeBody(id, name, glyph, lon, houses, kind, extra = {}) {
  const p = lonParts(lon);
  const house = houseOf(p.lon, houses);
  const retro = Boolean(extra.retro);
  return {
    id,
    name,
    glyph,
    sign: p.sign,
    deg: p.deg,
    min: p.min,
    lon: p.lon,
    house,
    kind,
    retro,
    color: COLORS[id] || "#E8B14A",
    headline: bodyHeadline(id, p.sign, house),
    body: bodyReading(id, p.sign, house, extra),
  };
}

function detectAspects(bodies) {
  const aspects = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const hit = classifyPair(bodies[i], bodies[j]);
      if (!hit) continue;
      aspects.push({
        a: bodies[i].id,
        b: bodies[j].id,
        type: hit.type,
        orb: Math.round(hit.orb),
        angle: hit.angle,
        note: aspectNote(bodies[i].name, bodies[j].name, hit.type),
      });
    }
  }
  aspects.sort((x, y) => x.orb - y.orb);
  return aspects;
}

function hasAspect(aspects, a, b, type) {
  return aspects.some(
    (x) => x.type === type && ((x.a === a && x.b === b) || (x.a === b && x.b === a)),
  );
}

function detectPatterns(bodies, aspects) {
  const planets = bodies.filter((b) => b.kind !== "angle");
  const byId = new Map(bodies.map((b) => [b.id, b]));
  const patterns = [];

  const bySign = new Map();
  for (const p of planets) {
    if (p.id === "northNode" || p.id === "chiron") continue;
    if (!bySign.has(p.sign)) bySign.set(p.sign, []);
    bySign.get(p.sign).push(p);
  }
  let si = 0;
  for (const [sign, list] of bySign) {
    if (list.length < 3) continue;
    const names = list.map((b) => b.name);
    const copy = stelliumCopy(sign, names);
    patterns.push({
      id: si === 0 ? "stellium" : `stellium-${sign.toLowerCase()}`,
      name: `${sign} stellium`,
      members: list.map((b) => b.id),
      headline: copy.headline,
      body: copy.body,
    });
    si += 1;
  }

  const ids = planets.map((p) => p.id).concat(bodies.filter((b) => b.id === "asc" || b.id === "mc").map((b) => b.id));
  const opps = aspects.filter((a) => a.type === "opposition");
  for (const opp of opps) {
    const apexes = ids.filter(
      (id) =>
        id !== opp.a
        && id !== opp.b
        && hasAspect(aspects, id, opp.a, "square")
        && hasAspect(aspects, id, opp.b, "square"),
    );
    for (const apex of apexes) {
      const A = byId.get(opp.a);
      const B = byId.get(opp.b);
      const apexBody = byId.get(apex);
      if (!A || !B || !apexBody) continue;
      const names = [A.name, B.name];
      const copy = tsquareCopy(apexBody.name, names);
      patterns.push({
        id: patterns.some((p) => p.id === "t-square") ? `t-square-${apex}` : "t-square",
        name: "T-square",
        members: [opp.a, opp.b, apex],
        headline: copy.headline,
        body: copy.body,
      });
    }
  }

  const trines = aspects.filter((a) => a.type === "trine");
  const triangles = [];
  for (let i = 0; i < trines.length; i++) {
    for (let j = i + 1; j < trines.length; j++) {
      const nodes = new Set([trines[i].a, trines[i].b, trines[j].a, trines[j].b]);
      if (nodes.size !== 3) continue;
      const [x, y, z] = [...nodes];
      if (!hasAspect(aspects, x, y, "trine") || !hasAspect(aspects, y, z, "trine") || !hasAspect(aspects, x, z, "trine")) continue;
      const key = [x, y, z].sort().join("|");
      if (triangles.some((t) => t.key === key)) continue;
      const members = [x, y, z];
      const element = byId.get(x)?.sign
        ? (SIGNS.find((s) => s.name === byId.get(x).sign) || {}).element
        : "fire";
      const copy = grandTrineCopy(element || "mixed", members.map((id) => byId.get(id)?.name).filter(Boolean));
      triangles.push({ key, members, element: element || "mixed", copy });
    }
  }
  triangles.forEach((t, i) => {
    patterns.push({
      id: i === 0 ? "grand-trine" : `grand-trine-${i}`,
      name: "Grand trine",
      members: t.members,
      headline: t.copy.headline,
      body: t.copy.body,
    });
  });

  for (const t of triangles) {
    for (const id of ids) {
      if (t.members.includes(id)) continue;
      const focus = t.members.find((m) => hasAspect(aspects, id, m, "opposition"));
      if (!focus) continue;
      const others = t.members.filter((m) => m !== focus);
      if (others.every((m) => hasAspect(aspects, id, m, "sextile"))) {
        const kiteBody = byId.get(id);
        if (!kiteBody) continue;
        const copy = kiteCopy(kiteBody.name);
        patterns.push({
          id: patterns.some((p) => p.id === "kite") ? `kite-${id}` : "kite",
          name: "Kite",
          members: [...t.members, id],
          headline: copy.headline,
          body: copy.body,
        });
      }
    }
  }

  const qx = aspects.filter((a) => a.type === "quincunx");
  for (let i = 0; i < qx.length; i++) {
    for (let j = i + 1; j < qx.length; j++) {
      const nodes = [qx[i].a, qx[i].b, qx[j].a, qx[j].b];
      const counts = {};
      for (const n of nodes) counts[n] = (counts[n] || 0) + 1;
      const apex = Object.keys(counts).find((k) => counts[k] === 2);
      if (!apex) continue;
      const feet = [...new Set(nodes.filter((n) => n !== apex))];
      if (feet.length !== 2) continue;
      if (!hasAspect(aspects, feet[0], feet[1], "sextile")) continue;
      const yodBody = byId.get(apex);
      if (!yodBody) continue;
      const copy = yodCopy(yodBody.name);
      patterns.push({
        id: patterns.some((p) => p.id === "yod") ? `yod-${apex}` : "yod",
        name: "Yod",
        members: [apex, feet[0], feet[1]],
        headline: copy.headline,
        body: copy.body,
      });
    }
  }

  const seen = new Set();
  const unique = [];
  for (const p of patterns) {
    const key = p.name + ":" + p.members.slice().sort().join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    if ((p.name === "Grand trine" || p.name === "T-square" || p.name === "Kite" || p.name === "Yod") && unique.some((u) => u.name === p.name)) continue;
    unique.push(p);
  }
  return unique.slice(0, 6);
}

function themesFor(sun, moon, asc, mc, timeUnknown) {
  const themes = [];
  if (timeUnknown) themes.push(themeUnknownTime());
  else if (sep(sun.lon, asc.lon) < 18) themes.push(themeSunrise(sun.sign));
  else {
    const dist = (sun.lon - asc.lon + 360) % 360;
    if (dist > 90 && dist < 270) themes.push(themeNight(sun.sign));
    else themes.push(themeSunrise(sun.sign));
  }
  themes.push(themeTwoLights(sun.sign, moon.sign));
  if (mc) themes.push(themeVocation(mc.sign));
  return themes;
}

export function synastryHits(inner, outer) {
  const pool = (chart) =>
    (chart.planets || []).concat(
      chart.angles?.ascendant ? [chart.angles.ascendant] : [],
      chart.angles?.mc ? [chart.angles.mc] : [],
    ).filter((b) => b && Number.isFinite(b.lon));
  const a = pool(inner);
  const b = pool(outer);
  const hits = [];
  for (const A of a) {
    for (const B of b) {
      const hit = classifyPair(A, B);
      if (!hit || hit.type === "quincunx") continue;
      hits.push({
        a: A.id,
        b: B.id,
        type: hit.type,
        orb: Math.round(hit.orb * 10) / 10,
        hard: hit.type === "square" || hit.type === "opposition",
        note: `Natal ${A.name} ${hit.type} overlay ${B.name}.`,
      });
    }
  }
  hits.sort((x, y) => x.orb - y.orb);
  return hits.slice(0, 36);
}

export function transitsToNatal(natalBodies, date) {
  const longs = planetLongitudes(date) || {};
  if (!Number.isFinite(longs.chiron)) {
    try { longs.chiron = chironLon(date); } catch { /* skip */ }
  }
  const transits = [];
  for (const p of PLANET_META) {
    const lon = longs[p.id];
    if (!Number.isFinite(lon)) continue;
    const part = lonParts(lon);
    transits.push({
      id: p.id,
      name: p.name,
      glyph: p.glyph,
      lon: part.lon,
      sign: part.sign,
      deg: part.deg,
      min: part.min,
    });
  }
  const extras = [
    { id: "northNode", name: "North Node", glyph: "☊", lon: longs.northNode },
    { id: "chiron", name: "Chiron", glyph: "⚷", lon: longs.chiron },
  ];
  for (const p of extras) {
    if (!Number.isFinite(p.lon)) continue;
    const part = lonParts(p.lon);
    transits.push({ ...p, lon: part.lon, sign: part.sign, deg: part.deg, min: part.min });
  }
  const hits = [];
  for (const t of transits) {
    for (const n of natalBodies) {
      if (!n || !Number.isFinite(n.lon)) continue;
      const hit = classifyPair({ id: t.id, lon: t.lon }, n);
      if (!hit) continue;
      if (hit.type === "quincunx" && hit.orb > 2) continue;
      hits.push({
        transit: t.id,
        natal: n.id,
        type: hit.type,
        orb: Math.round(hit.orb * 10) / 10,
        note: `Transiting ${t.name} ${hit.type} natal ${n.name}.`,
      });
    }
  }
  hits.sort((a, b) => a.orb - b.orb);
  return { transits, hits: hits.slice(0, 24) };
}

export function castChart(input) {
  const y = Number(input.year);
  const month = Number(input.month);
  const day = Number(input.day);
  const hour = input.timeUnknown ? 12 : Number(input.hour);
  const minute = input.timeUnknown ? 0 : Number(input.minute);
  const tz = input.timeZone || "UTC";
  const lat = Number(input.lat);
  const lon = Number(input.lon);
  const date = zonedCivilToUtc(y, month, day, hour, minute, tz);
  const motions = planetMotions(date);
  const timeUnknown = Boolean(input.timeUnknown);
  const system = timeUnknown ? "equal" : (input.houseSystem || "porphyry");
  let angles;
  let houses;
  if (timeUnknown) {
    const sunLon = motions.sun.lon;
    angles = { asc: sunLon, mc: norm(sunLon + 90), dsc: norm(sunLon + 180), ic: norm(sunLon + 270) };
    houses = equalHouses(sunLon);
  } else {
    angles = anglesFrom(date, lat, lon);
    houses = housesFor(system, angles.asc, angles.mc);
  }
  const houseSystem = houseSystemLabel(system, timeUnknown);

  const planets = PLANET_META.map((p) =>
    placeBody(p.id, p.name, p.glyph, motions[p.id].lon, houses, p.kind, {
      timeUnknown,
      retro: motions[p.id].retro,
    }),
  );
  planets.push(placeBody("northNode", "North Node", "☊", motions.northNode.lon, houses, "point", {
    timeUnknown,
    retro: true,
  }));

  const angleBodies = [
    placeBody("asc", "Ascendant", "AC", angles.asc, houses, "angle", { timeUnknown }),
    placeBody("mc", "Midheaven", "MC", angles.mc, houses, "angle", { timeUnknown }),
  ];
  angleBodies[0].id = "asc";
  angleBodies[1].id = "mc";

  const aspectPool = planets.concat(angleBodies);
  const aspects = detectAspects(aspectPool).filter((a) => a.type !== "quincunx" || a.orb <= 2);
  const natalAspects = aspects.filter((a) => a.type !== "quincunx");
  const patterns = detectPatterns(aspectPool, aspects);

  const sun = planets.find((p) => p.id === "sun");
  const moon = planets.find((p) => p.id === "moon");
  const themes = themesFor(sun, moon, angleBodies[0], angleBodies[1], timeUnknown);

  const subject = String(input.name || "Untitled").trim() || "Untitled";
  const place = input.place || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;

  const chart = {
    meta: {
      title: subject,
      kicker: "Natal atlas",
      subject,
      birth: {
        date: `${y}-${pad2(month)}-${pad2(day)}`,
        dateLabel: dateLabel(y, month, day),
        time: timeUnknown ? "" : `${pad2(hour)}:${pad2(minute)}`,
        timeLabel: timeUnknown ? "Time unknown" : timeLabel(hour, minute),
        timezone: tz,
        timezoneNote: timeUnknown ? "solar chart" : tz,
        place,
        lat,
        lon,
      },
      houseSystem,
      houseSystemId: system,
      privacy: "computed locally in the browser. nothing is uploaded.",
      copyPolicy: "Interpretive copy is original to this atlas.",
      computed: true,
      timeUnknown,
      utc: date.toISOString(),
    },
    signs: SIGNS.map((s) => ({ ...s })),
    angles: {
      ascendant: { ...angleBodies[0], id: "asc" },
      mc: { ...angleBodies[1], id: "mc" },
      descendant: { id: "dsc", name: "Descendant", lon: angles.dsc, ...lonParts(angles.dsc), house: 7 },
      ic: { id: "ic", name: "Imum Coeli", lon: angles.ic, ...lonParts(angles.ic), house: 4 },
    },
    houses,
    planets,
    aspects: natalAspects,
    patterns,
    themes,
  };

  const now = new Date();
  try {
    chart.now = transitsToNatal(aspectPool, now);
    chart.now.at = now.toISOString();
  } catch (err) {
    console.warn(err);
    chart.now = { transits: [], hits: [], at: now.toISOString() };
  }
  return chart;
}

export function rehouse(chart, system) {
  if (!chart || chart.meta?.waiting) return chart;
  const timeUnknown = Boolean(chart.meta.timeUnknown);
  const id = timeUnknown ? "equal" : system || "porphyry";
  const asc = chart.angles.ascendant.lon;
  const mc = chart.angles.mc.lon;
  const sun = chart.planets.find((p) => p.id === "sun");
  const houses = timeUnknown && sun
    ? equalHouses(sun.lon)
    : housesFor(id, asc, mc);
  chart.houses = houses;
  chart.meta.houseSystemId = id;
  chart.meta.houseSystem = houseSystemLabel(id, timeUnknown);
  const extraBase = { timeUnknown };
  for (const p of chart.planets) {
    p.house = houseOf(p.lon, houses);
    p.headline = bodyHeadline(p.id, p.sign, p.house);
    p.body = bodyReading(p.id, p.sign, p.house, { ...extraBase, retro: p.retro });
  }
  for (const key of ["ascendant", "mc"]) {
    const a = chart.angles[key];
    if (!a) continue;
    a.house = houseOf(a.lon, houses);
    a.headline = bodyHeadline(a.id, a.sign, a.house);
    a.body = bodyReading(a.id, a.sign, a.house, extraBase);
  }
  return chart;
}

export function parseBirthForm(form) {
  const data = new FormData(form);
  const timeUnknown = data.get("timeUnknown") === "on";
  return {
    name: String(data.get("name") || "").trim(),
    year: Number(data.get("year")),
    month: Number(data.get("month")),
    day: Number(data.get("day")),
    hour: Number(data.get("hour") || 12),
    minute: Number(data.get("minute") || 0),
    timeUnknown,
    timeZone: String(data.get("timeZone") || "UTC"),
    lat: Number(data.get("lat")),
    lon: Number(data.get("lon")),
    place: String(data.get("place") || "").trim(),
    houseSystem: String(data.get("houseSystem") || "porphyry"),
  };
}
