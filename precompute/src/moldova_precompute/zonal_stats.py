"""Step 3: per-field x per-RP zonal statistics using rasterstats.

For each field polygon, computes flood exposure statistics across all
return periods from the JRC depth rasters.
"""

from __future__ import annotations

import json
import os
import tempfile

import click
import geopandas as gpd
import numpy as np
from rasterstats import zonal_stats

from . import const


def _create_vrt(rp: int) -> str:
    """Create a VRT file for the two JRC tiles at a given RP."""
    paths = [
        str(const.JRC_RASTER_DIR / f"ID{tid}_{tname}_RP{rp}_depth.tif")
        for tid, tname in const.JRC_MOLDOVA_TILE_IDS
    ]
    existing = [p for p in paths if os.path.exists(p)]
    if not existing:
        raise FileNotFoundError(f"No rasters found for RP{rp}")

    vrt_path = const.WORK_DIR / f"jrc_rp{rp}.vrt"

    import subprocess
    subprocess.run(
        ["gdalbuildvrt", "-overwrite", str(vrt_path)] + existing,
        check=True,
        capture_output=True,
    )
    return str(vrt_path)


def run() -> None:
    """Compute zonal stats for all fields across all return periods."""
    if not const.FIELDS_PARQUET.exists():
        raise FileNotFoundError(
            f"Fields not found: {const.FIELDS_PARQUET}\n"
            "Run 'moldova-precompute extract-fields' first."
        )

    click.echo(f"Loading fields from {const.FIELDS_PARQUET}")
    gdf = gpd.read_parquet(const.FIELDS_PARQUET)
    click.echo(f"Loaded {len(gdf):,} fields")

    if "id" not in gdf.columns:
        gdf["id"] = range(len(gdf))

    results = {
        str(row["id"]): {"area_ha": float(row["area_ha"])}
        for _, row in gdf.iterrows()
    }

    for rp in const.RETURN_PERIODS:
        click.echo(f"Processing RP{rp}...")

        vrt_path = _create_vrt(rp)

        gdf_wgs84 = gdf.to_crs("EPSG:4326")

        stats = zonal_stats(
            gdf_wgs84.geometry,
            vrt_path,
            stats=["mean", "max", "count"],
            nodata=np.nan,
        )

        for idx, stat in enumerate(stats):
            fid = str(gdf.iloc[idx]["id"])
            if fid not in results:
                continue

            mean_depth = stat.get("mean") or 0
            max_depth = stat.get("max") or 0

            if mean_depth > 0:
                results[fid][f"pct_inun_{rp}"] = 100.0
                results[fid][f"depth_{rp}"] = round(float(mean_depth), 3)
                results[fid][f"depth_max_{rp}"] = round(float(max_depth), 3)
            else:
                results[fid][f"pct_inun_{rp}"] = 0.0
                results[fid][f"depth_{rp}"] = 0.0
                results[fid][f"depth_max_{rp}"] = 0.0

        click.echo(f"  Completed RP{rp}")

    for fid, attrs in results.items():
        min_rp = None
        for rp in const.RETURN_PERIODS:
            if attrs.get(f"pct_inun_{rp}", 0) > 0:
                min_rp = rp
                break
        attrs["min_rp"] = min_rp

    const.APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(const.FIELD_ATTRS_JSON, "w") as f:
        json.dump(results, f, indent=2)

    exposed_100 = sum(1 for v in results.values() if v.get("pct_inun_100", 0) > 0)
    click.echo(f"Done. {exposed_100:,} fields have RP100 exposure.")
    click.echo(f"Output: {const.FIELD_ATTRS_JSON}")
