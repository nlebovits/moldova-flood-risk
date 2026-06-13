import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Device } from '@luma.gl/core';
import 'maplibre-gl/dist/maplibre-gl.css';

import { useApp, type Basemap, themeFromBasemap } from '../store/state';
import { useData } from '../lib/data';
import { createFloodLayers, createHydroColormapTexture, FLOOD_BEFORE_ID } from './flood';
import { wireInteractions } from './interactions';
import { setMap, MOLDOVA_VIEW, resetView } from './mapRegistry';
import { t } from '../lib/i18n';
import {
  BASEMAP_PMTILES,
  BASEMAP_GLYPHS,
  BASEMAP_ATTRIBUTION,
  FIELDS_PMTILES,
  FIELDS_SOURCE_LAYER,
  FTW_ATTRIBUTION,
  ADMIN_GEOJSON_URL,
  OVERTURE_DIVISIONS_PMTILES,
  OVERTURE_ATTRIBUTION,
  ESRI_IMAGERY_TILES,
  ESRI_ATTRIBUTION,
} from './sources';

// pmtiles:// — module-level, single registration.
const pmtilesProtocol = new Protocol({ metadata: true });
maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile);

// Fields render as plain Lagoon-green outlines on every basemap (the green is
// interface identity; the blue flood raster is the evidence). The transparent
// fill below stays solely for click hit-testing.
const FIELD_OUTLINE = '#469695';

// ---------------------------------------------------------------------------
// Reset control — a button stacked with the NavigationControl (top-right) that
// flies back to the national overview. Custom IControl so it shares MapLibre's
// control chrome (and the no-radius lock applied to .maplibregl-ctrl).
// ---------------------------------------------------------------------------
class ResetControl implements maplibregl.IControl {
  private container: HTMLDivElement | null = null;
  private readonly label: string;
  constructor(label: string) {
    this.label = label;
  }

  onAdd(map: MapLibreMap): HTMLElement {
    const container = document.createElement('div');
    container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    const button = document.createElement('button');
    button.type = 'button';
    button.title = this.label;
    button.setAttribute('aria-label', this.label);
    // Lucide `house` glyph, inline so it inherits the control's currentColor.
    button.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" style="display:block;margin:auto"><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>';
    button.addEventListener('click', () => {
      resetView(map);
    });
    container.appendChild(button);
    this.container = container;
    return container;
  }

  onRemove(): void {
    this.container?.parentNode?.removeChild(this.container);
    this.container = null;
  }
}

// ---------------------------------------------------------------------------
// Palette per theme. Map paint expressions can't read CSS variables, so we
// resolve theme-dependent colors here and rebuild the style on basemap swap.
// ---------------------------------------------------------------------------
type Theme = 'light' | 'dark';

const PALETTE: Record<Theme, {
  bg: string;
  earth: string;
  water: string;
  boundary: string;
  boundaryCountry: string;
  road: string;
  adminHover: string;
  adminSelected: string;
  textCity: string;
  textCityHalo: string;
  textTown: string;
  textTownHalo: string;
  lc: { forest: string; farmland: string; grassland: string; wetland: string; def: string };
}> = {
  light: {
    bg:              '#EFEBEA',
    earth:           '#E4E1DE',
    water:           '#CFD8DC',
    boundary:        'rgba(38, 56, 58, 0.22)',
    boundaryCountry: 'rgba(38, 56, 58, 0.55)',
    road:            'rgba(38, 56, 58, 0.18)',
    adminHover:      'rgba(70, 150, 149, 0.12)',  // Lagoon, faint
    adminSelected:   '#469695',                    // Lagoon (interface)
    textCity:        '#26383A',
    textCityHalo:    '#EFEBEA',
    textTown:        '#4A5C5E',
    textTownHalo:    '#EFEBEA',
    lc: { forest: '#D6DDD2', farmland: '#E8E2D7', grassland: '#E0DDD2', wetland: '#D2DCDF', def: '#E4E1DE' },
  },
  dark: {
    bg:              '#121A19',
    earth:           '#1B2A2C',
    water:           '#0C1416',
    boundary:        'rgba(239, 235, 234, 0.20)',
    boundaryCountry: 'rgba(239, 235, 234, 0.55)',
    road:            'rgba(239, 235, 234, 0.20)',
    adminHover:      'rgba(155, 195, 194, 0.14)',  // Lagoon-200, faint
    adminSelected:   '#9BC3C2',                     // Lagoon-200
    textCity:        '#EFEBEA',
    textCityHalo:    '#121A19',
    textTown:        '#9BC3C2',
    textTownHalo:    '#121A19',
    lc: { forest: '#1F2E2A', farmland: '#2A2620', grassland: '#252A24', wetland: '#1A2530', def: '#1B2A2C' },
  },
};

