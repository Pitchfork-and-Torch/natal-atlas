/* atlas.js - selection, inspector, pattern solos, keyboard.
   Builds the read model from a computed chart and binds it to the wheel and the dock. */

import { NatalWheel, HARD, cssTint, norm } from "./wheel.js?v=1.2.6";
import { aspectarianTable } from "./aspectarian.js?v=1.2.6";

/* --------------------------------------------------------------- format */

const pad2 = (n) => String(n).padStart(2, "0");

export function fmtDeg(deg, min) {
  return `${pad2(deg)}\u00B0${pad2(min)}'`;
}

export function fmtDelta(decimalDeg) {
  const total = Math.round(Math.abs(decimalDeg) * 60);
  return fmtDeg(Math.floor(total / 60), total % 60);
}

export function fmtPos(body) {
  return `${fmtDeg(body.deg, body.min)} ${body.sign}`;
}

export function fmtPosHouse(body) {
  return `${fmtPos(body)}, house ${body.house}`;
}

export function fmtCoord(lat, lon) {
  const la = `${Math.abs(lat).toFixed(4)} ${lat >= 0 ? "N" : "S"}`;
  const lo = `${Math.abs(lon).toFixed(4)} ${lon >= 0 ? "E" : "W"}`;
  return `${la}, ${lo}`;
}

export function spokenPos(body) {
  return `${body.deg} degrees ${body.min} ${body.sign}, house ${body.house}`;
}

const ANGLE_SHORT = { asc: "AC", mc: "MC", dsc: "DC", ic: "IC" };

/* ---------------------------------------------------------------- model */

export function buildModel(chart) {
  const signs = chart.signs.map((s) => ({ ...s }));
  const signByName = new Map(signs.map((s) => [s.name, s]));
  const angles = chart.angles;

  const bodies = chart.planets.map((p) => ({
    ...p,
    isAngle: false,
    degLabel: fmtDeg(p.deg, p.min),
    element: signByName.get(p.sign)?.element || null,
    modality: signByName.get(p.sign)?.modality || null,
  }));

  for (const key of ["ascendant", "mc"]) {
    const a = angles[key];
    if (!a) continue;
    bodies.push({
      ...a,
      glyph: ANGLE_SHORT[a.id] || a.name,
      short: ANGLE_SHORT[a.id] || a.name,
      kind: "angle",
      isAngle: true,
      degLabel: fmtDeg(a.deg, a.min),
      element: signByName.get(a.sign)?.element || null,
      modality: signByName.get(a.sign)?.modality || null,
    });
  }

  const byId = new Map(bodies.map((b) => [b.id, b]));
  const asc = angles.ascendant.lon;
  const mc = angles.mc.lon;

  const houses = chart.houses.slice().sort((a, b) => a.id - b.id);

  const aspects = chart.aspects
    .filter((a) => byId.has(a.a) && byId.has(a.b))
    .map((a) => ({ ...a, hard: HARD.has(a.type) }));

  const linked = new Set();
  for (const a of aspects) {
    linked.add(a.a + "|" + a.b);
    linked.add(a.b + "|" + a.a);
  }

  const patterns = chart.patterns.map((p, i) => ({
    ...p,
    key: i + 1,
    members: p.members.filter((id) => byId.has(id)),
  }));
  const patternById = new Map(patterns.map((p) => [p.id, p]));
  const themeById = new Map((chart.themes || []).map((t) => [t.id, t]));

  const signCount = new Map();
  for (const b of bodies) {
    if (b.isAngle) continue;
    const s = signByName.get(b.sign);
    if (s) signCount.set(s.id, (signCount.get(s.id) || 0) + 1);
  }

  const order = bodies.slice().sort((a, b) => norm(a.lon - asc) - norm(b.lon - asc));

  const angleLabels = [
    { id: "asc", label: "AC", lon: asc },
    { id: "mc", label: "MC", lon: mc },
    { id: "dsc", label: "DC", lon: angles.descendant ? angles.descendant.lon : norm(asc + 180) },
    { id: "ic", label: "IC", lon: angles.ic ? angles.ic.lon : norm(mc + 180) },
  ];

  const planets = bodies.filter((b) => !b.isAngle);
  const tally = {
    total: planets.length,
    elements: countBy(planets, "element", ["fire", "earth", "air", "water"]),
    modalities: countBy(planets, "modality", ["cardinal", "fixed", "mutable"]),
  };

  return {
    meta: chart.meta,
    signs,
    signByName,
    signCount,
    angles,
    asc,
    mc,
    houses,
    bodies,
    byId,
    order,
    aspects,
    linked,
    patterns,
    patternById,
    themes: chart.themes || [],
    themeById,
    angleLabels,
    tally,
    now: chart.now || null,
    other: chart.other || null,
    synastry: chart.synastry || [],
    progressed: chart.progressed || null,
    ringMode: chart.ringMode || (chart.other ? "vault" : "now"),
    activeHit: chart.activeHit || null,
  };
}

