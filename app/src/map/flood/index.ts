/**
 * JRC Flood Layer exports.
 */

export {
  createFloodLayers,
  createHydroColormapTexture,
  type FloodLayerOptions,
} from './flood-layer';

export {
  getJrcFloodUrl,
  getJrcFloodUrls,
  JRC_ATTRIBUTION,
  JRC_TILE_IDS,
  type JrcTileId,
} from './jrc-sources';

export {
  buildHydroColormapData,
  HYDRO_COLORS,
  HYDRO_HEX,
  MAX_DEPTH_M,
} from './hydro-colormap';
