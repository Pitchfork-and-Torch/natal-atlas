/* boot.js - empty wheel until a chart is cast. */

import { NatalWheel, cssTint, clusterLegendMarks } from "./wheel.js?v=1.2.8";
import { buildModel, createAtlas, el, fmtPos, fmtPosHouse, fmtDelta, fmtCoord, soloLabel } from "./atlas.js?v=1.2.8";
import { castChart, parseBirthForm, rehouse, synastryHits } from "./cast.js?v=1.2.8";
import { searchCities, ensureCities, findCityByTz, TIMEZONES } from "./cities.js?v=1.2.8";
import { waitingChart } from "./ephemeris.js?v=1.2.8";
import { listCharts, saveChart, getChart, removeChart, exportVault, importVault } from "./vault.js?v=1.2.8";
import {
  natalPool,
  isoDate,
  nextSolarReturnDate,
  nextLunarReturnDate,
  nextJupiterReturnDate,
  nextSaturnReturnDate,
  chronoWindow,
  scaleById,
  stepDate,
  civilLabel,
  clockLabel,
  lunarReturnChart,
  jupiterReturnChart,
  saturnReturnChart,
  solarReturnChart,
} from "./time.js?v=1.2.8";
import {
  scanExactHits,
  decorateHits,
  strongestHits,
  currentSky,
  progressedPack,
  drawChapterRing,
  ringDateAt,
  hitLabel,
  jewelKind,
} from "./chronograph.js?v=1.2.8";
import { chronographLede } from "./lexicon.js?v=1.2.8";
import { downloadPlate, parseBirthHash, birthHash, chartToHashInput } from "./plate.js?v=1.2.8";

document.documentElement.classList.add("js");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function grab() {
  const $ = (id) => document.getElementById(id);
  return {
    nav: $("nav"),
    canvas: $("wheel"),
    stage: $("stage"),
    targets: $("targets"),
    tip: $("tip"),
    birth: $("birth"),
    status: $("status"),
    soloButtons: $("solo-buttons"),
    dock: $("dock"),
    dockBody: $("dock-body"),
    dockClose: $("dock-close"),
    announce: $("announce"),
    facts: $("facts"),
    stripMarks: $("strip-marks"),
    stripTicks: $("strip-ticks"),
    stripGlow: $("strip-glow"),
    rail: $("rail"),
    patternList: $("pattern-list"),
    transitList: $("transit-list"),
    transitsLede: $("transits-lede"),
    stripScale: $("strip-scale"),
    railScale: $("rail-scale"),
    stelliumChapter: $("stellium"),
    cast: $("cast"),
    castForm: $("cast-form"),
    openCast: $("open-cast"),
    openCastMenu: $("open-cast-menu"),
    closeCast: $("close-cast"),
    place: $("cast-place"),
    placeList: $("place-list"),
    coords: $("cast-coords"),
    error: $("cast-error"),
    demos: $("cast-demos"),
    unknown: $("cast-unknown"),
    nowBtn: $("cast-now"),
    geoBtn: $("cast-geo"),
    latVis: $("cast-lat-vis"),
    lonVis: $("cast-lon-vis"),
    tzVis: $("cast-tz-vis"),
    houseSwitch: $("house-switch"),
    vault: $("vault"),
    vaultList: $("vault-list"),
    openVault: $("open-vault"),
    closeVault: $("close-vault"),
    vaultSave: $("vault-save"),
    vaultExport: $("vault-export"),
    vaultImport: $("vault-import"),
    transitDate: $("transit-date"),
    transitRange: $("transit-range"),
    transitNow: $("transit-now"),
    solarReturn: $("solar-return"),
    lunarReturn: $("lunar-return"),
    jupiterReturn: $("jupiter-return"),
    saturnReturn: $("saturn-return"),
    transitsTitle: $("transits-title"),
    overlayChip: $("overlay-chip"),
    overlayNow: $("overlay-now"),
    overlayClear: $("overlay-clear"),
    chronoHero: $("chrono-hero"),
    chronoRing: $("chrono-ring"),
    chronoScales: $("chrono-scales"),
    chronoDate: $("chrono-date"),
    chronoMinus: $("chrono-minus"),
    chronoPlus: $("chrono-plus"),
    chronoPlay: $("chrono-play"),
    ringMode: $("ring-mode"),
    heroTools: $("hero-tools"),
    plateBtn: $("plate-btn"),
    dockPlate: $("dock-plate"),
    chronoHitLive: $("chrono-hit-live"),
    elementDiamond: $("element-diamond"),
    plateVideo: $("plate-video"),
  };
}

function clearStoredBirth() {
  try { localStorage.removeItem("natal-atlas-last"); } catch {}
}

function fontsReady() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  const wanted = [
    '600 16px "Clash Display"',
    '700 16px "Clash Display"',
    "400 16px Satoshi",
    "500 16px Satoshi",
  ];
  const timeout = new Promise((resolve) => window.setTimeout(resolve, 1500));
  return Promise.race([Promise.all(wanted.map((f) => document.fonts.load(f))).catch(() => {}), timeout]);
}

/* ---------------------------------------------------------------- copy */

function shortPlace(place) {
  return String(place || "").split(", ").slice(0, 2).join(", ");
}

function shortZone(note) {
  return String(note || "").split(" on ")[0];
}

function bindSlots(chart, model) {
  const birth = chart.meta.birth;
  const heroSub = chart.meta.waiting
    ? ""
    : [chart.meta.subject, birth.dateLabel, birth.timeLabel, shortPlace(birth.place)].filter(Boolean).join(". ");

  const resolve = (path) => {
    const [root, id, field] = path.split(".");
    if (root === "meta") return chart.meta[id];
    if (root === "hero" && id === "sub") return heroSub;
    if (root === "theme") return model.themeById.get(id)?.[field];
    if (root === "pattern") return model.patternById.get(id)?.[field];
    if (root === "body") {
      const b = model.byId.get(id);
      if (!b) return "";
      return field === "pos" ? fmtPosHouse(b) : b[field];
    }
    return undefined;
  };

  for (const node of document.querySelectorAll("[data-slot]")) {
    const value = resolve(node.dataset.slot);
    if (value != null) node.textContent = String(value);
  }
  document.title = chart.meta.waiting ? "Natal Atlas" : chart.meta.title;
  const ident = (model.themes || []).find((t) => t.id === "sunrise" || t.id === "night" || t.id === "unknown-time") || model.themes[0];
  const it = document.getElementById("identity-title");
  const il = document.getElementById("identity-lede");
  if (ident && it) it.textContent = ident.title;
  if (ident && il) il.textContent = ident.body;
}