// ---------------------------------------------------------------------------
// Style builder. Takes the current basemap and returns a full MapLibre style.
// The flood evidence is a deck.gl raster overlay (not a style layer); fields
// are outline-only here, so the style no longer depends on the selected RP.
// ---------------------------------------------------------------------------
function buildStyle(basemap: Basemap): StyleSpecification {
  const theme = themeFromBasemap(basemap);
  const satellite = basemap === 'satellite';
  const p = PALETTE[theme];

  return {
    version: 8,
    glyphs: BASEMAP_GLYPHS,
    sources: {
      basemap: {
        type: 'vector',
        url: BASEMAP_PMTILES,
        attribution: BASEMAP_ATTRIBUTION,
      },
      fields: {
        type: 'vector',
        url: FIELDS_PMTILES,
        attribution: FTW_ATTRIBUTION,
        promoteId: { [FIELDS_SOURCE_LAYER]: 'id' },
        minzoom: 0,
        maxzoom: 14,
      },
      admin: {
        type: 'geojson',
        data: ADMIN_GEOJSON_URL,
        promoteId: 'name',
      },
      divisions: {
        type: 'vector',
        url: OVERTURE_DIVISIONS_PMTILES,
        attribution: OVERTURE_ATTRIBUTION,
        minzoom: 0,
        maxzoom: 12,
      },
      ...(satellite
        ? {
            satellite: {
              type: 'raster' as const,
              tiles: ESRI_IMAGERY_TILES,
              tileSize: 256,
              attribution: ESRI_ATTRIBUTION,
              maxzoom: 19,
            },
          }
        : {}),
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': p.bg } },

      // Satellite base (replaces land + water + landcover when on)
      ...(satellite
        ? [
            {
              id: 'satellite',
              type: 'raster' as const,
              source: 'satellite',
              paint: { 'raster-opacity': 1 },
            },
          ]
        : [
            {
              id: 'earth',
              type: 'fill' as const,
              source: 'basemap',
              'source-layer': 'earth',
              paint: { 'fill-color': p.earth },
            },
            {
              id: 'landcover',
              type: 'fill' as const,
              source: 'basemap',
              'source-layer': 'landcover',
              paint: {
                'fill-color': ([
                  'match',
                  ['get', 'kind'],
                  'forest', p.lc.forest,
                  'wood', p.lc.forest,
                  'farmland', p.lc.farmland,
                  'grassland', p.lc.grassland,
                  'wetland', p.lc.wetland,
                  p.lc.def,
                ] as unknown as string),
                'fill-opacity': 0.7,
              },
            },
            {
              id: 'water',
              type: 'fill' as const,
              source: 'basemap',
              'source-layer': 'water',
              paint: { 'fill-color': p.water },
            },
          ]),

      // Roads — kept light on satellite for visibility
      {
        id: 'roads',
        type: 'line',
        source: 'basemap',
        'source-layer': 'roads',
        minzoom: 7,
        filter: ['in', 'kind', 'highway', 'major_road', 'medium_road'],
        paint: {
          'line-color': satellite ? 'rgba(255, 255, 255, 0.55)' : p.road,
          'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.3, 12, 1.2, 15, 2.0],
        },
      },

      // Country / region boundaries from the basemap (context worldwide)
      {
        id: 'basemap-boundaries',
        type: 'line',
        source: 'basemap',
        'source-layer': 'boundaries',
        paint: {
          'line-color': satellite ? 'rgba(255, 255, 255, 0.45)' : p.boundary,
          'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.4, 8, 1.0, 12, 1.6],
        },
      },

      // Moldova field polygons — the data spine. Transparent fill kept ONLY
      // for click hit-testing (queryRenderedFeatures targets 'fields-fill');
      // the flood raster sits just above it (beforeId 'fields-stroke').
      {
        id: 'fields-fill',
        type: 'fill',
        source: 'fields',
        'source-layer': FIELDS_SOURCE_LAYER,
        paint: {
          'fill-color': FIELD_OUTLINE,
          'fill-opacity': 0,
        },
      },
      // Field outlines — plain Lagoon green on every basemap (interface
      // identity), zoom-graduated width. The blue flood raster is the evidence.
      // id === FLOOD_BEFORE_ID: the flood overlay renders directly beneath this.
      {
        id: FLOOD_BEFORE_ID,
        type: 'line',
        source: 'fields',
        'source-layer': FIELDS_SOURCE_LAYER,
        paint: {
          'line-color': FIELD_OUTLINE,
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.4, 10, 0.7, 14, 1.2],
        },
      },
      // Selected field — Lagoon outline driven by feature-state.
      {
        id: 'fields-selected',
        type: 'line',
        source: 'fields',
        'source-layer': FIELDS_SOURCE_LAYER,
        paint: {
          'line-color': p.adminSelected,
          'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2.4, 0],
        },
      },

      // Admin units (raioane) from our own data — hit-testable + hover tint.
      {
        id: 'admin-fill',
        type: 'fill',
        source: 'admin',
        paint: {
          'fill-color': p.adminSelected,
          'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.10, 0],
        },
      },
      {
        id: 'admin-outline',
        type: 'line',
        source: 'admin',
        paint: {
          'line-color': satellite ? 'rgba(255,255,255,0.45)' : p.boundary,
          'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.4, 9, 0.9, 13, 1.5],
        },
      },
      {
        id: 'admin-selected',
        type: 'line',
        source: 'admin',
        paint: {
          'line-color': p.adminSelected,
          'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2.4, 0],
        },
      },

      // Overture country boundary — heavier, solid, for national context.
      {
        id: 'divisions-country',
        type: 'line',
        source: 'divisions',
        'source-layer': 'division_boundary',
        filter: ['==', ['get', 'subtype'], 'country'],
        paint: {
          'line-color': satellite ? 'rgba(255, 255, 255, 0.85)' : p.boundaryCountry,
          'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.6, 8, 1.4, 12, 2.4],
        },
      },

      // Place labels — cities (capitals, big towns)
      {
        id: 'place-city',
        type: 'symbol',
        source: 'basemap',
        'source-layer': 'places',
        filter: ['all', ['==', 'kind', 'locality'], ['>=', 'population_rank', 6]],
        minzoom: 4,
        layout: {
          'text-field': '{name}',
          'text-font': ['Noto Sans Medium'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 12, 16],
        },
        paint: {
          'text-color': satellite ? '#FFFFFF' : p.textCity,
          'text-halo-color': satellite ? 'rgba(0,0,0,0.7)' : p.textCityHalo,
          'text-halo-width': 1.5,
        },
      },
      // Place labels — towns
      {
        id: 'place-town',
        type: 'symbol',
        source: 'basemap',
        'source-layer': 'places',
        filter: [
          'all',
          ['==', 'kind', 'locality'],
          ['<', 'population_rank', 6],
          ['>=', 'population_rank', 3],
        ],
        minzoom: 8,
        layout: {
          'text-field': '{name}',
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 12, 13],
        },
        paint: {
          'text-color': satellite ? 'rgba(255,255,255,0.85)' : p.textTown,
          'text-halo-color': satellite ? 'rgba(0,0,0,0.6)' : p.textTownHalo,
          'text-halo-width': 1,
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------

export function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const basemap = useApp((s) => s.basemap);
  const selectedRP = useApp((s) => s.selectedRP);
  const selectedField = useApp((s) => s.selectedField);
  const selectedAdminId = useApp((s) => s.selectedAdminId);
  const loadData = useData((s) => s.load);
  const summaryView = useData((s) => s.summary?.view);
  const didFitRef = useRef(false);

  // deck.gl GPU device, set once the overlay initializes it.
  const [device, setDevice] = useState<Device | null>(null);

  // Hydro colormap texture — built once the device exists (memoized on device).
  const colormapTexture = useMemo(
    () => (device ? createHydroColormapTexture(device) : null),
    [device],
  );

  // Track applied feature-state so we can clear the previous selection.
  const prevFieldId = useRef<number | null>(null);
  const prevAdminId = useRef<string | null>(null);

  // The flood-depth raster layer for the selected RP. Stable layer id, so an
  // RP change re-fetches tiles rather than recreating the layer.
  const floodLayers = useMemo(
    () => createFloodLayers({ rp: selectedRP, device, colormapTexture, opacity: 0.85 }),
    [selectedRP, device, colormapTexture],
  );

  // Push the current flood layers onto the deck.gl overlay.
  useEffect(() => {
    overlayRef.current?.setProps({ layers: floodLayers });
  }, [floodLayers]);

  // Load the precompute sidecars once.
  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Once summary.json arrives, frame the configured country bbox (data-driven,
  // so a port needs no camera edit). Runs once; MOLDOVA_VIEW is the pre-load
  // fallback set at map construction.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !summaryView || didFitRef.current) return;
    didFitRef.current = true;
    resetView(map, 0);
  }, [summaryView]);

  // Mount the map exactly once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(useApp.getState().basemap),
      center: MOLDOVA_VIEW.center,
      zoom: MOLDOVA_VIEW.zoom,
      minZoom: 5,
      maxZoom: 14,
      attributionControl: { compact: true },
    });

    map.on('error', (e) => {
      const msg = e?.error?.message || String(e);
      console.error('[MapLibre]', msg, e);
      setErrMsg(msg);
    });
    map.on('webglcontextlost', () => setErrMsg('WebGL context lost'));
    map.on('webglcontextrestored', () => setErrMsg(null));

    // Zoom + reset, stacked top-right (clear of the bottom-left legend and the
    // bottom-right attribution).
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right',
    );
    map.addControl(
      new ResetControl(t(useApp.getState().locale, 'controls.reset')),
      'top-right',
    );

    // deck.gl overlay for the flood-depth raster. Interleaved so it composites
    // inside the MapLibre layer stack (honoring the flood layer's beforeId).
    const overlay = new MapboxOverlay({
      interleaved: true,
      layers: [],
      onDeviceInitialized: (dev: Device) => setDevice(dev),
    });
    map.addControl(overlay as unknown as maplibregl.IControl);
    overlayRef.current = overlay;

    const teardownInteractions = wireInteractions(map);
    mapRef.current = map;
    setMap(map);

    return () => {
      teardownInteractions();
      overlay.finalize();
      overlayRef.current = null;
      setMap(null);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Re-apply style on basemap change (light / dark / satellite). diff:true
  // preserves unchanged sources; the interleaved deck.gl overlay survives the
  // rebuild. Selection feature-state is re-applied below.
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    m.setStyle(buildStyle(basemap), { diff: true });
  }, [basemap]);

  // Apply selection feature-state (field OR admin). Clears the prior one.
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;

    const apply = () => {
      // Clear previous field selection.
      if (prevFieldId.current !== null) {
        m.setFeatureState(
          { source: 'fields', sourceLayer: FIELDS_SOURCE_LAYER, id: prevFieldId.current },
          { selected: false },
        );
        prevFieldId.current = null;
      }
      // Clear previous admin selection.
      if (prevAdminId.current !== null) {
        m.setFeatureState({ source: 'admin', id: prevAdminId.current }, { selected: false });
        prevAdminId.current = null;
      }

      if (selectedField) {
        m.setFeatureState(
          { source: 'fields', sourceLayer: FIELDS_SOURCE_LAYER, id: selectedField.id },
          { selected: true },
        );
        prevFieldId.current = selectedField.id;
      } else if (selectedAdminId) {
        m.setFeatureState({ source: 'admin', id: selectedAdminId }, { selected: true });
        prevAdminId.current = selectedAdminId;

        // Fly to the raion (covers map-click AND EAL-row-click selections).
        const bounds = useData.getState().adminBounds[selectedAdminId];
        if (bounds) {
          m.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], {
            padding: 80,
            duration: 600,
            maxZoom: 10,
          });
        }
      }
    };

    if (m.isStyleLoaded()) apply();
    else m.once('idle', apply);
  }, [selectedField, selectedAdminId, basemap]);

  return (
    <>
      <div
        ref={containerRef}
        aria-label="Hartă"
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          width: '100%', height: '100%',
        }}
      />
      {errMsg && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'rgba(0,0,0,0.78)',
            color: '#FCBB15',
            padding: '3px 10px',
            font: '11px ui-monospace, monospace',
            letterSpacing: '0.04em',
            pointerEvents: 'none',
          }}
        >
          {errMsg}
        </div>
      )}
    </>
  );
}
