/**
 * App state — minimal client store, no server.
 * Per README §"State management".
 */

import { create } from 'zustand';
import type { FieldProps, Parcel } from '../lib/types';

export type RP = 10 | 20 | 50 | 100 | 200 | 500;
export type Basemap = 'positron' | 'positron-dark' | 'satellite';
export type Locale = 'ro' | 'en';
export type Theme = 'light' | 'dark';

/** Dark / satellite basemaps flip the chrome to dark tokens (spec). */
export function themeFromBasemap(b: Basemap): Theme {
  return b === 'positron-dark' || b === 'satellite' ? 'dark' : 'light';
}

/** Disabled PROPOSED layer toggles (§10–11). Never wired to real layers. */
export interface LayerStubs {
  pluvial: boolean;
  footprints: boolean;
  infra: boolean;
}

export interface AppState {
  selectedRP: RP;
  basemap: Basemap;
  theme: Theme;
  locale: Locale;

  /** REAL spine selection — a field OR a raion, mutually exclusive. */
  selectedField: FieldProps | null;
  selectedAdminId: string | null;

  /** PROPOSED stubs. */
  portfolio: { loaded: boolean; rows: Parcel[] };
  layers: LayerStubs;

  setRP: (rp: RP) => void;
  setBasemap: (b: Basemap) => void;
  setLocale: (l: Locale) => void;
  setSelectedField: (field: FieldProps | null) => void;
  setSelectedAdmin: (id: string | null) => void;
  clearSelection: () => void;
  setPortfolio: (rows: Parcel[]) => void;
}

export const useApp = create<AppState>((set) => ({
  selectedRP: 100,
  basemap: 'positron',
  theme: 'light',
  locale: 'ro',

  selectedField: null,
  selectedAdminId: null,

  portfolio: { loaded: false, rows: [] },
  layers: { pluvial: false, footprints: false, infra: false },

  setRP: (rp) => set({ selectedRP: rp }),
  setBasemap: (basemap) => set({ basemap, theme: themeFromBasemap(basemap) }),
  setLocale: (locale) => set({ locale }),

  // Field and admin selections are mutually exclusive (one clears the other).
  setSelectedField: (selectedField) =>
    set({ selectedField, selectedAdminId: null }),
  setSelectedAdmin: (selectedAdminId) =>
    set({ selectedAdminId, selectedField: null }),
  clearSelection: () => set({ selectedField: null, selectedAdminId: null }),

  setPortfolio: (rows) => set({ portfolio: { loaded: true, rows } }),
}));

/** Derived: a list of all six return periods, in order. */
export const RPS: readonly RP[] = [10, 20, 50, 100, 200, 500] as const;
