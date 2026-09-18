import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadFromData, searchCities } from "../public/js/cities.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "public/data/cities.json"), "utf8"));
loadFromData(data);

function names(q) {
  return searchCities(q, 8).map((c) => c.name);
}

const cases = [
  ["tokyo", "Tokyo, Japan"],
  ["nairobi", "Nairobi, Kenya"],
  ["sao paulo", "Sao Paulo, Brazil"],
  ["new york", "New York, United States"],
  ["nyc", "New York, United States"],
  ["la", "Los Angeles, California, United States"],
  ["london", "London, England, United Kingdom"],
  ["portland", "Portland, Oregon, United States"],
  ["reykjavik", "Reykjavik, Iceland"],
  ["vatican", "Vatican City, Vatican"],
  ["london, uk", "London, England, United Kingdom"],
];

let failed = 0;
for (const [q, expect] of cases) {
  const got = names(q);
  if (got[0] !== expect) {
    console.error("FAIL", q, "expected", expect, "got", got);
    failed += 1;
  } else {
    console.log("OK", q, "->", got[0]);
  }
}
const dunedin = names("dunedin");
if (dunedin.length) {
  console.error("FAIL dunedin leaked", dunedin);
  failed += 1;
} else {
  console.log("OK dunedin absent");
}
if (searchCities("", 8).length) {
  console.error("FAIL empty query should hide suggestions");
  failed += 1;
} else {
  console.log("OK empty query");
}
if (failed) process.exit(1);
console.log("pass", cases.length + 2);