function fillBirth(chart, dom) {
  const b = chart.meta.birth || {};
  if (chart.meta.waiting || !b.dateLabel) {
    dom.birth.replaceChildren();
    return;
  }
  const rows = [
    ["Date", b.dateLabel],
    ["Time", `${b.timeLabel} ${shortZone(b.timezoneNote)}`],
    ["Place", shortPlace(b.place)],
    ["Coordinates", Number.isFinite(b.lat) ? fmtCoord(b.lat, b.lon) : ""],
  ].filter(([, v]) => v);
  dom.birth.replaceChildren(...rows.map(([k, v]) => el("div", {}, el("dt", { text: k }), el("dd", { text: v }))));
}

function fillFacts(chart, dom) {
  const b = chart.meta.birth || {};
  if (chart.meta.waiting || !b.dateLabel) {
    dom.facts.replaceChildren();
    return;
  }
  const rows = [
    ["Date", b.dateLabel],
    ["Time", `${b.timeLabel}${b.timezoneNote ? ", " + b.timezoneNote : ""}`],
    ["Place", b.place],
    ["Coordinates", Number.isFinite(b.lat) ? fmtCoord(b.lat, b.lon) : ""],
    ["Houses", chart.meta.houseSystem],
  ].filter(([, v]) => v);
  dom.facts.replaceChildren(...rows.flatMap(([k, v]) => [el("dt", { text: k }), el("dd", { text: v })]));
}

function fillHorizon(model) {
  const sun = model.byId.get("sun");
  const asc = model.byId.get("asc");
  if (!sun || !asc) return;
  const delta = ((sun.lon - asc.lon) % 360 + 360) % 360;
  const horizonY = 140;
  const cy = Math.min(228, horizonY + delta * 4);
  const sunNode = document.getElementById("horizon-sun");
  const glowNode = document.getElementById("horizon-glow");
  const ascNode = document.getElementById("horizon-asc");
  const cap = document.getElementById("horizon-cap");
  if (sunNode) sunNode.setAttribute("cy", String(cy));
  if (glowNode) glowNode.setAttribute("cy", String(cy));
  if (ascNode) ascNode.textContent = `AC ${fmtPos(asc).toUpperCase()}`;
  const below = delta < 180;
  if (cap) {
    cap.textContent = below
      ? `Sun ${fmtPosHouse(sun)}. ${fmtDelta(delta)} past the ascendant (${fmtPos(asc)}), still under the eastern horizon.`
      : `Sun ${fmtPosHouse(sun)}. ${fmtDelta(360 - delta)} before the next rising, above the horizon.`;
  }
}

function markLabel(body) {
  const glyph = el("span", { class: "glyph" + (body.isAngle ? " is-text" : ""), "aria-hidden": "true", text: body.isAngle ? body.short : body.glyph });
  const name = el("span", { class: "name", text: body.name });
  const deg = el("span", { class: "deg mono", text: body.degLabel });
  return el("span", { class: "mark-label" }, glyph, name, deg);
}

function showClusterNav(on) {
  document.body.classList.toggle("has-cluster", Boolean(on));
  document.querySelectorAll('a[href="#stellium"]').forEach((a) => {
    a.hidden = !on;
  });
}

function fillStrip(model, dom) {
  const pattern = model.patterns.find((p) => p.id === "stellium" || String(p.name || "").toLowerCase().includes("stellium"));
  const chapter = dom.stelliumChapter;
  if (!pattern) {
    if (chapter) chapter.hidden = true;
    showClusterNav(false);
    return;
  }
  if (chapter) chapter.hidden = false;
  showClusterNav(true);
  const first = model.byId.get(pattern.members[0]);
  const sign = model.signs.find((s) => s.name === first?.sign);
  if (!sign) {
    if (chapter) chapter.hidden = true;
    showClusterNav(false);
    return;
  }
  if (dom.stripScale) {
    dom.stripScale.replaceChildren(
      el("span", { text: `0\u00B0 ${sign.name}` }),
      el("span", { text: "10\u00B0" }),
      el("span", { text: "20\u00B0" }),
      el("span", { text: "30\u00B0" }),
    );
  }
  const members = pattern.members
    .map((id) => model.byId.get(id))
    .filter(Boolean)
    .sort((a, b) => a.lon - b.lon);

  const ticks = [];
  for (let d = 0; d <= 30; d += 1) {
    ticks.push(el("span", { class: d % 5 === 0 ? "is-major" : "", style: `--x: ${((d / 30) * 100).toFixed(2)}%` }));
  }
  dom.stripTicks.replaceChildren(...ticks);

  const legend = clusterLegendMarks(members.map((m) => m.lon), sign.start);
  dom.stripGlow.style.setProperty("--from", `${legend.from.toFixed(1)}%`);
  dom.stripGlow.style.setProperty("--to", `${legend.to.toFixed(1)}%`);
  const strip = document.getElementById("strip");
  if (strip) {
    strip.setAttribute(
      "aria-label",
      `${sign.name} cluster: ${members.map((m) => `${m.name} ${m.degLabel}`).join(", ")}`,
    );
  }

  dom.stripMarks.replaceChildren(
    ...members.map((m, i) =>
      el("button", {
        type: "button",
        class: "mark",
        dataset: { select: m.id, side: i % 2 === 0 ? "up" : "down" },
        style: `--x: ${legend.xs[i].toFixed(2)}%; --tint: ${cssTint(m.id)}`,
        "aria-label": `${m.name}, ${fmtPos(m)}`,
      }, el("span", { class: "mark-dot", "aria-hidden": "true" }), markLabel(m)),
    ),
  );
}

