/* zonedCivilToUtc must round-trip civil times across DST transitions. */
import { zonedCivilToUtc } from "../public/js/ephemeris.js";
import { civilNowInZone } from "../public/js/time.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function roundTrip(y, m, d, h, min, tz, label) {
  const utc = zonedCivilToUtc(y, m, d, h, min, tz);
  const civil = civilNowInZone(tz, utc);
  assert(
    civil.year === y && civil.month === m && civil.day === d && civil.hour === h && civil.minute === min,
    `${label}: wanted ${y}-${m}-${d} ${h}:${min} in ${tz}, got ${JSON.stringify(civil)} via ${utc.toISOString()}`,
  );
}

// Stable summer / winter (legacy expectations).
assert(
  zonedCivilToUtc(2000, 7, 4, 12, 0, "America/New_York").toISOString() === "2000-07-04T16:00:00.000Z",
  "New York summer is UTC-4",
);
assert(
  zonedCivilToUtc(2000, 1, 4, 12, 0, "America/New_York").toISOString() === "2000-01-04T17:00:00.000Z",
  "New York winter is UTC-5",
);

// 2024-03-10 America/New_York sprang forward 02:00 -> 03:00.
// Single-pass offset used to cast 03:00..06:00 an hour late.
roundTrip(2024, 3, 10, 3, 0, "America/New_York", "NY spring 03:00");
roundTrip(2024, 3, 10, 4, 15, "America/New_York", "NY spring 04:15");
roundTrip(2024, 3, 10, 6, 0, "America/New_York", "NY spring 06:00");
roundTrip(2024, 3, 10, 7, 0, "America/New_York", "NY spring 07:00");
roundTrip(2024, 3, 10, 1, 30, "America/New_York", "NY spring 01:30");

// 2024-11-03 America/New_York fell back 02:00 -> 01:00.
roundTrip(2024, 11, 3, 1, 30, "America/New_York", "NY fall 01:30");
roundTrip(2024, 11, 3, 2, 0, "America/New_York", "NY fall 02:00");
roundTrip(2024, 11, 3, 3, 0, "America/New_York", "NY fall 03:00");

// Europe/Berlin spring-forward 2024-03-31.
roundTrip(2024, 3, 31, 3, 0, "Europe/Berlin", "Berlin spring 03:00");
roundTrip(2024, 3, 31, 4, 0, "Europe/Berlin", "Berlin spring 04:00");

roundTrip(2024, 7, 4, 9, 0, "Asia/Tokyo", "Tokyo (no DST)");

console.log("ok zoned civil DST iterate");
