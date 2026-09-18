/* Near-window Jupiter/Saturn returns must not skip via large start floors. */
import { Body } from "../public/vendor/astronomy-engine.js";
import { geoEclipticLon } from "../public/js/ephemeris.js";
import {
  nextJupiterReturnDate,
  nextSaturnReturnDate,
  searchLongitude,
  DAY,
} from "../public/js/time.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const getJ = (d) => geoEclipticLon(Body.Jupiter, d);
const getS = (d) => geoEclipticLon(Body.Saturn, d);

// Jupiter near retrograde re-crossing of lon 80 in late 2024.
const jNatal = 80;
const jFrom = new Date("2024-09-15T00:00:00Z");
const jDirect = searchLongitude(getJ, jNatal, jFrom, 400, 80);
const jHit = nextJupiterReturnDate(jNatal, jFrom);
assert(jDirect, "direct Jupiter search should find a hit");
assert(jHit, "nextJupiterReturnDate should find a hit");
const jDays = (jHit.getTime() - jFrom.getTime()) / DAY;
assert(jDays < 120, `Jupiter return should be near-window, got ${jDays.toFixed(1)}d`);
assert(
  Math.abs(jHit.getTime() - jDirect.getTime()) < 2 * DAY,
  `Jupiter hit ${jHit.toISOString()} should match direct ${jDirect.toISOString()}`,
);

// Saturn ~90 days out from mid-2024 toward natal lon just behind current position.
const sFrom = new Date("2024-06-01T00:00:00Z");
const sNatal = geoEclipticLon(Body.Saturn, sFrom) - 2;
const sDirect = searchLongitude(getS, sNatal, sFrom, 800, 120);
const sHit = nextSaturnReturnDate(sNatal, sFrom);
assert(sDirect, "direct Saturn search should find a hit");
assert(sHit, "nextSaturnReturnDate should find a hit");
const sDays = (sHit.getTime() - sFrom.getTime()) / DAY;
assert(sDays < 150, `Saturn return should be near-window, got ${sDays.toFixed(1)}d`);
assert(
  Math.abs(sHit.getTime() - sDirect.getTime()) < 2 * DAY,
  `Saturn hit ${sHit.toISOString()} should match direct ${sDirect.toISOString()}`,
);

console.log("ok", {
  jupiterDays: Number(jDays.toFixed(1)),
  saturnDays: Number(sDays.toFixed(1)),
  jupiter: jHit.toISOString(),
  saturn: sHit.toISOString(),
});
