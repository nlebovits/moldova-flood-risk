"""Step 4: Moldova raioane with per-RP exposure aggregates.

Fetches GADM admin boundaries, spatial-joins fields, and aggregates
flood exposure statistics per administrative unit.
"""

from __future__ import annotations

import json

import click
import geopandas as gpd

from . import const

GADM_URL = (
    "https://geodata.ucdavis.edu/gadm/gadm4.1/json/"
    "gadm41_MDA_1.json"
)


def run() -> None:
    """Build admin GeoJSON with per-RP exposure aggregates."""
    if not const.FIELDS_PARQUET.exists():
        raise FileNotFoundError(
            f"Fields not found: {const.FIELDS_PARQUET}\n"
            "Run 'moldova-precompute extract-fields' first."
        )
    if not const.FIELD_ATTRS_JSON.exists():
        raise FileNotFoundError(
            f"Field attrs not found: {const.FIELD_ATTRS_JSON}\n"
            "Run 'moldova-precompute zonal-stats' first."
        )

    click.echo("Fetching GADM Moldova admin boundaries (level 1)...")
    admin = gpd.read_file(GADM_URL)
    click.echo(f"Loaded {len(admin)} raioane")

    click.echo(f"Loading fields from {const.FIELDS_PARQUET}")
    fields = gpd.read_parquet(const.FIELDS_PARQUET)

    with open(const.FIELD_ATTRS_JSON) as f:
        field_attrs = json.load(f)

    for col in ["area_ha"] + [f"pct_inun_{rp}" for rp in const.RETURN_PERIODS]:
        fields[col] = fields["id"].astype(str).map(lambda fid, c=col: field_attrs.get(fid, {}).get(c, 0))

    click.echo("Spatial joining fields to admin units...")
    fields_with_admin = gpd.sjoin(
        fields[["id", "geometry", "area_ha"] + [f"pct_inun_{rp}" for rp in const.RETURN_PERIODS]],
        admin[["NAME_1", "geometry"]],
        how="left",
        predicate="within",
    )

    agg_results = []
    for name, group in fields_with_admin.groupby("NAME_1"):
        if not name:
            continue

        row = {
            "name": name,
            "total_ag_ha": round(group["area_ha"].sum(), 1),
            "field_count": len(group),
        }

        for rp in const.RETURN_PERIODS:
            pct_col = f"pct_inun_{rp}"
            exposed_mask = group[pct_col] > 5
            row[f"exposed_ha_{rp}"] = round(group.loc[exposed_mask, "area_ha"].sum(), 1)
            row[f"fields_touched_{rp}"] = int(exposed_mask.sum())
            row[f"pct_exposed_{rp}"] = (
                round(row[f"exposed_ha_{rp}"] / row["total_ag_ha"] * 100, 2)
                if row["total_ag_ha"] > 0
                else 0.0
            )

        agg_results.append(row)

    admin_out = admin[["NAME_1", "geometry"]].copy()
    admin_out = admin_out.rename(columns={"NAME_1": "name"})

    agg_df = gpd.GeoDataFrame(agg_results)
    admin_out = admin_out.merge(agg_df, on="name", how="left")

    for col in admin_out.columns:
        if col not in ["name", "geometry"]:
            admin_out[col] = admin_out[col].fillna(0)

    const.APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
    admin_out.to_file(const.ADMIN_GEOJSON, driver="GeoJSON")

    click.echo(f"Done. Wrote {len(admin_out)} admin units to {const.ADMIN_GEOJSON}")

    total_exposed = admin_out["exposed_ha_100"].sum()
    total_ag = admin_out["total_ag_ha"].sum()
    click.echo(
        f"National RP100: {total_exposed:,.0f} ha exposed "
        f"/ {total_ag:,.0f} ha total ({total_exposed/total_ag*100:.1f}%)"
    )
