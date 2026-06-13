/**
 * Deploy-time frontend configuration — the port-time seam on the app side.
 *
 * The two large artifacts (fields.pmtiles, the JRC depth COGs) are too big to
 * commit, so they're hosted on a CDN. When porting to a new country, build the
 * data with the precompute pipeline, upload it, and point DATA_CDN_BASE at the
 * folder that holds `fields.pmtiles` and the `jrc/` directory. For local-only
 * work, set it to '' and the file fallbacks under /data kick in. See PORTING.md.
 */

/** CDN folder holding `fields.pmtiles` and `jrc/RP{rp}_depth.tif` (no trailing slash). */
export const DATA_CDN_BASE =
  'https://data.source.coop/nlebovits/moldova-test-data';
