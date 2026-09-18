import { mergeVaultRows, saveChart, importVault, listCharts, removeChart } from "../public/js/vault.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};

const natal = { meta: { waiting: false, subject: "Ada" }, planets: [{ id: "sun" }] };
const waiting = { meta: { waiting: true, subject: "Cast a nativity" }, planets: [] };

let threw = false;
try {
  saveChart({ meta: { waiting: true } });
} catch {
  threw = true;
}
assert(threw, "saveChart rejects the empty wheel");

const merged = mergeVaultRows([], [
  { id: "c_keep", name: "Ada", chart: natal },
  { id: "c_wait", name: "Empty", chart: waiting },
  { name: "No chart" },
  null,
], () => "c_new");
assert(merged.length === 1, `merge kept ${merged.length}`);
assert(merged[0].id === "c_keep", "kept original id");

const dup = mergeVaultRows(merged, [{ id: "c_keep", name: "Ada copy", chart: natal }], () => "c_dup");
assert(dup.length === 2, "duplicate id is reminted");
assert(dup[1].id === "c_dup", `remint ${dup[1].id}`);

let emptyThrew = false;
try {
  mergeVaultRows([], [{ chart: waiting }, { foo: 1 }]);
} catch (err) {
  emptyThrew = /no charts/.test(err.message);
}
assert(emptyThrew, "all-waiting import is rejected");

let notVault = false;
try {
  mergeVaultRows([], { nope: true });
} catch (err) {
  notVault = /not a vault/.test(err.message);
}
assert(notVault, "object without charts is rejected");

store.clear();
const n = importVault(JSON.stringify({ v: 1, charts: [{ id: "c1", name: "Ada", chart: natal }] }));
assert(n === 1, `import count ${n}`);
assert(listCharts()[0].name === "Ada", "list after import");
removeChart("c1");
assert(listCharts().length === 0, "forget");

console.log("ok", { merged: merged.length, dup: dup[1].id });
