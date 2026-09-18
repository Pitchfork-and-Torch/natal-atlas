/* addMonths must clamp end-of-month days (no setUTCMonth overflow). */
import { addMonths, scrubWindow } from "../public/js/time.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const aug31 = new Date(Date.UTC(2024, 7, 31, 12));
const plus18 = addMonths(aug31, 18);
assert(plus18.toISOString() === "2026-02-28T12:00:00.000Z", `Aug31+18 => ${plus18.toISOString()}`);

const mar31 = new Date(Date.UTC(2024, 2, 31, 0));
const minus1 = addMonths(mar31, -1);
assert(minus1.toISOString() === "2024-02-29T00:00:00.000Z", `Mar31-1 => ${minus1.toISOString()}`);

const jan31 = new Date(Date.UTC(2024, 0, 31, 15));
const plus1 = addMonths(jan31, 1);
assert(plus1.toISOString() === "2024-02-29T15:00:00.000Z", `Jan31+1 => ${plus1.toISOString()}`);

// Leap-year Feb 29 + 12 months stays on last day of Feb next year
const feb29 = new Date(Date.UTC(2024, 1, 29, 8));
const plusY = addMonths(feb29, 12);
assert(plusY.toISOString() === "2025-02-28T08:00:00.000Z", `Feb29+12 => ${plusY.toISOString()}`);

const w = scrubWindow(aug31);
assert(w.max.toISOString() === "2026-02-28T12:00:00.000Z", `scrub max => ${w.max.toISOString()}`);
assert(w.min.toISOString() === "2023-02-28T12:00:00.000Z", `scrub min => ${w.min.toISOString()}`);

console.log("ok", {
  plus18: plus18.toISOString(),
  minus1: minus1.toISOString(),
  plus1: plus1.toISOString(),
  plusY: plusY.toISOString(),
  scrub: { min: w.min.toISOString(), max: w.max.toISOString(), days: w.days },
});
