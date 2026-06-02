"""Step 3: per-field × per-RP zonal statistics.

Phase 2 — implementation pending.

Approach (planned):
  For each RP:
    1. Open the two JRC depth rasters as a virtual mosaic.
    2. Run `exactextract` against `const.FIELDS_PARQUET` polygons:
         - count of pixels where depth > 0 / total pixel count → pct_inun_{rp}
         - mean of depth pixels where depth > 0           → depth_{rp}
  Collect into a dict keyed by field_id; emit as
  `const.FIELD_ATTRS_JSON`.

Schema:
  {
    "<field_id>": {
      "area_ha": 12.3,
      "pct_inun_10": 0.0, "depth_10": 0.0,
      ...
      "pct_inun_500": 18.2, "depth_500": 1.45,
      "min_rp": 100   // lowest RP with any inundation
    },
    ...
  }
"""

from __future__ import annotations

from . import const


def run() -> None:
    raise NotImplementedError(
        "zonal_stats.run is implemented in phase 2.\n"
        f"Inputs:  fields={const.FIELDS_PARQUET}, "
        f"rasters={const.JRC_RASTER_DIR}\n"
        f"Output:  {const.FIELD_ATTRS_JSON}"
    )
