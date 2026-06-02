"""Step 5: headline summary.

Phase 2 — implementation pending.

Approach (planned):
  From `const.FIELD_ATTRS_JSON`:
    total_ag_ha             = sum of area_ha across all fields
    exposed_ag_rp100_ha     = sum of (area_ha * pct_inun_100 / 100)
    pct_ag_in_rp100_floodplain = exposed_ag_rp100_ha / total_ag_ha * 100

  Emit `const.SUMMARY_JSON` with shape:
    {
      "pct_ag_in_rp100_floodplain": 38.0,
      "total_ag_ha": 1234567,
      "exposed_ag_rp100_ha": 469135,
      "generated": "2026-06-02",
      "source": "JRC 90m fluvial + FTW boundaries",
      "rp": 100
    }
"""

from __future__ import annotations

from . import const


def run() -> None:
    raise NotImplementedError(
        "build_summary.run is implemented in phase 2.\n"
        f"Output:  {const.SUMMARY_JSON}"
    )
