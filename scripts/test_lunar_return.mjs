/* Near-window lunar return must not skip a full synodic cycle. */
import { nextLunarReturnDate, DAY, HOUR } from "../public/js/time.js";
import { geoEclipticLon } from "../public/js/ephemeris.js";
import { Body } from "../public/vendor/astronomy-engine.js";

function findMoonAt(target, start) {
  for (let i = 0; i < 40 * 48; i++) {
    const t = new Date(start.getTime() + i * 30 * 60 * 1000);
    let err = geoEclipticLon(Body.Moon, t) - target;
    while (err > 180) err -= 360;
    while (err < -180) err += 360;
    if (Math.abs(err) < 0.25) return t;
  }
  return null;
}

const natalMoon = 45;
const hit = findMoonAt(natalMoon, new Date("2026-06-01T00:00:00Z"));
if (!hit) throw new Error("could not locate sample lunar return");

let pass = 0;
for (const hours of [6, 12, 24, 48]) {
  const from = new Date(hit.getTime() - hours * HOUR);
  const got = nextLunarReturnDate(natalMoon, from);
  if (!got) throw new Error(`null return from -${hours}h`);
  const deltaDays = Math.abs(got.getTime() - hit.getTime()) / DAY;
  if (deltaDays > 1) {
    throw new Error(
      `from -${hours}h jumped a cycle: want ~${hit.toISOString()} got ${got.toISOString()} (Δ${deltaDays.toFixed(2)}d)`,
    );
  }
  console.log(`OK from -${hours}h -> ${got.toISOString()} (Δ${(deltaDays * 24).toFixed(2)}h)`);
  pass += 1;
}

console.log(`pass ${pass}`);
