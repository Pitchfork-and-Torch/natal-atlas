# Place index

`cities.json` is generated from [GeoNames](https://www.geonames.org/) dumps:

- cities with population of at least 15,000
- every national capital (PPLC)

License: GeoNames, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Rebuild from the repo root:

```bash
python scripts/write_cities.py
```
