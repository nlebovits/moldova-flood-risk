# Moldova Flood Risk Assessment — Reproducible HTML Document

## Context

The goal is to create a **fully reproducible HTML risk assessment** for riverine flooding and agriculture in Moldova, suitable for GitHub Pages. This follows the methodology from the esperanza.ipynb cookbook (hazard-exposure-risk framework with EAL calculation) and the presentation style of Chris Holmes' parks_buildings.html (Quarto-style narrative with interactive PMTiles maps).

**Data sources:**
- JRC GloFAS flood hazard rasters (90m, 6 return periods) — already downloaded to `precompute/_work/jrc/`
- Fields of the World (FTW) field boundaries — global PMTiles at Source Cooperative

**Key outputs:**
- Single self-contained HTML file with embedded maps, charts, and pre-computed statistics
- Reproducible via `make report` (runs full pipeline from raw data to HTML)

---

## Architecture

```
precompute/
  src/moldova_precompute/
    const.py                   # Existing - extend with EAL params
    fetch_jrc.py              # Implement - download JRC rasters (skip if cached)
    extract_fields.py         # Implement - FTW extraction via DuckDB spatial query
    zonal_stats.py            # Implement - exactextract per-field per-RP
    build_admin.py            # Implement - GADM fetch + spatial join
    build_summary.py          # Implement - headline stats
    build_eal.py              # NEW - Expected Annual Loss calculation
    export_report_data.py     # NEW - consolidate JSON for Quarto

report/
  _quarto.yml                  # Quarto project config
  moldova-flood-risk.qmd       # Main document (sections 01-07)
  styles.css                   # Moldova design tokens
  data/                        # Pre-computed JSON for embedding
```

---

## Implementation Plan

### Phase 1: Complete Precompute Pipeline

**1.1 Implement `extract_fields.py`**
- Use DuckDB with spatial extension to query FTW global PMTiles
- Filter by Moldova bbox (26.5, 45.3, 30.3, 48.6)
- Output: `_work/fields.parquet` (~100k-500k polygons)
- Pattern from esperanza: DuckDB + ST_Within for spatial filter

**1.2 Implement `fetch_jrc.py`**
- Download 12 rasters (2 tiles × 6 RPs) if not already cached
- Use httpx with streaming for large files
- Merge tiles into single Moldova-extent raster per RP using rasterio mosaic

**1.3 Implement `zonal_stats.py`**
- Use exactextract (already in pyproject.toml) for per-field statistics
- For each field, for each RP, compute:
  - `pct_inun_{rp}`: % of field with depth > 0
  - `depth_mean_{rp}`: mean depth where flooded
  - `depth_max_{rp}`: max depth
- Output: `field_attrs.json` (keyed by field ID)

**1.4 Implement `build_admin.py`**
- Fetch GADM Moldova raioane (level 1 admin units) via pygadm or direct download
- Spatial join fields to raioane
- Aggregate: total_ag_ha, exposed_ha by RP, field_count
- Output: `admin.geojson` with embedded statistics

**1.5 Implement `build_summary.py`**
- Compute headline stat: "X% of Moldova's agricultural land lies in the RP100 floodplain"
- Count total fields, total exposed fields by RP
- Output: `summary.json`

---

### Phase 2: EAL Calculation

**2.1 Implement `build_eal.py`**
- Expected Annual Loss using trapezoidal integration (esperanza methodology):
  ```
  EAL = Σ ((L_i + L_{i+1})/2) × (P_i - P_{i+1})
  ```
  where P_i = 1/RP_i and L_i = exposed_ha at RP_i
- Compute at field level and aggregate to raion level
- Output: `eal_by_admin.json`, `eal_national.json`

**2.2 Implement `export_report_data.py`**
- Consolidate all outputs into `report/data/`:
  - `summary.json`
  - `admin_stats.json` (simplified GeoJSON for embedding)
  - `eal_results.json`
  - `field_sample.json` (top 100 most exposed fields for table)
- Generate `_variables.yml` for Quarto params

---

### Phase 3: Quarto Document Structure

**Framework choice: Quarto** (single HTML output, Python code execution, MapLibre via OJS)

**Document structure (7 sections):**

