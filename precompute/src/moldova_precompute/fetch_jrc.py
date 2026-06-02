"""Step 2: fetch the 12 Moldova-covering JRC GloFAS depth rasters.

Phase 2 — implementation pending.

Approach (planned):
  For each tile in `const.JRC_MOLDOVA_TILE_IDS` and each RP in
  `const.RETURN_PERIODS`, construct the URL
    `{JRC_BASE_URL}/RP{rp}/ID{n}_{name}_RP{rp}_depth.tif`
  and stream it (with httpx) to `const.JRC_RASTER_DIR`.
  Skip downloads where the local file's size already matches the
  server's content-length (idempotent re-runs).
"""

from __future__ import annotations

from . import const


def run() -> None:
    raise NotImplementedError(
        "fetch_jrc.run is implemented in phase 2.\n"
        f"Output dir: {const.JRC_RASTER_DIR}\n"
        f"Tiles: {[t[1] for t in const.JRC_MOLDOVA_TILE_IDS]}\n"
        f"RPs:   {const.RETURN_PERIODS}"
    )
