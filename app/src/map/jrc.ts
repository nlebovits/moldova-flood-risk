/**
 * JRC GloFAS Global Flood Hazard rasters — URLs for live browser load.
 *
 * Each return period has two Moldova-covering tiles:
 *   ID134_N50_E20  — main, covers 20–30°E × 40–50°N (the bulk of Moldova)
 *   ID146_N50_E30  — eastern sliver, covers 30–40°E × 40–50°N
 *
 * URLs route through `/jrc/...` which is proxied to JRC's server.
 *   - Dev:  Vite's server.proxy rewrites the path.
 *   - Prod: Vercel rewrites (see vercel.json) with CORS headers added.
 */

import type { RP } from '../store/state';

export const JRC_BASE = '/jrc';

export const JRC_MOLDOVA_TILES = [
  { id: 134, name: 'N50_E20' },
  { id: 146, name: 'N50_E30' },
] as const;

/** Full URL for one tile at one return period. */
export function jrcTileUrl(rp: RP, tileName: 'N50_E20' | 'N50_E30'): string {
  return `${JRC_BASE}/RP${rp}/ID${
    tileName === 'N50_E20' ? 134 : 146
  }_${tileName}_RP${rp}_depth.tif`;
}

export const JRC_ATTRIBUTION =
  '© European Union, Copernicus EMS — JRC GloFAS v2.1.2 · CC BY 4.0';
