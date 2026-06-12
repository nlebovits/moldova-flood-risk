/**
 * Map interaction wiring — hover highlight + click selection.
 *
 * Click priority: a field hit wins over a raion hit (fields sit inside
 * raioane). Baked field attributes travel in the feature, so selecting a
 * field needs no ID lookup. Clicking empty map clears any selection.
 *
 * Returns a teardown that removes every listener.
 */

import type { Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import { useApp } from '../store/state';
import type { FieldProps } from '../lib/types';

const ADMIN_SOURCE = 'admin';
const FIELDS_LAYER = 'fields-fill';
const ADMIN_LAYER = 'admin-fill';

export function wireInteractions(map: MapLibreMap): () => void {
  let hoveredAdmin: string | number | null = null;

  const setAdminHover = (id: string | number, hover: boolean) =>
    map.setFeatureState({ source: ADMIN_SOURCE, id }, { hover });

  const onAdminMove = (e: MapLayerMouseEvent) => {
    if (!e.features?.length) return;
    const id = e.features[0].id ?? null;
    if (hoveredAdmin !== null && hoveredAdmin !== id) setAdminHover(hoveredAdmin, false);
    hoveredAdmin = id;
    if (hoveredAdmin !== null) setAdminHover(hoveredAdmin, true);
  };

  const onAdminLeave = () => {
    if (hoveredAdmin !== null) setAdminHover(hoveredAdmin, false);
    hoveredAdmin = null;
  };

  const onFieldsEnter = () => {
    map.getCanvas().style.cursor = 'pointer';
  };
  const onFieldsLeave = () => {
    map.getCanvas().style.cursor = '';
  };

  const onClick = (e: MapLayerMouseEvent) => {
    const fieldHits = map.queryRenderedFeatures(e.point, { layers: [FIELDS_LAYER] });
    if (fieldHits.length) {
      const props = fieldHits[0].properties as unknown as FieldProps;
      useApp.getState().setSelectedField(props);
      return;
    }
    const adminHits = map.queryRenderedFeatures(e.point, { layers: [ADMIN_LAYER] });
    if (adminHits.length) {
      const name = String(adminHits[0].properties?.name ?? adminHits[0].id ?? '');
      if (name) useApp.getState().setSelectedAdmin(name);
      return;
    }
    useApp.getState().clearSelection();
  };

  map.on('mousemove', ADMIN_LAYER, onAdminMove);
  map.on('mouseleave', ADMIN_LAYER, onAdminLeave);
  map.on('mouseenter', FIELDS_LAYER, onFieldsEnter);
  map.on('mouseleave', FIELDS_LAYER, onFieldsLeave);
  map.on('click', onClick);

  return () => {
    map.off('mousemove', ADMIN_LAYER, onAdminMove);
    map.off('mouseleave', ADMIN_LAYER, onAdminLeave);
    map.off('mouseenter', FIELDS_LAYER, onFieldsEnter);
    map.off('mouseleave', FIELDS_LAYER, onFieldsLeave);
    map.off('click', onClick);
  };
}
