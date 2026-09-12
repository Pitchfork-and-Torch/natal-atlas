/* wheel.js - Canvas 2D natal wheel.
   Western layout: the Ascendant is pinned at 9 o'clock, the zodiac runs
   counter-clockwise, houses from the computed cusps.
   This module touches no DOM at import time so its geometry can be unit-tested. */

const TAU = Math.PI * 2;

function safeArc(ctx, x, y, radius, a0, a1, ccw) {
  ctx.arc(x, y, Math.max(0.01, Number(radius) || 0), a0, a1, ccw);
}
const RAD = Math.PI / 180;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;

/* ------------------------------------------------------------- geometry */

export function norm(deg) {
  return ((deg % 360) + 360) % 360;
}

/** Shortest angular separation in degrees. */
export function sep(a, b) {
  const d = Math.abs(norm(a) - norm(b));
  return d > 180 ? 360 - d : d;
}

/** Classify the aspect between two longitudes for pattern geometry.
    Tolerance matches the widest orb the chart listing uses (8, rounded). */
export function classify(a, b) {
  const d = sep(a, b);
  if (d <= 10) return "conjunction";
  if (Math.abs(d - 60) <= 9) return "sextile";
  if (Math.abs(d - 90) <= 9) return "square";
  if (Math.abs(d - 120) <= 9) return "trine";
  if (Math.abs(d - 180) <= 10) return "opposition";
  return null;
}

export const HARD = new Set(["square", "opposition"]);

/** Edges between pattern members, derived from their longitudes. */
export function patternEdges(members) {
  const edges = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const type = classify(members[i].lon, members[j].lon);
      if (type) edges.push({ a: members[i], b: members[j], type });
    }
  }
  return edges;
}

/**
 * Sorted longitudes of a cluster, returned as [start, end] going forward
 * through the zodiac, so that the largest empty gap is left outside the arc.
 */
export function clusterSpan(lons) {
  const s = lons.map(norm).sort((x, y) => x - y);
  if (s.length < 2) return [s[0] || 0, s[0] || 0];
  let bestGap = -1;
  let bestIdx = 0;
  for (let i = 0; i < s.length; i++) {
    const next = s[(i + 1) % s.length];
    const gap = i === s.length - 1 ? next + 360 - s[i] : next - s[i];
    if (gap > bestGap) {
      bestGap = gap;
      bestIdx = i;
    }
  }
  const start = s[(bestIdx + 1) % s.length];
  const end = s[bestIdx];
  return [start, end];
}

