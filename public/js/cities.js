/* Place autofill. Index: /data/cities.json (GeoNames CC BY 4.0). */

const FALLBACK_TIMEZONES = [
  "UTC",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Nairobi",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/New_York",
  "America/Sao_Paulo",
  "America/Toronto",
  "Asia/Dubai",
  "Asia/Hong_Kong",
  "Asia/Kolkata",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Paris",
  "Pacific/Auckland",
  "Pacific/Honolulu",
];

const ALIASES = {
  nyc: "new york",
  "new york city": "new york",
  la: "los angeles",
  sf: "san francisco",
  "san fran": "san francisco",
  dc: "washington",
  "washington dc": "washington",
  "washington d c": "washington",
  bombay: "mumbai",
  calcutta: "kolkata",
  madras: "chennai",
  peking: "beijing",
  saigon: "ho chi minh",
  constantinople: "istanbul",
  rio: "rio de janeiro",
  "hongkong": "hong kong",
  "st pete": "saint petersburg",
};

const COUNTRY_ALIASES = {
  uk: "united kingdom",
  "u k": "united kingdom",
  britain: "united kingdom",
  "great britain": "united kingdom",
  england: "united kingdom",
  usa: "united states",
  us: "united states",
  "u s": "united states",
  america: "united states",
  uae: "united arab emirates",
  holland: "netherlands",
  burma: "myanmar",
};

function fold(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['\u2019.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** @type {{ name: string, lat: number, lon: number, tz: string, fold: string, city: string }[]} */
export let CITIES = [];

/** @type {string[]} */
export let TIMEZONES = FALLBACK_TIMEZONES.slice();

let loadPromise = null;

function unpack(data) {
  const zones = Array.isArray(data.tz) ? data.tz : [];
  const rows = Array.isArray(data.rows) ? data.rows : [];
  CITIES = rows.map((row) => {
    const name = String(row[0] || "");
    return {
      name,
      lat: Number(row[1]),
      lon: Number(row[2]),
      tz: zones[row[3]] || "UTC",
      fold: fold(name),
      city: fold(name.split(",")[0] || name),
    };
  });
  const seen = new Set(zones);
  const intl = (typeof Intl !== "undefined" && Intl.supportedValuesOf)
    ? Intl.supportedValuesOf("timeZone")
    : FALLBACK_TIMEZONES;
  TIMEZONES = [];
  for (const z of intl) {
    TIMEZONES.push(z);
    seen.add(z);
  }
  for (const z of zones) {
    if (!seen.has(z)) TIMEZONES.push(z);
  }
  if (!TIMEZONES.includes("UTC")) TIMEZONES.unshift("UTC");
}

export function loadFromData(data) {
  unpack(data);
  return CITIES;
}

export function ensureCities() {
  if (CITIES.length) return Promise.resolve(CITIES);
  if (loadPromise) return loadPromise;
  const url = new URL("../data/cities.json", import.meta.url);
  loadPromise = fetch(url).then((res) => {
    if (!res.ok) throw new Error("City index failed to load.");
    return res.json();
  }).then((data) => {
    unpack(data);
    return CITIES;
  }).catch((err) => {
    loadPromise = null;
    throw err;
  });
  return loadPromise;
}

function scoreCity(city, query, alias) {
  const n = city.fold;
  const c = city.city;
  if (alias && c === alias) return 0;
  if (c === query) return 1;
  if (c.startsWith(query)) return 2;
  if (n.startsWith(query)) return 3;
  if (c.includes(" " + query) || n.includes(" " + query)) return 4;
  if (n.includes(query)) return 5 + n.indexOf(query) / 200;
  return -1;
}

export function searchCities(q, limit = 8) {
  const raw = String(q || "").trim();
  if (!raw || !CITIES.length) return [];
  const parts = raw.split(",").map((p) => fold(p)).filter(Boolean);
  const query = parts[0] || "";
  if (!query) return [];
  const alias = ALIASES[query] || "";
  let region = parts[1] || "";
  if (region && COUNTRY_ALIASES[region]) region = COUNTRY_ALIASES[region];
  const scored = [];
  for (let i = 0; i < CITIES.length; i += 1) {
    const city = CITIES[i];
    if (region && !city.fold.includes(region)) continue;
    let score = scoreCity(city, query, alias);
    if (score < 0 && alias) score = scoreCity(city, alias, alias);
    if (score < 0) continue;
    scored.push({ city, score, i });
  }
  scored.sort((a, b) => a.score - b.score || a.i - b.i);
  return scored.slice(0, limit).map((x) => x.city);
}

export function findCityByTz(tz) {
  const zone = String(tz || "");
  if (!zone) return null;
  return CITIES.find((c) => c.tz === zone) || null;
}
