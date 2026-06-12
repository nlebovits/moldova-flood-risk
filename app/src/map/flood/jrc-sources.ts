/**
 * JRC GloFAS flood-depth COG source.
 *
 * One Cloud-Optimized GeoTIFF per return period, built offline by the
 * precompute pipeline (`make flood-cogs`) from the cached JRC tiles. Each COG
 * is a Moldova-clipped, zero-filled Float32 depth raster (meters) with
 * `average` overviews — see `precompute/.../build_flood_cogs.py`.
 *
 *   Format: GeoTIFF Float32, depth in meters (0 = no flood, rendered transparent)
 *   Resolution: 90 m (~3 arc-seconds)
 *   Return periods: 10, 20, 50, 100, 200, 500 years
 *
 * Single swap point: dev serves the local files from `public/data/jrc/`; the
 * six COGs total ~40 MB (too large to commit), so for production point
 * `JRC_COG_BASE` at a hosted, range-requestable URL (Source Cooperative / a CDN),
 * e.g. 'https://data.source.coop/<org>/moldova-test-data/jrc'.
 */

import type { RP } from '../../store/state';

/** Base URL for the per-RP flood-depth COGs. */
export const JRC_COG_BASE = '/data/jrc';

/**
 * Build the URL for a JRC flood-depth COG at a given return period.
 *
 * @param rp - The return period (10, 20, 50, 100, 200, or 500)
 * @returns Full URL to the GeoTIFF
 */
export function getJrcFloodUrl(rp: RP): string {
  return `${JRC_COG_BASE}/RP${rp}_depth.tif`;
}

/**
 * Attribution for JRC flood data.
 */
export const JRC_ATTRIBUTION =
  '<a href="https://data.jrc.ec.europa.eu/collection/id-0054" target="_blank">JRC GloFAS</a> v2.1.2, 90 m, fluvial only';
