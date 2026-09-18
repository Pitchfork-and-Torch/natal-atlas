# Natal Atlas (public product)

Static natal atlas. Cast any birth in the browser. Do not load a personal default chart.

- Live: https://astrochart.jonbailey.xyz/
- Engine: `public/js/ephemeris.js` + vendored Astronomy Engine (MIT). Tropical apparent geocentric. Porphyry houses. Solar chart if time unknown.
- Readings: `public/js/lexicon.js` (original copy). Do not paste commercial guidebook text.
- Type: Fontshare Clash Display + Satoshi via `/fonts/fontshare/`.
- Visual law: `VISUAL-SYSTEM.md`.
- Public GitHub: MIT, one commit on main, no personal birth data in the tree.
- Place index: `public/data/cities.json` from GeoNames (CC BY 4.0). Rebuild: `py -3 scripts/write_cities.py`. Typeahead only, never a full city dropdown.
- Chronograph: `public/js/chronograph.js` plus time/wheel/boot. Rings are mutually exclusive (off / transits / progressed / vault).
- Deploy: `scripts/deploy.ps1` (Cloudflare Pages `astrochart-jonbailey`).
