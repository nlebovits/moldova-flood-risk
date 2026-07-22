/**
 * Deploy-time frontend configuration — the port-time seam on the app side.
 *
 * The two large artifacts (fields.pmtiles, the JRC depth COGs) are too big to
 * commit, so they're hosted on a CDN. When porting to a new country, build the
 * data with the precompute pipeline, upload it, and point DATA_CDN_BASE at the
 * folder that holds `fields.pmtiles` and the `jrc/` directory. For local-only
 * work, set it to '' and the file fallbacks under /data kick in. See PORTING.md.
 */

/** CDN folder holding `fields.pmtiles` (no trailing slash). */
export const DATA_CDN_BASE =
  'https://data.source.coop/nlebovits/moldova-test-data';

/**
 * Source Cooperative STAC catalog holding the global JRC GloFAS flood-depth
 * COGs. The flood layer streams the country's tiles straight from here (they're
 * range-requestable + CORS-open), so there's no per-country clip/upload step.
 */
export const JRC_CATALOG_BASE =
  'https://data.source.coop/nlebovits/jrc-glofas';

/**
 * Fields of The World, admin-partitioned distribution: one GeoParquet per
 * country under `results-by-admin/admin:country_code=<ISO>/<Name>.parquet`.
 * This is the field-boundary source the exposure map is computed from, scoped
 * to the country. When porting, swap the ISO code and country file name.
 */
export const FTW_COUNTRY_PARQUET =
  'https://data.source.coop/ftw/global-data/predictions/vectors/alpha/results-by-admin/admin:country_code=MD/Moldova.parquet';

/**
 * The JRC 10° tiles covering the area of interest, as `[id, "Nlat_Elon"]` pairs
 * — the SAME list as `jrc_tile_ids` in `precompute/config.yaml` (keep in sync
 * when porting). Moldova spans two: tile 134 covers all but the far-eastern
 * sliver, tile 146 picks that up. Each becomes one streamed COGLayer per RP.
 */
export const JRC_TILES: ReadonlyArray<readonly [number, string]> = [
  [134, 'N50_E20'],
  [146, 'N50_E30'],
];
