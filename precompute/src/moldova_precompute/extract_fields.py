"""Step 1: extract Moldova field polygons from the global FTW PMTiles.

Phase 2 — implementation pending.

Approach (planned):
  1. Open the global FTW pmtiles via the `pmtiles` python lib's
     HTTP range-request reader.
  2. Iterate tiles intersecting `const.MOLDOVA_BBOX`.
  3. Decode each MVT, project features back to WGS84.
  4. Dedupe across tile borders by feature `id`.
  5. Write to `const.FIELDS_PARQUET` (GeoParquet, EPSG:4326).
"""

from __future__ import annotations

from . import const


def run() -> None:
    raise NotImplementedError(
        "extract_fields.run is implemented in phase 2.\n"
        f"Output target: {const.FIELDS_PARQUET}"
    )
