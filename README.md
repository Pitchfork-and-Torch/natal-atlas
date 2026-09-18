# Natal Atlas

Cast a natal chart in the browser. Tropical wheel, houses, transits, and synastry. Nothing is uploaded. The wheel stays empty until you cast.

**Live:** https://astrochart.jonbailey.xyz/

A static natal theatre. The wheel stays empty until someone casts a clock and a place. Computation stays on the device.

## What it does

- Cast any nativity (type a city to autofill, coordinates, or this location)
- Worldwide city index from GeoNames (CC BY 4.0): every city of 15,000+ people, plus national capitals
- Tropical apparent geocentric longitudes (Astronomy Engine)
- Porphyry, whole sign, or equal houses (solar chart if time is unknown)
- Pattern solos, chronograph (Hour/Day/Month/Year/Decade), exact hits, solar/lunar/Jupiter/Saturn returns
- Optional secondary progressed ring; vault bi-wheel is mutually exclusive with transits
- Aspectarian plate and local PNG export (Plate). Optional hash recast, no server.
- Vault saves charts in this browser only and never opens itself

Interpretive copy is original to this atlas.

## Run locally

Static files live in `public/`. Any static server works.

```bash
python -m http.server 8768 --directory public
```

Then open http://127.0.0.1:8768/

## Deploy

Cloudflare Pages project `astrochart-jonbailey`, directory `public/`.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy.ps1
```

## License

MIT. Astronomy Engine 2.1.19 by Don Cross is also MIT (vendored). Clash Display and Satoshi via Fontshare (Indian Type Foundry). City index from GeoNames, CC BY 4.0.

Rebuild the city index:

```bash
python scripts/write_cities.py
```
