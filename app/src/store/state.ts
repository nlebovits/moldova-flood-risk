/**
 * App state — minimal client store, no server.
 * Per README §"State management".
 */

import { create } from 'zustand';
import type { FieldProps, Parcel } from '../lib/types';
import { isOnboardingDismissed } from '../lib/onboarding';

/** Persisted chrome theme preference (try/catch — storage may be unavailable). */
const THEME_KEY = 'md-flood-theme';
function loadThemeMode(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* storage unavailable */
  }
  return 'system';
}
function persistThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    /* storage unavailable */
  }
}

export type RP = 10 | 20 | 50 | 100 | 200 | 500;
export type Basemap = 'positron' | 'positron-dark' | 'satellite';
export type Locale = 'ro' | 'en';
export type Theme = 'light' | 'dark';
/** Chrome theme preference. 'system' follows the OS prefers-color-scheme. */
export type ThemeMode = 'system' | 'light' | 'dark';

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

  /** First-run tutorial overlay — open on first visit, re-openable via "?". */
  tutorialOpen: boolean;

  /** UI chrome theme, independent of the basemap. */
  themeMode: ThemeMode;

  setRP: (rp: RP) => void;
  setBasemap: (b: Basemap) => void;
  setLocale: (l: Locale) => void;
  setSelectedField: (field: FieldProps | null) => void;
  setSelectedAdmin: (id: string | null) => void;
  clearSelection: () => void;
  setPortfolio: (rows: Parcel[]) => void;
  setTutorialOpen: (open: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
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

  // Show the tutorial on first visit; suppressed once dismissed (persisted).
  tutorialOpen: !isOnboardingDismissed(),

  themeMode: loadThemeMode(),

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
  setTutorialOpen: (open) => set({ tutorialOpen: open }),
  setThemeMode: (themeMode) => {
    persistThemeMode(themeMode);
    set({ themeMode });
  },
}));

/** Derived: a list of all six return periods, in order. */
export const RPS: readonly RP[] = [10, 20, 50, 100, 200, 500] as const;
