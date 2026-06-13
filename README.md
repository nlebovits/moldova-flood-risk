# Moldova Agricultural Flood-Risk Map (Demo)

> A static, client-only web map that shows the flood exposure of Moldova's agricultural
> land. It does two things at once: it renders **real, computed evidence** (JRC flood
> hazard + Fields-of-The-World boundaries) and it stages **labeled, mocked "proposed
> capabilities"** (the pitch — EAL, portfolio intake, a national Fathom-grade map, pluvial,
> Overture extensions). The whole demo is built to **argue for its own replacement** without
> ever letting a viewer confuse what is true today with what is being proposed.

**Live demo: https://moldova-flood-risk.vercel.app/**

---

## Status

Built and deployed. The **REAL spine** (map + return-period selector + reactive headline
stat + field-click exposure + admin-unit panel + EAL + persistent provenance) renders from
real precomputed data. The **PROPOSED stubs** (portfolio intake, "what this becomes",
disabled pluvial / Overture toggles) render in the proposed treatment. RO is the default
locale; EN follows.

---

## Architecture

Zero backend, fully static SPA. Everything — vector tiles, rasters, JSON — is served from a
CDN or static host; all data is precomputed offline.

| Layer | Choice |
|---|---|
| Framework | React 19 + Vite + TypeScript |
| Map engine | MapLibre GL JS 5 + the `pmtiles` protocol |
| Raster overlay | deck.gl 9 (`MapboxOverlay`, interleaved) + `@developmentseed/deck.gl-geotiff` `COGLayer`, Hydro colormap on the GPU |
| Styling | Tailwind CSS v4 (CSS-first), design tokens in `app/src/styles/tokens.css` |
| State | zustand (`app/src/store/state.ts`) |
| Geocoding | Nominatim (OpenStreetMap), on-Enter only (no per-keystroke autocomplete) |
| Precompute | Python + `uv` (`precompute/`): exactextract, rasterio, rio-cogeo, geopandas |

**How the evidence renders.** Field boundaries draw as plain Lagoon-green **outlines** (a
transparent fill is kept only for click hit-testing). The flood **evidence** is a per-RP
**Cloud-Optimized GeoTIFF** depth raster rendered by deck.gl through the locked blue Hydro
colormap, composited beneath the field outlines. Changing the return period swaps the COG
(stable layer id, so deck.gl re-fetches rather than rebuilding) and updates every dependent
figure.

---

## Repository layout

```
moldova-flood-risk/
├── app/                     ← the static SPA (React + Vite)
│   ├── src/
│   │   ├── map/             ← MapView, sources, interactions, flood/ (COG + colormap)
│   │   ├── components/      ← sidebar panels + map chrome
│   │   ├── store/           ← zustand state
│   │   └── styles/tokens.css ← design tokens (mirror of design-reference)
│   └── public/data/         ← small committed sidecars (summary/admin/eal JSON, CSV)
├── precompute/              ← offline pipeline (uv + Makefile): FTW × JRC → tiles + JSON + COGs
├── report/                  ← Quarto reproducible risk-assessment report
├── i18n/{ro,en}.json        ← keyed strings (RO default), imported at build time
├── design-reference/        ← canonical visual language (HTML style board + tokens + private fonts)
├── vercel.json              ← static deploy config (build app/, output app/dist)
└── CLAUDE.md                ← agent orientation
```

---

## Running locally

```bash
cd app
pnpm install
pnpm dev
```

The small sidecars (`summary.json`, `admin.geojson`, `eal.json`, `sample_portfolio.csv`) are
committed under `app/public/data/`. The two large artifacts — the field vector tiles and the
flood COGs — are streamed from Source Cooperative (see below), so a clean checkout runs
without regenerating anything.

To rebuild the data from scratch:

```bash
cd precompute
uv sync
make data          # fields.pmtiles + JSON sidecars + flood COGs
make flood-cogs    # just the per-RP flood-depth COGs
make report        # + render the Quarto report
```

---

## Data hosting (Source Cooperative)

