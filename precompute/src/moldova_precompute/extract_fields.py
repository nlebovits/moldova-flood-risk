"""Step 1: extract Moldova field polygons from FTW via DuckDB spatial query.

Queries the Fields of the World GeoParquet on Source Cooperative,
filters to Moldova bbox, and writes to local parquet.
"""

from __future__ import annotations

import click
import duckdb
import geopandas as gpd

from . import const

FTW_PARQUET_URL = (
    "s3://ftw/global-data/predictions/vectors/alpha/results-fiboa/*.parquet"
)


def run() -> None:
    """Extract Moldova fields from FTW global dataset."""
    const.WORK_DIR.mkdir(parents=True, exist_ok=True)

    west, south, east, north = const.MOLDOVA_BBOX
    click.echo(f"Extracting FTW fields for bbox: {const.MOLDOVA_BBOX}")

    con = duckdb.connect()
    con.install_extension("spatial")
    con.load_extension("spatial")
    con.install_extension("httpfs")
    con.load_extension("httpfs")

    con.execute("SET s3_region='us-west-2';")
    con.execute("SET s3_endpoint='data.source.coop';")
    con.execute("SET s3_use_ssl=true;")
    con.execute("SET s3_url_style='path';")

    query = f"""
    SELECT
        ST_AsWKB(geometry) AS geometry
    FROM read_parquet('{FTW_PARQUET_URL}')
    WHERE bbox.xmax >= {west}
      AND bbox.xmin <= {east}
      AND bbox.ymax >= {south}
      AND bbox.ymin <= {north}
    """

    click.echo("Running spatial query on FTW global dataset...")
    click.echo("(This may take several minutes for the first run)")

    result = con.execute(query).fetchdf()
    click.echo(f"Retrieved {len(result):,} candidate fields")

    if result.empty:
        click.echo("No fields found in bbox. Check FTW data availability.")
        return

    gdf = gpd.GeoDataFrame(
        geometry=gpd.GeoSeries.from_wkb(result["geometry"].apply(bytes), crs="EPSG:4326"),
        crs="EPSG:4326",
    )

    from shapely.geometry import box

    bbox_poly = box(west, south, east, north)
    gdf = gdf[gdf.geometry.intersects(bbox_poly)].copy()
    click.echo(f"After bbox clip: {len(gdf):,} fields")

    gdf["id"] = range(len(gdf))
    gdf["area_ha"] = gdf.geometry.to_crs("EPSG:32635").area / 10_000

    gdf.to_parquet(const.FIELDS_PARQUET, index=False)
    click.echo(f"Wrote {len(gdf):,} fields to {const.FIELDS_PARQUET}")

    con.close()