function fillRail(model, dom) {
  const mc = model.byId.get("mc");
  const sign = model.signs.find((s) => s.name === mc?.sign);
  if (!sign) return;
  if (dom.railScale) {
    dom.railScale.replaceChildren(
      el("span", { text: "30\u00B0" }),
      el("span", { text: sign.name }),
      el("span", { text: "0\u00B0" }),
    );
  }
  const ids = ["jupiter", "mc", "northNode", "sun", "saturn"];
  const marks = ids
    .map((id) => model.byId.get(id))
    .filter((b) => b && b.sign === sign.name)
    .map((b) => {
      const y = (1 - (b.lon - sign.start) / 30) * 100;
      return el("button", {
        type: "button",
        class: "rail-mark",
        dataset: { select: b.id },
        style: `--y: ${y.toFixed(2)}%; --tint: ${cssTint(b.id)}`,
        "aria-label": `${b.name}, ${fmtPos(b)}`,
      },
        el("span", { class: "mark-dot", "aria-hidden": "true" }),
        el("span", { class: "glyph" + (b.isAngle ? " is-text" : ""), "aria-hidden": "true", text: b.isAngle ? b.short : b.glyph }),
        el("span", { class: "name", text: b.name }),
        el("span", { class: "mono", text: b.degLabel }),
      );
    });
  dom.rail.replaceChildren(...marks);
}

function fillPatterns(model, dom) {
  const minis = [];
  const rows = model.patterns.map((p) => {
    const canvas = el("canvas", {
      role: "img",
      "aria-label": `${p.name} geometry: ${p.members.map((id) => model.byId.get(id)?.name).filter(Boolean).join(", ")}`,
    });
    const fig = el("div", { class: "pattern-fig" }, canvas);
    minis.push({ canvas, solo: p.id });
    return el("li", { class: "pattern-row" },
      fig,
      el("div", { class: "pattern-copy" },
        el("p", { class: "pattern-index mono" }, el("b", { text: `0${p.key}` }), ` / ${soloLabel(p)}`),
        el("h3", { class: "pattern-name", text: p.name }),
        p.headline ? el("p", { class: "pattern-head", text: p.headline }) : null,
        p.body ? el("p", { class: "pattern-body", text: p.body }) : null,
        el("p", { class: "pattern-members mono", text: p.members.map((id) => model.byId.get(id)?.name).filter(Boolean).join(", ") }),
        el("button", { type: "button", class: "btn", dataset: { soloJump: p.id } }, "Solo on the wheel ", el("kbd", { text: String(p.key) })),
      ),
    );
  });
  if (!rows.length) {
    const lede = document.getElementById("patterns-lede");
    if (lede) lede.textContent = "No major stellium, T-square, grand trine, kite, or yod in the orbs used here. The wheel still holds the aspects.";
    dom.patternList.replaceChildren();
    return [];
  }
  const lede = document.getElementById("patterns-lede");
  if (lede) lede.textContent = "Each figure can be soloed on the hero wheel. Everything outside it dims.";
  dom.patternList.replaceChildren(...rows);
  return minis.map(({ canvas, solo }) => new NatalWheel(canvas, model, { mini: true, solo, reducedMotion: true }));
}

function chronoState() {
  if (!session.chrono) {
    session.chrono = {
      scale: "year",
      date: new Date(),
      window: chronoWindow("year"),
      playing: false,
      hits: [],
      ringMode: "now",
    };
  }
  return session.chrono;
}

function fillChronoScales(dom) {
  if (!dom.chronoScales) return;
  const c = chronoState();
  const { SCALES } = waitScales();
  dom.chronoScales.replaceChildren(
    ...SCALES.map((s) =>
      el("button", {
        type: "button",
        class: "btn btn-ghost btn-small",
        "aria-pressed": String(s.id === c.scale),
        onclick: () => setScale(s.id, dom),
      }, s.label),
    ),
  );
}

function waitScales() {
  return { SCALES: ["hour", "day", "month", "year", "decade"].map((id) => scaleById(id)) };
}

function fillElements(model, dom) {
  const host = dom.elementDiamond;
  if (!host) return;
  const t = model.tally?.elements || { fire: 0, earth: 0, air: 0, water: 0 };
  const max = Math.max(1, t.fire, t.earth, t.air, t.water);
  const o = (n) => (0.16 + 0.84 * (n / max)).toFixed(2);
  host.innerHTML = `<svg viewBox="0 0 200 200" role="img" aria-label="Fire ${t.fire}, earth ${t.earth}, air ${t.air}, water ${t.water}">
    <polygon points="100,20 100,100 180,100" fill="oklch(0.78 0.12 80 / ${o(t.fire)})"></polygon>
    <polygon points="180,100 100,100 100,180" fill="oklch(0.72 0.03 240 / ${o(t.air)})"></polygon>
    <polygon points="100,180 100,100 20,100" fill="oklch(0.45 0.11 22 / ${o(t.water)})"></polygon>
    <polygon points="20,100 100,100 100,20" fill="oklch(0.72 0.03 80 / ${o(t.earth)})"></polygon>
    <text x="100" y="16" text-anchor="middle" fill="oklch(0.93 0.02 85 / 0.7)" font-size="11" letter-spacing="1">FIRE ${t.fire}</text>
    <text x="188" y="104" text-anchor="start" fill="oklch(0.93 0.02 85 / 0.7)" font-size="11" letter-spacing="1">AIR ${t.air}</text>
    <text x="100" y="196" text-anchor="middle" fill="oklch(0.93 0.02 85 / 0.7)" font-size="11" letter-spacing="1">WATER ${t.water}</text>
    <text x="12" y="104" text-anchor="end" fill="oklch(0.93 0.02 85 / 0.7)" font-size="11" letter-spacing="1">EARTH ${t.earth}</text>
  </svg>`;
}

function syncOverlayChip(dom, chart) {
  const other = chart?.other;
  const waiting = Boolean(chart?.meta?.waiting);
  syncRingMode(dom);
  if (!dom.overlayChip) return;
  if (!other || chronoState().ringMode !== "vault") {
    dom.overlayChip.hidden = true;
    return;
  }
  dom.overlayChip.hidden = waiting;
  dom.overlayChip.textContent = `Vault ring: ${other.meta?.subject || "overlay"}`;
}

function setOverlay(other, dom) {
  if (!session.chart || session.chart.meta.waiting) return;
  session.chart.other = other;
  session.vaultOther = other;
  session.chart.synastry = synastryHits(session.chart, other);
  chronoState().ringMode = "vault";
  session.chart.ringMode = "vault";
  paint(session.chart, dom);
}

