"""Step 5: headline summary statistics.

Computes the headline figure for the risk assessment:
"X% of Moldova's agricultural land lies in the RP100 floodplain"
"""

from __future__ import annotations

import json
from datetime import date

import click

from . import const


def run() -> None:
    """Build summary.json with headline statistics."""
    if not const.FIELD_ATTRS_JSON.exists():
        raise FileNotFoundError(
            f"Field attrs not found: {const.FIELD_ATTRS_JSON}\n"
            "Run 'moldova-precompute zonal-stats' first."
        )

    with open(const.FIELD_ATTRS_JSON) as f:
        field_attrs = json.load(f)

    total_ag_ha = sum(v.get("area_ha", 0) for v in field_attrs.values())
    total_fields = len(field_attrs)

    rp_stats = {}
    for rp in const.RETURN_PERIODS:
        exposed_ha = sum(
            v.get("area_ha", 0) * v.get(f"pct_inun_{rp}", 0) / 100
            for v in field_attrs.values()
        )
        fields_touched = sum(
            1 for v in field_attrs.values() if v.get(f"pct_inun_{rp}", 0) > 0
        )
        rp_stats[rp] = {
            "exposed_ha": round(exposed_ha, 1),
            "fields_touched": fields_touched,
            "pct_ag_exposed": round(exposed_ha / total_ag_ha * 100, 2) if total_ag_ha > 0 else 0,
        }

    # Data-driven initial map view, so the frontend camera follows the bbox
    # automatically when porting to a new country (no hardcoded center/zoom).
    west, south, east, north = const.MOLDOVA_BBOX
    view = {
        "bounds": [west, south, east, north],
        "center": [round((west + east) / 2, 4), round((south + north) / 2, 4)],
        "min_zoom": const.MIN_ZOOM,
        "max_zoom": const.MAX_ZOOM,
    }

    summary = {
        "pct_ag_in_rp100_floodplain": rp_stats[100]["pct_ag_exposed"],
        "total_ag_ha": round(total_ag_ha, 1),
        "total_fields": total_fields,
        "exposed_ag_rp100_ha": rp_stats[100]["exposed_ha"],
        "fields_touched_rp100": rp_stats[100]["fields_touched"],
        "by_rp": {str(rp): stats for rp, stats in rp_stats.items()},
        "view": view,
        "generated": date.today().isoformat(),
        "source": "JRC GloFAS 90m fluvial + FTW field boundaries",
        "default_rp": const.DEFAULT_RP,
    }

    const.APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(const.SUMMARY_JSON, "w") as f:
        json.dump(summary, f, indent=2)

    click.echo("Summary statistics:")
    click.echo(f"  Total ag area:    {total_ag_ha:,.0f} ha")
    click.echo(f"  Total fields:     {total_fields:,}")
    click.echo(f"  RP100 exposed:    {rp_stats[100]['exposed_ha']:,.0f} ha ({rp_stats[100]['pct_ag_exposed']:.1f}%)")
    click.echo(f"  Fields touched:   {rp_stats[100]['fields_touched']:,}")
    click.echo(f"Output: {const.SUMMARY_JSON}")