Two artifacts are too large to commit, so they're hosted on Source Cooperative
(`nlebovits/moldova-test-data`) and served range-requestable + CORS-open from its read CDN:

- **Flood COGs** — `…/jrc/RP{rp}_depth.tif` (six, ~6 MB each)
- **Field tiles** — `…/fields.pmtiles` (~230 MB)

The app reaches them through **two single swap points**:

- `app/src/map/flood/jrc-sources.ts` → `JRC_COG_BASE`
- `app/src/map/sources.ts` → `FIELDS_PMTILES`

Both point at `https://data.source.coop/nlebovits/moldova-test-data/…`. To run fully local,
point them back at `/data/jrc` and `pmtiles:///data/fields.pmtiles` (the files are also
written there by `make flood-cogs` / `make fields-tiles`).

### The flood COG pipeline (`build-flood-cogs`)

JRC encodes dry land as **nodata `-9999`** (≈93% of the Moldova clip), not 0. If `-9999` is
kept as nodata while building `average` overviews, GDAL excludes nodata from the mean and the
flood extent dilates badly at low zoom. So `build_flood_cogs.py` mosaics the two cached JRC
tiles per RP, clips to the Moldova bbox, **zero-fills every dry / nodata / ≤0 pixel before
building `average` overviews**, and writes a float32 COG with `nodata=None` (depth 0 renders
transparent via the GPU colormap). Verified honest: a coarse-overview flood fraction stays
close to the full-resolution fraction instead of blowing up.

---

## Deployment (Vercel)

Static deploy from the repo root (the root is required because `i18n/` is imported from
outside `app/`). Key configuration:

- **`vercel.json`** — `installCommand: cd app && pnpm install --frozen-lockfile`,
  `buildCommand: cd app && pnpm build`, `outputDirectory: app/dist`.
