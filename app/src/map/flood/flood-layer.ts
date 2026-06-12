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
import { getJrcFloodUrl } from './jrc-sources';

/**
 * Anchor layer the flood raster renders beneath. The raster sits above the
 * basemap/water and the (transparent) field fill, but below the field
 * outlines, admin lines, and labels — see the MapLibre style in MapView.
 * Exported so the style builder and the deck.gl layer share one source of truth.
 */
export const FLOOD_BEFORE_ID = 'fields-stroke';

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
  onLoad?: () => void;
  /** MapLibre layer id the raster renders beneath (default FLOOD_BEFORE_ID). */
  beforeId?: string;
}

/**
 * Create the JRC flood-depth COG layer for the given return period.
 *
 * Returns a single-element array (deck.gl's `setProps({ layers })` wants an
 * array) holding one COGLayer that streams the per-RP Moldova COG, handles its
 * Float32 depth data, and applies the Hydro blue colormap on the GPU.
 */
export function createFloodLayers(options: FloodLayerOptions): COGLayer[] {
  const {
    rp,
    device,
    colormapTexture,
    opacity = 0.85,
    debug = false,
    onLoad,
    beforeId = FLOOD_BEFORE_ID,
  } = options;

  if (!device || !colormapTexture) {
    return [];
  }

  const renderTile = makeRenderTile(colormapTexture);

  // Stable id across RP changes so deck.gl diffs (re-fetches tiles) rather than
  // tearing the layer down and recreating it on every selector click.
  return [
    new COGLayer({
      id: 'flood-depth',
      geotiff: getJrcFloodUrl(rp),
      opacity,
      debug,
      getTileData,
      renderTile,
      onGeoTIFFLoad: () => onLoad?.(),
      // @ts-expect-error beforeId is injected by @deck.gl/mapbox
      beforeId,
    }),
  ];
}

/**
 * Hook helper: Create the colormap texture from a deck.gl device.
 * Call this once when device becomes available.
 */
export { createHydroColormapTexture };
