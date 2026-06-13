/**
 * Shapes of the precompute sidecar data + baked tile features.
 * Mirror of the JSON emitted by `precompute/` — keep in sync with
 * build_summary.py / build_eal.py / build_admin.py / zonal_stats.py.
 */

import type { RP } from '../store/state';

/** Per-return-period roll-up inside summary.json. */
export interface SummaryRpStat {
  exposed_ha: number;
  fields_touched: number;
  pct_ag_exposed: number;
}

/** summary.json — headline figures. */
export interface Summary {
  pct_ag_in_rp100_floodplain: number;
  total_ag_ha: number;
  total_fields: number;
  exposed_ag_rp100_ha: number;
  fields_touched_rp100: number;
  by_rp: Record<string, SummaryRpStat>;
  generated: string;
  source: string;
  default_rp: number;
}

/** eal.json — national + per-raion Expected Annual Loss (ha/year). */
export interface Eal {
  national_eal_ha_per_year: number;
  by_admin: Record<string, number>;
  methodology: string;
  return_periods: number[];
  formula: string;
}

/** Properties on each admin.geojson raion feature. */
export interface AdminProps {
  name: string;
  total_ag_ha: number;
  field_count: number;
  // Per-RP columns: exposed_ha_{rp}, fields_touched_{rp}, pct_exposed_{rp}.
  [key: string]: string | number;
}

/**
 * Properties baked into each fields.pmtiles feature.
 *
 * Numeric attributes are quantized to integers in the tile (cheap MVT varints):
 * `area_ha` is in ares (ha × 100) and `depth_{rp}` in millimetres (m × 1000).
 * Always read them through the accessors below, which un-scale to ha / metres.
 * Keep these factors in sync with precompute/.../const.py TILE_*_SCALE.
 */
export interface FieldProps {
  id: number;
  /** Field area in ares (ha × 100). Use {@link fieldAreaHa} for hectares. */
  area_ha: number;
  min_rp: number;
  // Per-RP columns: pct_inun_{rp} (0/100), depth_{rp} (millimetres).
  [key: string]: number;
}

/** Tile quantization factors — must match const.py TILE_*_SCALE. */
const TILE_DEPTH_SCALE = 1000; // millimetres → metres
const TILE_AREA_SCALE = 100; // ares → hectares

/** A row of the bundled sample portfolio CSV (PROPOSED stub). */
export interface Parcel {
  parcel_id: string;
  lat: number;
  lon: number;
  crop: string;
  value_eur: number;
}

/** Typed accessors for per-RP attributes (avoid scattering template strings). */
export const fieldPct = (f: FieldProps, rp: RP): number =>
  Number(f[`pct_inun_${rp}`] ?? 0);
/** Mean inundation depth in metres (tile stores millimetres). */
export const fieldDepth = (f: FieldProps, rp: RP): number =>
  Number(f[`depth_${rp}`] ?? 0) / TILE_DEPTH_SCALE;
/** Field area in hectares (tile stores ares). */
export const fieldAreaHa = (f: FieldProps): number =>
  Number(f.area_ha ?? 0) / TILE_AREA_SCALE;
export const adminExposedHa = (a: AdminProps, rp: RP): number =>
  Number(a[`exposed_ha_${rp}`] ?? 0);
export const adminFieldsTouched = (a: AdminProps, rp: RP): number =>
  Number(a[`fields_touched_${rp}`] ?? 0);
export const adminPctExposed = (a: AdminProps, rp: RP): number =>
  Number(a[`pct_exposed_${rp}`] ?? 0);