- **`packageManager: pnpm@10.12.4`** in the root `package.json` + `app/package.json`, with the
  project env var **`ENABLE_EXPERIMENTAL_COREPACK=1`** so Vercel provisions the right pnpm (the
  v9 lockfile is incompatible with Vercel's default pnpm).
- **`.vercelignore`** — keeps the upload small: excludes `precompute/`, `report/`,
  `design-reference/`, the Source-Coop-hosted data files, and the private font symlinks.

Deploy: `vercel --prod`. The committed sidecars are served by Vercel from `/data/…`; the large
tiles + COGs stream from Source Cooperative.

---

## The live-vs-proposed rule

Two visual registers, applied everywhere, so a viewer **always** knows whether they're
looking at evidence or a pitch:

| | **LIVE (real, computed)** | **PROPOSED (mocked stub — the pitch)** |
|---|---|---|
| Fill | Solid (the blue flood ramp / Lagoon outlines) | Diagonal **hatch** (`repeating-linear-gradient`, 45°) |
| Stroke | Solid 1px hairline | **Dashed** 1px, tangerine `#FCBB15` |
| Stamp | none needed inline — a single **Data sources** block carries provenance | `PROPUS` — tangerine `#FCBB15`, mono, dashed border, hollow dot |
| Editable mock values | — | tangerine mono text with a dashed underline + `✎` |
| Tone of copy | Plain, factual, states limits | "method real, coefficients placeholder" — honest about being a mock |

The hatch + dashed-tangerine + `PROPUS` stamp combination appears on **every** stub. The eye
should learn it once. **Tangerine `#FCBB15` is reserved exclusively for "proposed"** — it must
never appear in the chrome or the flood ramp.

> Note: this is the one place the implementation refined the spec. The original design
> stamped `DATE REALE` on every REAL panel; in the build those repeated stamps are replaced by
> a single **Data sources** block at the foot of the sidebar (sources + licenses + the
> persistent "JRC 90 m · fluvial only" caveat). The REAL/PROPOSED distinction is unchanged —
> REAL is solid, PROPOSED wears the hatch/dash/tangerine/`PROPUS` treatment.

---

## Visual system (locked)

Authoritative values live in `design-reference/colors_and_type.css`, mirrored into
`app/src/styles/tokens.css`. Highlights:

### Theme & basemaps
- **Light is the default.** Dark rides along with the dark / satellite basemaps.
- **Basemaps (switcher, 3 options):** Carto **Positron** (light, default), Positron **Dark**,
  **Esri World Imagery** (satellite). The same blue flood ramp and hairline chrome ride on all
  three. The basemap switcher is folded into the bottom-left legend.

### Sharp, data-y aesthetic
- **No rounded corners. Anywhere.** `border-radius: 0` on every control, card, panel, input,
  and the map container.
- **Hairline borders:** `1px` at `rgba(38,56,58,0.12)` (light) / `rgba(239,235,234,0.14)` (dark).

### Three color vocabularies — never blurred
- **Lagoon `#469695` = interface only** (active state, selection, links, field outlines).
- **Blue Hydro ramp = evidence only** (the flood raster).
- **Tangerine `#FCBB15` = proposed only** (the stubs).

### Flood-exposure ramp — "Hydro", sequential blue (LOCKED)
Depth of inundation at the selected return period. Single-hue, color-blind-safe. Six stops,
shallow → deep:

```
#CFE3F2  #9BC4E6  #5E97D1  #2E68B5  #1C4189  #0E2356
```

### Typography
The licensed brand faces (**Vert Grotesk Display**, **Neue Swiss**, **Berkeley Mono**) are
private and not deployed. The app ships free, open-licensed Google Fonts analogs that lead
their fallback stacks only when the licensed faces aren't installed locally:

- **Display** — Vert Grotesk Display → **Space Grotesk** (headline stat, section titles)
- **Body / UI** — Neue Swiss → **Inter**
- **Mono** — Berkeley Mono → **IBM Plex Mono** (data, units, labels, the RP selector)

Sentence case everywhere; ALL-CAPS only for small mono eyebrow labels (`.14em` tracking).
**No emoji, ever.** The "fields" icon is the Lucide `sprout` mark.

---

## What's on screen

Tagged **[REAL]** (the computed spine — solid and correct) or **[STUB]** (the pitch — wears
the proposed treatment). The layout is a **solid left sidebar** (all panels) beside a **map**
that fills the rest with floating chrome.

**Sidebar (top → bottom):**
1. **Header [REAL]** — app title / subtitle + RO/EN language toggle.
2. **Return-period selector [REAL]** — full-width segmented `RP10 · RP20 · RP50 · RP100 · RP200 · RP500`
   (default RP100). Active = Lagoon. Changing it swaps the flood COG and updates every figure below.
3. **Headline stat [REAL]** — one big number (Space Grotesk), the real ag-exposed share for the
   **selected** RP, read from `summary.json`'s `by_rp` table; the sentence interpolates the RP
   ("1-in-{rp}").
4. **Admin-unit selector [REAL]** — a sharp native `<select>` of raioane; choosing one flies to it.
   Stays in sync with map clicks.
5. **Field / raion panel [REAL]** — on click: a field's exposure across all six RPs (% inundated +
   mean depth), or a raion's per-RP totals (ag area, exposed ha, fields touched, cropland share).
6. **EAL panel [REAL]** — national Expected Annual Loss (ha/yr) + a ranked list of the most-at-risk
   raioane; row click flies to the raion.
7. **PROPOSED section [STUB]** — collapsible, visually separated: portfolio intake (live CSV parse +
   point-in-polygon join, indicative readout), "what this becomes" (JRC 90 m floor vs Fathom-grade
   ceiling), and disabled pluvial / building-footprint / infrastructure toggles.
8. **Data sources [REAL]** — JRC GloFAS, Fields of The World, Overture Maps (linked + licensed);
   the "JRC 90 m, fluvial" provenance is carried in the JRC source line itself.

**Map chrome:** Nominatim **geocoder** (top-left), **zoom + national-reset** controls
(top-right), **legend + basemap switcher** (bottom-left), attribution (bottom-right).

---

## Interactions & behavior

- **RP change** → swap the flood COG + update the open field/raion panel, the headline, the EAL
  context, and the legend's RP label.
