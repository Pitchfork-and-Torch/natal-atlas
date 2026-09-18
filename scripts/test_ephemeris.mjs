import { Body, Observer, SearchHourAngle, SearchAltitude } from "../public/vendor/astronomy-engine.js";
import {
  anglesFrom,
  geoEclipticLon,
  porphyryHouses,
  houseOf,
  lonParts,
  fmtLon,
  zonedCivilToUtc,
  sep,
} from "../public/js/ephemeris.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function near(a, b, tol, msg) {
  const d = sep(a, b);
  assert(d <= tol, `${msg}: ${a.toFixed(4)} vs ${b.toFixed(4)} (diff ${d.toFixed(4)}, tol ${tol})`);
}

// Angles are checked against the Sun itself. The Sun sits within 1.2 arcsec of the
// ecliptic, so at local solar noon its longitude is the MC, and at geometric sunrise
// (center on the horizon, no refraction) its longitude is the ascendant.
const places = [
  { lat: 40.7128, lon: -74.006, from: "2000-01-05T00:00:00Z" },
  { lat: 40.7128, lon: -74.006, from: "1990-03-15T00:00:00Z" },
  { lat: 51.5, lon: -0.12, from: "1985-11-02T00:00:00Z" },
  { lat: -33.87, lon: 151.21, from: "2010-06-20T00:00:00Z" },
  { lat: 35.68, lon: 139.69, from: "1975-08-09T00:00:00Z" },
  { lat: 55.75, lon: 37.62, from: "2020-02-01T00:00:00Z" },
  { lat: -1.29, lon: 36.82, from: "1969-07-20T00:00:00Z" },
];

for (const p of places) {
  const obs = new Observer(p.lat, p.lon, 0);
  const start = new Date(p.from);

  const noon = SearchHourAngle(Body.Sun, obs, 0, start).time.date;
  const atNoon = anglesFrom(noon, p.lat, p.lon);
  near(atNoon.mc, geoEclipticLon(Body.Sun, noon), 0.01, `MC at noon ${p.from} lat ${p.lat}`);
  near(atNoon.ic, atNoon.mc + 180, 1e-9, "IC opposes MC");
  near(atNoon.dsc, atNoon.asc + 180, 1e-9, "DSC opposes ASC");

  const rise = SearchAltitude(Body.Sun, obs, +1, start, 2, 0);
  assert(rise, `no sunrise found ${p.from}`);
  const atRise = anglesFrom(rise.date, p.lat, p.lon);
  near(atRise.asc, geoEclipticLon(Body.Sun, rise.date), 0.02, `ASC at sunrise ${p.from} lat ${p.lat}`);

  const houses = porphyryHouses(atNoon.asc, atNoon.mc);
  near(houses[0].lon, atNoon.asc, 1e-9, "cusp 1 is ASC");
  near(houses[9].lon, atNoon.mc, 1e-9, "cusp 10 is MC");
  for (let i = 0; i < 6; i++) {
    near(houses[i + 6].lon, houses[i].lon + 180, 1e-6, `cusp ${i + 7} opposes cusp ${i + 1}`);
  }
  for (let i = 0; i < 12; i++) {
    const span = (houses[(i + 1) % 12].lon - houses[i].lon + 360) % 360;
    assert(span > 0 && span < 180, `cusp ${i + 1} span ${span.toFixed(3)} out of range`);
  }
  assert(houseOf(atNoon.mc + 1, houses) === 10, "just past MC is house 10");
  assert(houseOf(atNoon.asc + 1, houses) === 1, "just past ASC is house 1");
}

// Degree/minute rounding must carry into the next sign instead of printing 60'.
const roll = lonParts(29.99999);
assert(roll.deg === 0 && roll.min === 0 && roll.sign === "Taurus", `sign rollover ${JSON.stringify(roll)}`);
const wrap = lonParts(359.99999);
assert(wrap.sign === "Aries" && wrap.deg === 0, `zodiac wraparound ${JSON.stringify(wrap)}`);
assert(fmtLon(95.5) === "05\u00B030' Cancer", `fmtLon ${fmtLon(95.5)}`);
assert(lonParts(NaN).lon === 0, "NaN longitude falls back to 0 Aries");

// Civil time in a zone resolves through the zone's DST rules.
assert(
  zonedCivilToUtc(2000, 7, 4, 12, 0, "America/New_York").toISOString() === "2000-07-04T16:00:00.000Z",
  "New York summer is UTC-4",
);
assert(
  zonedCivilToUtc(2000, 1, 4, 12, 0, "America/New_York").toISOString() === "2000-01-04T17:00:00.000Z",
  "New York winter is UTC-5",
);
assert(
  zonedCivilToUtc(1990, 3, 15, 9, 30, "Asia/Kolkata").toISOString() === "1990-03-15T04:00:00.000Z",
  "Kolkata is UTC+5:30",
);
assert(
  zonedCivilToUtc(1990, 3, 15, 9, 30, "UTC").toISOString() === "1990-03-15T09:30:00.000Z",
  "UTC passthrough",
);

console.log("ok", { places: places.length });