function clearOverlay(dom) {
  if (!session.chart) return;
  delete session.chart.other;
  delete session.chart.synastry;
  chronoState().ringMode = "now";
  session.chart.ringMode = "now";
  paint(session.chart, dom);
}

function fillTransits(model, dom) {
  const c = chronoState();
  const when = c.date;
  const label = `${civilLabel(when)} · ${clockLabel(when)}`;
  if (dom.transitsLede) dom.transitsLede.textContent = chronographLede(civilLabel(when));
  if (dom.transitsTitle) dom.transitsTitle.textContent = "Chronograph";
  if (dom.chronoDate) dom.chronoDate.textContent = `Sky for ${label}`;
  if (dom.transitDate) dom.transitDate.value = isoDate(when);
  const natal = natalPool(session.chart || { planets: model.bodies });
  const decorated = decorateHits(c.hits, when, natal, model.now?.transits);
  const list = strongestHits(decorated, when, 24);
  if (c.ringMode === "progressed" && model.progressed?.hits?.length) {
    list.unshift(...model.progressed.hits.slice(0, 8).map((h) => ({ ...h, kind: "progression" })));
  }
  const rows = list.slice(0, 24).map((h) => {
    const names = hitLabel(h);
    const jewel = jewelKind(h);
    return el("li", { class: "transit-row" + (jewel === "hard" ? " is-hard" : "") },
      el("button", {
        type: "button",
        class: "asp-btn",
        style: "width:100%; text-align:left",
        onclick: () => {
          applyTransitDate(h.date, dom, { fromHit: true });
          session.atlas?.selectHit?.(h);
          if (dom.chronoHitLive) {
            dom.chronoHitLive.textContent = `${names.tg} ${names.type} ${names.ng}, ${h.phase || "exact"}`;
          }
        },
      },
        el("span", { class: "mono", text: civilLabel(h.date) }),
        el("strong", { text: ` ${names.tg} ${names.ng}` }),
        el("span", { text: ` ${h.type}` }),
        el("span", { class: "mono", text: ` ${h.orb}\u00B0 ${h.phase || "exact"}${h.station ? " station" : ""}` }),
      ),
      h.kind === "return"
        ? el("button", {
          type: "button",
          class: "btn btn-ghost btn-small",
          onclick: () => openReturnAsPlate(h, dom),
        }, "Open as plate")
        : null,
    );
  });
  if (!rows.length) {
    dom.transitList.replaceChildren(el("li", { class: "transit-empty", text: "No exact hits in this window. Wind the ring." }));
  } else {
    dom.transitList.replaceChildren(...rows);
  }
  paintChronoRing(dom);
  fillChronoScales(dom);
  syncRingMode(dom);
}

/* ------------------------------------------------------------- chrome */

function wireNav(dom) {
  const update = () => dom.nav.classList.toggle("is-scrolled", window.scrollY > 24);
  window.addEventListener("scroll", update, { passive: true });
  update();
  const menu = dom.nav.querySelector(".nav-menu");
  if (menu) {
    menu.querySelector(".nav-menu-list")?.addEventListener("click", (e) => {
      if (e.target.closest("a, button")) menu.open = false;
    });
  }
}

function wireReveals() {
  const nodes = document.querySelectorAll(".reveal");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    nodes.forEach((n) => n.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
  );
  nodes.forEach((n) => io.observe(n));
}

function fail(dom, err) {
  console.error(err);
  dom.status.textContent = "The atlas could not start. Enable JavaScript and reload.";
  document.body.classList.remove("is-loading");
}

/* ----------------------------------------------------------------- main */

let session = { atlas: null, minis: [], chart: null, model: null, time: null, chrono: null };
let transitTimer = 0;
let playTimer = 0;
let holdTimer = 0;

function rescanHits() {
  const c = chronoState();
  c.window = chronoWindow(c.scale, c.date);
  if (!session.chart || session.chart.meta.waiting) {
    c.hits = [];
    return;
  }
  try {
    c.hits = scanExactHits(session.chart, c.window).hits;
  } catch {
    c.hits = [];
  }
}

function paintChronoRing(dom) {
  if (!dom.chronoRing) return;
  const c = chronoState();
  drawChapterRing(dom.chronoRing, {
    min: c.window.min,
    max: c.window.max,
    date: c.date,
    hits: c.hits,
    scale: scaleById(c.scale),
  });
}

function applyTransitDate(date, dom, opts = {}) {
  if (!session.chart || session.chart.meta.waiting) return;
  const c = chronoState();
  const snap = reducedMotion || opts.snap;
  c.date = new Date(date.getTime());
  const win = c.window;
  if (c.date < win.min || c.date > win.max) {
    c.window = chronoWindow(c.scale, c.date);
    if (!opts.fromHit) rescanHits();
  }
  const pack = currentSky(session.chart, c.date);
  session.chart.now = pack;
  const prog = progressedPack(session.chart, c.date);
  session.chart.progressed = prog;
  if (session.model) {
    session.model.now = pack;
    session.model.progressed = prog;
    session.model.ringMode = c.ringMode;
  }
  session.atlas?.wheel.setNow(pack, { snap });
  session.atlas?.wheel.setProgressed(prog, { snap });
  session.atlas?.wheel.setRingMode(c.ringMode);
  fillTransits(session.model || buildModel(session.chart), dom);
  session.atlas?.describe && session.atlas.wheel.canvas.setAttribute("aria-label", session.atlas.describe());
}

function setScale(id, dom) {
  const c = chronoState();
  c.scale = id;
  c.window = chronoWindow(id, c.date);
  rescanHits();
  applyTransitDate(c.date, dom, { snap: true });
}

function wind(dir, dom) {
  const c = chronoState();
  applyTransitDate(stepDate(c.date, c.scale, dir), dom);
}

function setPlay(on, dom) {
  const c = chronoState();
  if (reducedMotion) on = false;
  c.playing = Boolean(on);
  if (dom.chronoPlay) {
    dom.chronoPlay.hidden = reducedMotion;
    dom.chronoPlay.setAttribute("aria-pressed", String(c.playing));
    dom.chronoPlay.textContent = c.playing ? "Pause" : "Play";
  }
  window.clearInterval(playTimer);
  if (c.playing) playTimer = window.setInterval(() => wind(1, dom), 80);
}

