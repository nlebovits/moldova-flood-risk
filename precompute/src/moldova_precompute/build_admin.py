"""Step 4: first-level admin units with per-RP exposure aggregates.

Fetches Overture admin boundaries, spatial-joins fields, and aggregates
flood exposure statistics per administrative unit.

We source boundaries from Overture so the overlay shares the basemap's
OpenStreetMap lineage and the unit outlines coincide with the boundary lines
the Protomaps basemap already draws. The country and the division subtype that
maps to the first administrative level are configured in ``config.yaml``
(Moldova: ISO ``MD`` × subtype ``region`` = 37 raioane).
"""

from __future__ import annotations

import json

import click
import duckdb
import geopandas as gpd

from . import const

OVERTURE_DIVISION_AREA_URL = (
    f"s3://overturemaps-us-west-2/release/{const.OVERTURE_RELEASE}"
    "/theme=divisions/type=division_area/*"
)


def _load_overture_regions() -> gpd.GeoDataFrame:
    """First-level admin units (configured Overture subtype) as a GeoDataFrame."""
    con = duckdb.connect()
    for ext in ("spatial", "httpfs"):
        con.install_extension(ext)
        con.load_extension(ext)
    # Public bucket — region is enough; requests go unsigned without creds.
    con.execute("SET s3_region='us-west-2';")

    # Prefer the Romanian name (RO-first UI); fall back to primary. This keeps
    # Găgăuzia clean instead of its trilingual primary label.
    query = f"""
    SELECT
        coalesce(names.common['ro'], names.primary) AS name,
        ST_AsWKB(geometry) AS geometry
    FROM read_parquet('{OVERTURE_DIVISION_AREA_URL}', hive_partitioning=1)
    WHERE country = '{const.COUNTRY_ISO}' AND subtype = '{const.OVERTURE_SUBTYPE}'
    """
    df = con.execute(query).fetchdf()
    con.close()

    return gpd.GeoDataFrame(
        {"name": df["name"]},
        geometry=gpd.GeoSeries.from_wkb(df["geometry"].apply(bytes), crs="EPSG:4326"),
        crs="EPSG:4326",
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

    click.echo(
        f"Fetching Overture {const.COUNTRY_NAME} "
        f"'{const.OVERTURE_SUBTYPE}' units (release {const.OVERTURE_RELEASE})..."
    )
    admin = _load_overture_regions()
    click.echo(f"Loaded {len(admin)} admin units")

    click.echo(f"Loading fields from {const.FIELDS_PARQUET}")
    fields = gpd.read_parquet(const.FIELDS_PARQUET)

    with open(const.FIELD_ATTRS_JSON) as f:
        field_attrs = json.load(f)

    for col in ["area_ha"] + [f"pct_inun_{rp}" for rp in const.RETURN_PERIODS]:
        fields[col] = fields["id"].astype(str).map(lambda fid, c=col: field_attrs.get(fid, {}).get(c, 0))

    click.echo("Spatial joining fields to admin units...")
    fields_with_admin = gpd.sjoin(
        fields[["id", "geometry", "area_ha"] + [f"pct_inun_{rp}" for rp in const.RETURN_PERIODS]],
        admin[["name", "geometry"]],
        how="left",
        predicate="within",
    )

    agg_results = []
    for name, group in fields_with_admin.groupby("name"):
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

    admin_out = admin[["name", "geometry"]].copy()

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
