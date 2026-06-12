/**
 * Module-level handle to the live MapLibre instance.
 *
 * MapView owns the map and registers it here on mount; chrome that lives
 * outside MapView (the geocoder, the reset control) reads it via getMap()
 * without threading a ref through React context or polluting the zustand store
 * (which stays serializable). There is only ever one map.
 */

import type { Map as MapLibreMap } from 'maplibre-gl';

let current: MapLibreMap | null = null;

/** Called by MapView: pass the map on mount, null on teardown. */
export function setMap(map: MapLibreMap | null): void {
  current = map;
}

/** The live map, or null before mount / after teardown. */
export function getMap(): MapLibreMap | null {
  return current;
}

/** National overview camera — shared by the reset control and initial view. */
export const MOLDOVA_VIEW = {
  center: [28.6, 47.05] as [number, number],
  zoom: 7.1,
};
