/**
 * One-shot loader for the precompute sidecars (summary, eal, admin).
 * Fetched once on mount into a tiny zustand store; components read from it
 * rather than fetching themselves. Total payload is light (~150 KB).
 *
 * Field-level attributes are NOT loaded here — they travel inside the
 * fields.pmtiles features and arrive on click, so the big JSON never ships.
 */

import { create } from 'zustand';
import type { AdminProps, Eal, Summary } from './types';

/** [west, south, east, north] in EPSG:4326. */
export type BBox = [number, number, number, number];

interface DataState {
  summary: Summary | null;
  eal: Eal | null;
  /** Raion name → its aggregate properties, for the admin panel. */
  adminByName: Record<string, AdminProps>;
  /** Raion name → bbox, for fly-to on selection. */
  adminBounds: Record<string, BBox>;
  loaded: boolean;
  error: string | null;
  load: () => Promise<void>;
}

interface AdminFeature {
  properties: AdminProps;
  geometry: { type: string; coordinates: unknown };
}
interface AdminFeatureCollection {
  features: AdminFeature[];
}

/** Walk a GeoJSON coordinate tree and grow a bbox in place. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function growBBox(coords: any, bbox: BBox): void {
  if (typeof coords[0] === 'number') {
    const [x, y] = coords as [number, number];
    if (x < bbox[0]) bbox[0] = x;
    if (y < bbox[1]) bbox[1] = y;
    if (x > bbox[2]) bbox[2] = x;
    if (y > bbox[3]) bbox[3] = y;
    return;
  }
  for (const c of coords) growBBox(c, bbox);
}

export const useData = create<DataState>((set, get) => ({
  summary: null,
  eal: null,
  adminByName: {},
  adminBounds: {},
  loaded: false,
  error: null,

  load: async () => {
    if (get().loaded) return;
    try {
      const [summary, eal, admin] = await Promise.all([
        fetch('/data/summary.json').then((r) => r.json() as Promise<Summary>),
        fetch('/data/eal.json').then((r) => r.json() as Promise<Eal>),
        fetch('/data/admin.geojson').then(
          (r) => r.json() as Promise<AdminFeatureCollection>,
        ),
      ]);

      const adminByName: Record<string, AdminProps> = {};
      const adminBounds: Record<string, BBox> = {};
      for (const f of admin.features) {
        const name = f.properties?.name;
        if (!name) continue;
        adminByName[name] = f.properties;
        const bbox: BBox = [Infinity, Infinity, -Infinity, -Infinity];
        growBBox(f.geometry.coordinates, bbox);
        adminBounds[name] = bbox;
      }

      set({ summary, eal, adminByName, adminBounds, loaded: true, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },
}));