- **Field click** → exposure-profile panel. **Admin hover** → outline; **click** (or dropdown
  select, or EAL row click) → panel + fly-to.
- **Geocoder** → search a place (Moldova-scoped), fit to its bounding box.
- **Basemap switch** → Positron / Positron Dark / Esri satellite; dark/satellite flips the chrome
  to dark tokens. The interleaved deck.gl overlay survives the style rebuild.
- **Language toggle** → swap all strings RO ⇄ EN and reformat numbers for the locale.
- **Stubs** are interactive workflows with mock data, always wearing the proposed treatment.
- **Motion:** 120/200/320ms; ease-out `cubic-bezier(0.2,0.6,0.2,1)`. **Accessibility:** 2px Lagoon
  focus ring; the single-hue ramp + stamps/hatch never rely on color alone.

---

## Data contract

Everything is **precomputed offline** (`precompute/`) and published as static files.

- **Field boundaries (FTW)** — `fields.pmtiles` (source-layer `fields`). Per feature: `id`,
  `area_ha`, `min_rp`, and per RP `pct_inun_{rp}` (0–100) + `depth_{rp}` (mean depth, m). Hosted
  on Source Cooperative.
- **JRC flood hazard** — per-RP **COG** depth rasters (90 m, fluvial, Moldova extent), built by
  `build-flood-cogs` and rendered as the evidence raster. Hosted on Source Cooperative.
- **Admin units (raioane)** — `admin.geojson` (Overture Divisions, region level — shares the
  basemap's OSM lineage so outlines coincide). Per unit, per RP: `total_ag_ha`,
  `exposed_ha_{rp}`, `fields_touched_{rp}`, `pct_exposed_{rp}`. Committed.
- **Headline + rollups** — `summary.json`: `pct_ag_in_rp100_floodplain`, totals, and a `by_rp`
  table (`exposed_ha`, `fields_touched`, `pct_ag_exposed` per RP). Committed.
- **EAL** — `eal.json`: national + per-raion expected annual loss (ha/yr), trapezoidal over the RP
  probability curve. Committed.
- **Portfolio sample (stub)** — `sample_portfolio.csv` (`parcel_id, lat, lon, crop, value_eur`),
  joined to raioane by point-in-polygon at load. Committed.
- **Ramp class breaks (depth, m)** — `0.25 / 0.5 / 1 / 2 / 4` (bucket 6 = 4+).

The TypeScript shapes mirror these in `app/src/lib/types.ts`.

---

## Internationalization

- **RO is the default and ships first;** EN follows. Strings in `i18n/{ro,en}.json`, keyed and
  swapped client-side — never hardcode user-facing copy.
- **Number formatting:** `Intl.NumberFormat('ro-RO')` (comma decimal, space thousands) / `en-US`.
- Diacritics **ă â î ș ț** verified in the fonts.

---

## Design tokens

Authoritative source: `design-reference/colors_and_type.css`, mirrored into
`app/src/styles/tokens.css`. Key values:

- **Chrome:** map base `#121A19`, Ponderosa `#26383A`, Dusty white `#EFEBEA`, raised dark `#2D4244`
- **Interaction:** Lagoon `#469695` (hover `#3B7F7E`, pressed `#2F6766`), Lagoon-200 `#9BC3C2` (dark)
- **Flood ramp (Hydro):** `#CFE3F2 #9BC4E6 #5E97D1 #2E68B5 #1C4189 #0E2356`
- **Status:** success/real `#3F8F6E`, warning/caveat `#C98A1A`; **Proposed:** tangerine `#FCBB15`
- **Radius:** `0` everywhere. **Motion:** `--dur-fast 120ms / --dur-base 200ms / --dur-slow 320ms`.

---

## Design reference

`design-reference/Design Language — Moldova Flood Risk.html` is the canonical visual reference —
open it in a browser to see the locked palette, flood ramp, type, the live-vs-proposed treatment,
and the in-situ map composition. Where this README and the HTML reference disagree: the README
wins for **behavior**, the HTML wins for **visual detail**. The licensed brand fonts in
`design-reference/fonts/` are **private** — never commit or deploy them.
