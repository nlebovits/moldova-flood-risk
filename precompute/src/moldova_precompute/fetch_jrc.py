"""Step 2: fetch the 12 Moldova-covering JRC GloFAS depth rasters.

Downloads rasters from the JRC FTP server if not already cached locally.
Idempotent: skips files where local size matches remote content-length.
"""

from __future__ import annotations

import click
import httpx

from . import const


def _build_url(tile_id: int, tile_name: str, rp: int) -> str:
    """Construct the JRC download URL for a single raster."""
    return (
        f"{const.JRC_BASE_URL}/RP{rp}/"
        f"ID{tile_id}_{tile_name}_RP{rp}_depth.tif"
    )


def _download_one(url: str, dest: const.Path, client: httpx.Client) -> bool:
    """Download a single raster. Returns True if downloaded, False if skipped."""
    if dest.exists() and dest.stat().st_size > 1_000_000:
        return False

    try:
        head = client.head(url, follow_redirects=True)
        head.raise_for_status()
        remote_size = int(head.headers.get("content-length", 0))

        if dest.exists() and dest.stat().st_size == remote_size:
            return False
    except httpx.HTTPStatusError:
        if dest.exists():
            return False
        raise

    dest.parent.mkdir(parents=True, exist_ok=True)
    with client.stream("GET", url, follow_redirects=True) as resp:
        resp.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in resp.iter_bytes(chunk_size=1024 * 1024):
                f.write(chunk)
    return True


def run() -> None:
    """Download all 12 JRC rasters (2 tiles x 6 RPs) for Moldova."""
    const.JRC_RASTER_DIR.mkdir(parents=True, exist_ok=True)

    tasks = [
        (tile_id, tile_name, rp)
        for tile_id, tile_name in const.JRC_MOLDOVA_TILE_IDS
        for rp in const.RETURN_PERIODS
    ]

    click.echo(f"Checking {len(tasks)} JRC rasters...")

    downloaded = 0
    skipped = 0

    with httpx.Client(timeout=300) as client:
        for tile_id, tile_name, rp in tasks:
            url = _build_url(tile_id, tile_name, rp)
            filename = f"ID{tile_id}_{tile_name}_RP{rp}_depth.tif"
            dest = const.JRC_RASTER_DIR / filename

            if _download_one(url, dest, client):
                click.echo(f"  Downloaded: {filename}")
                downloaded += 1
            else:
                skipped += 1

    click.echo(f"Done: {downloaded} downloaded, {skipped} already cached.")
    click.echo(f"Output dir: {const.JRC_RASTER_DIR}")
