"""Step 7: Export data for Quarto report.

Consolidates all computed data into formats suitable for embedding
in the Quarto HTML document.
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import click
import geopandas as gpd

from . import const

REPORT_DIR = const.REPO_ROOT / "report"
REPORT_DATA_DIR = REPORT_DIR / "data"


def run() -> None:
    """Export all data for the Quarto report."""
    REPORT_DATA_DIR.mkdir(parents=True, exist_ok=True)

    with open(const.SUMMARY_JSON) as f:
        summary = json.load(f)

    with open(const.APP_DATA_DIR / "eal.json") as f:
        eal_data = json.load(f)

    admin = gpd.read_file(const.ADMIN_GEOJSON)

    with open(const.FIELD_ATTRS_JSON) as f:
        field_attrs = json.load(f)

    click.echo("Exporting admin statistics...")
    admin_stats = []
    for _, row in admin.iterrows():
        stats = {
            "name": row["name"],
            "total_ag_ha": row["total_ag_ha"],
            "field_count": row["field_count"],
        }
        for rp in const.RETURN_PERIODS:
            stats[f"exposed_ha_{rp}"] = row.get(f"exposed_ha_{rp}", 0)
            stats[f"pct_exposed_{rp}"] = row.get(f"pct_exposed_{rp}", 0)
        stats["eal_ha_year"] = eal_data["by_admin"].get(row["name"], 0)
        admin_stats.append(stats)

    admin_stats.sort(key=lambda x: x["eal_ha_year"], reverse=True)

    with open(REPORT_DATA_DIR / "admin_stats.json", "w") as f:
        json.dump(admin_stats, f, indent=2)

    click.echo("Exporting top exposed fields...")
    fields_with_eal = []
    for fid, attrs in field_attrs.items():
        area = attrs.get("area_ha", 0)
        pct_100 = attrs.get("pct_inun_100", 0)
        if pct_100 > 0:
            exposed_by_rp = {
                rp: area * attrs.get(f"pct_inun_{rp}", 0) / 100
                for rp in const.RETURN_PERIODS
            }
            sorted_rps = sorted(const.RETURN_PERIODS)
            probs = [1.0 / rp for rp in sorted_rps]
            losses = [exposed_by_rp.get(rp, 0) for rp in sorted_rps]
            eal = sum(
                (losses[i] + losses[i + 1]) / 2 * (probs[i] - probs[i + 1])
                for i in range(len(sorted_rps) - 1)
            )
            fields_with_eal.append(
                {
                    "id": fid,
                    "area_ha": round(area, 2),
                    "pct_inun_100": pct_100,
                    "depth_100": attrs.get("depth_100", 0),
                    "min_rp": attrs.get("min_rp"),
                    "eal_ha_year": round(eal, 4),
                }
            )

    fields_with_eal.sort(key=lambda x: x["eal_ha_year"], reverse=True)
    top_fields = fields_with_eal[:100]

    with open(REPORT_DATA_DIR / "top_fields.json", "w") as f:
        json.dump(top_fields, f, indent=2)

    click.echo("Exporting Quarto variables...")
    variables = {
        "pct_ag_floodplain": summary["pct_ag_in_rp100_floodplain"],
        "total_ag_ha": summary["total_ag_ha"],
        "total_fields": summary["total_fields"],
        "exposed_ha_100": summary["exposed_ag_rp100_ha"],
        "fields_touched_100": summary["fields_touched_rp100"],
        "national_eal": eal_data["national_eal_ha_per_year"],
        "top_raion": admin_stats[0]["name"] if admin_stats else "N/A",
        "top_raion_eal": admin_stats[0]["eal_ha_year"] if admin_stats else 0,
        "generated_date": date.today().isoformat(),
        "data_sources": {
            "flood_hazard": "JRC GloFAS v2.1.2 (CC BY 4.0)",
            "field_boundaries": "Fields of the World 2025-01-01 (CC BY 4.0)",
            "admin_boundaries": "GADM 4.1",
        },
    }

    import yaml

    with open(REPORT_DATA_DIR / "variables.yml", "w") as f:
        yaml.dump(variables, f, default_flow_style=False)

    click.echo("Copying summary and EAL to report/data/...")
    with open(REPORT_DATA_DIR / "summary.json", "w") as f:
        json.dump(summary, f, indent=2)
    with open(REPORT_DATA_DIR / "eal.json", "w") as f:
        json.dump(eal_data, f, indent=2)

    admin_simple = admin.drop(columns=["geometry"]).to_dict(orient="records")
    with open(REPORT_DATA_DIR / "admin_table.json", "w") as f:
        json.dump(admin_simple, f, indent=2)

    click.echo(f"\nExported to {REPORT_DATA_DIR}:")
    for p in sorted(REPORT_DATA_DIR.glob("*")):
        click.echo(f"  {p.name}")
