"""Step 3: per-field x per-RP zonal statistics using rasterstats.

For each field polygon, computes flood exposure statistics across all
return periods from the JRC depth rasters.

Two artifacts are emitted in a single pass so their field IDs can never
drift apart:

  * ``app/public/data/field_attrs.json`` — the front-end sidecar, keyed by
    field ``id`` (the sequential IDs assigned in ``extract_fields``).
  * ``_work/fields_attributed.parquet`` — the same attributes welded onto the
    field geometries, ready to tile into ``fields.pmtiles``. Because it is
    written from the very GeoDataFrame the stats were computed on, the
    geometry↔attribute join is guaranteed (no ID lookup, no drift).
"""

from __future__ import annotations

import json
import os
import subprocess

import click
import geopandas as gpd
import numpy as np

from rasterstats import zonal_stats

from . import const


def _create_vrt(rp: int) -> str:
    """Create a VRT file for the two JRC tiles at a given RP."""
    paths = [
        str(const.JRC_RASTER_DIR / f"ID{tid}_{tname}_RP{rp}_depth.tif")
        for tid, tname in const.resolve_jrc_tiles()
    ]
    existing = [p for p in paths if os.path.exists(p)]
    if not existing:
        raise FileNotFoundError(f"No rasters found for RP{rp}")

    vrt_path = const.WORK_DIR / f"jrc_rp{rp}.vrt"

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

    # rasterstats needs WGS84 geometries that match the JRC rasters' CRS.
    # Reproject once; row order is preserved so results align by position.
    gdf_wgs84 = gdf.to_crs("EPSG:4326")

    for rp in const.RETURN_PERIODS:
        click.echo(f"Processing RP{rp}...")
        vrt_path = _create_vrt(rp)

        stats = zonal_stats(
            gdf_wgs84.geometry,
            vrt_path,
            stats=["mean", "max"],
            nodata=np.nan,
        )

        mean_arr = np.array([(s.get("mean") or 0.0) for s in stats], dtype=float)
        max_arr = np.array([(s.get("max") or 0.0) for s in stats], dtype=float)
        flooded = mean_arr > 0

        # Field-mean depth > 0 ⇒ treat the whole field as inundated at this RP.
        # (Coarse, but honest at JRC's 90 m resolution; see data-contract §6.)
        gdf[f"pct_inun_{rp}"] = np.where(flooded, 100.0, 0.0)
        gdf[f"depth_{rp}"] = np.where(flooded, mean_arr.round(3), 0.0)
        gdf[f"depth_max_{rp}"] = np.where(flooded, max_arr.round(3), 0.0)

        click.echo(f"  Completed RP{rp}")

    # min_rp: smallest return period at which a field is inundated (None if dry).
    # RETURN_PERIODS is ascending, so the first hit wins.
    min_rp = np.zeros(len(gdf), dtype=int)
    for rp in const.RETURN_PERIODS:
        hit = (gdf[f"pct_inun_{rp}"].to_numpy() > 0) & (min_rp == 0)
        min_rp[hit] = rp
    gdf["min_rp"] = min_rp  # 0 ⇒ never inundated

    # ----- Artifact 1: field_attrs.json (keyed by id; min_rp null when dry) ---
    results: dict[str, dict] = {}
    for row in gdf.itertuples(index=False):
        attrs = {"area_ha": float(row.area_ha)}
        for rp in const.RETURN_PERIODS:
            attrs[f"pct_inun_{rp}"] = float(getattr(row, f"pct_inun_{rp}"))
            attrs[f"depth_{rp}"] = float(getattr(row, f"depth_{rp}"))
            attrs[f"depth_max_{rp}"] = float(getattr(row, f"depth_max_{rp}"))
        attrs["min_rp"] = int(row.min_rp) if row.min_rp else None
        results[str(row.id)] = attrs

    const.APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(const.FIELD_ATTRS_JSON, "w") as f:
        json.dump(results, f, indent=2)

    # ----- Artifact 2: fields_attributed.parquet (lean: no depth_max) --------
    tile_cols = (
        ["id", "area_ha"]
        + [f"pct_inun_{rp}" for rp in const.RETURN_PERIODS]
        + [f"depth_{rp}" for rp in const.RETURN_PERIODS]
        + ["min_rp", "geometry"]
    )
    gdf[tile_cols].to_parquet(const.FIELDS_ATTRIBUTED_PARQUET, index=False)

    exposed_100 = int((gdf["pct_inun_100"] > 0).sum())
    click.echo(f"Done. {exposed_100:,} fields have RP100 exposure.")
    click.echo(f"Output: {const.FIELD_ATTRS_JSON}")
    click.echo(f"Output: {const.FIELDS_ATTRIBUTED_PARQUET}")
