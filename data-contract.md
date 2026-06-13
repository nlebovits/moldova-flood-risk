# Data contract — Moldova Ag Flood-Risk Map

All data is **precomputed offline** and published as **static files** (S3 / Cloudflare / any
CDN). The client never talks to a backend we run. This document expands the shapes summarized
in `../README.md`.

---

## 1. Field boundaries (FTW) — primary geometry

The **only** filled geometry on the map. Source: Fields of The World (FTW) boundaries for
Moldova.

**File:** `fields.pmtiles` (vector tiles) — or GeoJSON for a small extent during dev.

**Per-feature attributes** (precompute via zonal statistics of the JRC depth rasters over each
field polygon):

| attribute | type | notes |
|---|---|---|
| `id` | int | stable field id |
| `area_ha` | int | field area, in **ares** (ha × 100) — quantized for the tile |
| `pct_inun_10` … `pct_inun_500` | int 0 or 100 | inundated (100) or not (0) at each RP |
| `depth_10` … `depth_500` | int | mean inundation depth in **millimetres** (m × 1000) at each RP |
| `min_rp` | int | lowest RP at which the field is inundated (for a future "severity" view) |

RPs: **10, 20, 50, 100, 200, 500**.

> **Tile encoding.** Float attributes are quantized to integers *in the tile only*
> — MVT stores integers as cheap deduplicating varints but every non-integer as an
> 8-byte double, which otherwise bloats tiles and forces `--drop-densest-as-needed`
> to delete most fields at low zoom. The analytical `fields_attributed.parquet`
> keeps SI floats (metres, hectares); the front-end un-scales on read via the
> `fieldDepth` / `fieldAreaHa` accessors (`app/src/lib/types.ts`). Scale factors
> live in `precompute/.../const.py` (`TILE_DEPTH_SCALE`, `TILE_AREA_SCALE`).

The map colors each field by `depth_{selectedRP}` through the Hydro ramp (see class breaks
below). Fields with no inundation at the selected RP render unfilled (hairline outline only).

---

## 2. JRC flood hazard

Source: JRC global river-flood hazard maps — **90 m, fluvial (riverine) only**, modeled.

**Option A (preferred):** bake the per-field summaries into `fields.pmtiles` (§1). The map only
needs the per-field numbers, so no raster needs to ship.

**Option B (optional raster underlay):** per-RP **COG** depth rasters clipped to Moldova
(`jrc_depth_rp{n}.tif`). Only add if you want a continuous hazard wash under the fields.

State the limits plainly in the UI: **JRC · 90 m · fluvial only · modeled.**

---

## 3. Administrative units (raioane)

For the hover/click admin panel — the "act on it" numbers.

**File:** `admin.pmtiles` or `admin.geojson`.

**Per-unit attributes, per RP:**

| attribute | type | notes |
|---|---|---|
| `id`, `name` | string | raion id + display name |
| `total_ag_ha` | number | total agricultural area in the unit |
| `exposed_ha_10` … `exposed_ha_500` | number | ag area exposed at each RP |
| `fields_touched_10` … `_500` | int | count of fields intersecting the floodplain at each RP |
| `cropland_share_10` … `_500` | number 0–100 | share of cropland in the floodplain at each RP |

---

## 4. Headline summary

**File:** `summary.json`

```json
{
  "pct_ag_in_rp100_floodplain": 38.0,
  "total_ag_ha": 0,
  "generated": "YYYY-MM-DD",
  "source": "JRC 90m fluvial + FTW boundaries"
}
```

`pct_ag_in_rp100_floodplain` drives the on-load headline stat. Replace the `38%` placeholder.

---

## 5. Portfolio sample (STUB workflow)

Drives the "Load portfolio" demo. Mock data, real workflow.

**File:** `sample_portfolio.csv`

| column | type | notes |
|---|---|---|
| `parcel_id` | string | portfolio's own id |
| `field_id` | string | FK to `fields.id` (preferred) |
| `lat`, `lon` | number | alternative to `field_id`; point-in-polygon match at load |
| `crop` | string | optional |
| `value_eur` | number | exposed value, for portfolio EAL |

On load: parse client-side, match to fields, highlight matched fields, compute portfolio EAL
(real exposure × placeholder coefficients), parcels exposed at RP100, and concentration by
raion. All outputs wear the `PROPUS` treatment.

---

## 6. Ramp class breaks (depth → color)

Map mean depth (m) to the six Hydro ramp stops. **Confirm against the real data distribution;**
starting point:

| bucket | depth range (m) | ramp stop |
|---|---|---|
| 1 | 0 – 0.25 | `#CFE3F2` |
| 2 | 0.25 – 0.5 | `#9BC4E6` |
| 3 | 0.5 – 1.0 | `#5E97D1` |
| 4 | 1.0 – 2.0 | `#2E68B5` |
| 5 | 2.0 – 4.0 | `#1C4189` |
| 6 | 4.0+ | `#0E2356` |

Use a stepped (bucketed) scale, not a continuous interpolation, so the legend reads cleanly and
matches print. Document the final breaks in the legend tooltip.

---

## File layout (suggested, on the CDN)

```
/data/
  fields.pmtiles
  admin.pmtiles            (or admin.geojson)
  summary.json
  sample_portfolio.csv
  jrc_depth_rp{10,20,50,100,200,500}.tif   (optional, Option B only)
```
