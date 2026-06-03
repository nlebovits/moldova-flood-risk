/**
 * Hydro colormap — the locked sequential blue ramp from the design spec.
 *
 * Shallow → Deep:
 *   #CFE3F2 → #9BC4E6 → #5E97D1 → #2E68B5 → #1C4189 → #0E2356
 *
 * This module creates a 256×1 RGBA GPU texture for use with deck.gl-raster's
 * Colormap shader module.
 */

import type { Device, Texture } from '@luma.gl/core';

/**
 * The 6 color stops of the Hydro ramp (RGB tuples, 0-255).
 * Ordered shallow to deep.
 */
export const HYDRO_COLORS: [number, number, number][] = [
  [207, 227, 242], // #CFE3F2 — shallow
  [155, 196, 230], // #9BC4E6
  [94, 151, 209],  // #5E97D1
  [46, 104, 181],  // #2E68B5
  [28, 65, 137],   // #1C4189
  [14, 35, 86],    // #0E2356 — deep
];

/**
 * Maximum depth value (meters) for the colormap.
 * Depths beyond this saturate at the deepest color.
 */
export const MAX_DEPTH_M = 5.0;

/**
 * Linearly interpolate between two RGB colors.
 */
function lerpColor(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

/**
 * Build a 256×1 RGBA Uint8Array from the Hydro color stops.
 * Index 0 is transparent (nodata), indices 1-255 interpolate the ramp.
 */
export function buildHydroColormapData(): Uint8Array {
  const data = new Uint8Array(256 * 4); // RGBA × 256

  // Index 0: transparent (nodata / depth == 0)
  data[0] = 0;
  data[1] = 0;
  data[2] = 0;
  data[3] = 0;

  // Indices 1-255: interpolate across 6 color stops
  const numStops = HYDRO_COLORS.length;
  for (let i = 1; i < 256; i++) {
    // Map index 1-255 to position 0.0-1.0
    const t = (i - 1) / 254;

    // Find which segment we're in (0 to numStops-2)
    const segmentFloat = t * (numStops - 1);
    const segment = Math.min(Math.floor(segmentFloat), numStops - 2);
    const segmentT = segmentFloat - segment;

    const color = lerpColor(
      HYDRO_COLORS[segment],
      HYDRO_COLORS[segment + 1],
      segmentT,
    );

    const offset = i * 4;
    data[offset] = color[0];
    data[offset + 1] = color[1];
    data[offset + 2] = color[2];
    data[offset + 3] = 255; // Fully opaque
  }

  return data;
}

/**
 * Create a GPU texture for the Hydro colormap.
 *
 * Returns a 2D array texture with a single layer (required by the Colormap
 * shader module).
 */
export function createHydroColormapTexture(device: Device): Texture {
  const data = buildHydroColormapData();

  return device.createTexture({
    dimension: '2d-array',
    format: 'rgba8unorm',
    width: 256,
    height: 1,
    depth: 1, // Single layer
    data,
    mipLevels: 1,
    sampler: {
      minFilter: 'linear',
      magFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
      addressModeW: 'clamp-to-edge',
    },
  });
}

/**
 * Hex color strings for use in CSS legends.
 */
export const HYDRO_HEX = [
  '#CFE3F2',
  '#9BC4E6',
  '#5E97D1',
  '#2E68B5',
  '#1C4189',
  '#0E2356',
] as const;
