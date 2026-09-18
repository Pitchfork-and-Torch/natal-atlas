/* nextSolarReturnDate must never return a past instant. */
import { Body } from "../public/vendor/astronomy-engine.js";
import { geoEclipticLon } from "../public/js/ephemeris.js";
import { nextSolarReturnDate } from "../public/js/time.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const natalDate = new Date(Date.UTC(1990, 5, 15, 12, 0, 0));
const natalLon = geoEclipticLon(Body.Sun, natalDate);

const cases = [
  ["day after birthday", new Date(Date.UTC(2026, 5, 16, 12, 0, 0))],
  ["evening of birthday", new Date(Date.UTC(2026, 5, 15, 18, 0, 0))],
  ["early birthday morning", new Date(Date.UTC(2026, 5, 15, 2, 0, 0))],
  ["week before", new Date(Date.UTC(2026, 5, 8, 12, 0, 0))],
];

for (const [label, from] of cases) {
  const hit = nextSolarReturnDate(natalLon, from, "1990-06-15");
  assert(hit && Number.isFinite(hit.getTime()), `${label}: missing hit`);
  assert(hit.getTime() >= from.getTime(), `${label}: past hit ${hit.toISOString()} < ${from.toISOString()}`);
  console.log("OK", label, "->", hit.toISOString());
}

console.log("pass", cases.length);
