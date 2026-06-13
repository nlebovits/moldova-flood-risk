"""Project-wide constants for the precompute pipeline.

Country-variable values (bbox, ISO code, Overture release/subtype, JRC tiles,
UTM zone, zoom window) are loaded from ``precompute/config.yaml`` and are the
only thing to edit when porting to a new country — see ``../PORTING.md``.

Everything else here is generic and locked by the design spec: return periods,
the Hydro colour ramp, tile-attribute quantization, and the output file layout.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Final

import yaml

# ---------------------------------------------------------------------------
# Country configuration (precompute/config.yaml — the single port-time seam)
# ---------------------------------------------------------------------------
_CONFIG_PATH: Final[Path] = Path(__file__).resolve().parents[2] / "config.yaml"
_CONFIG: Final[dict] = yaml.safe_load(_CONFIG_PATH.read_text())

COUNTRY_NAME: Final[str] = _CONFIG["country"]["name"]
COUNTRY_ISO: Final[str] = _CONFIG["country"]["iso"]

# Area of interest, EPSG:4326 [west, south, east, north]. (Name kept for the
# many call sites; the value comes from config — Moldova is the worked example.)
MOLDOVA_BBOX: Final[tuple[float, float, float, float]] = tuple(
    float(v) for v in _CONFIG["country"]["bbox"]
)  # type: ignore[assignment]

# Overture admin boundaries — release pinned to the frontend's divisions.pmtiles
# (OVERTURE_DIVISIONS_RELEASE in app/src/map/sources.ts) and the first-level
# division subtype for this country (Moldova: "region" = raioane).
OVERTURE_RELEASE: Final[str] = _CONFIG["admin"]["overture_release"]
OVERTURE_SUBTYPE: Final[str] = _CONFIG["admin"]["overture_subtype"]

# Initial-view zoom window surfaced to the frontend via summary.json.
MIN_ZOOM: Final[int] = int(_CONFIG["ui"]["min_zoom"])
MAX_ZOOM: Final[int] = int(_CONFIG["ui"]["max_zoom"])

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
JRC_BASE_URL: Final[str] = (
    "https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/"
    "CEMS-GLOFAS/flood_hazard"
)
# The 10°×10° tile grid, used to auto-select tiles covering an arbitrary bbox.
JRC_TILE_EXTENTS_URL: Final[str] = f"{JRC_BASE_URL}/tile_extents.geojson"

# Explicit tile override from config, or () to auto-derive from the bbox.
_JRC_TILE_IDS_CONFIG: Final[list] = _CONFIG.get("hazard", {}).get("jrc_tile_ids") or []


def resolve_jrc_tiles() -> tuple[tuple[int, str], ...]:
    """JRC ``(id, name)`` tiles covering the AOI.

    Uses ``hazard.jrc_tile_ids`` from config when set; otherwise derives them
    from the bbox via the JRC tile-extents grid (cached under ``_work/``).
    """
    if _JRC_TILE_IDS_CONFIG:
        return tuple((int(i), str(n)) for i, n in _JRC_TILE_IDS_CONFIG)
    from .jrc_tiles import tiles_for_bbox

    return tiles_for_bbox(
        MOLDOVA_BBOX, JRC_TILE_EXTENTS_URL, WORK_DIR / "tile_extents.geojson"
    )


# ---------------------------------------------------------------------------
# Metric projection for field-area calculation
# ---------------------------------------------------------------------------
def _utm_epsg_from_bbox(bbox: tuple[float, float, float, float]) -> int:
    """EPSG code for the UTM zone at the bbox centroid (326xx N / 327xx S)."""
    west, south, east, north = bbox
    lon = (west + east) / 2
    lat = (south + north) / 2
    zone = int((lon + 180) // 6) + 1
    return (32600 if lat >= 0 else 32700) + zone


# Config override, else auto-derive from the bbox (Moldova → 32635 / UTM 35N).
UTM_EPSG: Final[int] = int(
    _CONFIG.get("projection", {}).get("utm_epsg") or _utm_epsg_from_bbox(MOLDOVA_BBOX)
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
# Tile-prep copy of the above with float attributes quantized to integers
# (see TILE_*_SCALE below). Keeps the analytical parquet pure (meters / ha,
# float) while the tiled artifact carries cheap varint integers.
FIELDS_TILES_PARQUET: Final[Path] = WORK_DIR / "fields_tiles.parquet"
ADMIN_RAW: Final[Path] = WORK_DIR / "admin_raw.geojson"

APP_DATA_DIR: Final[Path] = REPO_ROOT / "app" / "public" / "data"
FIELD_ATTRS_JSON: Final[Path] = APP_DATA_DIR / "field_attrs.json"
FIELDS_PMTILES: Final[Path] = APP_DATA_DIR / "fields.pmtiles"
# Per-RP flood-depth COGs shipped to the app (built by build-flood-cogs from the
# cached JRC tiles in JRC_RASTER_DIR). Rendered as the flood-evidence raster.
JRC_COG_DIR: Final[Path] = APP_DATA_DIR / "jrc"
ADMIN_GEOJSON: Final[Path] = APP_DATA_DIR / "admin.geojson"
SUMMARY_JSON: Final[Path] = APP_DATA_DIR / "summary.json"

# ---------------------------------------------------------------------------
# Tile attribute quantization (build-fields-tiles)
# ---------------------------------------------------------------------------
# MVT stores attribute values in a per-tile deduplicated pool: integers are
# varints (1–2 bytes for small magnitudes) while any non-integer is an 8-byte
# double. So we quantize the float attributes to integers *in the tile only*
# — depth metres → integer millimetres, area hectares → integer ares — which
# turns 8-byte doubles into cheap varints and lets the pool dedupe. The
# front-end un-scales by the same factors on click (see app/src/lib/types.ts).
# Keep these two in sync with the TS constants.
TILE_DEPTH_SCALE: Final[int] = 1000  # metres → millimetres (depth_{rp})
TILE_AREA_SCALE: Final[int] = 100  # hectares → ares (area_ha)

# Local geoparquet-io checkout providing the `gpio pmtiles` command (the
# released 1.1.0b1 lacks it). Used by build-fields-tiles. Override the path with
# the GPIO_PROJECT env var; see ../PORTING.md and precompute/README.md.
GPIO_DEV_PROJECT: Final[str] = os.environ.get(
    "GPIO_PROJECT", "/home/nissim/Documents/dev/geoparquet-io"
)

# Attribution string — required by JRC's CC BY 4.0 license.
ATTRIBUTION: Final[str] = (
    "© European Union, Copernicus Emergency Management Service — "
    "JRC GloFAS flood hazard maps v2.1.2 "
    "(Baugh et al., 2024). CC BY 4.0. "
    "Field boundaries: Fields of The World (FTW). "
    "Map rendering: this project."
)
