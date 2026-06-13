"""Step 7: tile the attributed fields into ``fields.pmtiles``.

Quantizes ``_work/fields_attributed.parquet`` (float metres / hectares) into
``_work/fields_tiles.parquet`` (integer millimetres / ares), then streams that
through the development geoparquet-io ``pmtiles`` command (which wraps
tippecanoe) to produce a Moldova-only vector tileset with per-RP flood
attributes baked into every field feature. The front-end reads a field's
exposure on click straight from the tile — no runtime ID lookup — and un-scales
the integers back to metres / hectares (see ``app/src/lib/types.ts``).

The integer quantization is the key performance lever: MVT stores non-integer
attributes as 8-byte doubles, so a tile of attribute-heavy features blows past
the size budget and ``--drop-densest-as-needed`` deletes most of them. As cheap
deduplicating varints, the attributes fit and nearly every field survives.
"""

from __future__ import annotations

import shutil
import subprocess

import click
import geopandas as gpd

from . import const

# Source-layer name inside the tileset. The front-end references this exactly.
SOURCE_LAYER: str = "fields"

# Attributes baked into each tile feature (geometry travels implicitly).
INCLUDE_COLS: tuple[str, ...] = (
    ("id", "area_ha")
    + tuple(f"pct_inun_{rp}" for rp in const.RETURN_PERIODS)
    + tuple(f"depth_{rp}" for rp in const.RETURN_PERIODS)
    + ("min_rp",)
)

MIN_ZOOM: int = 6
MAX_ZOOM: int = 14

# Per-tile byte budget. With the attributes quantized to varints (see
# _quantize_for_tiles), this cap mainly thins the national-scale (z6–z8) tiles
# where individual fields are sub-pixel anyway; mid/high zooms keep ~every
# field. Tippecanoe's --drop-densest-as-needed (gpio default) drops against it.
MAX_TILE_BYTES: int = 1_000_000


def _quantize_for_tiles() -> None:
    """Write ``fields_tiles.parquet`` with float attributes cast to integers.

    Metres → millimetres (``depth_{rp}``), hectares → ares (``area_ha``). This
    keeps the analytical ``fields_attributed.parquet`` untouched (float, SI)
    while the tiled copy carries cheap deduplicating varints. ``pct_inun_{rp}``
    is already binary 0/100 and ``min_rp`` already an int; both are cast to a
    compact integer dtype so the GeoJSON stream emits integer tokens.
    """
    gdf = gpd.read_parquet(const.FIELDS_ATTRIBUTED_PARQUET)

    gdf["area_ha"] = (gdf["area_ha"] * const.TILE_AREA_SCALE).round().astype("int32")
    gdf["min_rp"] = gdf["min_rp"].round().astype("int16")
    for rp in const.RETURN_PERIODS:
        gdf[f"depth_{rp}"] = (
            (gdf[f"depth_{rp}"] * const.TILE_DEPTH_SCALE).round().astype("int32")
        )
        gdf[f"pct_inun_{rp}"] = gdf[f"pct_inun_{rp}"].round().astype("int16")

    gdf.to_parquet(const.FIELDS_TILES_PARQUET)


def run() -> None:
    """Build ``app/public/data/fields.pmtiles`` from the attributed parquet."""
    if not const.FIELDS_ATTRIBUTED_PARQUET.exists():
        raise FileNotFoundError(
            f"Attributed fields not found: {const.FIELDS_ATTRIBUTED_PARQUET}\n"
            "Run 'moldova-precompute zonal-stats' first."
        )
    if shutil.which("tippecanoe") is None:
        raise RuntimeError(
            "tippecanoe not found on PATH — required by `gpio pmtiles create`."
        )

    const.APP_DATA_DIR.mkdir(parents=True, exist_ok=True)

    click.echo(
        f"Quantizing {const.FIELDS_ATTRIBUTED_PARQUET.name} "
        f"→ {const.FIELDS_TILES_PARQUET.name} (depth→mm, area→ares)"
    )
    _quantize_for_tiles()

    # tippecanoe refuses to overwrite an existing tileset, so clear it first
    # to keep regeneration idempotent.
    const.FIELDS_PMTILES.unlink(missing_ok=True)

    cmd = [
        "uv", "run", "--project", const.GPIO_DEV_PROJECT,
        "gpio", "pmtiles", "create",
        str(const.FIELDS_TILES_PARQUET),
        str(const.FIELDS_PMTILES),
        "-l", SOURCE_LAYER,
        "--min-zoom", str(MIN_ZOOM),
        "--max-zoom", str(MAX_ZOOM),
        "--include-cols", ",".join(INCLUDE_COLS),
        "--attribution", const.ATTRIBUTION,
        # Cap per-tile bytes so --drop-densest-as-needed (gpio default) thins
        # the dense national-scale tiles instead of shipping multi-MB tiles.
        # --maximum-tile-bytes takes precedence over gpio's default
        # --no-tile-size-limit. Requires geoparquet-io issue #492.
        "--maximum-tile-bytes", str(MAX_TILE_BYTES),
    ]

    click.echo(f"Tiling {const.FIELDS_TILES_PARQUET.name} → {const.FIELDS_PMTILES.name}")
    click.echo("  " + " ".join(cmd))
    subprocess.run(cmd, check=True)

    size_mb = const.FIELDS_PMTILES.stat().st_size / 1e6
    click.echo(f"Done. Wrote {const.FIELDS_PMTILES} ({size_mb:.1f} MB)")
    click.echo(f"  source-layer: {SOURCE_LAYER}")
