/**
 * Module-level handle to the live MapLibre instance.
 *
 * MapView owns the map and registers it here on mount; chrome that lives
 * outside MapView (the geocoder, the reset control) reads it via getMap()
 * without threading a ref through React context or polluting the zustand store
 * (which stays serializable). There is only ever one map.
 */

import type { Map as MapLibreMap } from 'maplibre-gl';
import { useData } from '../lib/data';

let current: MapLibreMap | null = null;

/** Called by MapView: pass the map on mount, null on teardown. */
export function setMap(map: MapLibreMap | null): void {
  current = map;
}

/** The live map, or null before mount / after teardown. */
export function getMap(): MapLibreMap | null {
  return current;
}

/**
 * Synchronous fallback overview camera, used for the very first paint before
 * summary.json loads (and if it ever fails). Once the data-driven `view` block
 * arrives, `resetView` frames the configured bbox instead — so porting to a new
 * country needs no edit here.
 */
export const MOLDOVA_VIEW = {
  center: [28.6, 47.05] as [number, number],
  zoom: 7.1,
};

/** Padding (px) around the fitted country bounds within the map pane. */
const OVERVIEW_PADDING = 32;

/**
 * Frame the country overview: fit the data-driven bbox from summary.json when
 * available, else fall back to the static MOLDOVA_VIEW. Shared by the reset
 * control and the initial post-load fit.
 */
export function resetView(map: MapLibreMap, duration = 700): void {
  const view = useData.getState().summary?.view;
  if (view?.bounds) {
    map.fitBounds(view.bounds, { padding: OVERVIEW_PADDING, duration });
    map.setMinZoom(view.min_zoom);
    map.setMaxZoom(view.max_zoom);
  } else {
    map.flyTo({ center: MOLDOVA_VIEW.center, zoom: MOLDOVA_VIEW.zoom, duration });
  }
}
