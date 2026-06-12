/**
 * Hydro ramp — locked per README / data-contract §6.
 * Sequential blue, color-blind-safe. Six stops, shallow → deep.
 */
export const HYDRO_HEX = [
  '#CFE3F2',
  '#9BC4E6',
  '#5E97D1',
  '#2E68B5',
  '#1C4189',
  '#0E2356',
] as const;

/** Depth (m) ceiling for each bucket. Bucket 6 = > 4.0 m. */
export const HYDRO_BREAKS_M = [0.25, 0.5, 1.0, 2.0, 4.0] as const;

/**
 * MapLibre `raster-color` step expression for the Hydro ramp.
 * Maps depth in meters (single-band Float32 raster value) through the
 * locked palette. Values <= 0 (or nodata) render transparent.
 *
 * Retained for reference; the live map colors vector fields, not a raster.
 */
export const RASTER_HYDRO_STEP = [
  'step',
  ['raster-value'],
  'rgba(0,0,0,0)',
  0.001,             HYDRO_HEX[0],
  HYDRO_BREAKS_M[0], HYDRO_HEX[1],
  HYDRO_BREAKS_M[1], HYDRO_HEX[2],
  HYDRO_BREAKS_M[2], HYDRO_HEX[3],
  HYDRO_BREAKS_M[3], HYDRO_HEX[4],
  HYDRO_BREAKS_M[4], HYDRO_HEX[5],
] as const;

/**
 * Field base fill — Lagoon green. A field that does not flood at the
 * selected RP reads as agricultural land; only exposed fields take the
 * blue Hydro ramp (evidence). Keeps the three color vocabularies separate:
 * Lagoon = the field layer's identity, blue = flood evidence.
 */
export const FIELD_FILL_BASE = '#469695';

/**
 * MapLibre `fill-color` step expression for vector field polygons at a given
 * return period. Reads the baked `depth_{rp}` attribute (meters):
 *   depth 0  → Lagoon field base (dry)
 *   depth >0 → Hydro ramp by depth bucket (exposed)
 *
 * On RP change call `map.setPaintProperty('fields-fill','fill-color',
 * vectorHydroStep(rp))` — no style rebuild.
 */
export function vectorHydroStep(rp: number) {
  return [
    'step',
    ['coalesce', ['get', `depth_${rp}`], 0],
    FIELD_FILL_BASE,
    0.001,             HYDRO_HEX[0],
    HYDRO_BREAKS_M[0], HYDRO_HEX[1],
    HYDRO_BREAKS_M[1], HYDRO_HEX[2],
    HYDRO_BREAKS_M[2], HYDRO_HEX[3],
    HYDRO_BREAKS_M[3], HYDRO_HEX[4],
    HYDRO_BREAKS_M[4], HYDRO_HEX[5],
  ];
}
