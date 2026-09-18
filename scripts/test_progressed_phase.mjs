import { castChart } from "../public/js/cast.js";
import { progressedPack } from "../public/js/chronograph.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const chart = castChart({
  name: "Phase Check",
  year: 1990,
  month: 6,
  day: 15,
  hour: 12,
  minute: 0,
  lat: 40.71,
  lon: -74.01,
  timeZone: "America/New_York",
});

const target = new Date("2026-09-17T15:00:00Z");
const pack = progressedPack(chart, target);
const phases = new Set(pack.hits.map((h) => h.phase));

assert(pack.hits.length > 0, "expected progression hits");
assert(phases.has("separating") || phases.has("applying"), `expected applying/separating, got ${[...phases]}`);
assert(![...phases].every((p) => p === "exact" || p === "applying") || phases.has("separating"),
  "progressedPack must not label every non-exact hit as applying");

// Stronger: at least one separating among non-exact hits for a mid-life chart
const nonExact = pack.hits.filter((h) => h.phase !== "exact");
assert(nonExact.some((h) => h.phase === "separating"), `expected a separating hit, phases=${[...phases]}`);
assert(nonExact.some((h) => h.phase === "applying"), `expected an applying hit, phases=${[...phases]}`);

console.log("ok", { hits: pack.hits.length, phases: [...phases] });
