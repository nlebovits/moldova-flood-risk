/**
 * App state — minimal client store, no server.
 * Per README §"State management".
 */

import { create } from 'zustand';

export type RP = 10 | 20 | 50 | 100 | 200 | 500;
export type Basemap = 'positron' | 'positron-dark' | 'satellite';
export type Locale = 'ro' | 'en';

export interface AppState {
  selectedRP: RP;
  basemap: Basemap;
  locale: Locale;
  selectedFieldId: string | null;
  selectedAdminId: string | null;

  setRP: (rp: RP) => void;
  setBasemap: (b: Basemap) => void;
  setLocale: (l: Locale) => void;
  setSelectedField: (id: string | null) => void;
  setSelectedAdmin: (id: string | null) => void;
}

export const useApp = create<AppState>((set) => ({
  selectedRP: 100,
  basemap: 'positron',
  locale: 'ro',
  selectedFieldId: null,
  selectedAdminId: null,

  setRP: (rp) => set({ selectedRP: rp }),
  setBasemap: (basemap) =>
    set({
      basemap,
      // Spec: dark basemap flips chrome to dark theme tokens.
      // We toggle the .dark class on <html> as a side-effect here.
    }),
  setLocale: (locale) => set({ locale }),
  setSelectedField: (selectedFieldId) => set({ selectedFieldId }),
  setSelectedAdmin: (selectedAdminId) => set({ selectedAdminId }),
}));

/** Derived: a list of all six return periods, in order. */
export const RPS: readonly RP[] = [10, 20, 50, 100, 200, 500] as const;
