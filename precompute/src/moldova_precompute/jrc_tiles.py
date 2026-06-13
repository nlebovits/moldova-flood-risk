"""Derive the JRC GloFAS tiles covering an arbitrary bounding box.

Used only when ``config.yaml`` leaves ``hazard.jrc_tile_ids`` empty. Fetches
the JRC ``tile_extents.geojson`` grid (cached under ``_work/``) and returns the
``(id, name)`` pairs whose footprints intersect the area of interest.

Kept dependency-free (stdlib + a bbox-overlap test) and free of any import of
``const`` so it can be resolved lazily without circular imports.
"""

from __future__ import annotations

import json
import urllib.request
from pathlib import Path


def _download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url, timeout=120) as resp:  # noqa: S310 (trusted JRC host)
        dest.write_bytes(resp.read())


def _feature_bounds(feature: dict) -> tuple[float, float, float, float]:
    """(minx, miny, maxx, maxy) of a (Multi)Polygon GeoJSON feature."""
    xs: list[float] = []
    ys: list[float] = []
    geom = feature["geometry"]
    polys = (
        geom["coordinates"]
        if geom["type"] == "MultiPolygon"
        else [geom["coordinates"]]
    )
    for poly in polys:
        for ring in poly:
            for x, y in ring:
                xs.append(x)
                ys.append(y)
    return min(xs), min(ys), max(xs), max(ys)


def tiles_for_bbox(
    bbox: tuple[float, float, float, float],
    extents_url: str,
    cache_path: Path,
) -> tuple[tuple[int, str], ...]:
    """JRC ``(id, name)`` tiles whose footprint intersects ``bbox``.

    Tiles are 10°×10° grid rectangles, so a bbox-overlap test is exact.
    """
    west, south, east, north = bbox
    if not cache_path.exists():
        _download(extents_url, cache_path)

    collection = json.loads(cache_path.read_text())
    hits: list[tuple[int, str]] = []
    for feature in collection["features"]:
        tminx, tminy, tmaxx, tmaxy = _feature_bounds(feature)
        if tmaxx >= west and tminx <= east and tmaxy >= south and tminy <= north:
            props = feature["properties"]
            hits.append((int(props["id"]), str(props["name"])))

    return tuple(sorted(hits))
