/**
 * JRC GloFAS flood-depth COG sources.
 *
 * The flood depth rasters are streamed directly from the published JRC GloFAS
 * STAC catalog on Source Cooperative (`nlebovits/jrc-glofas`) — the global,
 * wall-to-wall CEMS-GLOFAS v2.1.2 dataset. Each return period is a collection
 * (`depth-rp{N}`) of 10° tiles; a STAC item per tile holds one COG asset:
 *
 *   depth-rp{N}/ID{id}_{tile}/ID{id}_{tile}_RP{N}_depth.tif
 *
 *   Format: GeoTIFF Float32, depth in meters (0 / nodata rendered transparent)
 *   Resolution: 90 m (~3 arc-seconds), EPSG:4326, nodata -9999
 *   Return periods: 10, 20, 50, 100, 200, 500 years
 *
 * We stream only the tiles that cover the area of interest (`JRC_TILES` in
 * `config.ts`). The COGs are range-requestable + CORS-open with `average`
 * overviews, so COGLayer fetches only the visible overview levels — pointing at
 * the full-country tiles instead of pre-clipped files costs nothing at view
 * zoom, and there's no offline clip/upload step to port.
 */

import { JRC_CATALOG_BASE, JRC_TILES } from '../../config';
import type { RP } from '../../store/state';

/**
 * Build the flood-depth COG URLs for a given return period — one per tile that
 * covers the area of interest.
 *
 * @param rp - The return period (10, 20, 50, 100, 200, or 500)
 * @returns One STAC-asset GeoTIFF URL per tile in `JRC_TILES`
 */
export function getJrcFloodUrls(rp: RP): string[] {
  return JRC_TILES.map(([id, tile]) => {
    const item = `ID${id}_${tile}`;
    return `${JRC_CATALOG_BASE}/depth-rp${rp}/${item}/${item}_RP${rp}_depth.tif`;
  });
}

/**
 * Attribution for JRC flood data — links the Source Cooperative catalog we
 * stream from.
 */
export const JRC_ATTRIBUTION =
  '<a href="https://data.source.coop/nlebovits/jrc-glofas" target="_blank">JRC GloFAS</a> v2.1.2, 90 m, fluvial only';
