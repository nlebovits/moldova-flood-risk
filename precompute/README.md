# precompute — Moldova flood-risk data pipeline

One-shot, offline pipeline that ingests live data from two open sources
(FTW global field boundaries + JRC GloFAS flood hazard rasters), runs
zonal statistics, and emits the small static sidecar JSONs that the
front-end consumes at runtime.

## Run

```bash
cd precompute
make data
```

Outputs land in `../app/public/data/`:

| File | Source | Purpose |
|---|---|---|
| `field_attrs.json` | FTW × JRC zonal stats | Per-field per-RP exposure attrs, joined client-side to live FTW tiles via `setFeatureState` |
| `admin.geojson` | GADM/OSM × field attrs | Moldova raioane + per-RP exposure aggregates |
| `summary.json` | aggregate of above | Headline stat (RP100 ag share) |

Intermediate work goes to `_work/` (gitignored).

## Steps

```
make data
 ├─ extract-fields  # Moldova polygons from global FTW pmtiles
 ├─ fetch-jrc       # 12 JRC depth rasters (≈265 MB)
 ├─ zonal-stats     # exactextract → field_attrs.json
 ├─ build-admin     # raioane × per-RP aggregates → admin.geojson
 └─ build-summary   # headline stat → summary.json
```

Each step is invocable individually:

```bash
uv run moldova-precompute extract-fields
uv run moldova-precompute fetch-jrc
uv run moldova-precompute zonal-stats
uv run moldova-precompute build-admin
uv run moldova-precompute build-summary
uv run moldova-precompute info     # print resolved paths and constants
```

## Sources

- **FTW** — Fields of The World global field boundaries, served as
  PMTiles v3 from Source Cooperative (`data.source.coop/ftw/...`).
  License: CC BY 4.0.
- **JRC** — Copernicus Emergency Management Service GloFAS flood hazard
  maps v2.1.2, 90 m, fluvial only. Two tiles cover Moldova:
  `ID134_N50_E20` (main) and `ID146_N50_E30` (eastern sliver), per RP
  10 / 20 / 50 / 100 / 200 / 500. License: CC BY 4.0.

Both attribution strings ship with the app in the provenance "About the
data" expander.

## Dependencies

Managed by `uv`. Key libraries:
- `rasterio` — raster I/O
- `exactextract` — fast zonal stats with partial-pixel coverage
- `geopandas` + `pyogrio` — vector I/O, GeoParquet
- `pmtiles` — read the global FTW archive
- `httpx` — async HTTP for parallel raster downloads
- `click` — CLI dispatcher

Re-resolve / install:

```bash
uv sync
```
