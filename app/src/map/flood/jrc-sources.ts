/**
 * JRC GloFAS Flood Hazard data sources.
 *
 * Data mirrored to Source Cooperative from the JRC Data Catalogue:
 * https://data.jrc.ec.europa.eu/collection/id-0054
 *
 * Coverage: Moldova is covered by two tiles:
 *   - ID134_N50_E20: 20-30°E × 40-50°N (bulk of Moldova)
 *   - ID146_N50_E30: 30-40°E × 40-50°N (eastern sliver)
 *
 * Format: GeoTIFF Float32, depth in meters (0 = no flood)
 * Resolution: 90m (~3 arc-seconds)
 * Return periods: 10, 20, 50, 100, 200, 500 years
 */

import type { RP } from '../../store/state';

/** Base URL for the mirrored JRC flood hazard data on Source Cooperative. */
const SOURCE_COOP_BASE =
  'https://data.source.coop/nlebovits/moldova-test-data/jrc-flood-hazard';

/** Tile IDs covering Moldova. */
export const JRC_TILE_IDS = ['ID134_N50_E20', 'ID146_N50_E30'] as const;
export type JrcTileId = (typeof JRC_TILE_IDS)[number];

/**
 * Build the URL for a JRC flood depth GeoTIFF.
 *
 * @param tileId - The tile ID (e.g. 'ID134_N50_E20')
 * @param rp - The return period (10, 20, 50, 100, 200, or 500)
 * @returns Full URL to the GeoTIFF
 */
export function getJrcFloodUrl(tileId: JrcTileId, rp: RP): string {
  return `${SOURCE_COOP_BASE}/RP${rp}/${tileId}_RP${rp}_depth.tif`;
}

/**
 * Get URLs for all JRC tiles at a given return period.
 */
export function getJrcFloodUrls(rp: RP): string[] {
  return JRC_TILE_IDS.map((tileId) => getJrcFloodUrl(tileId, rp));
}

/**
 * Attribution for JRC flood data.
 */
export const JRC_ATTRIBUTION =
  '<a href="https://data.jrc.ec.europa.eu/collection/id-0054" target="_blank">JRC GloFAS</a> v2.1.2, 90 m, fluvial only';
