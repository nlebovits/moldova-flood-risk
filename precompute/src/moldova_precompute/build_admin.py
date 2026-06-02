"""Step 4: Moldova raioane + per-RP exposure aggregates.

Phase 3 — implementation pending.

Approach (planned):
  1. Fetch Moldova admin level 2 (raioane) from GADM or OSM
     (`const.ADMIN_RAW`).
  2. Spatial-join field polygons (from `const.FIELDS_PARQUET`) to raioane.
  3. For each raion × each RP, aggregate:
       total_ag_ha
       exposed_ha_{rp}    (sum of area_ha where pct_inun_{rp} > 5%)
       fields_touched_{rp}
       cropland_share_{rp} (= exposed / total * 100)
  4. Emit `const.ADMIN_GEOJSON` with geometry + per-RP properties.
"""

from __future__ import annotations

from . import const


def run() -> None:
    raise NotImplementedError(
        "build_admin.run is implemented in phase 3.\n"
        f"Output:  {const.ADMIN_GEOJSON}"
    )