function setRing(mode, dom) {
  const c = chronoState();
  if (mode === "vault" && !session.chart?.other && !session.vaultOther) return;
  if (mode === "vault" && session.vaultOther && !session.chart.other) {
    session.chart.other = session.vaultOther;
    session.chart.synastry = synastryHits(session.chart, session.vaultOther);
  }
  if (mode !== "vault") {
    /* keep vaultOther but stop drawing it */
  }
  c.ringMode = mode;
  session.chart.ringMode = mode;
  if (session.model) session.model.ringMode = mode;
  if (mode !== "vault") {
    /* wheel uses ringMode; other stays stored */
  }
  session.atlas?.wheel.setRingMode(mode);
  syncRingMode(dom);
  applyTransitDate(c.date, dom, { snap: true });
}

function syncRingMode(dom) {
  const c = chronoState();
  if (!dom.ringMode) return;
  const waiting = Boolean(session.chart?.meta?.waiting);
  dom.ringMode.hidden = waiting;
  if (dom.chronoHero) dom.chronoHero.hidden = waiting;
  if (dom.heroTools) dom.heroTools.hidden = waiting;
  dom.ringMode.querySelectorAll("[data-ring]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.ring === c.ringMode));
  });
}

function openReturnAsPlate(hit, dom) {
  if (!session.chart) return;
  const from = hit.date || new Date();
  try {
    let next;
    if (hit.tId === "sun") next = solarReturnChart(session.chart, new Date(from.getTime() - 86400000));
    else if (hit.tId === "moon") next = lunarReturnChart(session.chart, new Date(from.getTime() - 86400000));
    else if (hit.tId === "jupiter") next = jupiterReturnChart(session.chart, new Date(from.getTime() - 86400000));
    else if (hit.tId === "saturn") next = saturnReturnChart(session.chart, new Date(from.getTime() - 86400000));
    if (next) paint(next, dom);
  } catch (err) {
    if (dom.transitsLede) dom.transitsLede.textContent = err.message || String(err);
  }
}

function paint(chart, dom) {
  const run = () => {
    document.body.classList.toggle("is-waiting", Boolean(chart.meta.waiting));
    const model = buildModel(chart);
    bindSlots(chart, model);
    fillBirth(chart, dom);
    fillFacts(chart, dom);
    if (!chart.meta.waiting) {
      try { fillHorizon(model); } catch (err) { console.warn(err); }
      try { fillStrip(model, dom); } catch (err) { console.warn(err); }
      try { fillRail(model, dom); } catch (err) { console.warn(err); }
      try { fillElements(model, dom); } catch (err) { console.warn(err); }
    } else {
      showClusterNav(false);
      if (dom.stelliumChapter) dom.stelliumChapter.hidden = true;
      if (dom.elementDiamond) dom.elementDiamond.replaceChildren();
    }
    syncOverlayChip(dom, chart);
    if (session.atlas) session.atlas.destroy();
    session.minis.forEach((m) => m.destroy?.());
    session.chart = chart;
    session.model = model;
    session.atlas = createAtlas({ model, dom, reducedMotion });
    try {
      session.minis = chart.meta.waiting ? [] : fillPatterns(model, dom);
    } catch (err) {
      console.warn(err);
      session.minis = [];
    }
    if (!chart.meta.waiting) {
      try {
        const c = chronoState();
        c.date = new Date(chart.now?.at || Date.now());
        c.window = chronoWindow(c.scale, c.date);
        c.ringMode = chart.ringMode || (chart.other ? "vault" : "now");
        rescanHits();
        const prog = progressedPack(chart, c.date);
        chart.progressed = prog;
        model.progressed = prog;
        model.ringMode = c.ringMode;
        fillTransits(model, dom);
        session.atlas.wheel.setProgressed(prog, { snap: true });
        session.atlas.wheel.setRingMode(c.ringMode);
      } catch (err) {
        console.warn(err);
      }
    } else {
      setPlay(false, dom);
    }
    window.__atlas = session.atlas;
    session.atlas.start();
    session.minis.forEach((m) => m.snap());
    syncHouseSwitch(dom, chart);
    return model;
  };
  try {
    return run();
  } catch (err) {
    console.error(err);
    if (dom.error) {
      dom.error.hidden = false;
      dom.error.textContent = err.message || String(err);
    }
    throw err;
  }
}

function setDialogExpanded(id, open) {
  document.querySelectorAll(`[aria-controls="${id}"]`).forEach((btn) => {
    btn.setAttribute("aria-expanded", String(open));
  });
}

let castOpener = null;

function openCast(dom) {
  const already = document.body.classList.contains("cast-open");
  const opener = document.activeElement;
  if (!already && opener instanceof HTMLElement) castOpener = opener;
  dom.cast.hidden = false;
  document.body.classList.add("cast-open");
  setDialogExpanded("cast", true);
  ensureCities().catch(() => {});
  document.getElementById("cast-name")?.focus();
}

function closeCast(dom) {
  dom.cast.hidden = true;
  document.body.classList.remove("cast-open");
  setDialogExpanded("cast", false);
  const back = castOpener;
  castOpener = null;
  if (back && back.isConnected && !dom.cast.contains(back)) {
    back.focus();
    return;
  }
  document.getElementById("open-cast")?.focus();
}

function fillTimezones(dom) {
  if (!dom.tzVis || dom.tzVis.options.length) return;
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zones = (typeof Intl !== "undefined" && Intl.supportedValuesOf)
    ? Intl.supportedValuesOf("timeZone").slice()
    : TIMEZONES.slice();
  if (local && !zones.includes(local)) zones.unshift(local);
  if (!zones.includes("UTC")) zones.unshift("UTC");
  dom.tzVis.replaceChildren(...zones.map((z) => el("option", { value: z, text: z })));
}

function syncHiddenCoords(dom) {
  if (dom.latVis?.value) document.getElementById("cast-lat").value = dom.latVis.value;
  if (dom.lonVis?.value) document.getElementById("cast-lon").value = dom.lonVis.value;
  if (dom.tzVis?.value) document.getElementById("cast-tz").value = dom.tzVis.value;
}

function hidePlaceList(dom) {
  dom.placeList.hidden = true;
  dom.placeList.replaceChildren();
  dom.place.setAttribute("aria-expanded", "false");
  dom.place.removeAttribute("aria-activedescendant");
}

