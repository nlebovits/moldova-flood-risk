# precompute — Moldova flood-risk data pipeline

One-shot, offline pipeline that ingests live data from two open sources
(FTW global field boundaries + JRC GloFAS flood hazard rasters), runs
zonal statistics, and emits the small static sidecar JSONs that the
front-end consumes at runtime.

## Configure

All country-variable values live in **`config.yaml`** — bbox, ISO code, Overture
release/subtype, optional JRC-tile / UTM-zone overrides, and the camera zoom
window. Everything derivable from the bbox (UTM zone, the covering JRC tiles,
the initial map view) is computed automatically. Porting to a new country is
mostly editing this one file — see [`../PORTING.md`](../PORTING.md).

## Run

```bash
cd precompute
uv sync
export GPIO_PROJECT=/path/to/geoparquet-io   # see "geoparquet-io" below
make data
make info     # print the resolved config (bbox, derived UTM zone, JRC tiles)
```

Outputs land in `../app/public/data/`:

| File | Source | Purpose |
|---|---|---|
| `field_attrs.json` | FTW × JRC zonal stats | Per-field per-RP exposure attrs, joined client-side to live FTW tiles via `setFeatureState` |
| `admin.geojson` | Overture Divisions × field attrs | First-level admin units (Moldova: raioane) + per-RP exposure aggregates |
| `summary.json` | aggregate of above | Headline stat (RP100 ag share) + data-driven map view |

Intermediate work goes to `_work/` (gitignored).

## geoparquet-io

`build-fields-tiles` shells out to the `gpio pmtiles` command, which the
published `geoparquet-io` release does not yet ship. Until it does, use a local
checkout and point `GPIO_PROJECT` at it (defaults to a hardcoded dev path if
unset). All other steps run without it.

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
