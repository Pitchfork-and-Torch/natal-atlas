import { civilNowInZone } from "../public/js/time.js";
import { zonedCivilToUtc } from "../public/js/ephemeris.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Fixed instant: 2020-01-15T17:30:00.000Z
const instant = new Date("2020-01-15T17:30:00.000Z");

const nyc = civilNowInZone("America/New_York", instant);
assert(nyc.year === 2020 && nyc.month === 1 && nyc.day === 15, `nyc date ${JSON.stringify(nyc)}`);
assert(nyc.hour === 12 && nyc.minute === 30, `nyc civil should be 12:30 not browser-local; got ${nyc.hour}:${nyc.minute}`);

const tokyo = civilNowInZone("Asia/Tokyo", instant);
assert(tokyo.hour === 2 && tokyo.minute === 30 && tokyo.day === 16, `tokyo ${JSON.stringify(tokyo)}`);

// Round-trip: civil in zone -> UTC recovers the instant (to the minute).
const back = zonedCivilToUtc(nyc.year, nyc.month, nyc.day, nyc.hour, nyc.minute, "America/New_York");
assert(back.toISOString() === "2020-01-15T17:30:00.000Z", `round-trip ${back.toISOString()}`);

// Browser-local getters would disagree with a foreign zone for this instant.
const localHour = instant.getHours();
assert(nyc.hour !== localHour || Intl.DateTimeFormat().resolvedOptions().timeZone === "America/New_York",
  "test host unexpectedly matches NYC; still ok if zone is NYC");

console.log("ok", { nyc, tokyo });
