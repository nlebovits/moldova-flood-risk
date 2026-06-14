import type { ReactNode } from 'react';
import { useApp, type ThemeMode } from '../store/state';
import { t } from '../lib/i18n';

/**
 * Chrome theme switcher — a single button that cycles System → Light → Dark.
 * Independent of the basemap (which only drives the map tiles + paint palette).
 * Icons are inline Lucide glyphs with square caps to match the sharp chrome.
 */

const ORDER: ThemeMode[] = ['system', 'light', 'dark'];

const svg = (paths: ReactNode) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    style={{ display: 'block' }}
  >
    {paths}
  </svg>
);

const OPTIONS: { value: ThemeMode; key: string; icon: ReactNode }[] = [
  {
    value: 'system',
    key: 'theme.system',
    icon: svg(
      <>
        <rect width="20" height="14" x="2" y="3" />
        <line x1="8" x2="16" y1="21" y2="21" />
        <line x1="12" x2="12" y1="17" y2="21" />
      </>,
    ),
  },
  {
    value: 'light',
    key: 'theme.light',
    icon: svg(
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </>,
    ),
  },
  {
    value: 'dark',
    key: 'theme.dark',
    icon: svg(<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />),
  },
];

export function ThemeToggle() {
  const { locale, themeMode, setThemeMode } = useApp();
  const current = OPTIONS.find((o) => o.value === themeMode) ?? OPTIONS[0];
  const next = ORDER[(ORDER.indexOf(themeMode) + 1) % ORDER.length];
  const label = t(locale, current.key);

  return (
    <button
      type="button"
      onClick={() => setThemeMode(next)}
      title={`${t(locale, 'controls.theme')}: ${label}`}
      aria-label={`${t(locale, 'controls.theme')}: ${label}`}
      className="flex items-center gap-1.5 border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)] px-2 py-1.5 text-[var(--color-fg-2)] transition-colors hover:bg-[var(--color-bg-sunken)]"
    >
      {current.icon}
      <span className="font-mono text-[11px]">{label}</span>
    </button>
  );
}
