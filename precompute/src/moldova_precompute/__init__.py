"""Moldova Ag Flood-Risk Map — precompute pipeline.

This package ingests live data from two sources (FTW global PMTiles +
JRC GloFAS flood hazard rasters), runs zonal statistics, and emits
small static JSON sidecar files into ``app/public/data/`` for the
front-end to consume at runtime.

CLI entrypoint:

.. code-block:: console

    $ uv run moldova-precompute --help

Phases (run by `make data`):

  1. extract-fields  — pull Moldova polygons from global FTW pmtiles
  2. fetch-jrc       — download the 12 Moldova depth rasters
  3. zonal-stats     — per-field × per-RP exposure attributes
  4. build-admin     — raioane + per-RP exposure aggregates
  5. build-summary   — headline figure (RP100 ag share)
"""

from __future__ import annotations

import click

from . import const


@click.group(context_settings={"help_option_names": ["-h", "--help"]})
@click.version_option(package_name="moldova-precompute")
def cli() -> None:
    """Moldova flood-risk precompute pipeline."""


@cli.command("extract-fields")
def extract_fields_cmd() -> None:
    """Extract Moldova field polygons from the global FTW PMTiles.

    Output: ``precompute/_work/fields.parquet``.
    Phase 2 work — implementation pending.
    """
    from .extract_fields import run

    run()


@cli.command("fetch-jrc")
def fetch_jrc_cmd() -> None:
    """Download the 12 Moldova-covering JRC depth rasters (~265 MB).

    Output: ``precompute/_work/jrc/*.tif`` (cached; re-runs are idempotent).
    Phase 2 work — implementation pending.
    """
    from .fetch_jrc import run

    run()


@cli.command("zonal-stats")
def zonal_stats_cmd() -> None:
    """Compute per-field × per-RP zonal stats (pct_inun + mean depth).

    Reads ``_work/fields.parquet`` and ``_work/jrc/*.tif``.
    Output: ``app/public/data/field_attrs.json``.
    Phase 2 work — implementation pending.
    """
    from .zonal_stats import run

    run()


@cli.command("build-admin")
def build_admin_cmd() -> None:
    """Build admin units (raioane) with per-RP exposure aggregates.

    Output: ``app/public/data/admin.geojson``.
    Phase 3 work — implementation pending.
    """
    from .build_admin import run

    run()


@cli.command("build-summary")
def build_summary_cmd() -> None:
    """Build the headline summary JSON (RP100 ag share + totals).

    Output: ``app/public/data/summary.json``.
    """
    from .build_summary import run

    run()


@cli.command("build-eal")
def build_eal_cmd() -> None:
    """Compute Expected Annual Loss via trapezoidal integration.

    Output: ``app/public/data/eal.json``.
    """
    from .build_eal import run

    run()


@cli.command("build-fields-tiles")
def build_fields_tiles_cmd() -> None:
    """Tile the attributed fields into ``app/public/data/fields.pmtiles``.

    Reads ``_work/fields_attributed.parquet`` (emitted by zonal-stats) and
    streams it through the dev geoparquet-io ``pmtiles`` command.
    """
    from .build_fields_tiles import run

    run()


@cli.command("export-report")
def export_report_cmd() -> None:
    """Export all data for the Quarto report.

    Output: ``report/data/*.json`` + ``report/data/variables.yml``.
    """
    from .export_report_data import run

    run()


@cli.command("info")
def info_cmd() -> None:
    """Print resolved paths and constants. Useful for sanity checks."""
    click.echo("Moldova precompute — resolved paths and constants:")
    click.echo(f"  Repo root          : {const.REPO_ROOT}")
    click.echo(f"  Work dir           : {const.WORK_DIR}")
    click.echo(f"  App data dir       : {const.APP_DATA_DIR}")
    click.echo("")
    click.echo(f"  Moldova bbox       : {const.MOLDOVA_BBOX}")
    click.echo(f"  Return periods     : {const.RETURN_PERIODS}")
    click.echo(f"  Default RP         : {const.DEFAULT_RP}")
    click.echo("")
    click.echo(f"  FTW PMTiles URL    : {const.FTW_PMTILES_URL}")
    click.echo(f"  JRC base URL       : {const.JRC_BASE_URL}")
    click.echo(f"  JRC Moldova tiles  : {[t[1] for t in const.JRC_MOLDOVA_TILE_IDS]}")
    click.echo("")
    click.echo(f"  Hydro depth breaks : {const.HYDRO_BREAKS_M}")
    click.echo(f"  Hydro ramp (hex)   : {const.HYDRO_HEX}")


def main() -> None:
    """Entrypoint for the ``moldova-precompute`` console script."""
    cli()


if __name__ == "__main__":
    main()
