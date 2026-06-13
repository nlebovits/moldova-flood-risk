"""Step 6: build per-RP flood-depth COGs for the app's raster overlay.

Mosaics the two cached JRC tiles per return period, clips to the Moldova
bbox, and writes a Cloud-Optimized GeoTIFF the front-end renders via
deck.gl-raster.

Key empirical finding (verified against the cached rasters): JRC encodes dry
land as ``nodata = -9999`` (≈93% of the Moldova clip), NOT 0. If we keep
-9999 as nodata and build ``average`` overviews, GDAL excludes nodata from the
averaging — so at low zoom the flood pixels bleed into their dry neighbours and
the inundated area dilates ~16× in the smallest overview, badly overstating the
hazard at national zoom.

The fix: rewrite every dry / nodata / non-finite / ≤0 pixel to ``0.0`` BEFORE
building overviews, set output ``nodata=None``, and resample overviews with
``average``. Now a low-zoom pixel is the honest mean depth over its footprint
(dry land pulls it toward 0), and the GPU colormap renders depth 0 transparent.
"""

from __future__ import annotations

import click
import numpy as np
import rasterio
from rasterio.io import MemoryFile
from rasterio.merge import merge
from rio_cogeo.cogeo import cog_translate
from rio_cogeo.profiles import cog_profiles

from . import const

# JRC dry-land sentinel. Anything ≤ 0 or non-finite is treated as "no flood".
JRC_NODATA = -9999.0


def _tile_paths(rp: int) -> list[str]:
    """Cached JRC tile paths covering Moldova at one return period."""
    return [
        str(const.JRC_RASTER_DIR / f"ID{tid}_{tname}_RP{rp}_depth.tif")
        for tid, tname in const.resolve_jrc_tiles()
    ]


def _build_one(rp: int) -> None:
    """Build a single zero-filled, overview-bearing COG for one return period."""
    paths = _tile_paths(rp)
    srcs = [rasterio.open(p) for p in paths]
    try:
        # Mosaic both tiles, clipped to the Moldova bbox. -9999 fills any gaps.
        mosaic, transform = merge(
            srcs,
            bounds=const.MOLDOVA_BBOX,
            nodata=JRC_NODATA,
        )
    finally:
        for s in srcs:
            s.close()

    band = mosaic.astype("float32", copy=False)
    # Zero-fill dry land / nodata / non-finite so `average` overviews stay honest.
    band[~np.isfinite(band) | (band <= 0)] = 0.0

    _, height, width = band.shape
    src_profile = {
        "driver": "GTiff",
        "dtype": "float32",
        "count": 1,
        "height": height,
        "width": width,
        "crs": "EPSG:4326",
        "transform": transform,
    }

    dst_profile = cog_profiles.get("deflate")
    # Predictor 3 = floating-point predictor — best lossless ratio for float32.
    dst_profile.update({"predictor": 3})

    const.JRC_COG_DIR.mkdir(parents=True, exist_ok=True)
    out_path = const.JRC_COG_DIR / f"RP{rp}_depth.tif"

    with MemoryFile() as memfile:
        with memfile.open(**src_profile) as mem:
            mem.write(band)
            cog_translate(
                mem,
                str(out_path),
                dst_profile,
                # Output nodata=None: depth 0 is a real value the GPU colormap
                # renders transparent, and overviews average across all pixels.
                nodata=None,
                overview_resampling="average",
                in_memory=True,
                quiet=True,
            )

    size_mb = out_path.stat().st_size / 1_000_000
    flooded = int((band > 0).sum())
    click.echo(f"  RP{rp}: {width}x{height}, {flooded:,} flooded px → {out_path.name} ({size_mb:.1f} MB)")


def run(rp: int | None = None) -> None:
    """Build flood-depth COGs for one return period or all of them.

    Args:
        rp: A single return period to build, or ``None`` to build all six.
    """
    rps = (rp,) if rp is not None else const.RETURN_PERIODS
    click.echo(f"Building {len(rps)} flood-depth COG(s) → {const.JRC_COG_DIR}")
    for r in rps:
        _build_one(r)
    click.echo("Done.")