```
§01 Executive Summary
- Hero stat (% ag land in RP100 floodplain)
- 3-4 key findings
- Data sources + licenses

§02 Study Area
- Moldova context, agricultural importance
- Map: Raioane boundaries with ag land overlay
- Total area figures

§03 Hazard Characterization
- JRC GloFAS methodology explanation
- Interactive map: Flood extent by RP (MapLibre + COGs from Source Coop CDN)
- Table: Coverage by return period
- Callout: Limitations (90m, fluvial only, no observed validation)

§04 Exposure Mapping
- FTW field boundaries explanation
- Map: Fields colored by flood depth
- Chart: Field area distribution by exposure class
- Hydro colormap legend

§05 Risk Calculation
- EAL methodology with formula
- Exceedance probability curve
- Table: EAL by raion (ranked)
- National EAL figure

§06 Field-Level Analysis
- Top 20 most exposed fields
- Pixel-level vs field-level comparison
- Spatial clustering patterns

§07 Summary & Recommendations
- Policy implications
- Limitations and caveats
- Future work (pluvial, higher resolution)

Appendix: Full Methodology & Reproducibility
- Data citations with URLs
- `make report` instructions
- Docker option for isolated builds
```

---

### Phase 4: Interactive Maps

**Strategy: Pre-rendered statics + one interactive overview**

- Most visualizations: matplotlib/plotly static (SVG embedded)
- Section 03 hazard map: Interactive MapLibre via OJS cell
  - Basemap: CARTO Positron
  - Flood extent: Pre-generated PMTiles or inline GeoJSON
  - RP selector: Inputs.select() → layer filter

**Map implementation (OJS cell in Quarto):**
```javascript
viewof selectedRP = Inputs.select([10, 20, 50, 100, 200, 500], {value: 100})

map = {
  const container = DOM.element('div', {style: 'height: 500px'});
  const map = new maplibregl.Map({
    container,
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [28.5, 47.0],
    zoom: 6
  });
  // Add admin boundaries layer
  // Add flood extent layer (filtered by selectedRP)
  return container;
}
```

---

### Phase 5: Design System

Port Moldova design tokens to Quarto CSS:

```css
:root {
  /* Hydro ramp (sequential blue) */
  --f1: #CFE3F2; --f2: #9BC4E6; --f3: #5E97D1;
  --f4: #2E68B5; --f5: #1C4189; --f6: #0E2356;
  
  /* Chrome */
  --ponderosa: #26383A;
  --lagoon: #469695;
  
  /* Sharp corners everywhere */
  --radius: 0;
  
  /* Typography */
  --font-display: "Vert Grotesk Display", serif;
  --font-body: "Neue Swiss", sans-serif;
  --font-mono: "Berkeley Mono", monospace;
}
```

---

### Phase 6: Reproducibility

**Makefile orchestration:**
```makefile
.PHONY: all data report clean

all: report

data:
	cd precompute && uv run moldova-precompute extract-fields
	cd precompute && uv run moldova-precompute fetch-jrc
	cd precompute && uv run moldova-precompute zonal-stats
	cd precompute && uv run moldova-precompute build-admin
	cd precompute && uv run moldova-precompute build-summary
	cd precompute && uv run moldova-precompute build-eal
	cd precompute && uv run moldova-precompute export-report

report: data
	cd report && quarto render moldova-flood-risk.qmd --to html

clean:
	rm -rf precompute/_work/fields.parquet
	rm -rf report/data/*.json
```

**Quarto config for single-file output:**
```yaml
format:
  html:
    self-contained: true
    embed-resources: true
    code-fold: true
execute:
  freeze: auto
  cache: true
```

---

## Critical Files

| File | Purpose |
|------|---------|
| `precompute/src/moldova_precompute/const.py` | Extend with EAL params, damage threshold |
| `precompute/src/moldova_precompute/zonal_stats.py` | Core analysis - implement with exactextract |
| `precompute/src/moldova_precompute/build_eal.py` | NEW - trapezoidal integration |
| `report/moldova-flood-risk.qmd` | NEW - main Quarto document |
| `report/_quarto.yml` | NEW - Quarto project config |
| `report/styles.css` | NEW - Moldova design tokens |

---

## Verification

1. Run `make data` — all precompute steps succeed, outputs in `_work/` and `report/data/`
2. Run `make report` — Quarto renders without errors
3. Open `report/moldova-flood-risk.html` in browser:
   - Hero stat visible with correct figure
   - All 7 sections render with maps/charts
   - Interactive RP selector works
   - Data sources cited with licenses
4. Compare with Chris's parks_buildings.html for presentation quality

---

## Decisions (Confirmed)

1. **Admin level**: Raioane (32 districts) — good balance of granularity vs readability
2. **Historic validation**: None available — skip validation section, document as limitation
3. **Map data loading**: CDN-hosted on Source Cooperative — keeps HTML small, data already uploaded
4. **Damage threshold**: 0.3m (from esperanza) — standard agricultural flooding threshold
5. **Field boundary vintage**: FTW 2025-01-01 — document timing mismatch with JRC model as limitation