function applyCity(city, dom) {
  document.getElementById("cast-place-full").value = city.name;
  document.getElementById("cast-tz").value = city.tz;
  document.getElementById("cast-lat").value = String(city.lat);
  document.getElementById("cast-lon").value = String(city.lon);
  if (dom.latVis) dom.latVis.value = String(city.lat);
  if (dom.lonVis) dom.lonVis.value = String(city.lon);
  if (dom.tzVis) {
    fillTimezones(dom);
    if (![...dom.tzVis.options].some((o) => o.value === city.tz)) {
      dom.tzVis.prepend(el("option", { value: city.tz, text: city.tz }));
    }
    dom.tzVis.value = city.tz;
  }
  dom.place.value = city.name;
  dom.coords.textContent = `${city.name} · ${city.tz} · ${city.lat.toFixed(4)}, ${city.lon.toFixed(4)}`;
  hidePlaceList(dom);
}

function setPlaceActive(dom, index) {
  const buttons = [...dom.placeList.querySelectorAll("button[data-place]")];
  if (!buttons.length) return -1;
  const next = (index + buttons.length) % buttons.length;
  buttons.forEach((btn, i) => {
    btn.classList.toggle("is-on", i === next);
    if (i === next) {
      btn.id = "place-opt-active";
      dom.place.setAttribute("aria-activedescendant", "place-opt-active");
      btn.scrollIntoView({ block: "nearest" });
    } else {
      btn.removeAttribute("id");
    }
  });
  return next;
}

let placeGen = 0;

async function renderPlaces(q, dom) {
  const s = String(q || "").trim();
  const gen = ++placeGen;
  if (s.length < 1) {
    hidePlaceList(dom);
    return;
  }
  try {
    await ensureCities();
  } catch {
    dom.placeList.hidden = false;
    dom.place.setAttribute("aria-expanded", "true");
    dom.placeList.replaceChildren(
      el("li", { class: "place-empty", text: "City list failed to load. Use coordinates below." }),
    );
    return;
  }
  if (gen !== placeGen) return;
  const hits = searchCities(s, 7);
  if (gen !== placeGen) return;
  if (!hits.length) {
    dom.placeList.hidden = false;
    dom.place.setAttribute("aria-expanded", "true");
    dom.placeList.replaceChildren(
      el("li", { class: "place-empty", text: "No city match. Open coordinates below." }),
    );
    return;
  }
  dom.placeList.hidden = false;
  dom.place.setAttribute("aria-expanded", "true");
  dom.placeList.replaceChildren(
    ...hits.map((c, i) =>
      el("li", { role: "presentation" },
        el("button", {
          type: "button",
          role: "option",
          "data-place": "1",
          class: i === 0 ? "is-on" : false,
          id: i === 0 ? "place-opt-active" : null,
          onmousedown: (e) => e.preventDefault(),
          onclick: () => applyCity(c, dom),
        }, c.name),
      ),
    ),
  );
  dom.place.setAttribute("aria-activedescendant", "place-opt-active");
}

function fillDemos(dom, onNow) {
  dom.demos.replaceChildren(
    el("button", { type: "button", onclick: onNow }, "Sky right now"),
  );
}

function resetCastForm(dom) {
  dom.castForm.reset();
  document.getElementById("cast-place-full").value = "";
  document.getElementById("cast-tz").value = "";
  document.getElementById("cast-lat").value = "";
  document.getElementById("cast-lon").value = "";
  document.getElementById("cast-hour").value = "12";
  document.getElementById("cast-minute").value = "0";
  document.getElementById("cast-hour").disabled = false;
  document.getElementById("cast-minute").disabled = false;
  if (dom.latVis) dom.latVis.value = "";
  if (dom.lonVis) dom.lonVis.value = "";
  fillTimezones(dom);
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (dom.tzVis && local) dom.tzVis.value = local;
  dom.coords.textContent = "Type a city, or open coordinates.";
  hidePlaceList(dom);
  dom.error.hidden = true;
}

function syncHouseSwitch(dom, chart) {
  if (!dom.houseSwitch) return;
  const waiting = Boolean(chart?.meta?.waiting);
  const unknown = Boolean(chart?.meta?.timeUnknown);
  dom.houseSwitch.hidden = waiting || unknown;
  const id = chart?.meta?.houseSystemId || "porphyry";
  dom.houseSwitch.querySelectorAll("button[data-houses]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.houses === id));
  });
}

function renderVaultList(dom) {
  const rows = listCharts();
  if (!rows.length) {
    dom.vaultList.replaceChildren(el("li", { class: "transit-empty", text: "Empty. Cast a chart, then save it here." }));
    return;
  }
  dom.vaultList.replaceChildren(
    ...rows.map((row) =>
      el("li", { class: "vault-row" },
        el("div", {},
          el("strong", { text: row.name }),
          el("p", { class: "mono", text: [row.dateLabel, row.place].filter(Boolean).join(" · ") }),
        ),
        el("div", { class: "vault-row-actions" },
          el("button", { type: "button", class: "btn btn-ghost btn-small", "aria-label": `Open ${row.name}`, onclick: () => {
            const chart = getChart(row.id);
            if (chart) {
              paint(chart, dom);
              closeVault(dom);
            }
          } }, "Open"),
          el("button", { type: "button", class: "btn btn-ghost btn-small", "aria-label": `Outer ring ${row.name}`, onclick: () => {
            const chart = getChart(row.id);
            if (chart) {
              setOverlay(chart, dom);
              closeVault(dom);
            }
          } }, "Outer ring"),
          el("button", { type: "button", class: "btn btn-ghost btn-small", "aria-label": `Forget ${row.name}`, onclick: () => {
            removeChart(row.id);
            renderVaultList(dom);
          } }, "Forget"),
        ),
      ),
    ),
  );
}

function openVault(dom) {
  renderVaultList(dom);
  dom.vault.hidden = false;
  document.body.classList.add("vault-open");
  setDialogExpanded("vault", true);
  dom.closeVault?.focus();
}

function closeVault(dom) {
  dom.vault.hidden = true;
  document.body.classList.remove("vault-open");
  setDialogExpanded("vault", false);
  document.getElementById("open-vault")?.focus();
}

