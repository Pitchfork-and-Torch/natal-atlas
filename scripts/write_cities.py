#!/usr/bin/env python3
"""Build the Place autofill index from GeoNames (CC BY 4.0).

Cities with population >= 15,000, plus every national capital.
Output: public/data/cities.json (compact rows, population-sorted).
"""
from __future__ import annotations

import io
import json
import unicodedata
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "scripts" / "cache"
OUT = ROOT / "public" / "data" / "cities.json"
SKIP_FILE = ROOT / ".private" / "city-skip.txt"

UA = "NatalAtlas/1.2 (https://astrochart.jonbailey.xyz/)"
CITIES_URL = "https://download.geonames.org/export/dump/cities15000.zip"
CITIES1000_URL = "https://download.geonames.org/export/dump/cities1000.zip"
COUNTRY_URL = "https://download.geonames.org/export/dump/countryInfo.txt"
ADMIN1_URL = "https://download.geonames.org/export/dump/admin1CodesASCII.txt"

# State / province on the label so duplicate names stay distinct.
ALWAYS_ADMIN = {
    "AR", "AU", "BD", "BR", "CA", "CN", "CO", "DE", "ES", "GB", "ID",
    "IN", "IT", "MX", "MY", "NG", "PH", "PK", "RU", "US", "ZA",
}

# Cities and seats, not neighborhood sections (PPLX).
KEEP_CODES = {"PPL", "PPLA", "PPLA2", "PPLA3", "PPLA4", "PPLC", "PPLG", "PPLS"}


def ascii_name(value: str) -> str:
    text = unicodedata.normalize("NFKD", value or "")
    text = text.encode("ascii", "ignore").decode("ascii")
    return " ".join(text.replace("`", "'").split())


def fetch(url: str) -> bytes:
    CACHE.mkdir(parents=True, exist_ok=True)
    dest = CACHE / url.rstrip("/").split("/")[-1]
    if dest.is_file() and dest.stat().st_size > 1000:
        return dest.read_bytes()
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as res:
        data = res.read()
    dest.write_bytes(data)
    return data


def zip_text(blob: bytes, suffix: str = ".txt") -> str:
    with zipfile.ZipFile(io.BytesIO(blob)) as zf:
        name = next(n for n in zf.namelist() if n.endswith(suffix))
        return zf.read(name).decode("utf-8")


def load_skip() -> set[str]:
    names: set[str] = set()
    if not SKIP_FILE.is_file():
        return names
    for line in SKIP_FILE.read_text(encoding="utf-8").splitlines():
        item = ascii_name(line.split("#", 1)[0]).lower()
        if item:
            names.add(item)
    return names


