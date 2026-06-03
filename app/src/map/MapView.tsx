import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Device, Texture } from '@luma.gl/core';
import 'maplibre-gl/dist/maplibre-gl.css';

import { useApp, type Basemap } from '../store/state';
import {
  BASEMAP_PMTILES,
  BASEMAP_GLYPHS,
  BASEMAP_ATTRIBUTION,
  FTW_PMTILES,
  FTW_SOURCE_LAYER,
  FTW_ATTRIBUTION,
  OVERTURE_DIVISIONS_PMTILES,
  OVERTURE_ATTRIBUTION,
  ESRI_IMAGERY_TILES,
  ESRI_ATTRIBUTION,
} from './sources';
import { createFloodLayers, createHydroColormapTexture } from './flood';

// pmtiles:// — module-level, single registration.
const pmtilesProtocol = new Protocol({ metadata: true });
maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile);

const MOLDOVA_CENTER: [number, number] = [28.6, 47.05];
const MOLDOVA_ZOOM = 7.1;

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
  fieldFill: string;
  fieldStroke: string;
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
    fieldFill:       '#469695',  // Lagoon — fields are now green, flood is blue
    fieldStroke:     'rgba(38, 56, 58, 0.45)',
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
    fieldFill:       '#469695',  // Lagoon — fields are now green, flood is blue
    fieldStroke:     'rgba(239, 235, 234, 0.35)',
    textCity:        '#EFEBEA',
    textCityHalo:    '#121A19',
    textTown:        '#9BC3C2',
    textTownHalo:    '#121A19',
    lc: { forest: '#1F2E2A', farmland: '#2A2620', grassland: '#252A24', wetland: '#1A2530', def: '#1B2A2C' },
  },
};

function deriveThemeFromBasemap(b: Basemap): Theme {
  return b === 'positron-dark' || b === 'satellite' ? 'dark' : 'light';
}

// ---------------------------------------------------------------------------
// Style builder. Takes the current basemap and returns a full MapLibre style.
// ---------------------------------------------------------------------------
function buildStyle(basemap: Basemap): StyleSpecification {
  const theme = deriveThemeFromBasemap(basemap);
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
      ftw: {
        type: 'vector',
        url: FTW_PMTILES,
        attribution: FTW_ATTRIBUTION,
        minzoom: 0,
        maxzoom: 15,
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
                // TS can't infer the `match` tuple shape across mixed
                // string/string[] members; runtime accepts it fine.
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

      // Country / region boundaries from the basemap (for context worldwide)
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

      // FTW field polygons — the data spine
      {
        id: 'fields-fill',
        type: 'fill',
        source: 'ftw',
        'source-layer': FTW_SOURCE_LAYER,
        paint: {
          'fill-color': p.fieldFill,
          'fill-opacity': [
            'interpolate', ['linear'], ['zoom'],
            6, 0.35,
            10, 0.55,
            14, 0.7,
          ],
        },
      },
      {
        id: 'fields-stroke',
        type: 'line',
        source: 'ftw',
        'source-layer': FTW_SOURCE_LAYER,
        paint: {
          'line-color': p.fieldStroke,
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.2, 10, 0.4, 14, 0.8],
        },
      },

      // Overture admin boundaries — counties (raioane in Moldova)
      {
        id: 'divisions-county',
        type: 'line',
        source: 'divisions',
        'source-layer': 'division_boundary',
        filter: ['==', ['get', 'subtype'], 'county'],
        minzoom: 5,
        paint: {
          'line-color': satellite ? 'rgba(255, 255, 255, 0.5)' : p.boundary,
          'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.3, 9, 0.8, 13, 1.4],
          'line-dasharray': [2, 2],
        },
      },

      // Overture admin boundaries — country (heavier, solid)
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
  const [status, setStatus] = useState<string>('booting…');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const basemap = useApp((s) => s.basemap);
  const selectedRP = useApp((s) => s.selectedRP);

  // deck.gl GPU device and colormap texture (created once)
  const [device, setDevice] = useState<Device | null>(null);
  const [colormapTexture, setColormapTexture] = useState<Texture | null>(null);

  // Create colormap texture when device becomes available
  useEffect(() => {
    if (device && !colormapTexture) {
      const texture = createHydroColormapTexture(device);
      setColormapTexture(texture);
    }
    // Cleanup on unmount only — colormapTexture is stable once created
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device]);

  // Create flood layers for the selected return period
  const floodLayers = useMemo(() => {
    return createFloodLayers({
      rp: selectedRP,
      device,
      colormapTexture,
      opacity: 0.85,
      onLoad: (tileId) => setStatus(`flood: ${tileId} loaded`),
    });
  }, [selectedRP, device, colormapTexture]);

  // Update deck.gl overlay when layers change
  useEffect(() => {
    const overlay = overlayRef.current;
    if (overlay) {
      overlay.setProps({ layers: floodLayers });
    }
  }, [floodLayers]);

  // Mount the map exactly once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const el = containerRef.current;
    const rect = el.getBoundingClientRect();
    setStatus(`container ${Math.round(rect.width)}×${Math.round(rect.height)}`);

    const map = new maplibregl.Map({
      container: el,
      style: buildStyle(useApp.getState().basemap),
      center: MOLDOVA_CENTER,
      zoom: MOLDOVA_ZOOM,
      minZoom: 5,
      maxZoom: 14,
      attributionControl: { compact: true },
    });

    map.on('load', () => setStatus('load fired'));
    map.on('idle', () => setStatus('rendered'));
    map.on('error', (e) => {
      const msg = e?.error?.message || String(e);
      console.error('[MapLibre]', msg, e);
      setErrMsg(msg);
    });
    map.on('webglcontextlost', () => setErrMsg('WebGL context lost'));
    map.on('webglcontextrestored', () => setErrMsg(null));

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'bottom-right',
    );

    // Add deck.gl overlay for flood raster layers
    const overlay = new MapboxOverlay({
      interleaved: true,
      layers: [],
      onDeviceInitialized: (dev) => {
        setDevice(dev);
        setStatus('deck.gl ready');
      },
    });
    // MapLibre 4+ uses addControl for IControl implementations
    map.addControl(overlay as unknown as maplibregl.IControl);
    overlayRef.current = overlay;

    mapRef.current = map;

    return () => {
      overlay.finalize();
      overlayRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Re-apply style when basemap changes (light / dark / satellite).
  // setStyle with diff:true preserves sources that haven't changed.
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    m.setStyle(buildStyle(basemap), { diff: true });
    setStatus(`switching → ${basemap}`);
  }, [basemap]);

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
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'rgba(0,0,0,0.78)',
          color: errMsg ? '#FCBB15' : '#9BC4E6',
          padding: '3px 10px',
          font: '11px ui-monospace, monospace',
          letterSpacing: '0.04em',
          pointerEvents: 'none',
        }}
      >
        map: {status}{errMsg ? ' · ' + errMsg : ''}
      </div>
    </>
  );
}