function countBy(list, key, keys) {
  const out = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const item of list) {
    if (item[key] in out) out[item[key]] += 1;
  }
  return out;
}

/* ------------------------------------------------------------------ dom */

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "style") node.setAttribute("style", v);
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : String(v));
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

const SOLO_LABELS = {
  stellium: "Stellium",
  "t-square": "T-square",
  "grand-trine": "Grand trine",
  kite: "Kite",
};

export function soloLabel(pattern) {
  return SOLO_LABELS[pattern.id] || pattern.name;
}

const ARROWS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

/* ------------------------------------------------------------- controller */

export function createAtlas({ model, dom, reducedMotion }) {
  const state = { selected: null, solo: null, hotPointer: null, hotFocus: null, heroVisible: true };
  const sheetQuery = window.matchMedia("(max-width: 1099.98px)");
  const targetsById = new Map();
  const ac = new AbortController();
  const on = { signal: ac.signal };

  const wheel = new NatalWheel(dom.canvas, model, {
    reducedMotion,
    onTap: (id) => {
      if (id) select(id, { focus: false });
      else if (state.selected) clearSelection();
    },
    onLayout: (positions) => {
      for (const [id, p] of positions) {
        const btn = targetsById.get(id);
        if (!btn) continue;
        btn.style.setProperty("--x", `${p.x.toFixed(1)}px`);
        btn.style.setProperty("--y", `${p.y.toFixed(1)}px`);
      }
      positionTip();
    },
  });

  /* ---- targets: real buttons over the canvas for keyboard and AT ---- */

  for (const body of model.order) {
    const btn = el("button", {
      type: "button",
      class: "target",
      dataset: { body: body.id },
      "aria-label": `${body.name}, ${spokenPos(body)}`,
      onclick: () => select(body.id, { focus: false }),
      onfocus: () => setHot(body.id, "focus"),
      onblur: () => setHot(null, "focus"),
    });
    targetsById.set(body.id, btn);
    dom.targets.append(btn);
  }
  wheel.updatePoints();

  {
    const hold = (btn, dir) => {
      if (!btn) return;
      let timer = 0;
      const step = () => wheel.nudge(dir * 0.2);
      const stop = () => window.clearInterval(timer);
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        step();
        window.clearInterval(timer);
        timer = window.setInterval(step, 70);
      }, on);
      btn.addEventListener("pointerup", stop, on);
      btn.addEventListener("pointerleave", stop, on);
      btn.addEventListener("pointercancel", stop, on);
    };
    hold(document.getElementById("wheel-ccw"), -1);
    hold(document.getElementById("wheel-cw"), 1);
  }

  /* ---- pointer on the canvas ---- */

  function localPoint(e) {
    const rect = dom.canvas.getBoundingClientRect();
    const scale = rect.width ? wheel.size / rect.width : 1;
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale };
  }

  dom.stage.addEventListener("pointerenter", () => wheel.wake(), on);
  dom.canvas.addEventListener("pointermove", (e) => {
    if (wheel.dragging) return;
    const { x, y } = localPoint(e);
    setHot(wheel.bodyAt(x, y, true), "pointer");
  }, on);
  dom.canvas.addEventListener("pointerleave", () => setHot(null, "pointer"), on);

  function setHot(id, source) {
    if (source === "pointer") state.hotPointer = id;
    else state.hotFocus = id;
    const hot = state.hotPointer || state.hotFocus;
    wheel.setHot(hot);
    dom.stage.classList.toggle("is-pointing", Boolean(state.hotPointer));
    renderTip(hot);
  }

  function renderTip(id) {
    if (!id) {
      dom.tip.hidden = true;
      dom.tip.dataset.body = "";
      return;
    }
    let label = "";
    let pos = "";
    if (String(id).startsWith("o:")) {
      const body = overlayBody(id.slice(2));
      if (!body) {
        dom.tip.hidden = true;
        return;
      }
      label = `Outer ${body.name}`;
      pos = fmtPosHouse(body);
    } else if (String(id).startsWith("t:")) {
      const t = (model.now?.transits || []).find((x) => x.id === id.slice(2));
      if (!t) {
        dom.tip.hidden = true;
        return;
      }
      label = `t. ${t.name}`;
      pos = fmtPos(t);
    } else {
      const body = model.byId.get(id);
      if (!body) {
        dom.tip.hidden = true;
        return;
      }
      label = body.name;
      pos = fmtPosHouse(body);
    }
    dom.tip.replaceChildren(el("strong", { text: label }), pos);
    dom.tip.dataset.body = id;
    dom.tip.hidden = false;
    positionTip();
  }

  function positionTip() {
    const id = dom.tip.dataset.body;
    if (!id) return;
    const p = wheel.positions.get(id);
    if (!p) return;
    const natal = model.byId.get(id);
    const lift = natal?.isAngle ? 10 : wheel.glyphSize() * 0.6;
    dom.tip.style.setProperty("--x", `${p.x.toFixed(1)}px`);
    dom.tip.style.setProperty("--y", `${(p.y - lift).toFixed(1)}px`);
  }

  /* ---- selection ---- */

  function select(id, opts = {}) {
    if (typeof id === "string" && id.startsWith("t:")) {
      const tid = id.slice(2);
      const hit = (model.now?.hits || []).find((h) => h.transit === tid);
      if (!hit) return;
      id = hit.natal;
    }
    if (typeof id === "string" && id.startsWith("o:")) {
      state.selected = id;
      wheel.setSelected(id);
      renderDock();
      updateAria();
      openSheet();
      return;
    }
    if (!model.byId.has(id)) return;
    state.selected = id;
    wheel.setSelected(id);
    renderDock();
    updateAria();
    if (opts.focus) targetsById.get(id)?.focus({ preventScroll: true });
    openSheet();
  }

  function clearSelection() {
    if (!state.selected) return;
    state.selected = null;
    wheel.setSelected(null);
    renderDock();
    updateAria();
    if (!state.solo) closeSheet();
  }

  function setSolo(id, opts = {}) {
    const next = id && model.patternById.has(id) ? id : null;
    if (state.solo === next && !opts.force) return;
    state.solo = next;
    wheel.setSolo(next);
    updateSoloButtons();
    renderDock();
    updateAria();
    if (next) {
      const p = model.patternById.get(next);
      announce(`Soloing ${p.name}: ${memberNames(p)}.`);
    } else if (!opts.silent) {
      announce("Solo cleared.");
    }
    if (next && !state.selected) openSheet();
    if (!next && !state.selected) closeSheet();
  }

  function toggleSolo(id) {
    setSolo(state.solo === id ? null : id);
  }

  function soloAndJump(id) {
    setSolo(id);
    jumpToWheel(null);
  }

  function jumpToWheel(bodyId) {
    dom.stage.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    const target = bodyId ? targetsById.get(bodyId) : null;
    window.setTimeout(() => {
      if (target) target.focus({ preventScroll: true });
      else dom.stage.focus({ preventScroll: true });
    }, reducedMotion ? 0 : 450);
  }

  function memberNames(p) {
    return p.members.map((id) => model.byId.get(id)?.name).filter(Boolean).join(", ");
  }

  /* ---- solo buttons ---- */

  const soloButtons = [];
  {
    const all = el("button", {
      type: "button",
      class: "solo-btn",
      dataset: { solo: "" },
      "aria-pressed": "true",
      onclick: () => setSolo(null),
    }, el("kbd", { text: "0" }), "Everything");
    soloButtons.push(all);
    for (const p of model.patterns) {
      soloButtons.push(
        el("button", {
          type: "button",
          class: "solo-btn",
          dataset: { solo: p.id },
          "aria-pressed": "false",
          title: p.name,
          onclick: () => toggleSolo(p.id),
        }, el("kbd", { text: String(p.key) }), soloLabel(p)),
      );
    }
    dom.soloButtons.replaceChildren(...soloButtons);
  }

  function updateSoloButtons() {
    for (const btn of soloButtons) {
      const id = btn.dataset.solo || null;
      btn.setAttribute("aria-pressed", String(id === state.solo));
    }
  }

  /* ---- dock / inspector ---- */

  function renderDock() {
    let content;
    if (typeof state.selected === "string" && state.selected.startsWith("o:")) {
      content = overlayReading(state.selected.slice(2));
    } else if (state.selected) content = readingFor(model.byId.get(state.selected));
    else if (state.solo) content = patternReading(model.patternById.get(state.solo));
    else content = emptyState();
    dom.dockBody.replaceChildren(content);
    dom.dockBody.scrollTop = 0;
  }

  function readingFor(body) {
    const aspects = model.aspects
      .filter((a) => a.a === body.id || a.b === body.id)
      .sort((x, y) => x.orb - y.orb);
    const glyph = el("span", {
      class: "reading-glyph" + (body.isAngle ? " is-text" : ""),
      "aria-hidden": "true",
      text: body.isAngle ? body.short : body.glyph,
    });
    const soloNote = state.solo ? model.patternById.get(state.solo) : null;
    return el("article", { class: "reading", style: `--tint: ${cssTint(body.id)}` },
      el("div", { class: "reading-top" },
        glyph,
        el("div", {},
          el("h2", { class: "reading-name" },
            body.name,
            body.retro ? el("span", { class: "reading-retro", text: "Rx" }) : null,
          ),
          el("p", { class: "reading-pos mono", text: fmtPosHouse(body) }),
        ),
      ),
      state.hit && state.hit.nId === body.id
        ? el("p", { class: "reading-pos mono", text: `Chronograph: t. ${state.hit.tId} ${state.hit.type} natal ${body.name}, ${state.hit.phase || "exact"}${state.hit.station ? ", station" : ""}.` })
        : null,
      body.headline ? el("h3", { class: "reading-headline", text: body.headline }) : null,
      body.body ? el("p", { class: "reading-body", text: body.body }) : null,
      el("div", { class: "reading-actions" },
        el("button", { type: "button", class: "btn btn-ghost btn-small jump", onclick: () => jumpToWheel(body.id) }, "Show on wheel"),
        el("button", { type: "button", class: "btn btn-ghost btn-small", onclick: () => clearSelection() }, "Clear ", el("kbd", { text: "Esc" })),
      ),
      soloNote
        ? el("p", { class: "asp-note", style: "padding-left:0; margin-top: 0.75rem" },
            `Solo on: ${soloNote.name}. `,
            el("button", { type: "button", class: "asp-other", style: "color: var(--gold)", onclick: () => setSolo(null) }, "Clear solo"))
        : null,
      aspects.length
        ? el("section", { class: "reading-aspects" },
            el("h4", { class: "mono" }, "Aspects", el("span", { text: String(aspects.length) })),
            el("ul", {}, aspects.map((a) => aspectRow(a, body.id))),
          )
        : null,
      transitHits(body.id),
      synastryFor(body.id),
    );
  }

  function overlayBody(id) {
    return (model.other?.planets || []).find((p) => p.id === id)
      || (id === "asc" ? model.other?.angles?.ascendant : null)
      || (id === "mc" ? model.other?.angles?.mc : null);
  }

  function overlayReading(id) {
    const body = overlayBody(id);
    if (!body) return emptyState();
    const hits = (model.synastry || []).filter((h) => h.b === id).slice(0, 10);
    return el("article", { class: "reading" },
      el("p", { class: "mono dock-kicker", text: "Overlay" }),
      el("h2", { class: "reading-name", text: body.name }),
      el("p", { class: "reading-pos mono", text: fmtPosHouse(body) }),
      body.headline ? el("h3", { class: "reading-headline", text: body.headline }) : null,
      body.body ? el("p", { class: "reading-body", text: body.body }) : null,
      hits.length
        ? el("section", { class: "reading-aspects" },
            el("h4", { class: "mono" }, "To natal", el("span", { text: String(hits.length) })),
            el("ul", {}, hits.map((h) => {
              const n = model.byId.get(h.a);
              return el("li", { class: "asp" + (h.hard ? " is-hard" : "") },
                el("button", { type: "button", class: "asp-btn", dataset: { select: h.a } },
                  el("span", { class: "asp-type", text: h.type }),
                  el("span", { class: "asp-other", text: n ? n.name : h.a }),
                  el("span", { class: "asp-orb mono", text: `${h.orb}\u00B0` }),
                ),
              );
            })),
          )
        : el("p", { class: "empty-hint", text: "No tight synastry to this overlay body." }),
    );
  }

  function synastryFor(natalId) {
    const hits = (model.synastry || []).filter((h) => h.a === natalId).slice(0, 8);
    if (!hits.length) return null;
    const others = new Map((model.other?.planets || []).map((p) => [p.id, p]));
    return el("section", { class: "reading-aspects" },
      el("h4", { class: "mono" }, "Synastry", el("span", { text: String(hits.length) })),
      el("ul", {}, hits.map((h) => {
        const o = others.get(h.b) || overlayBody(h.b);
        return el("li", { class: "asp" + (h.hard ? " is-hard" : "") },
          el("button", { type: "button", class: "asp-btn", dataset: { select: "o:" + h.b } },
            el("span", { class: "asp-type", text: h.type }),
            el("span", { class: "asp-other", text: o ? `overlay ${o.name}` : h.b }),
            el("span", { class: "asp-orb mono", text: `${h.orb}\u00B0` }),
          ),
        );
      })),
    );
  }

  function transitHits(natalId) {
    const hits = (model.now?.hits || []).filter((h) => h.natal === natalId).slice(0, 8);
    if (!hits.length) return null;
    const tById = new Map((model.now.transits || []).map((t) => [t.id, t]));
    return el("section", { class: "reading-aspects" },
      el("h4", { class: "mono" }, "Transits now", el("span", { text: String(hits.length) })),
      el("ul", {}, hits.map((h) => {
        const t = tById.get(h.transit);
        return el("li", { class: "asp" + (h.type === "square" || h.type === "opposition" ? " is-hard" : "") },
          el("div", { class: "asp-btn", style: "cursor: default" },
            el("span", { class: "asp-mark", "aria-hidden": "true" }),
            el("span", {},
              el("span", { class: "asp-type", text: h.type }),
              el("span", { class: "asp-other", text: t ? `t. ${t.name}` : h.transit }),
            ),
            el("span", { class: "asp-orb mono", text: `${h.orb}\u00B0` }),
          ),
          h.note ? el("p", { class: "asp-note", text: h.note }) : null,
        );
      })),
    );
  }

  function aspectRow(a, selfId) {
    const otherId = a.a === selfId ? a.b : a.a;
    const other = model.byId.get(otherId);
    return el("li", { class: "asp" + (a.hard ? " is-hard" : "") + (a.type === "conjunction" ? " is-conj" : "") },
      el("button", { type: "button", class: "asp-btn", onclick: () => select(otherId, { focus: false }) },
        el("span", { class: "asp-mark", "aria-hidden": "true" }),
        el("span", {},
          el("span", { class: "asp-type", text: a.type }),
          el("span", { class: "asp-other", text: other.name }),
        ),
        el("span", { class: "asp-orb mono", text: `${a.orb}\u00B0 orb` }),
      ),
      a.note ? el("p", { class: "asp-note", text: a.note }) : null,
    );
  }

  function patternReading(p) {
    const members = p.members.map((id) => model.byId.get(id)).filter(Boolean);
    const inside = model.aspects
      .filter((a) => p.members.includes(a.a) && p.members.includes(a.b))
      .sort((x, y) => x.orb - y.orb);
    return el("article", { class: "reading reading-pattern" },
      el("p", { class: "reading-pos mono", style: "margin-top: 0.75rem", text: `Pattern ${p.key} of ${model.patterns.length}, key ${p.key}` }),
      el("h2", { class: "reading-name", style: "margin-top: 0.4rem", text: p.name }),
      p.headline ? el("h3", { class: "reading-headline", text: p.headline }) : null,
      p.body ? el("p", { class: "reading-body", text: p.body }) : null,
      el("ul", { class: "chips", "aria-label": "Members" },
        members.map((m) =>
          el("li", {},
            el("button", { type: "button", class: "chip", style: `--tint: ${cssTint(m.id)}`, onclick: () => select(m.id, { focus: false }) },
              el("span", { class: "glyph" + (m.isAngle ? " is-text" : ""), "aria-hidden": "true", text: m.isAngle ? m.short : m.glyph }),
              m.name,
            ),
          ),
        ),
      ),
      inside.length
        ? el("section", { class: "reading-aspects" },
            el("h4", { class: "mono" }, "Aspects inside the figure", el("span", { text: String(inside.length) })),
            el("ul", {}, inside.map((a) => aspectPairRow(a))),
          )
        : null,
      el("div", { class: "reading-actions" },
        el("button", { type: "button", class: "btn btn-ghost btn-small jump", onclick: () => jumpToWheel(null) }, "Show on wheel"),
        el("button", { type: "button", class: "btn btn-ghost btn-small", onclick: () => setSolo(null) }, "Clear solo ", el("kbd", { text: "Esc" })),
      ),
    );
  }

  function aspectPairRow(a) {
    const A = model.byId.get(a.a);
    const B = model.byId.get(a.b);
    return el("li", { class: "asp" + (a.hard ? " is-hard" : "") + (a.type === "conjunction" ? " is-conj" : "") },
      el("div", { class: "asp-btn", style: "cursor: default" },
        el("span", { class: "asp-mark", "aria-hidden": "true" }),
        el("span", {},
          el("span", { class: "asp-other", text: A.name }),
          el("span", { class: "asp-type", text: ` ${a.type} ` }),
          el("span", { class: "asp-other", text: B.name }),
        ),
        el("span", { class: "asp-orb mono", text: `${a.orb}\u00B0 orb` }),
      ),
      a.note ? el("p", { class: "asp-note", text: a.note }) : null,
    );
  }

  function emptyState() {
    const t = model.tally;
    const tints = { fire: "var(--gold)", earth: "var(--steel)", air: "var(--bone)", water: "var(--wine)" };
    const asc = model.byId.get("asc");
    const mc = model.byId.get("mc");
    const houseSystem = String(model.meta.houseSystem || "").split(" (")[0];
    return el("div", { class: "empty" },
      el("h2", { class: "empty-title", text: "Nothing selected" }),
      el("p", { class: "empty-hint" },
        "Hover a body. Click to read. Keys 1 to 4 solo a pattern."),
      aspectarianTable(model, (a, b) => {
        setSolo(null);
        select(a, { focus: false });
        window.setTimeout(() => select(b, { focus: false }), 0);
      }, el),
      el("section", { class: "tally" },
        el("h4", { class: "mono" }, `Elements, ${t.total} points`),
        el("ul", {},
          Object.entries(t.elements).map(([k, n]) =>
            el("li", {},
              el("span", { text: k[0].toUpperCase() + k.slice(1) }),
              el("span", { class: "bar", style: `--w: ${((n / t.total) * 100).toFixed(1)}%; --tint: ${tints[k]}`, "aria-hidden": "true" }),
              el("span", { class: "count mono", text: String(n) }),
            ),
          ),
        ),
      ),
      el("section", { class: "tally" },
        el("h4", { class: "mono" }, "Modalities"),
        el("p", { class: "tally-line" },
          Object.entries(t.modalities).map(([k, n]) => el("span", {}, el("b", { text: String(n) }), ` ${k}`)),
        ),
      ),
      el("section", { class: "tally" },
        el("h4", { class: "mono" }, "Frame"),
        el("dl", { class: "facts" },
          asc ? [el("dt", { text: "Rising" }), el("dd", { text: fmtPos(asc) })] : null,
          mc ? [el("dt", { text: "Midheaven" }), el("dd", { text: fmtPos(mc) })] : null,
          el("dt", { text: "Houses" }),
          el("dd", { text: houseSystem }),
        ),
      ),
    );
  }

  /* ---- sheet (mobile dock) ---- */

  function openSheet() {
    if (!sheetQuery.matches) return;
    dom.dock.classList.add("is-open");
  }
  function closeSheet() {
    dom.dock.classList.remove("is-open");
  }
  dom.dockClose.addEventListener("click", () => {
    clearSelection();
    if (!state.selected) closeSheet();
  }, on);
  sheetQuery.addEventListener("change", () => {
    if (!sheetQuery.matches) closeSheet();
    else if (state.selected || state.solo) openSheet();
  }, on);

  /* ---- keyboard ---- */

  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
    if (document.body.classList.contains("cast-open")) return;
    if (!document.getElementById("vault")?.hidden) return;

    if (e.key >= "1" && e.key <= "9") {
      const p = model.patterns[Number(e.key) - 1];
      if (p) {
        e.preventDefault();
        toggleSolo(p.id);
      }
      return;
    }
    if (e.key === "0") {
      setSolo(null);
      return;
    }
    if (e.key === "Escape") {
      if (state.selected) clearSelection();
      else if (state.solo) setSolo(null);
      closeSheet();
      return;
    }
    if (ARROWS.has(e.key)) {
      if (!dom.stage.contains(document.activeElement)) return;
      e.preventDefault();
      wheel.wake();
      const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
      const active = document.activeElement?.dataset?.body;
      const current = active || state.selected;
      const n = model.order.length;
      let i = model.order.findIndex((b) => b.id === current);
      i = i < 0 ? 0 : (i + dir + n) % n;
      select(model.order[i].id, { focus: true });
    }
  }, on);

  dom.stage.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && document.activeElement === dom.stage) {
      e.preventDefault();
      targetsById.get(state.selected || model.order[0].id)?.focus({ preventScroll: true });
    }
  }, on);

  /* ---- delegated chapter controls ---- */

  document.addEventListener("click", (e) => {
    const sel = e.target.closest?.("[data-select]");
    if (sel) {
      select(sel.dataset.select, { focus: false });
      if (!sheetQuery.matches) dom.dock.classList.add("is-flash");
      window.setTimeout(() => dom.dock.classList.remove("is-flash"), 600);
      return;
    }
    const jump = e.target.closest?.("[data-solo-jump]");
    if (jump) soloAndJump(jump.dataset.soloJump);
  }, on);

  /* ---- hero visibility, aria, announcements ---- */

  const heroObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        state.heroVisible = entry.isIntersecting;
        dom.dock.classList.toggle("is-away", !entry.isIntersecting);
      }
    },
    { threshold: 0.15 },
  );
  heroObserver.observe(dom.stage);

  function describe() {
    if (model.meta.waiting) {
      return "Empty natal wheel. Cast a nativity to draw the bodies. Ascendant sits at the left.";
    }
    const sky = model.now?.at ? new Date(model.now.at) : null;
    const asc = model.byId.get("asc");
    const mc = model.byId.get("mc");
    const parts = [`Natal wheel for ${model.meta.subject}. Drag to rotate the wheel.`];
    if (sky && Number.isFinite(sky.getTime())) {
      parts.push(`Sky for ${sky.toUTCString()}.`);
    }
    if (asc) parts.push(`Ascendant ${fmtPos(asc)} at the left.`);
    if (mc) parts.push(`Midheaven ${fmtPos(mc)} at the top.`);
    parts.push(model.bodies.filter((b) => !b.isAngle).map((b) => `${b.name} ${fmtPosHouse(b)}`).join("; ") + ".");
    if (state.selected) {
      if (String(state.selected).startsWith("o:")) {
        const o = overlayBody(state.selected.slice(2));
        parts.push(`Selected overlay: ${o ? o.name : state.selected}.`);
      } else {
        const b = model.byId.get(state.selected);
        if (b) {
          const n = model.aspects.filter((a) => a.a === b.id || a.b === b.id).length;
          parts.push(`Selected: ${b.name}, ${n} aspects lit.`);
        }
      }
    }
    if (state.solo) {
      const p = model.patternById.get(state.solo);
      parts.push(`Soloing ${p.name}: ${memberNames(p)}.`);
    }
    return parts.join(" ");
  }

  function updateAria() {
    dom.canvas.setAttribute("aria-label", describe());
  }

  let announceTimer = 0;
  function announce(text) {
    dom.announce.textContent = "";
    window.clearTimeout(announceTimer);
    announceTimer = window.setTimeout(() => {
      dom.announce.textContent = text;
    }, 40);
  }

  const plate = document.getElementById("aspectarian-plate");
  if (plate) {
    plate.replaceChildren();
    if (!model.meta.waiting) {
      plate.append(aspectarianTable(model, (a) => {
        setSolo(null);
        select(a, { focus: false });
      }, el));
    }
  }

  renderDock();
  updateAria();

  return {
    wheel,
    state,
    select,
    selectHit(hit) {
      state.hit = hit;
      wheel.setActiveHit(hit);
      if (hit?.nId) select(hit.nId, { focus: false });
      else {
        renderDock();
        openSheet();
      }
    },
    clearSelection,
    setSolo,
    toggleSolo,
    soloAndJump,
    jumpToWheel,
    describe,
    start() {
      wheel.requestFrame();
    },
    destroy() {
      ac.abort();
      heroObserver.disconnect();
      wheel.destroy();
      dom.targets.replaceChildren();
    },
  };
}
