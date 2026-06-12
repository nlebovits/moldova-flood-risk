"""Step 6: Expected Annual Loss (EAL) calculation.

Computes EAL using trapezoidal integration over the exceedance probability
curve, following the methodology from the esperanza.ipynb cookbook.

EAL = sum((L_i + L_{i+1}) / 2 * (P_i - P_{i+1}))

Where:
- P_i = 1/RP_i (annual exceedance probability)
- L_i = exposed_ha at RP_i
"""

from __future__ import annotations

import json

import click

from . import const


def _compute_eal(exposed_by_rp: dict[int, float]) -> float:
    """Compute EAL via trapezoidal integration."""
    sorted_rps = sorted(const.RETURN_PERIODS)
    probs = [1.0 / rp for rp in sorted_rps]
    losses = [exposed_by_rp.get(rp, 0) for rp in sorted_rps]

    eal = 0.0
    for i in range(len(sorted_rps) - 1):
        avg_loss = (losses[i] + losses[i + 1]) / 2
        delta_prob = probs[i] - probs[i + 1]
        eal += avg_loss * delta_prob

    return eal


def run() -> None:
    """Compute EAL at field and admin levels."""
    if not const.FIELD_ATTRS_JSON.exists():
        raise FileNotFoundError(
            f"Field attrs not found: {const.FIELD_ATTRS_JSON}\n"
            "Run 'moldova-precompute zonal-stats' first."
        )
    if not const.ADMIN_GEOJSON.exists():
        raise FileNotFoundError(
            f"Admin GeoJSON not found: {const.ADMIN_GEOJSON}\n"
            "Run 'moldova-precompute build-admin' first."
        )

    with open(const.FIELD_ATTRS_JSON) as f:
        field_attrs = json.load(f)

    import geopandas as gpd

    admin = gpd.read_file(const.ADMIN_GEOJSON)

    click.echo("Computing field-level EAL...")
    field_eal = {}
    for fid, attrs in field_attrs.items():
        area_ha = attrs.get("area_ha", 0)
        exposed_by_rp = {
            rp: area_ha * attrs.get(f"pct_inun_{rp}", 0) / 100
            for rp in const.RETURN_PERIODS
        }
        field_eal[fid] = round(_compute_eal(exposed_by_rp), 4)

    total_field_eal = sum(field_eal.values())
    click.echo(f"  Total field-level EAL: {total_field_eal:,.2f} ha/year")

    click.echo("Computing admin-level EAL...")
    admin_eal = {}
    for _, row in admin.iterrows():
        name = row.get("name", "Unknown")
        exposed_by_rp = {
            rp: row.get(f"exposed_ha_{rp}", 0) for rp in const.RETURN_PERIODS
        }
        admin_eal[name] = round(_compute_eal(exposed_by_rp), 2)

    national_eal_ha = sum(admin_eal.values())

    click.echo(f"  National EAL: {national_eal_ha:,.2f} ha/year")

    eal_output = {
        "national_eal_ha_per_year": round(national_eal_ha, 2),
        "by_admin": admin_eal,
        "methodology": "Trapezoidal integration over exceedance probability curve",
        "return_periods": list(const.RETURN_PERIODS),
        "formula": "EAL = sum((L_i + L_{i+1})/2 * (1/RP_i - 1/RP_{i+1}))",
    }

    eal_path = const.APP_DATA_DIR / "eal.json"
    with open(eal_path, "w") as f:
        json.dump(eal_output, f, indent=2)

    click.echo(f"Output: {eal_path}")

    ranked = sorted(admin_eal.items(), key=lambda x: x[1], reverse=True)[:5]
    click.echo("\nTop 5 raioane by EAL:")
    for name, eal in ranked:
        click.echo(f"  {name}: {eal:,.2f} ha/year")
