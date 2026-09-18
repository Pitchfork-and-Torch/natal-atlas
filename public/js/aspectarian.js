/* Natal aspectarian: engraved triangle, not a planet-tile grid. */

import { HARD } from "./wheel.js?v=1.2.8";

const ORDER = [
  "sun", "moon", "mercury", "venus", "mars",
  "jupiter", "saturn", "uranus", "neptune", "pluto",
  "northNode", "chiron", "asc", "mc",
];

export function aspectarianTable(model, onPick, el) {
  const present = ORDER.filter((id) => model.byId.has(id));
  const lookup = new Map();
  for (const a of model.aspects) {
    lookup.set(`${a.a}|${a.b}`, a);
    lookup.set(`${a.b}|${a.a}`, a);
  }
  const table = el("div", { class: "aspectarian", role: "table", "aria-label": "Natal aspects" });
  const head = el("div", { class: "aspectarian-row is-head", role: "row" },
    el("span", { class: "aspectarian-cell is-corner", role: "columnheader", text: "" }),
    ...present.map((id) => {
      const b = model.byId.get(id);
      if (!b) return el("span", { class: "aspectarian-cell is-head", role: "columnheader", text: "" });
      return el("span", { class: "aspectarian-cell is-head", role: "columnheader", title: b.name || id, text: b.isAngle ? (b.short || b.name) : (b.glyph || "") });
    }),
  );
  table.append(head);
  present.forEach((rowId, ri) => {
    const rowBody = model.byId.get(rowId);
    if (!rowBody) return;
    const row = el("div", { class: "aspectarian-row", role: "row" },
      el("span", { class: "aspectarian-cell is-head", role: "rowheader", title: rowBody.name || rowId, text: rowBody.isAngle ? (rowBody.short || rowBody.name) : (rowBody.glyph || "") }),
    );
    present.forEach((colId, ci) => {
      if (ci <= ri) {
        row.append(el("span", { class: "aspectarian-cell is-blank", role: "cell" }));
        return;
      }
      const a = lookup.get(`${rowId}|${colId}`);
      if (!a) {
        row.append(el("span", { class: "aspectarian-cell is-empty", role: "cell", text: "·" }));
        return;
      }
      const hard = HARD.has(a.type);
      const mark = a.type === "conjunction" ? "0"
        : a.type === "opposition" ? "8"
        : a.type === "trine" ? "3"
        : a.type === "square" ? "4"
        : a.type === "sextile" ? "6"
        : "q";
      row.append(el("button", {
        type: "button",
        class: "aspectarian-cell is-hit" + (hard ? " is-hard" : " is-soft"),
        role: "cell",
        title: `${rowBody.name} ${a.type} ${model.byId.get(colId)?.name || colId}, ${a.orb} deg`,
        onclick: () => onPick && onPick(rowId, colId, a),
      }, mark));
    });
    table.append(row);
  });
  return table;
}
