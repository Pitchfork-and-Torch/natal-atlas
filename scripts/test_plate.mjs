/* plate hash round-trip, including midnight (hour 0). */
import { birthHash, parseBirthHash, chartToHashInput } from "../public/js/plate.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const midnight = {
  meta: {
    subject: "Midnight child",
    timeUnknown: false,
    houseSystemId: "porphyry",
    birth: {
      date: "1990-06-15",
      time: "00:30",
      lat: 40.7128,
      lon: -74.006,
      timezone: "America/New_York",
      place: "New York, United States",
    },
  },
};

const input = chartToHashInput(midnight);
assert(input.hour === 0, `hour should be 0, got ${input.hour}`);
assert(input.minute === 30, `minute should be 30, got ${input.minute}`);

const hash = birthHash(input);
const parsed = parseBirthHash(hash);
assert(parsed.hour === 0, `parsed hour should be 0, got ${parsed.hour}`);
assert(parsed.minute === 30, `parsed minute should be 30, got ${parsed.minute}`);

const noonish = {
  meta: {
    subject: "Noon",
    timeUnknown: false,
    houseSystemId: "porphyry",
    birth: {
      date: "1990-06-15",
      time: "12:00",
      lat: 40.7,
      lon: -74,
      timezone: "UTC",
      place: "NYC",
    },
  },
};
const noon = chartToHashInput(noonish);
assert(noon.hour === 12 && noon.minute === 0, "noon still works");

const unknown = {
  meta: {
    subject: "Solar",
    timeUnknown: true,
    houseSystemId: "equal",
    birth: {
      date: "1990-06-15",
      time: "",
      lat: 40.7,
      lon: -74,
      timezone: "UTC",
      place: "NYC",
    },
  },
};
const u = chartToHashInput(unknown);
assert(u.timeUnknown === true, "timeUnknown preserved");
const uh = parseBirthHash(birthHash(u));
assert(uh.timeUnknown === true, "hash round-trips timeUnknown");

console.log("ok", { midnightHour: input.hour, parsedHour: parsed.hour, noon: noon.hour });