/** Push glyphs apart around the circle so none overlap. Order is preserved. */
export function declutter(lons, minSep, iterations = 48) {
  const n = lons.length;
  if (n < 2) return lons.slice();
  const idx = lons.map((_, i) => i).sort((i, j) => lons[i] - lons[j]);
  const pos = idx.map((i) => lons[i]);
  for (let it = 0; it < iterations; it++) {
    let moved = false;
    for (let k = 0; k < n; k++) {
      const j = (k + 1) % n;
      let gap = pos[j] - pos[k];
      if (j === 0) gap += 360;
      if (gap < minSep - 1e-6) {
        const push = (minSep - gap) / 2;
        pos[k] -= push;
        pos[j] += push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const out = new Array(n);
  idx.forEach((i, k) => {
    out[i] = norm(pos[k]);
  });
  return out;
}

/* ---------------------------------------------------------------- color */

/** OKLCH -> sRGB [0..255]. Same numbers as the CSS tokens in atlas.css. */
export function oklchToRgb(L, C, h) {
  const hr = h * RAD;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const gam = (x) => {
    const v = clamp(x, 0, 1);
    return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  };
  return [gam(r), gam(g), gam(bl)].map((v) => Math.round(v * 255));
}

const TOKENS = {
  ink: [0.16, 0.01, 70],
  inkDeep: [0.12, 0.01, 70],
  inkRaise: [0.2, 0.012, 70],
  bone: [0.93, 0.02, 85],
  gold: [0.78, 0.12, 80],
  ember: [0.68, 0.18, 45],
  steel: [0.72, 0.03, 240],
  wine: [0.45, 0.11, 22],
  wineLight: [0.7, 0.08, 22],
};

/* Body tints live inside the five-value palette: fire reads gold to ember,
   earth and air read steel or bone, Pluto reads wine. */
const TINTS = {
  sun: [0.82, 0.13, 84],
  moon: [0.86, 0.02, 240],
  mercury: [0.88, 0.08, 88],
  venus: [0.75, 0.15, 62],
  mars: [0.66, 0.19, 40],
  jupiter: [0.72, 0.13, 70],
  saturn: [0.64, 0.06, 75],
  uranus: [0.8, 0.04, 220],
  neptune: [0.7, 0.05, 240],
  pluto: [0.56, 0.11, 20],
  northNode: [0.82, 0.1, 86],
  chiron: [0.82, 0.02, 220],
  asc: [0.93, 0.02, 85],
  mc: [0.93, 0.02, 85],
};

const toRgbMap = (src) =>
  Object.fromEntries(Object.entries(src).map(([k, v]) => [k, oklchToRgb(v[0], v[1], v[2])]));

export const RGB = toRgbMap(TOKENS);
export const TINT_RGB = toRgbMap(TINTS);

export function rgba(rgb, a = 1) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${clamp(a, 0, 1).toFixed(3)})`;
}

export function tintFor(id) {
  return TINT_RGB[id] || RGB.bone;
}

export function cssTint(id) {
  const c = tintFor(id);
  return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}

const ELEMENT_RGB = { fire: RGB.gold, earth: RGB.steel, air: RGB.bone, water: RGB.wine };
const ELEMENT_GLYPH_RGB = { fire: RGB.gold, earth: RGB.steel, air: RGB.bone, water: RGB.wineLight };
const ELEMENT_ALPHA = { fire: 0.1, earth: 0.075, air: 0.045, water: 0.11 };

const FONT_SYMBOL = '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols 2", "Noto Sans Symbols", sans-serif';
const FONT_MONO = 'ui-monospace, "Cascadia Code", "Segoe UI Mono", Menlo, monospace';
const FONT_DISPLAY = '"Clash Display", "Satoshi", sans-serif';

/* ---------------------------------------------------------------- wheel */

export class NatalWheel {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} model  built by atlas.buildModel
   * @param {object} opts   { mini, reducedMotion, solo, onLayout }
   */
  constructor(canvas, model, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.model = model;
    this.opts = Object.assign({ mini: false, reducedMotion: false, solo: null, onLayout: null, onTap: null }, opts);

    this.hot = null;
    this.selected = null;
    this.solo = this.opts.solo;

    this.rot = 0;
    this.spin = 0;
    this.spinVel = 0;
    this.dragging = false;
    this.spun = false;
    this.idle = !this.opts.reducedMotion && !this.opts.mini;
    this.introDone = this.opts.reducedMotion || this.opts.mini;
    this.t0 = null;
    this._spinLast = 0;
    this._spinMoved = 0;
    this._spinPointer = null;
    this._pending = null;

    this.vis = new Map();
    this.lit = new Map();
    this.ring = new Map();
    this.soloMix = this.solo ? 1 : 0;
    this.positions = new Map();

    this.size = 0;
    this.dpr = 1;
    this.cx = 0;
    this.cy = 0;
    this.R = 0;
    this._raf = 0;
    this._last = 0;
    this._clock = 0;
    this.pulseTransit = null;
    this.activeHit = null;

    for (const b of model.bodies) {
      this.vis.set(b.id, 1);
      this.ring.set(b.id, 0);
    }
    model.aspects.forEach((_, i) => {
      this.vis.set("a" + i, 1);
      this.lit.set("a" + i, 0);
    });

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement || canvas);
    this._onWinResize = () => this.resize();
    window.addEventListener("resize", this._onWinResize);
    this.resize();
    const tight = (model.now?.hits || [])[0];
    this.pulseTransit = !this.opts.mini && tight && tight.orb <= 1 ? tight.transit : null;
    if (this.opts.mini) this.snap();
    else {
      this.bindSpin();
      this.requestFrame();
    }
  }

  destroy() {
    this.unbindSpin();
    this.ro.disconnect();
    if (this._onWinResize) window.removeEventListener("resize", this._onWinResize);
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  ringMode() {
    return this.model.ringMode || (this.model.other ? "vault" : "now");
  }

  setActiveHit(hit) {
    this.activeHit = hit || null;
    this.model.activeHit = this.activeHit;
    this.requestFrame();
  }

  setNow(now, opts = {}) {
    this.model.now = now;
    const snap = this.opts.reducedMotion || opts.snap;
    const keep = new Set();
    for (const t of now?.transits || []) {
      const id = "t:" + t.id;
      keep.add(id);
      const prev = this.positions.get(id);
      if (prev) {
        prev.lon = t.lon;
        if (snap) prev.drawLon = t.lon;
      } else {
        this.positions.set(id, { lon: t.lon, drawLon: t.lon, x: 0, y: 0, transit: true });
      }
    }
    for (const id of [...this.positions.keys()]) {
      if (String(id).startsWith("t:") && !keep.has(id)) this.positions.delete(id);
    }
    const tight = (now?.hits || [])[0];
    this.pulseTransit = tight && tight.orb <= 1 ? (tight.transit || tight.tId) : null;
    this.updatePoints();
    this.requestFrame();
  }

  setProgressed(pack, opts = {}) {
    this.model.progressed = pack;
    const snap = this.opts.reducedMotion || opts.snap;
    const keep = new Set();
    for (const t of pack?.planets || []) {
      const id = "p:" + t.id;
      keep.add(id);
      const prev = this.positions.get(id);
      if (prev) {
        prev.lon = t.lon;
        if (snap) prev.drawLon = t.lon;
      } else {
        this.positions.set(id, { lon: t.lon, drawLon: t.lon, x: 0, y: 0, progressed: true });
      }
    }
    for (const id of [...this.positions.keys()]) {
      if (String(id).startsWith("p:") && !keep.has(id)) this.positions.delete(id);
    }
    this.updatePoints();
    this.requestFrame();
  }

  setRingMode(mode) {
    this.model.ringMode = mode;
    this.layout();
    this.requestFrame();
  }

  adopt(model) {
    this.model = model;
    this.hot = null;
    this.selected = null;
    this.solo = this.opts.solo;
    this.vis = new Map();
    this.lit = new Map();
    this.ring = new Map();
    this.soloMix = this.solo ? 1 : 0;
    this._soloKey = null;
    this._soloSet = null;
    this.positions.clear();
    for (const b of model.bodies) {
      this.vis.set(b.id, this.opts.mini || this.opts.reducedMotion ? 1 : 0);
      this.ring.set(b.id, 0);
    }
    model.aspects.forEach((_, i) => {
      this.vis.set("a" + i, this.opts.mini || this.opts.reducedMotion ? 1 : 0);
      this.lit.set("a" + i, 0);
    });
    this.layout();
    this.requestFrame();
  }

  /* ---- sizing and layout ---- */

  resize() {
    const host = this.canvas.parentElement || this.canvas;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let size;
    if (this.opts.mini) {
      const w = host.clientWidth;
      const h = host.clientHeight || w;
      size = Math.max(0, Math.floor(Math.min(w, h)));
    } else {
      const wrap = host.parentElement || host;
      const availW = wrap.clientWidth || host.clientWidth || Math.floor(window.innerWidth * 0.5);
      const availH = Math.floor(window.innerHeight - 150);
      size = Math.max(280, Math.floor(Math.min(availW, availH) * 0.94));
      host.style.width = `${size}px`;
      host.style.height = `${size}px`;
      this.canvas.style.width = `${size}px`;
      this.canvas.style.height = `${size}px`;
    }
    if (size === this.size && dpr === this.dpr && this.r) return;
    this.size = size;
    this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.round(size * dpr));
    this.canvas.height = Math.max(1, Math.round(size * dpr));
    this.cx = size / 2;
    this.cy = size / 2;
    const pad = this.opts.mini
      ? Math.min(size * 0.05, size * 0.18)
      : Math.min(Math.max(12, size * 0.052), size * 0.12);
    this.R = Math.max(8, size / 2 - pad);
    this.layout();
    this.requestFrame();
  }

  layout() {
    const R = this.R;
    const mode = this.opts.mini ? "off" : this.ringMode();
    const vault = mode === "vault";
    const prog = mode === "progressed";
    const trans = mode === "now";
    this.r = {
      bezelOut: R,
      bezelIn: R * 0.965,
      signOut: R * 0.965,
      signIn: R * 0.865,
      band: vault || prog ? R * 0.62 : R * 0.84,
      glyph: vault || prog ? R * 0.52 : R * 0.72,
      degree: vault || prog ? R * 0.44 : R * 0.63,
      bracket: R * 0.58,
      aspect: vault || prog ? R * 0.4 : R * 0.54,
      houseNum: vault || prog ? R * 0.36 : R * 0.48,
      label: R * 0.99,
      other: R * 0.8,
      otherBand: R * 0.86,
      prog: R * 0.78,
      transit: R * 0.91,
    };
    const planets = this.model.bodies.filter((b) => !b.isAngle);
    const glyphPx = this.glyphSize();
    const minSep = this.opts.mini ? 3.2 : ((glyphPx * 1.35) / this.r.glyph) / RAD;
    const natalDraw = new Map();
    for (const [id, p] of this.positions) natalDraw.set(id, p.drawLon);
    const adjusted = declutter(planets.map((p) => p.lon), minSep);
    const savedT = new Map();
    const savedP = new Map();
    const savedO = new Map();
    for (const [id, p] of this.positions) {
      if (p.transit) savedT.set(id, p);
      else if (p.progressed) savedP.set(id, p);
      else if (p.overlay) savedO.set(id, p);
    }
    this.positions.clear();
    planets.forEach((p, i) => {
      const prev = natalDraw.get(p.id);
      this.positions.set(p.id, { lon: p.lon, drawLon: prev ?? adjusted[i], x: 0, y: 0 });
    });
    for (const b of this.model.bodies) {
      if (b.isAngle) this.positions.set(b.id, { lon: b.lon, drawLon: b.lon, x: 0, y: 0 });
    }
    if (vault) {
      const others = (this.model.other?.planets || []).filter((p) => Number.isFinite(p.lon));
      const adj = declutter(others.map((p) => p.lon), minSep * 0.9);
      others.forEach((p, i) => {
        const id = "o:" + p.id;
        const prev = savedO.get(id);
        this.positions.set(id, {
          lon: p.lon,
          drawLon: prev ? prev.drawLon : adj[i],
          x: 0,
          y: 0,
          overlay: true,
        });
      });
    } else if (trans) {
      for (const t of this.model.now?.transits || []) {
        const id = "t:" + t.id;
        const prev = savedT.get(id);
        this.positions.set(id, {
          lon: t.lon,
          drawLon: prev ? prev.drawLon : t.lon,
          x: 0,
          y: 0,
          transit: true,
        });
      }
    } else if (prog) {
      for (const t of this.model.progressed?.planets || []) {
        const id = "p:" + t.id;
        const prev = savedP.get(id);
        this.positions.set(id, {
          lon: t.lon,
          drawLon: prev ? prev.drawLon : t.lon,
          x: 0,
          y: 0,
          progressed: true,
        });
      }
    }
    this.updatePoints();
  }

  updatePoints() {
    for (const [id, p] of this.positions) {
      const body = this.model.byId.get(id);
      const r = p.transit ? this.r.transit : p.progressed ? this.r.prog : p.overlay ? this.r.other : body?.isAngle ? this.r.label : this.r.glyph;
      const a = this.angle(p.drawLon);
      p.a = a;
      p.x = this.cx + Math.cos(a) * r;
      p.y = this.cy + Math.sin(a) * r;
    }
    if (this.opts.onLayout) this.opts.onLayout(this.positions, this);
  }

  /** Longitude -> canvas angle. ASC at 9 o'clock, zodiac counter-clockwise. */
  angle(lon) {
    return Math.PI - (lon - this.model.asc) * RAD + this.rot;
  }

  pt(lon, r) {
    const a = this.angle(lon);
    return [this.cx + Math.cos(a) * r, this.cy + Math.sin(a) * r];
  }

  /** Canvas arc angles [from, to] covering the zodiac forward from start to end. */
  arcRange(start, end) {
    const to = this.angle(start);
    return [to - norm(end - start) * RAD, to];
  }

  glyphSize() {
    return this.opts.mini ? 0 : clamp(this.R * 0.058, 13, 27);
  }

  monoSize() {
    return clamp(this.R * 0.03, 9, 12);
  }

  /** Nearest interactive body to a canvas-space point, or null. */
  bodyAt(x, y, natalOnly = false) {
    let best = null;
    let bd = Infinity;
    for (const [id, p] of this.positions) {
      if (natalOnly && (p.transit || p.progressed || p.overlay)) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) {
        bd = d;
        best = id;
      }
    }
    const threshold = Math.max(32, this.glyphSize() * 1.85);
    return bd <= threshold ? best : null;
  }

  nudge(delta) {
    this.wake();
    this.spin += delta;
    this.rot = this.spin;
    this.spinVel = 0;
    this.updatePoints();
    this.requestFrame();
  }

  /* ---- state ---- */

  setHot(id) {
    if (this.hot === id) return;
    this.hot = id;
    this.requestFrame();
  }

  setSelected(id) {
    if (this.selected === id) return;
    this.selected = id;
    this.wake();
    this.requestFrame();
  }

  setSolo(id) {
    if (this.solo === id) return;
    this.solo = id;
    this.wake();
    this.requestFrame();
  }

  /** First interaction ends the idle drift; the pointer owns the wheel now. */
  wake() {
    if (!this.idle && this.introDone) return;
    this.idle = false;
    this.introDone = true;
    this.spin = this.rot;
    this.spinVel = 0;
    this.requestFrame();
  }

  localPoint(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scale = rect.width ? this.size / rect.width : 1;
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale };
  }

  pointerAngle(e) {
    const { x, y } = this.localPoint(e);
    return Math.atan2(y - this.cy, x - this.cx);
  }

  bindSpin() {
    this.host = this.canvas.closest(".stage") || this.canvas;
    this._onSpinDown = (e) => this.onSpinDown(e);
    this._onSpinMove = (e) => this.onSpinMove(e);
    this._onSpinUp = (e) => this.onSpinUp(e);
    this.host.addEventListener("pointerdown", this._onSpinDown);
    this.host.addEventListener("pointermove", this._onSpinMove);
    this.host.addEventListener("pointerup", this._onSpinUp);
    this.host.addEventListener("pointercancel", this._onSpinUp);
    this.host.addEventListener("lostpointercapture", this._onSpinUp);
  }

  unbindSpin() {
    if (!this._onSpinDown || !this.host) return;
    this.host.removeEventListener("pointerdown", this._onSpinDown);
    this.host.removeEventListener("pointermove", this._onSpinMove);
    this.host.removeEventListener("pointerup", this._onSpinUp);
    this.host.removeEventListener("pointercancel", this._onSpinUp);
    this.host.removeEventListener("lostpointercapture", this._onSpinUp);
    this._onSpinDown = null;
  }

  applyDrag(e) {
    const { x, y } = this.localPoint(e);
    const dx = x - this.cx;
    const dy = y - this.cy;
    const dist = Math.hypot(dx, dy);
    const now = e.timeStamp || performance.now();
    const dt = Math.max(8, now - this._spinAt);
    let d = 0;
    if (dist > this.R * 0.16) {
      const a = Math.atan2(dy, dx);
      d = a - this._spinLast;
      if (d > Math.PI) d -= TAU;
      if (d < -Math.PI) d += TAU;
      this._spinLast = a;
    } else {
      d = ((e.movementX || 0) * (this.size / Math.max(1, this.canvas.getBoundingClientRect().width))) / Math.max(24, this.R);
      this._spinLast = Math.atan2(dy, dx);
    }
    this.spin += d;
    this.rot = this.spin;
    this._spinMoved += Math.abs(d);
    this.spinVel = d / dt;
    this._spinAt = now;
    if (this._spinMoved > 0.08) this.spun = true;
    this.updatePoints();
    this.requestFrame();
  }

  onSpinDown(e) {
    if (this.opts.mini || e.button) return;
    if (e.target && e.target.closest && e.target.closest("button, a, input, select, textarea")) return;
    this._pending = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      angle: this.pointerAngle(e),
      t: e.timeStamp || performance.now(),
    };
    this.spun = false;
    this.dragging = false;
    this.spinVel = 0;
    this._spinMoved = 0;
    this._spinPointer = e.pointerId;
    try { this.host.setPointerCapture(e.pointerId); } catch {}
  }

  onSpinMove(e) {
    if (e.pointerId !== this._spinPointer) return;
    if (this._pending && !this.dragging) {
      const dx = e.clientX - this._pending.x;
      const dy = e.clientY - this._pending.y;
      if (dx * dx + dy * dy < 81) return;
      this.wake();
      this.dragging = true;
      this._pending = null;
      this._spinLast = this.pointerAngle(e);
      this._spinAt = e.timeStamp || performance.now();
      this.host.classList.add("is-spinning");
      this.canvas.classList.add("is-spinning");
    }
    if (!this.dragging) return;
    this.applyDrag(e);
  }

  onSpinUp(e) {
    if (e && this._spinPointer != null && e.pointerId !== this._spinPointer && e.type !== "lostpointercapture") return;
    const pending = this._pending;
    const wasDrag = this.dragging;
    this._pending = null;
    this.dragging = false;
    this._spinPointer = null;
    this.host?.classList.remove("is-spinning");
    this.canvas.classList.remove("is-spinning");
    if (pending && !wasDrag) {
      const src = e && Number.isFinite(e.clientX) ? e : { clientX: pending.x, clientY: pending.y };
      const { x, y } = this.localPoint(src);
      const id = this.bodyAt(x, y, true);
      if (typeof this.opts.onTap === "function") this.opts.onTap(id);
      return;
    }
    if (this.opts.reducedMotion) this.spinVel = 0;
    else {
      const v = this.spinVel;
      const cap = 0.014;
      this.spinVel = v > cap ? cap : v < -cap ? -cap : v;
      if (Math.abs(this.spinVel) < 0.00025) this.spinVel = 0;
    }
    this.requestFrame();
  }

  didSpin() {
    const spun = this.spun;
    this.spun = false;
    return spun;
  }

  soloMembers() {
    if (!this.solo) return null;
    if (this._soloKey !== this.solo) {
      const pat = this.model.patternById.get(this.solo);
      this._soloKey = this.solo;
      this._soloSet = pat ? new Set(pat.members) : null;
    }
    return this._soloSet;
  }

  connected(a, b) {
    return this.model.linked.has(a + "|" + b);
  }

  /* ---- animation ---- */

  requestFrame() {
    if (!this._raf) this._raf = requestAnimationFrame((t) => this.frame(t));
  }

  frame(t) {
    this._raf = 0;
    const dt = this._last ? Math.min(64, t - this._last) : 16;
    this._last = t;
    this._clock = t;
    let animating = false;

    if (!this.opts.mini) {
      if (this.dragging) {
        this.rot = this.spin;
        animating = true;
      } else if (!this.introDone) {
        if (this.t0 === null) this.t0 = t;
        const k = Math.min(1, (t - this.t0) / 2400);
        const e = 1 - Math.pow(1 - k, 3);
        this.rot = -9 * RAD * (1 - e);
        this.spin = this.rot;
        if (k >= 1) this.introDone = true;
        animating = true;
      } else if (this.spinVel) {
        this.spin += this.spinVel * dt;
        this.spinVel *= Math.exp(-dt / 980);
        if (Math.abs(this.spinVel) < 0.00004) this.spinVel = 0;
        this.rot = this.spin;
        animating = true;
      } else if (this.idle) {
        this.rot = this.spin + 0.7 * RAD * Math.sin((t / 36000) * TAU);
        animating = true;
      } else {
        this.rot = this.spin;
      }
      if (animating) this.updatePoints();
    }

    animating = this.tween(dt) || animating;
    if (this.pulseTransit && !this.opts.reducedMotion) animating = true;
    this.render();
    if (animating) this.requestFrame();
    else this._last = 0;
  }

  step(map, key, target, k) {
    const v = map.get(key);
    if (v === target) return false;
    let n = v + (target - v) * k;
    if (Math.abs(target - n) < 0.004) n = target;
    map.set(key, n);
    return n !== target;
  }

  tween(dt) {
    const k = 1 - Math.exp(-dt / 150);
    let moving = false;
    const focus = this.hot || this.selected;
    const soloSet = this.soloMembers();

    for (const b of this.model.bodies) {
      let target = 1;
      if (soloSet) target = soloSet.has(b.id) ? 1 : 0.16;
      else if (focus) target = b.id === focus || this.connected(b.id, focus) ? 1 : 0.32;
      moving = this.step(this.vis, b.id, target, k) || moving;
      const ringTarget = b.id === this.selected ? 1 : b.id === this.hot ? 0.6 : 0;
      moving = this.step(this.ring, b.id, ringTarget, k) || moving;
    }

    this.model.aspects.forEach((a, i) => {
      const key = "a" + i;
      let target = 1;
      let lit = 0;
      if (soloSet) target = soloSet.has(a.a) && soloSet.has(a.b) ? 1 : 0.05;
      else if (focus) {
        const touches = a.a === focus || a.b === focus;
        target = touches ? 1 : 0.1;
        lit = touches ? 1 : 0;
      }
      moving = this.step(this.vis, key, target, k) || moving;
      moving = this.step(this.lit, key, lit, k) || moving;
    });

    const sm = this.solo ? 1 : 0;
    if (this.soloMix !== sm) {
      let n = this.soloMix + (sm - this.soloMix) * k;
      if (Math.abs(sm - n) < 0.004) n = sm;
      this.soloMix = n;
      moving = true;
    }

    let ringMove = false;
    for (const p of this.positions.values()) {
      if (!p.transit && !p.progressed && !p.overlay) continue;
      let d = p.lon - p.drawLon;
      while (d > 180) d -= 360;
      while (d < -180) d += 360;
      if (Math.abs(d) < 0.02) {
        if (p.drawLon !== p.lon) {
          p.drawLon = p.lon;
          ringMove = true;
        }
        continue;
      }
      p.drawLon = norm(p.drawLon + d * k);
      ringMove = true;
    }
    if (ringMove) this.updatePoints();
    return moving || ringMove;
  }

  /** Jump every tween to its target (used by mini wheels). */
  snap() {
    this.tween(1e9);
    this.render();
  }

  /* ---- render ---- */

  render() {
    try {
      this.paint();
    } catch (err) {
      console.warn("wheel render", err);
    }
  }

  paint() {
    const { ctx, dpr, size } = this;
    if (!size || !this.r) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    this.drawDisc();
    this.drawSigns();
    this.drawBezel();
    if (this.model.meta?.waiting) {
      const [x0, y0] = this.pt(this.model.asc, this.r.bezelOut);
      const [x1, y1] = this.pt(this.model.asc, this.r.bezelOut + this.R * 0.045);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = rgba(RGB.gold, 0.9);
      ctx.lineWidth = 2;
      ctx.stroke();
      this.drawCenter();
      return;
    }
    const mode = this.ringMode();
    if (!this.opts.mini && mode === "vault") this.drawOther();
    else if (!this.opts.mini && mode === "progressed") this.drawProgressed();
    else if (!this.opts.mini && mode === "now") this.drawTransits();
    this.drawHouses();
    this.drawAspects();
    if (!this.opts.mini) this.drawHitLine();
    if (this.solo && this.soloMix > 0.001) this.drawPattern();
    this.drawConjunctions();
    this.drawPlanets();
    this.drawAngles();
    this.drawCenter();
  }

  drawDisc() {
    const { ctx, cx, cy, r } = this;
    const g = ctx.createRadialGradient(cx, cy, r.aspect * 0.2, cx, cy, r.bezelOut);
    g.addColorStop(0, rgba(RGB.inkDeep, 0.94));
    g.addColorStop(0.55, rgba(RGB.ink, 0.88));
    g.addColorStop(1, rgba(RGB.ink, 0.55));
    ctx.beginPath();
    safeArc(ctx,cx, cy, r.bezelOut, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.beginPath();
    safeArc(ctx,cx, cy, r.signOut, 0, TAU);
    safeArc(ctx,cx, cy, r.signIn, 0, TAU, true);
    ctx.fillStyle = rgba(RGB.inkRaise, 0.55);
    ctx.fill();

    ctx.beginPath();
    safeArc(ctx,cx, cy, r.aspect, 0, TAU);
    ctx.fillStyle = rgba(RGB.inkDeep, 0.5);
    ctx.fill();
  }

  drawSigns() {
    const { ctx, cx, cy, r, model } = this;
    const mini = this.opts.mini;
    const dim = 1 - 0.35 * this.soloMix;
    const glyphPx = mini ? 0 : clamp(this.R * 0.05, 11, 21);
    const mid = (r.signIn + r.signOut) / 2;

    for (const sign of model.signs) {
      const [a1, a0] = this.arcRange(sign.start, sign.start + 30);
      const count = model.signCount.get(sign.id) || 0;
      const alpha = Math.min(0.24, (ELEMENT_ALPHA[sign.element] || 0.05) + count * 0.024);
      ctx.beginPath();
      safeArc(ctx,cx, cy, r.signOut, a1, a0);
      safeArc(ctx,cx, cy, r.signIn, a0, a1, true);
      ctx.closePath();
      ctx.fillStyle = rgba(ELEMENT_RGB[sign.element] || RGB.bone, alpha);
      ctx.fill();

      if (count >= 3 && !mini) {
        const glow = ctx.createRadialGradient(cx, cy, r.signIn * 0.92, cx, cy, r.signOut);
        glow.addColorStop(0, rgba(RGB.gold, 0));
        glow.addColorStop(1, rgba(RGB.gold, 0.16));
        ctx.fillStyle = glow;
        ctx.fill();
      }

      const [sx, sy] = this.pt(sign.start, r.signIn);
      const [ex, ey] = this.pt(sign.start, r.bezelOut);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = rgba(RGB.bone, mini ? 0.22 : 0.3);
      ctx.lineWidth = 1;
      ctx.stroke();

      if (!mini) {
        const [gx, gy] = this.pt(sign.start + 15, mid);
        const tint = ELEMENT_GLYPH_RGB[sign.element] || RGB.bone;
        const ga = (sign.element === "fire" ? 0.92 : 0.72) * dim;
        ctx.font = `${glyphPx}px ${FONT_SYMBOL}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = rgba(tint, ga);
        ctx.fillText(sign.glyph, gx, gy);
      }
    }

    ctx.beginPath();
    safeArc(ctx,cx, cy, r.signIn, 0, TAU);
    ctx.strokeStyle = rgba(RGB.bone, 0.28);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  drawBezel() {
    const { ctx, cx, cy, r } = this;
    const mini = this.opts.mini;
    const R = this.R;
    ctx.beginPath();
    safeArc(ctx,cx, cy, r.bezelOut, 0, TAU);
    ctx.strokeStyle = rgba(RGB.gold, mini ? 0.35 : 0.55);
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    safeArc(ctx,cx, cy, r.bezelOut - 1.2, 0, TAU);
    ctx.strokeStyle = rgba(RGB.bone, mini ? 0.18 : 0.32);
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    safeArc(ctx,cx, cy, r.bezelIn, 0, TAU);
    ctx.strokeStyle = rgba(RGB.gold, 0.18);
    ctx.stroke();

    const classes = mini
      ? [{ every: 10, len: 0.02, alpha: 0.45 }]
      : [
          { every: 1, len: 0.011, alpha: 0.2 },
          { every: 5, len: 0.02, alpha: 0.4 },
          { every: 10, len: 0.03, alpha: 0.55 },
          { every: 30, len: 0.04, alpha: 0.72 },
        ];
    for (const c of classes) {
      ctx.beginPath();
      for (let d = 0; d < 360; d += c.every) {
        if (c.every === 1 && d % 5 === 0) continue;
        if (c.every === 5 && d % 10 === 0) continue;
        if (c.every === 10 && d % 30 === 0) continue;
        const [x0, y0] = this.pt(d, r.bezelOut);
        const [x1, y1] = this.pt(d, r.bezelOut - R * c.len);
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
      }
      ctx.strokeStyle = rgba(c.every === 30 || c.every === 10 ? RGB.gold : RGB.bone, c.alpha);
      ctx.lineWidth = c.every === 30 ? 1.2 : c.every === 10 ? 1.1 : 0.8;
      ctx.stroke();
    }
  }

  drawTransits() {
    if (!this.r) this.layout();
    const transits = this.model.now?.transits;
    if (!transits || this.opts.mini) return;
    const { ctx, r } = this;
    const R = this.R;
    const pulse = this.opts.reducedMotion ? 1 : 0.55 + 0.45 * Math.sin((this._clock || 0) / 420);
    const hitId = this.activeHit?.tId;
    ctx.save();
    ctx.beginPath();
    safeArc(ctx,this.cx, this.cy, r.transit, 0, TAU);
    ctx.strokeStyle = rgba(RGB.steel, 0.28);
    ctx.lineWidth = 1;
    ctx.stroke();
    for (const t of transits) {
      const p = this.positions.get("t:" + t.id);
      const lon = p ? p.drawLon : t.lon;
      const glow = t.id === this.pulseTransit || t.id === hitId ? pulse : 1;
      const [x0, y0] = this.pt(lon, r.transit);
      const [x1, y1] = this.pt(lon, r.transit - R * 0.02);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = rgba(RGB.steel, 0.5 + 0.35 * glow);
      ctx.lineWidth = t.id === hitId ? 1.8 : 1.1;
      ctx.stroke();
      const [gx, gy] = this.pt(lon, r.transit);
      ctx.font = `${clamp(this.R * 0.028, 8, 11)}px ${FONT_SYMBOL}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = rgba(t.id === hitId || t.id === this.pulseTransit ? RGB.gold : RGB.steel, 0.72 + 0.28 * glow);
      ctx.fillText(t.glyph, gx, gy);
    }
    ctx.restore();
  }

  drawProgressed() {
    if (!this.r) this.layout();
    const planets = this.model.progressed?.planets || [];
    if (!planets.length) return;
    const { ctx, r } = this;
    const R = this.R;
    const hitId = this.activeHit?.tId;
    ctx.beginPath();
    safeArc(ctx,this.cx, this.cy, r.prog, 0, TAU);
    ctx.strokeStyle = rgba(RGB.steel, 0.38);
    ctx.lineWidth = 1;
    ctx.stroke();
    for (const t of planets) {
      const p = this.positions.get("p:" + t.id);
      const lon = p ? p.drawLon : t.lon;
      const [x0, y0] = this.pt(lon, r.prog);
      const [x1, y1] = this.pt(lon, r.prog - R * 0.018);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = rgba(RGB.steel, 0.7);
      ctx.stroke();
      ctx.font = `${clamp(this.R * 0.03, 8, 12)}px ${FONT_SYMBOL}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = rgba(t.id === hitId ? RGB.gold : RGB.steel, 0.92);
      const [gx, gy] = this.pt(lon, r.prog);
      ctx.fillText(t.glyph, gx, gy);
    }
  }

  drawHitLine() {
    const hit = this.activeHit || this.model.activeHit;
    if (!hit) return;
    const natal = this.model.byId.get(hit.nId);
    if (!natal) return;
    const prefix = hit.kind === "progression" ? "p:" : "t:";
    const tp = this.positions.get(prefix + hit.tId);
    const np = this.positions.get(hit.nId);
    if (!tp || !np) return;
    const { ctx } = this;
    const hard = hit.type === "square" || hit.type === "opposition";
    const color = hard ? RGB.ember : RGB.gold;
    ctx.beginPath();
    ctx.moveTo(tp.x, tp.y);
    ctx.lineTo(np.x, np.y);
    ctx.strokeStyle = rgba(color, 0.12);
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tp.x, tp.y);
    ctx.lineTo(np.x, np.y);
    ctx.strokeStyle = rgba(color, 0.85);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  drawOther() {
    const others = this.model.other?.planets || [];
    if (!others.length) return;
    const { ctx, r } = this;
    const R = this.R;
    const glyphPx = this.glyphSize() * 0.78;
    ctx.beginPath();
    safeArc(ctx,this.cx, this.cy, r.otherBand, 0, TAU);
    ctx.strokeStyle = rgba(RGB.steel, 0.35);
    ctx.lineWidth = 1;
    ctx.stroke();
    for (const b of others) {
      const oid = "o:" + b.id;
      const p = this.positions.get(oid);
      if (!p) continue;
      const [x0, y0] = this.pt(b.lon, r.otherBand);
      const [x1, y1] = this.pt(b.lon, r.otherBand - R * 0.02);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = rgba(RGB.steel, 0.7);
      ctx.stroke();
      if (this.hot === oid || this.selected === oid) {
        ctx.beginPath();
        safeArc(ctx,p.x, p.y, glyphPx * 0.95, 0, TAU);
        ctx.strokeStyle = rgba(RGB.gold, 0.85);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.font = `${glyphPx}px ${FONT_SYMBOL}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = rgba(RGB.steel, 0.95);
      ctx.fillText(b.glyph, p.x, p.y);
    }
  }

  drawHouses() {
    const { ctx, cx, cy, r, model } = this;
    const mini = this.opts.mini;
    const R = this.R;
    const houses = model.houses;

    for (let i = 0; i < houses.length; i++) {
      const h = houses[i];
      const isAngle = h.id === 1 || h.id === 4 || h.id === 7 || h.id === 10;
      const [x0, y0] = this.pt(h.lon, r.aspect);
      const [x1, y1] = this.pt(h.lon, isAngle ? r.bezelOut : r.signIn);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = rgba(RGB.bone, isAngle ? 0.55 : 0.2);
      ctx.lineWidth = isAngle ? 1.3 : 0.8;
      ctx.stroke();

      if (isAngle && (h.id === 1 || h.id === 10)) {
        const a = this.angle(h.lon);
        const tipR = r.bezelOut + R * 0.018;
        const baseR = r.bezelOut - R * 0.006;
        const spread = 0.012;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * tipR, cy + Math.sin(a) * tipR);
        ctx.lineTo(cx + Math.cos(a + spread) * baseR, cy + Math.sin(a + spread) * baseR);
        ctx.lineTo(cx + Math.cos(a - spread) * baseR, cy + Math.sin(a - spread) * baseR);
        ctx.closePath();
        ctx.fillStyle = rgba(RGB.gold, 0.9);
        ctx.fill();
      }

      if (!mini) {
        const next = houses[(i + 1) % houses.length];
        const span = norm(next.lon - h.lon);
        const midLon = h.lon + span / 2;
        const [nx, ny] = this.pt(midLon, r.houseNum);
        ctx.font = `${this.monoSize()}px ${FONT_MONO}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = rgba(RGB.bone, 0.38);
        ctx.fillText(String(h.id), nx, ny);
      }
    }

    ctx.beginPath();
    safeArc(ctx,cx, cy, r.aspect, 0, TAU);
    ctx.strokeStyle = rgba(RGB.bone, 0.26);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  drawAspects() {
    const { ctx, r, model } = this;
    const mini = this.opts.mini;
    model.aspects.forEach((a, i) => {
      if (a.type === "conjunction") return;
      const A = model.byId.get(a.a);
      const B = model.byId.get(a.b);
      if (!A || !B) return;
      const key = "a" + i;
      const vis = this.vis.get(key);
      const lit = this.lit.get(key);
      const t = clamp(a.orb / 8, 0, 1);
      const base = lerp(0.9, 0.16, t);
      const alpha = clamp(base * vis + lit * 0.3, 0, 1);
      const width = (mini ? 0.7 : lerp(1.6, 0.8, t)) + lit * 0.7;
      const color = a.hard ? RGB.ember : RGB.gold;
      const [x0, y0] = this.pt(A.lon, r.aspect);
      const [x1, y1] = this.pt(B.lon, r.aspect);

      if (a.orb <= 2 && !mini) {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.strokeStyle = rgba(color, 0.09 * vis + 0.1 * lit);
        ctx.lineWidth = 5;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = rgba(color, alpha);
      ctx.lineWidth = width;
      ctx.stroke();

      if (lit > 0.01 && !mini) {
        ctx.fillStyle = rgba(color, lit * 0.9);
        ctx.beginPath();
        safeArc(ctx,x0, y0, 2.2, 0, TAU);
        safeArc(ctx,x1, y1, 2.2, 0, TAU);
        ctx.fill();
      }
    });
  }

  drawConjunctions() {
    const { ctx, cx, cy, r, model } = this;
    const soloSet = this.soloMembers();
    const clusterSolo = soloSet && this.isClusterSolo();
    model.aspects.forEach((a, i) => {
      if (a.type !== "conjunction") return;
      if (clusterSolo && soloSet.has(a.a) && soloSet.has(a.b)) return;
      const A = model.byId.get(a.a);
      const B = model.byId.get(a.b);
      if (!A || !B) return;
      const vis = this.vis.get("a" + i);
      const alpha = lerp(0.75, 0.28, clamp(a.orb / 8, 0, 1)) * vis;
      const [start, end] = clusterSpan([A.lon, B.lon]);
      const [a1, a0] = this.arcRange(start, end);
      ctx.beginPath();
      safeArc(ctx,cx, cy, r.bracket, a1, a0);
      ctx.strokeStyle = rgba(RGB.gold, alpha);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      const tick = this.R * 0.014;
      for (const lon of [start, end]) {
        const [x0, y0] = this.pt(lon, r.bracket - tick);
        const [x1, y1] = this.pt(lon, r.bracket + tick);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
    });
  }

  isClusterSolo() {
    const pat = this.model.patternById.get(this.solo);
    if (!pat) return false;
    const members = pat.members.map((id) => this.model.byId.get(id)).filter(Boolean);
    let maxSep = 0;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) maxSep = Math.max(maxSep, sep(members[i].lon, members[j].lon));
    }
    return maxSep < 40;
  }

  drawPattern() {
    const { ctx, cx, cy, r, model } = this;
    const pat = model.patternById.get(this.solo);
    if (!pat) return;
    const mix = this.soloMix;
    const members = pat.members.map((id) => model.byId.get(id)).filter(Boolean);
    if (members.length < 2) return;
    const R = this.R;

    if (this.isClusterSolo()) {
      const [start, end] = clusterSpan(members.map((m) => m.lon));
      const [a1, a0] = this.arcRange(start, end);

      ctx.beginPath();
      safeArc(ctx,cx, cy, r.signIn, a1, a0);
      safeArc(ctx,cx, cy, r.aspect, a0, a1, true);
      ctx.closePath();
      const g = ctx.createRadialGradient(cx, cy, r.aspect, cx, cy, r.signIn);
      g.addColorStop(0, rgba(RGB.gold, 0.02 * mix));
      g.addColorStop(1, rgba(RGB.ember, 0.14 * mix));
      ctx.fillStyle = g;
      ctx.fill();

      ctx.beginPath();
      safeArc(ctx,cx, cy, r.bracket, a1, a0);
      ctx.strokeStyle = rgba(RGB.gold, 0.14 * mix);
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.beginPath();
      safeArc(ctx,cx, cy, r.bracket, a1, a0);
      ctx.strokeStyle = rgba(RGB.gold, 0.9 * mix);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      const tick = R * 0.022;
      for (const lon of [start, end]) {
        const [x0, y0] = this.pt(lon, r.bracket - tick);
        const [x1, y1] = this.pt(lon, r.bracket + tick);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      return;
    }

    const edges = patternEdges(members);
    const anyHard = edges.some((e) => HARD.has(e.type));
    const fillColor = anyHard ? RGB.ember : RGB.gold;

    if (members.length >= 3) {
      const sorted = members.slice().sort((a, b) => norm(a.lon - model.asc) - norm(b.lon - model.asc));
      ctx.beginPath();
      sorted.forEach((m, i) => {
        const [x, y] = this.pt(m.lon, r.aspect);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = rgba(fillColor, (anyHard ? 0.06 : 0.075) * mix);
      ctx.fill();
    }

    for (const e of edges) {
      if (e.type === "conjunction") {
        const [start, end] = clusterSpan([e.a.lon, e.b.lon]);
        const [a1, a0] = this.arcRange(start, end);
        ctx.beginPath();
        safeArc(ctx,cx, cy, r.bracket, a1, a0);
        ctx.strokeStyle = rgba(RGB.gold, 0.9 * mix);
        ctx.lineWidth = 1.6;
        ctx.stroke();
        continue;
      }
      const hard = HARD.has(e.type);
      const color = hard ? RGB.ember : RGB.gold;
      const [x0, y0] = this.pt(e.a.lon, r.aspect);
      const [x1, y1] = this.pt(e.b.lon, r.aspect);
      const isBar = e.type === "opposition";
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = rgba(color, 0.14 * mix);
      ctx.lineWidth = isBar ? 9 : 7;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = rgba(color, 0.95 * mix);
      ctx.lineWidth = isBar ? 2.6 : 1.8;
      ctx.stroke();
      if (isBar) {
        const cap = R * 0.02;
        const ang = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2;
        for (const [x, y] of [[x0, y0], [x1, y1]]) {
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(ang) * cap, y + Math.sin(ang) * cap);
          ctx.lineTo(x - Math.cos(ang) * cap, y - Math.sin(ang) * cap);
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
      }
    }

    for (const m of members) {
      const [x, y] = this.pt(m.lon, r.aspect);
      ctx.beginPath();
      safeArc(ctx,x, y, this.opts.mini ? 2.4 : 3, 0, TAU);
      ctx.fillStyle = rgba(RGB.bone, 0.95 * mix);
      ctx.fill();
    }
  }

  drawPlanets() {
    const { ctx, r, model } = this;
    const mini = this.opts.mini;
    const R = this.R;
    const glyphPx = this.glyphSize();
    const monoPx = this.monoSize();
    const showDegrees = !mini && R > 190;
    const soloSet = this.soloMembers();

    for (const b of model.bodies) {
      if (b.isAngle) continue;
      const p = this.positions.get(b.id);
      const vis = this.vis.get(b.id);
      const tint = tintFor(b.id);

      if (mini) {
        const inSolo = soloSet && soloSet.has(b.id);
        const [x, y] = this.pt(b.lon, r.glyph);
        ctx.beginPath();
        safeArc(ctx,x, y, inSolo ? 3.6 : 2.2, 0, TAU);
        ctx.fillStyle = rgba(tint, 0.25 + 0.75 * vis);
        ctx.fill();
        continue;
      }

      const [tx0, ty0] = this.pt(b.lon, r.band);
      const [tx1, ty1] = this.pt(b.lon, r.band - R * 0.026);
      ctx.beginPath();
      ctx.moveTo(tx0, ty0);
      ctx.lineTo(tx1, ty1);
      ctx.strokeStyle = rgba(tint, 0.25 + 0.7 * vis);
      ctx.lineWidth = 1.2;
      ctx.stroke();

      if (Math.abs(sep(p.drawLon, b.lon)) > 0.25) {
        const [lx, ly] = this.pt(p.drawLon, r.glyph + glyphPx * 0.8);
        ctx.beginPath();
        ctx.moveTo(tx1, ty1);
        ctx.lineTo(lx, ly);
        ctx.strokeStyle = rgba(tint, 0.35 * vis);
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      const ringV = this.ring.get(b.id);
      if (ringV > 0.01) {
        ctx.beginPath();
        safeArc(ctx,p.x, p.y, glyphPx * 0.95, 0, TAU);
        ctx.strokeStyle = rgba(RGB.gold, 0.9 * ringV);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        safeArc(ctx,p.x, p.y, glyphPx * 0.95, 0, TAU);
        ctx.fillStyle = rgba(RGB.gold, 0.08 * ringV);
        ctx.fill();
      }

      ctx.font = `${glyphPx}px ${FONT_SYMBOL}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = rgba(tint, 0.15 + 0.85 * vis);
      ctx.fillText(b.glyph, p.x, p.y);
      if (b.retro && !mini) {
        ctx.font = `${Math.max(8, monoPx - 1)}px ${FONT_MONO}`;
        ctx.fillStyle = rgba(RGB.steel, 0.85 * vis);
        ctx.fillText("R", p.x + glyphPx * 0.58, p.y - glyphPx * 0.42);
      }

      if (showDegrees) {
        const [dx, dy] = this.pt(p.drawLon, r.degree);
        ctx.font = `${monoPx}px ${FONT_MONO}`;
        ctx.fillStyle = rgba(RGB.bone, 0.5 * vis);
        ctx.fillText(b.degLabel, dx, dy);
      }
    }
  }

  drawAngles() {
    const { ctx, r, model } = this;
    if (this.opts.mini) return;
    const px = clamp(this.R * 0.038, 10, 15);
    ctx.font = `600 ${px}px ${FONT_DISPLAY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const ang of model.angleLabels) {
      const body = model.byId.get(ang.id);
      const vis = body ? this.vis.get(ang.id) : 0.55;
      let x;
      let y;
      if (body) {
        const p = this.positions.get(ang.id);
        x = p.x;
        y = p.y;
      } else {
        [x, y] = this.pt(ang.lon, r.label);
      }
      const ringV = body ? this.ring.get(ang.id) : 0;
      if (ringV > 0.01) {
        ctx.beginPath();
        safeArc(ctx,x, y, px * 1.05, 0, TAU);
        ctx.strokeStyle = rgba(RGB.gold, 0.9 * ringV);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.fillStyle = rgba(body ? RGB.gold : RGB.bone, body ? 0.35 + 0.65 * vis : 0.5);
      ctx.fillText(ang.label, x, y);
    }
  }

  drawCenter() {
    const { ctx, cx, cy } = this;
    ctx.beginPath();
    safeArc(ctx,cx, cy, this.opts.mini ? 1.2 : 2, 0, TAU);
    ctx.fillStyle = rgba(RGB.gold, 0.9);
    ctx.fill();
    if (!this.opts.mini) {
      ctx.beginPath();
      safeArc(ctx,cx, cy, this.R * 0.05, 0, TAU);
      ctx.strokeStyle = rgba(RGB.bone, 0.18);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}