function wireCast(dom) {
  const presentSky = (lat, lon, tz, place) => {
    try {
      const now = new Date();
      const chart = castChart({
        name: "The present sky",
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        hour: now.getHours(),
        minute: now.getMinutes(),
        timeUnknown: false,
        timeZone: tz,
        lat,
        lon,
        place,
        houseSystem: document.querySelector("input[name=houseSystem]:checked")?.value || "porphyry",
      });
      paint(chart, dom);
      closeCast(dom);
    } catch (err) {
      console.error(err);
      openCast(dom);
      dom.error.hidden = false;
      dom.error.textContent = err.message || "Could not cast this sky.";
    }
  };

  const onNow = async () => {
    syncHiddenCoords(dom);
    const latRaw = document.getElementById("cast-lat").value;
    const lonRaw = document.getElementById("cast-lon").value;
    const lat = Number(latRaw);
    const lon = Number(lonRaw);
    const tz = document.getElementById("cast-tz").value || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const place = document.getElementById("cast-place-full").value || "Here";
    if (latRaw !== "" && lonRaw !== "" && Number.isFinite(lat) && Number.isFinite(lon)) {
      presentSky(lat, lon, tz, place);
      return;
    }
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    try {
      await ensureCities();
    } catch {
      openCast(dom);
      dom.error.hidden = false;
      dom.error.textContent = "Pick a city, or use this location, then cast the present sky.";
      return;
    }
    const here = findCityByTz(zone) || findCityByTz("Africa/Accra") || findCityByTz("Europe/London");
    if (!here) {
      openCast(dom);
      dom.error.hidden = false;
      dom.error.textContent = "Pick a city, or use this location, then cast the present sky.";
      return;
    }
    presentSky(here.lat, here.lon, here.tz, here.name);
  };

  fillDemos(dom, onNow);
  fillTimezones(dom);
  dom.nowBtn?.addEventListener("click", onNow);
  dom.geoBtn?.addEventListener("click", () => {
    if (!navigator.geolocation) {
      dom.error.hidden = false;
      dom.error.textContent = "This browser will not share a location.";
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        applyCity({
          name: "This location",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          tz,
        }, dom);
      },
      () => {
        dom.error.hidden = false;
        dom.error.textContent = "Location was denied. Pick a city instead.";
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  });
  dom.openCast?.addEventListener("click", () => openCast(dom));
  dom.openCastMenu?.addEventListener("click", () => openCast(dom));
  dom.closeCast?.addEventListener("click", () => closeCast(dom));
  dom.cast.addEventListener("click", (e) => { if (e.target === dom.cast) closeCast(dom); });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!dom.vault.hidden) {
      e.preventDefault();
      closeVault(dom);
      return;
    }
    if (document.body.classList.contains("cast-open")) {
      e.preventDefault();
      closeCast(dom);
    }
  });
  dom.place.addEventListener("input", () => {
    document.getElementById("cast-place-full").value = "";
    renderPlaces(dom.place.value, dom);
  });
  dom.place.addEventListener("focus", () => renderPlaces(dom.place.value, dom));
  dom.place.addEventListener("keydown", (e) => {
    if (dom.placeList.hidden) {
      if (e.key === "ArrowDown" && dom.place.value.trim()) {
        e.preventDefault();
        renderPlaces(dom.place.value, dom);
      }
      return;
    }
    const buttons = [...dom.placeList.querySelectorAll("button[data-place]")];
    if (!buttons.length) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        hidePlaceList(dom);
      }
      return;
    }
    const current = buttons.findIndex((b) => b.classList.contains("is-on"));
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setPlaceActive(dom, current + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPlaceActive(dom, current < 0 ? 0 : current - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = buttons[current] || buttons[0];
      pick.click();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      hidePlaceList(dom);
    }
  });
  document.addEventListener("pointerdown", (e) => {
    if (dom.placeList.hidden) return;
    if (dom.place.contains(e.target) || dom.placeList.contains(e.target)) return;
    hidePlaceList(dom);
  });
  dom.latVis?.addEventListener("input", () => {
    document.getElementById("cast-lat").value = dom.latVis.value;
    if (!document.getElementById("cast-place-full").value) {
      document.getElementById("cast-place-full").value = "Custom coordinates";
    }
  });
  dom.lonVis?.addEventListener("input", () => {
    document.getElementById("cast-lon").value = dom.lonVis.value;
  });
  dom.tzVis?.addEventListener("change", () => {
    document.getElementById("cast-tz").value = dom.tzVis.value;
  });
  dom.unknown.addEventListener("change", () => {
    const off = dom.unknown.checked;
    document.getElementById("cast-hour").disabled = off;
    document.getElementById("cast-minute").disabled = off;
  });
  resetCastForm(dom);

  dom.castForm.addEventListener("submit", (e) => {
    e.preventDefault();
    dom.error.hidden = true;
    syncHiddenCoords(dom);
    try {
      const input = parseBirthForm(dom.castForm);
      if (!Number.isFinite(input.lat) || !Number.isFinite(input.lon)) {
        throw new Error("Pick a city, or enter latitude and longitude.");
      }
      if (!input.name) throw new Error("Give the chart a name.");
      if (!input.place) input.place = `${input.lat.toFixed(4)}, ${input.lon.toFixed(4)}`;
      const chart = castChart(input);
      paint(chart, dom);
      closeCast(dom);
    } catch (err) {
      dom.error.hidden = false;
      dom.error.textContent = err.message || String(err);
    }
  });

  dom.houseSwitch?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-houses]");
    if (!btn || !session.chart || session.chart.meta.waiting || session.chart.meta.timeUnknown) return;
    rehouse(session.chart, btn.dataset.houses);
    paint(session.chart, dom);
  });

  dom.openVault?.addEventListener("click", () => openVault(dom));
  dom.closeVault?.addEventListener("click", () => closeVault(dom));
  dom.vault?.addEventListener("click", (e) => { if (e.target === dom.vault) closeVault(dom); });
  dom.vaultSave?.addEventListener("click", () => {
    try {
      saveChart(session.chart);
      renderVaultList(dom);
    } catch (err) {
      renderVaultList(dom);
      dom.vaultList.prepend(el("li", { class: "cast-error", text: err.message || String(err) }));
    }
  });
  dom.vaultExport?.addEventListener("click", () => {
    const blob = new Blob([exportVault()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "natal-atlas-vault.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });
  dom.vaultImport?.addEventListener("change", async () => {
    const file = dom.vaultImport.files?.[0];
    if (!file) return;
    try {
      importVault(await file.text());
      renderVaultList(dom);
    } catch (err) {
      renderVaultList(dom);
      dom.vaultList.prepend(el("li", { class: "cast-error", text: err.message || String(err) }));
    }
    dom.vaultImport.value = "";
  });
}

function jumpReturn(kind, dom) {
  if (!session.chart || session.chart.meta.waiting) return;
  try {
    const from = new Date();
    let when = null;
    if (kind === "sun") {
      const sun = session.chart.planets?.find((p) => p.id === "sun");
      when = nextSolarReturnDate(sun.lon, from, session.chart.meta.birth?.date);
    } else if (kind === "moon") {
      const moon = session.chart.planets?.find((p) => p.id === "moon");
      when = nextLunarReturnDate(moon.lon, from);
    } else if (kind === "jupiter") {
      const j = session.chart.planets?.find((p) => p.id === "jupiter");
      when = nextJupiterReturnDate(j.lon, from);
    } else if (kind === "saturn") {
      const s = session.chart.planets?.find((p) => p.id === "saturn");
      when = nextSaturnReturnDate(s.lon, from);
    }
    if (!when) throw new Error("Could not find that return.");
    applyTransitDate(when, dom, { snap: reducedMotion });
    document.getElementById("transits")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  } catch (err) {
    if (dom.transitsLede) dom.transitsLede.textContent = err.message || String(err);
  }
}

function exportPlate() {
  if (!session.chart || session.chart.meta.waiting) return;
  const canvas = document.getElementById("wheel");
  downloadPlate({
    canvas,
    chart: session.chart,
    when: civilLabel(chronoState().date),
  }).catch(() => {});
  const input = chartToHashInput(session.chart);
  if (input) {
    const hash = birthHash(input);
    try { history.replaceState(null, "", hash); } catch {}
  }
}

function wireTime(dom) {
  const schedule = (date) => {
    window.clearTimeout(transitTimer);
    transitTimer = window.setTimeout(() => applyTransitDate(date, dom), 40);
  };
  fillChronoScales(dom);
  if (reducedMotion && dom.chronoPlay) dom.chronoPlay.hidden = true;

  const bindHold = (btn, dir) => {
    if (!btn) return;
    const stop = () => window.clearInterval(holdTimer);
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      wind(dir, dom);
      window.clearInterval(holdTimer);
      holdTimer = window.setInterval(() => wind(dir, dom), reducedMotion ? 240 : 80);
    });
    // pointerdown preventDefault swallows the click that Enter/Space would fire.
    btn.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      e.stopPropagation();
      wind(dir, dom);
    });
    btn.addEventListener("pointerup", stop);
    btn.addEventListener("pointerleave", stop);
    btn.addEventListener("pointercancel", stop);
  };
  bindHold(dom.chronoMinus, -1);
  bindHold(dom.chronoPlus, 1);

  dom.chronoPlay?.addEventListener("click", () => setPlay(!chronoState().playing, dom));
  dom.chronoRing?.addEventListener("pointerdown", (e) => {
    if (!session.chart || session.chart.meta.waiting) return;
    const c = chronoState();
    const move = (ev) => schedule(ringDateAt(dom.chronoRing, ev.clientX, c.window.min, c.window.max));
    move(e);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  });
  window.addEventListener("resize", () => paintChronoRing(dom));

  dom.transitDate?.addEventListener("change", () => {
    if (!dom.transitDate.value) return;
    schedule(new Date(`${dom.transitDate.value}T12:00:00Z`));
  });
  dom.transitNow?.addEventListener("click", () => applyTransitDate(new Date(), dom));
  dom.solarReturn?.addEventListener("click", () => jumpReturn("sun", dom));
  dom.lunarReturn?.addEventListener("click", () => jumpReturn("moon", dom));
  dom.jupiterReturn?.addEventListener("click", () => jumpReturn("jupiter", dom));
  dom.saturnReturn?.addEventListener("click", () => jumpReturn("saturn", dom));

  dom.ringMode?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-ring]");
    if (btn) setRing(btn.dataset.ring, dom);
  });
  dom.plateBtn?.addEventListener("click", exportPlate);
  dom.dockPlate?.addEventListener("click", exportPlate);

  document.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
    if (document.body.classList.contains("cast-open")) return;
    if (!document.getElementById("vault")?.hidden) return;
    if (!session.chart || session.chart.meta.waiting) return;
    const stage = document.getElementById("stage");
    const onWheel = stage && (stage === t || stage.contains(t));
    if (e.key === " " && !onWheel) {
      e.preventDefault();
      setPlay(!chronoState().playing, dom);
      return;
    }
    if (e.key === "Escape") {
      setPlay(false, dom);
      return;
    }
    if (onWheel) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (e.shiftKey) {
        const ids = ["hour", "day", "month", "year", "decade"];
        const i = Math.max(0, ids.indexOf(chronoState().scale) - 1);
        setScale(ids[i], dom);
      } else wind(-1, dom);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (e.shiftKey) {
        const ids = ["hour", "day", "month", "year", "decade"];
        const i = Math.min(ids.length - 1, ids.indexOf(chronoState().scale) + 1);
        setScale(ids[i], dom);
      } else wind(1, dom);
    }
  });
}

async function main() {
  const dom = grab();
  clearStoredBirth();
  await fontsReady();
  paint(waitingChart(), dom);
  wireNav(dom);
  wireReveals();
  wireCast(dom);
  wireTime(dom);
  const vid = dom.plateVideo;
  const plate = document.querySelector(".plate");
  if (vid && !reducedMotion) {
    vid.src = "./assets/hero-loop.mp4";
    vid.addEventListener("canplay", () => {
      plate?.classList.add("has-video");
      vid.play().catch(() => {});
    }, { once: true });
  }

  document.body.classList.remove("is-loading");
  if (window.location.hash === "#cast") openCast(dom);
  const hashed = parseBirthHash(window.location.hash);
  if (hashed) {
    try {
      const chart = castChart(hashed);
      paint(chart, dom);
    } catch (err) {
      fail(dom, err);
    }
  }
}

main();
