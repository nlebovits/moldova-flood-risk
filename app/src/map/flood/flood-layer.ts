/**
 * JRC Flood Depth Layer using deck.gl-raster.
 *
 * This module creates COGLayers for JRC flood hazard GeoTIFFs with custom
 * tile data handling and GPU colormap rendering.
 *
 * The JRC data is Float32 depth in meters. We normalize it to 0-255 on the
 * CPU during tile fetch, then use GPU shader modules for colormap rendering.
 */

import { COGLayer } from '@developmentseed/deck.gl-geotiff';
import type { RenderTileResult } from '@developmentseed/deck.gl-raster';
import { Colormap, CreateTexture } from '@developmentseed/deck.gl-raster/gpu-modules';
import type { GeoTIFF, Overview } from '@developmentseed/geotiff';
import type { Device, Texture } from '@luma.gl/core';
import type { RP } from '../../store/state';
import { createHydroColormapTexture, MAX_DEPTH_M } from './hydro-colormap';
import { getJrcFloodUrl, JRC_TILE_IDS, type JrcTileId } from './jrc-sources';

/** Options passed to getTileData by COGLayer. */
interface GetTileDataOptions {
  device: Device;
  x: number;
  y: number;
  signal?: AbortSignal;
  pool: unknown;
}

/** Minimal tile data shape. */
interface FloodTileData {
  texture: Texture;
  width: number;
  height: number;
  byteLength: number;
}

/**
 * Custom getTileData that handles Float32 depth data.
 *
 * Normalizes depth values from [0, MAX_DEPTH_M] to [0, 255] and uploads
 * as r8unorm texture for GPU colormap lookup.
 */
async function getTileData(
  image: GeoTIFF | Overview,
  options: GetTileDataOptions,
): Promise<FloodTileData> {
  const { device, x, y, signal, pool } = options;

  const tile = await image.fetchTile(x, y, {
    boundless: false,
    pool: pool as never,
    signal,
  });

  const { array } = tile;
  const { width, height } = array;

  // Extract source data - handle both pixel-interleaved and band-separate layouts
  let srcData: Float32Array;
  if (array.layout === 'pixel-interleaved') {
    srcData = array.data as Float32Array;
  } else {
    // band-separate: JRC is single-band, take first band
    srcData = array.bands[0] as Float32Array;
  }

  // Data is Float32 depth in meters. Convert to Uint8 for colormap lookup.
  // Index 0 = transparent (nodata/0 depth), 1-255 = depth ramp.
  const dstData = new Uint8Array(width * height);

  for (let i = 0; i < srcData.length; i++) {
    const depth = srcData[i];
    if (depth <= 0 || !Number.isFinite(depth)) {
      // Nodata, zero, or invalid → transparent
      dstData[i] = 0;
    } else {
      // Normalize depth to 1-255 range
      const normalized = Math.min(depth / MAX_DEPTH_M, 1.0);
      dstData[i] = Math.round(1 + normalized * 254);
    }
  }

  const texture = device.createTexture({
    data: dstData,
    format: 'r8unorm',
    width,
    height,
    sampler: {
      minFilter: 'nearest',
      magFilter: 'nearest',
    },
  });

  return {
    texture,
    width,
    height,
    byteLength: dstData.byteLength,
  };
}

/**
 * Create the render pipeline for flood depth visualization.
 *
 * Pipeline: CreateTexture → Colormap (with Hydro ramp)
 */
function makeRenderTile(
  colormapTexture: Texture | null,
): (data: FloodTileData) => RenderTileResult | null {
  return (data) => {
    if (!colormapTexture) {
      return null;
    }

    return {
      renderPipeline: [
        {
          module: CreateTexture,
          props: { textureName: data.texture },
        },
        {
          module: Colormap,
          props: {
            colormapTexture,
            colormapIndex: 0, // Single-layer texture
            reversed: false,
          },
        },
      ],
    };
  };
}

/** Props for creating flood layers. */
export interface FloodLayerOptions {
  /** Return period (10, 20, 50, 100, 200, 500) */
  rp: RP;
  /** GPU device for texture creation (from deck.gl) */
  device: Device | null;
  /** Shared colormap texture (create once, reuse) */
  colormapTexture: Texture | null;
  /** Layer opacity (0-1) */
  opacity?: number;
  /** Debug mode (show tile boundaries) */
  debug?: boolean;
  /** Callback when GeoTIFF metadata is loaded */
  onLoad?: (tileId: JrcTileId) => void;
}

/**
 * Create COGLayers for JRC flood depth at the given return period.
 *
 * Returns one layer per tile covering Moldova. The layers handle Float32
 * depth data and apply the Hydro blue colormap on the GPU.
 */
export function createFloodLayers(options: FloodLayerOptions): COGLayer[] {
  const {
    rp,
    device,
    colormapTexture,
    opacity = 0.85,
    debug = false,
    onLoad,
  } = options;

  if (!device || !colormapTexture) {
    return [];
  }

  const renderTile = makeRenderTile(colormapTexture);

  return JRC_TILE_IDS.map((tileId) => {
    const url = getJrcFloodUrl(tileId, rp);

    return new COGLayer({
      id: `flood-${tileId}-rp${rp}`,
      geotiff: url,
      opacity,
      debug,
      getTileData,
      renderTile,
      onGeoTIFFLoad: () => onLoad?.(tileId),
      // @ts-expect-error beforeId is injected by @deck.gl/mapbox
      beforeId: 'fields-fill', // Render below field polygons
    });
  });
}

/**
 * Hook helper: Create the colormap texture from a deck.gl device.
 * Call this once when device becomes available.
 */
export { createHydroColormapTexture };
