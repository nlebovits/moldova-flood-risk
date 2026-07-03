# Porting this demo to a new country

This map is built for Moldova, but almost everything country-specific is funneled
through a few config seams. Pointing it at a different country (and its
first-level administrative units) is mostly editing **one YAML file** and
rebuilding the data. Moldova stays in the repo as the worked example.

The pipeline assumes two things exist for your target country:

- **JRC GloFAS** fluvial flood-hazard coverage (global 90 m — most countries are covered), and
- an **Overture Divisions** subtype that maps to the administrative level you want to show.

Field boundaries come from **Fields of The World (FTW)**, which is global — no change needed.

Flood depth is streamed live from the global **JRC GloFAS** STAC catalog on
Source Cooperative (`nlebovits/jrc-glofas`) — there is **no per-country flood COG
build or upload**. Porting the flood layer is just telling the frontend which of
the catalog's 10° tiles cover your country (step 3).

---

## 1. Edit `precompute/config.yaml`

This is the main seam. Change:

```yaml
country:
  name: "Republic of Moldova"   # → your country's English name
  iso: "MD"                      # → ISO 3166-1 alpha-2 (e.g. "RO", "UA")
  bbox: [26.5, 45.3, 30.3, 48.6] # → [west, south, east, north], ~0.1° buffer past the border

admin:
  overture_release: "2026-05-20.0"  # keep in sync with app/src/config.ts note below
  overture_subtype: "region"        # first-level subtype for your country ("region", "county", …)
```

Everything else is **derived from the bbox** and normally left alone:

- `projection.utm_epsg: null` → UTM zone auto-derived from the bbox centroid.
- `hazard.jrc_tile_ids: []` → the covering JRC tiles auto-derived from the bbox.
- `ui.min_zoom` / `ui.max_zoom` → camera zoom window.

Sanity-check the resolved values before building:

```bash
cd precompute
uv sync
uv run moldova-precompute info     # prints country, bbox, derived UTM zone + JRC tiles
```

> Not sure which Overture subtype is your first admin level? Overture's `region`
> is the most common; some countries use `county`. If `build-admin` returns the
> wrong number of units, try the other subtype.

## 2. Build the data

```bash
cd precompute
export GPIO_PROJECT=/path/to/geoparquet-io   # local checkout providing `gpio pmtiles`
make data
```

`make data` writes the committed sidecars (`admin.geojson`, `summary.json`,
`eal.json`) plus the large `fields.pmtiles` artifact into `app/public/data/`.
`fields.pmtiles` is gitignored — it goes to your CDN (step 3). `summary.json`
now carries a data-driven `view` block, so the map camera follows your bbox with
no frontend edit.

> The flood layer no longer needs built COGs — it streams the JRC tiles straight
> from the published catalog (step 3). `make flood-cogs` is therefore optional
> and off the critical path; it stays only for offline experimentation.

> **geoparquet-io:** the tiling step shells out to `gpio pmtiles`, which the
> published release does not yet ship. Use a local checkout and point
> `GPIO_PROJECT` at it. All other steps run without it.

## 3. Host `fields.pmtiles` and point the app at the flood tiles

Two frontend seams, both in **`app/src/config.ts`**.

**a. Fields CDN.** Upload `fields.pmtiles` to a CORS-open, range-request CDN
(this demo uses [Source Cooperative](https://source.coop)) and set:

```ts
export const DATA_CDN_BASE = 'https://<your-cdn>/<path-to-the-folder>';
```

`FIELDS_PMTILES` (`sources.ts`) derives from it. For local-only work, set
`DATA_CDN_BASE = ''` to fall back to `fields.pmtiles` under `/data`.

**b. Flood tiles.** The flood layer streams from the global JRC GloFAS catalog,
so `JRC_CATALOG_BASE` normally needs no change. Set `JRC_TILES` to the tiles
covering your country — the **same** `[id, "Nlat_Elon"]` pairs `moldova-precompute
info` resolves for your bbox (step 1):

```ts
export const JRC_TILES: ReadonlyArray<readonly [number, string]> = [
  [134, 'N50_E20'],   // → your country's covering tiles
];
```

Each tile becomes one streamed COGLayer per return period; list all tiles that
overlap the bbox so no part of the country renders empty.

Also bump `OVERTURE_DIVISIONS_RELEASE` in `app/src/map/sources.ts` to match the
`overture_release` you set in `config.yaml`, so the basemap admin outlines line
up with the computed aggregates.

## 4. Translate the UI strings

Place names come straight from Overture (via `admin.geojson`) — no translation
needed. Only a handful of **fixed** UI strings reference Moldova or its admin
term ("raion"). Edit them in `i18n/ro.json` and `i18n/en.json`:

- `app.subtitle` — the country name shown under the title.
- `admin_select.label` / `admin_select.placeholder` — "Zoom to a raion".
- `eal.concentration_by_raion`, `portfolio.hint` — the "raion" wording.

`build_admin.py` prefers the Romanian (`ro`) Overture name to keep Moldova's
labels monolingual; if your country reads better in another language, change the
`names.common[...]` preference there. Adding a brand-new locale means adding it
to `DICTS`/`Locale` in `app/src/lib/i18n.ts`.

## 5. Build and deploy

```bash
cd app
pnpm install
pnpm build          # typecheck + bundle (also `pnpm dev` to preview locally)
vercel --prod       # from the repo root
```

---

## Touch-point summary

| What | Where | Auto? |
|---|---|---|
| Country name, ISO, bbox | `precompute/config.yaml` | edit |
| Overture release + subtype | `precompute/config.yaml` (+ `app/src/map/sources.ts` release) | edit |
| UTM zone | derived from bbox (`projection.utm_epsg: null`) | ✅ auto |
| JRC tiles | derived from bbox (`hazard.jrc_tile_ids: []`) | ✅ auto |
| Initial map view (center/bounds/zoom) | emitted into `summary.json` → read by the app | ✅ auto |
| Data CDN | `DATA_CDN_BASE` in `app/src/config.ts` | edit |
| UI strings ("raion", country name) | `i18n/{ro,en}.json` | edit |
| Return periods (10/20/50/100/200/500) | `const.py` + frontend RP selector | locked design — deeper edit |
