import { useEffect, useState } from 'react';
import { MapView } from './map/MapView';
import { RPSelector } from './components/RPSelector';
import { HeadlineStat } from './components/HeadlineStat';
import { AdminSelector } from './components/AdminSelector';
import { Legend } from './components/Legend';
import { Geocoder } from './components/Geocoder';
import { LanguageToggle } from './components/LanguageToggle';
import { ThemeToggle } from './components/ThemeToggle';
import { FieldPanel } from './components/FieldPanel';
import { AdminPanel } from './components/AdminPanel';
import { EalPanel } from './components/EalPanel';
import { PortfolioPanel } from './components/PortfolioPanel';
import { BecomesPanel } from './components/BecomesPanel';
import { LayerControls } from './components/LayerControls';
import { DataSources } from './components/DataSources';
import { OnboardingTutorial } from './components/OnboardingTutorial';
import { useApp } from './store/state';
import { t } from './lib/i18n';

/**
 * Two-pane shell: a solid left sidebar holds all panels (REAL spine above the
 * collapsible PROPOSED section, provenance at the foot); the map fills the rest
 * with floating chrome (geocoder top-left, zoom+reset top-right, legend +
 * basemap bottom-left, attribution bottom-right). Sharp corners, hairline
 * borders — nothing rounded.
 */
export default function App() {
  const { locale, selectedField, selectedAdminId, tutorialOpen, themeMode } = useApp();
  const [proposedOpen, setProposedOpen] = useState(false);

  // Reflect locale on <html> so the lang attribute matches visible text.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // Apply the chosen chrome theme; 'system' tracks the OS preference live.
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = themeMode === 'dark' || (themeMode === 'system' && mql.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    if (themeMode !== 'system') return;
    mql.addEventListener('change', apply);
    return () => mql.removeEventListener('change', apply);
  }, [themeMode]);

  return (
    <div className="re-base flex h-screen w-screen overflow-hidden">
      {/* SIDEBAR */}
      <aside className="flex w-[380px] shrink-0 flex-col overflow-y-auto border-r border-[var(--color-border-strong)] bg-[var(--color-bg-raised)] shadow-[var(--shadow-2)]">
        <div className="flex flex-col gap-4 p-5">
          {/* Header */}
          <header className="flex items-start justify-between gap-3">
            <div>
              <span className="re-eyebrow mb-1.5 inline-block [font-family:var(--font-mono)] text-[var(--color-fg-3)]">
                {t(locale, 'app.radiant_earth')
                  .split('{brand}')
                  .flatMap((part, i) =>
                    i === 0
                      ? [part]
                      : [
                          <a
                            key="brand"
                            href="https://radiant.earth/"
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'var(--color-fg-3)' }}
                            className="underline underline-offset-2 hover:opacity-80"
                          >
                            {t(locale, 'app.radiant_earth_brand')}
                          </a>,
                          part,
                        ],
                  )}
              </span>
              <h1 className="re-h4 text-[var(--color-fg-1)]">{t(locale, 'app.title')}</h1>
              <div className="re-meta mt-0.5">{t(locale, 'app.subtitle')}</div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </header>

          <RPSelector />
          <HeadlineStat />
          <AdminSelector />

          {/* REAL spine — selected field OR raion (mutually exclusive). */}
          {selectedField && <FieldPanel />}
          {selectedAdminId && <AdminPanel />}

          <EalPanel />

          {/* PROPOSED — visually separated, collapsed by default. */}
          <div className="border-t border-dashed border-[var(--color-proposed)] pt-3">
            <button
              type="button"
              onClick={() => setProposedOpen((s) => !s)}
              aria-expanded={proposedOpen}
              className="stamp-proposed flex w-full justify-between"
            >
              <span>{t(locale, 'ui.proposed_section')}</span>
              <span aria-hidden className="font-mono">{proposedOpen ? '▾' : '▸'}</span>
            </button>

            {proposedOpen && (
              <div className="mt-3 flex flex-col gap-3">
                <PortfolioPanel />
                <BecomesPanel />
                <LayerControls />
              </div>
            )}
          </div>

          <DataSources />
        </div>
      </aside>

      {/* MAP */}
      <div className="relative flex-1">
        <MapView />

        {/* Top-left: place search */}
        <div className="absolute left-4 top-4 z-10">
          <Geocoder />
        </div>

        {/* Bottom-left: legend + basemap switcher */}
        <div className="absolute bottom-4 left-4 z-10">
          <Legend />
        </div>
      </div>

      {/* First-run tutorial — fixed overlay, re-openable via the map "?" control.
          Keyed on open state so each open remounts with fresh slide/checkbox state. */}
      <OnboardingTutorial key={tutorialOpen ? 'open' : 'closed'} />
    </div>
  );
}
