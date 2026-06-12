"""Project-wide constants for the precompute pipeline.

Single source of truth for:
- Moldova bbox + AOI
- Return periods (design spec)
- FTW PMTiles URL (Source Cooperative)
- JRC GloFAS flood-hazard URL pattern + Moldova-covering tile IDs
- Hydro ramp class breaks (depth → ramp stop)
- Output paths (relative to repo root)

These values are referenced by every step of the pipeline. If you need
to change a URL, a bbox, or a ramp break, change it here.
"""

from __future__ import annotations

from pathlib import Path
from typing import Final

# ---------------------------------------------------------------------------
# Moldova area of interest
# ---------------------------------------------------------------------------
# Slightly expanded bbox to give a 0.1° buffer beyond the national border
# (so border-touching fields aren't clipped). EPSG:4326 (WGS84).
MOLDOVA_BBOX: Final[tuple[float, float, float, float]] = (
    26.5,  # west
    45.3,  # south
    30.3,  # east
    48.6,  # north
)

# ---------------------------------------------------------------------------
# Return periods — per design spec (README §"Return-period selector").
# RP75 exists in the JRC dataset but is NOT used by this product.
# ---------------------------------------------------------------------------
RETURN_PERIODS: Final[tuple[int, ...]] = (10, 20, 50, 100, 200, 500)
DEFAULT_RP: Final[int] = 100

# ---------------------------------------------------------------------------
# Data sources
# ---------------------------------------------------------------------------
# FTW global field boundaries — PMTiles v3, ~2.14 TB total, range-requestable.
FTW_PMTILES_URL: Final[str] = (
    "https://data.source.coop/"
    "ftw/global-data/predictions/vectors/alpha/global.pmtiles"
)

# JRC GloFAS flood hazard maps (v2.1.2). Naming pattern:
#   ID{n}_N{lat}_E{lon}_RP{period}_depth.tif
# Moldova is covered by exactly two tiles in the JRC global grid:
JRC_BASE_URL: Final[str] = (
    "https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/"
    "CEMS-GLOFAS/flood_hazard"
)
JRC_MOLDOVA_TILE_IDS: Final[tuple[tuple[int, str], ...]] = (
    (134, "N50_E20"),  # main bulk: 20–30°E, 40–50°N
    (146, "N50_E30"),  # eastern sliver: 30–40°E, 40–50°N
)

# Tile extents reference (used only if we ever need to programmatically
# select tiles across a larger AOI — for Moldova the two IDs above are
# hard-coded and verified).
JRC_TILE_EXTENTS_URL: Final[str] = (
    f"{JRC_BASE_URL}/tile_extents.geojson"
)

# ---------------------------------------------------------------------------
# Hydro ramp — class breaks for mean depth (m).
# Confirm against the real distribution; documented in data-contract.md §6.
# ---------------------------------------------------------------------------
HYDRO_BREAKS_M: Final[tuple[float, ...]] = (
    0.25,  # bucket 1 ceiling
    0.5,   # bucket 2 ceiling
    1.0,   # bucket 3 ceiling
    2.0,   # bucket 4 ceiling
    4.0,   # bucket 5 ceiling
    # bucket 6: > 4.0
)
HYDRO_HEX: Final[tuple[str, ...]] = (
    "#CFE3F2",
    "#9BC4E6",
    "#5E97D1",
    "#2E68B5",
    "#1C4189",
    "#0E2356",
)

# ---------------------------------------------------------------------------
# Filesystem layout
# ---------------------------------------------------------------------------
# repo_root/
#   precompute/
#     _work/         ← intermediate artifacts (gitignored)
#       jrc/         ← downloaded depth rasters per RP
#       fields.parquet  ← Moldova FTW polygons extracted from global pmtiles
#       admin_raw.geojson
#   app/
#     public/data/   ← shipped artifacts (committed)
#       field_attrs.json
#       admin.geojson
#       summary.json
#       sample_portfolio.csv

# Path arithmetic:
#   __file__ = .../moldova-flood-risk/precompute/src/moldova_precompute/const.py
#   parents[0] = moldova_precompute/
#   parents[1] = src/
#   parents[2] = precompute/         ← PRECOMPUTE_ROOT
#   parents[3] = moldova-flood-risk/ ← REPO_ROOT
PRECOMPUTE_ROOT: Final[Path] = Path(__file__).resolve().parents[2]
REPO_ROOT: Final[Path] = PRECOMPUTE_ROOT.parent
WORK_DIR: Final[Path] = PRECOMPUTE_ROOT / "_work"
JRC_RASTER_DIR: Final[Path] = WORK_DIR / "jrc"
FIELDS_PARQUET: Final[Path] = WORK_DIR / "fields.parquet"
# Geometry + per-RP attributes welded together by zonal-stats; tiled into
# fields.pmtiles by build-fields-tiles. ID alignment guaranteed by construction.
FIELDS_ATTRIBUTED_PARQUET: Final[Path] = WORK_DIR / "fields_attributed.parquet"
ADMIN_RAW: Final[Path] = WORK_DIR / "admin_raw.geojson"

APP_DATA_DIR: Final[Path] = REPO_ROOT / "app" / "public" / "data"
FIELD_ATTRS_JSON: Final[Path] = APP_DATA_DIR / "field_attrs.json"
FIELDS_PMTILES: Final[Path] = APP_DATA_DIR / "fields.pmtiles"
ADMIN_GEOJSON: Final[Path] = APP_DATA_DIR / "admin.geojson"
SUMMARY_JSON: Final[Path] = APP_DATA_DIR / "summary.json"

# Development geoparquet-io checkout providing the `gpio pmtiles` command
# (the released 1.1.0b1 lacks it). Used by build-fields-tiles.
GPIO_DEV_PROJECT: Final[str] = "/home/nissim/Documents/dev/geoparquet-io"

# Attribution string — required by JRC's CC BY 4.0 license.
ATTRIBUTION: Final[str] = (
    "© European Union, Copernicus Emergency Management Service — "
    "JRC GloFAS flood hazard maps v2.1.2 "
    "(Baugh et al., 2024). CC BY 4.0. "
    "Field boundaries: Fields of The World (FTW). "
    "Map rendering: this project."
)