def load_countries(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in text.splitlines():
        if not line or line.startswith("#"):
            continue
        cols = line.split("\t")
        if len(cols) < 5:
            continue
        iso, country = cols[0].strip(), ascii_name(cols[4])
        if iso and country:
            out[iso] = country
    return out


def load_admin1(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in text.splitlines():
        if not line or line.startswith("#"):
            continue
        cols = line.split("\t")
        if len(cols) < 3:
            continue
        code = cols[0].strip()
        name = ascii_name(cols[2] or cols[1])
        if code and name:
            out[code] = name
    return out


def parse_geonames(text: str, countries: dict[str, str], admin1: dict[str, str], skip: set[str], codes: set[str] | None = None) -> list[dict]:
    rows: list[dict] = []
    for line in text.splitlines():
        if not line:
            continue
        cols = line.split("\t")
        if len(cols) < 19:
            continue
        fcode = cols[7]
        if codes is not None:
            if fcode not in codes:
                continue
        elif fcode not in KEEP_CODES:
            continue
        cc = cols[8]
        country = countries.get(cc)
        if not country:
            continue
        tz = cols[17].strip()
        if not tz or tz == "null":
            continue
        city = ascii_name(cols[2] or cols[1])
        if city == "New York City":
            city = "New York"
        if not city:
            continue
        if city.lower() in skip:
            continue
        try:
            lat = round(float(cols[4]), 4)
            lon = round(float(cols[5]), 4)
            pop = int(cols[14] or 0)
        except ValueError:
            continue
        admin = admin1.get(f"{cc}.{cols[10]}", "")
        if admin.lower() in skip:
            continue
        rows.append({
            "id": cols[0],
            "city": city,
            "cc": cc,
            "country": country,
            "admin": admin,
            "lat": lat,
            "lon": lon,
            "tz": tz,
            "pop": pop,
        })
    return rows


def label_for(row: dict, dup: bool) -> str:
    city, admin, country, cc = row["city"], row["admin"], row["country"], row["cc"]
    parts = [city]
    use_admin = bool(admin) and (cc in ALWAYS_ADMIN or dup)
    if use_admin and admin.lower() not in {city.lower(), country.lower()}:
        parts.append(admin)
    if country.lower() != city.lower():
        parts.append(country)
    return ", ".join(parts)


def merge(primary: list[dict], extra: list[dict]) -> list[dict]:
    by_id = {r["id"]: r for r in extra}
    by_id.update({r["id"]: r for r in primary})
    return list(by_id.values())


def dedupe(rows: list[dict]) -> list[dict]:
    best: dict[tuple[str, str, str], dict] = {}
    for row in rows:
        key = (row["cc"], row["admin"].lower(), row["city"].lower())
        prev = best.get(key)
        if prev is None or row["pop"] > prev["pop"]:
            best[key] = row
    return list(best.values())


def main() -> int:
    skip = load_skip()
    print("fetch GeoNames dumps...")
    countries = load_countries(fetch(COUNTRY_URL).decode("utf-8", "replace"))
    admin1 = load_admin1(fetch(ADMIN1_URL).decode("utf-8", "replace"))
    major = parse_geonames(zip_text(fetch(CITIES_URL)), countries, admin1, skip)
    capitals = parse_geonames(
        zip_text(fetch(CITIES1000_URL)),
        countries,
        admin1,
        skip,
        codes={"PPLC"},
    )
    rows = dedupe(merge(major, capitals))
    counts: dict[tuple[str, str], int] = {}
    for row in rows:
        key = (row["cc"], row["city"].lower())
        counts[key] = counts.get(key, 0) + 1
    rows.sort(key=lambda r: (-r["pop"], r["city"]))
    packed = []
    tz_index: dict[str, int] = {}
    tz_list: list[str] = []
    for row in rows:
        dup = counts[(row["cc"], row["city"].lower())] > 1
        name = label_for(row, dup)
        tz = row["tz"]
        if tz not in tz_index:
            tz_index[tz] = len(tz_list)
            tz_list.append(tz)
        packed.append([name, row["lat"], row["lon"], tz_index[tz]])
    payload = {
        "src": "GeoNames cities15000 + PPLC capitals (CC BY 4.0)",
        "tz": tz_list,
        "rows": packed,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    raw = json.dumps(payload, ensure_ascii=True, separators=(",", ":"))
    OUT.write_text(raw + "\n", encoding="ascii")
    print(f"wrote {len(packed)} places, {len(tz_list)} timezones -> {OUT.relative_to(ROOT)}")
    print(f"bytes {len(raw)}")
    names = [row[0] for row in packed]
    blob = " | ".join(names).lower()
    for needle in ("tokyo", "nairobi", "sao paulo", "new york", "reykjavik", "accra"):
        if needle not in blob:
            raise SystemExit(f"missing expected city: {needle}")
    for blocked in skip:
        if any(blocked == ascii_name(n.split(",")[0]).lower() for n in names):
            raise SystemExit(f"skip name leaked: {blocked}")
    if len(packed) < 20000:
        raise SystemExit(f"too few cities: {len(packed)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
