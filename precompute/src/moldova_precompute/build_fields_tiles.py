"""Step 7: tile the attributed fields into ``fields.pmtiles``.

Streams ``_work/fields_attributed.parquet`` through the development
geoparquet-io ``pmtiles`` command (which wraps tippecanoe) to produce a
Moldova-only vector tileset with per-RP flood attributes baked into every
field feature. The front-end colors fields directly off ``depth_{rp}`` and
reads exposure on click straight from the tile — no runtime ID lookup.
"""

from __future__ import annotations

import shutil
import subprocess

import click

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

    cmd = [
        "uv", "run", "--project", const.GPIO_DEV_PROJECT,
        "gpio", "pmtiles", "create",
        str(const.FIELDS_ATTRIBUTED_PARQUET),
        str(const.FIELDS_PMTILES),
        "-l", SOURCE_LAYER,
        "--min-zoom", str(MIN_ZOOM),
        "--max-zoom", str(MAX_ZOOM),
        "--include-cols", ",".join(INCLUDE_COLS),
        "--attribution", const.ATTRIBUTION,
    ]

    click.echo(f"Tiling {const.FIELDS_ATTRIBUTED_PARQUET.name} → {const.FIELDS_PMTILES.name}")
    click.echo("  " + " ".join(cmd))
    subprocess.run(cmd, check=True)

    size_mb = const.FIELDS_PMTILES.stat().st_size / 1e6
    click.echo(f"Done. Wrote {const.FIELDS_PMTILES} ({size_mb:.1f} MB)")
    click.echo(f"  source-layer: {SOURCE_LAYER}")
