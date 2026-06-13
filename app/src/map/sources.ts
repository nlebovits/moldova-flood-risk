/**
 * Live data sources — all CORS-open, range-requestable, no API keys.
 *
 *   Basemap        — OSM data, built to the Protomaps basemap schema, hosted
 *                    by CarbonPlan as global pmtiles on S3.
 *   Glyphs         — Protomaps' GitHub Pages basemaps-assets bucket.
 *                    (CarbonPlan's font CDN is empty — every name 404s.)
 *   FTW fields     — Fields of The World, source-layer 2025-01-01 vintage.
 *   Overture divs  — Admin boundaries (countries / regions / counties).
 *   Esri imagery   — Satellite base, used when basemap === 'satellite'.
 */

export const BASEMAP_PMTILES =
  'pmtiles://https://carbonplan-maps.s3.us-west-2.amazonaws.com/basemaps/pmtiles/global.pmtiles';

export const BASEMAP_GLYPHS =
  'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf';

// Credit lineage in order of contribution: OSM is the data, Protomaps the
// basemap schema/build, CarbonPlan the host.
export const BASEMAP_ATTRIBUTION =
  '© <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a> · ' +
  '<a href="https://protomaps.com" target="_blank">Protomaps</a> · ' +
  '<a href="https://carbonplan.org" target="_blank">CarbonPlan</a>';

export const FTW_PMTILES =
  'pmtiles://https://data.source.coop/ftw/global-data/predictions/vectors/alpha/global.pmtiles';

/**
 * FTW source-layer name (literal, includes a space). Confirmed by parsing
 * the FTW pmtiles header's `vector_layers` metadata. 2025 vintage.
 */
export const FTW_SOURCE_LAYER = 'field-2025-01-01 00:00:00';

export const FTW_ATTRIBUTION =
  '<a href="https://fieldsofthe.world" target="_blank">Fields of The World</a>';

/**
 * Moldova field polygons with per-RP flood attributes baked in, tiled by the
 * precompute pipeline (`make fields-tiles`). Source-layer name is `fields`;
 * every feature carries `id`, `area_ha`, `pct_inun_{rp}`, `depth_{rp}`,
 * `min_rp`. Numeric attrs are quantized to integers in the tile (area in
 * ares, depth in mm) — read them via the un-scaling accessors in `lib/types`.
 *
 * Single swap point: the tileset is ~230 MB (too large to commit), so it's
 * hosted on Source Cooperative and streamed range-requestable + CORS-open from
 * its read CDN. For local-only work, point this back at
 * 'pmtiles:///data/fields.pmtiles' (the file is also written there by
 * `make fields-tiles`).
 */
export const FIELDS_PMTILES =
  'pmtiles://https://data.source.coop/nlebovits/moldova-test-data/fields.pmtiles';

export const FIELDS_SOURCE_LAYER = 'fields';

/** Moldova raioane with per-RP exposure aggregates (precompute build-admin). */
export const ADMIN_GEOJSON_URL = '/data/admin.geojson';

/**
 * Overture divisions — admin boundaries at country / region / county /
 * locality. Released ~monthly; we pin a known-good release.
 *
 * Three source-layers:
 *   division          — point centroids (capital cities, etc.)
 *   division_area     — filled polygons of the admin region
 *   division_boundary — line strings, with `subtype` field for level
 *                       ('country', 'region', 'county', 'locality', ...)
 */
export const OVERTURE_DIVISIONS_RELEASE = '2026-05-20.0';

export const OVERTURE_DIVISIONS_PMTILES =
  `pmtiles://https://overturemaps-extras-us-west-2.s3.us-west-2.amazonaws.com/tiles/${OVERTURE_DIVISIONS_RELEASE}/divisions.pmtiles`;

export const OVERTURE_ATTRIBUTION =
  '<a href="https://overturemaps.org" target="_blank">Overture Maps</a>';

/** Esri World Imagery — raster XYZ. Respect Esri ToS for non-demo use. */
export const ESRI_IMAGERY_TILES = [
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
];

export const ESRI_ATTRIBUTION =
  'Imagery © Esri, Maxar, Earthstar Geographics';
