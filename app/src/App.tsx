import { useEffect, useState } from 'react';
import { MapView } from './map/MapView';
import { RPSelector } from './components/RPSelector';
import { HeadlineStat } from './components/HeadlineStat';
import { ProvenanceChip } from './components/ProvenanceChip';
import { Legend } from './components/Legend';
import { BasemapToggle } from './components/BasemapToggle';
import { LanguageToggle } from './components/LanguageToggle';
import { FieldPanel } from './components/FieldPanel';
import { AdminPanel } from './components/AdminPanel';
import { EalPanel } from './components/EalPanel';
import { PortfolioPanel } from './components/PortfolioPanel';
import { BecomesPanel } from './components/BecomesPanel';
import { LayerControls } from './components/LayerControls';
import { useApp } from './store/state';
import { t } from './lib/i18n';

/**
 * Full-bleed map. Chrome floats over with hairline borders and sharp
 * corners — nothing boxes the map in. Light theme by default.
 *
 * Right rail (under the provenance chip): the REAL spine — the selected
 * field OR raion, then the EAL ranking — sits above a collapsible PROPOSED
 * section so the eye never confuses computed evidence with mockups.
 */
export default function App() {
  const { locale, selectedField, selectedAdminId } = useApp();
  const [proposedOpen, setProposedOpen] = useState(false);

  // Reflect locale on <html> so the lang attribute matches the visible text.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <div className="re-base relative h-screen w-screen overflow-hidden">
      <MapView />

      {/* Floating chrome — pointer-events: none on the wrapper so the map
          stays draggable; each chrome island re-enables pointer events. */}
      <div className="pointer-events-none absolute inset-0">
        {/* Top-center: RP selector */}
        <div className="absolute left-1/2 top-4 -translate-x-1/2">
          <RPSelector />
        </div>

        {/* Top-left: headline stat */}
        <div className="absolute left-4 top-4 max-w-[560px]">
          <HeadlineStat />
        </div>

        {/* Top-right rail: provenance → REAL context → EAL → PROPOSED. */}
        <div className="pointer-events-auto absolute right-4 top-4 flex max-h-[calc(100vh-2rem)] w-[320px] flex-col items-end gap-3 overflow-y-auto">
          <ProvenanceChip />

          {/* REAL spine — field or raion, mutually exclusive. */}
          {selectedField && <FieldPanel />}
          {selectedAdminId && <AdminPanel />}

          <EalPanel />

          {/* PROPOSED — visually separated, collapsed by default. */}
          <div className="w-full border-t border-dashed border-[var(--color-proposed)] pt-3">
            <button
              type="button"
              onClick={() => setProposedOpen((s) => !s)}
              aria-expanded={proposedOpen}
              className="stamp-proposed w-full justify-between"
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
        </div>

        {/* Bottom-left: legend */}
        <div className="absolute bottom-4 left-4">
          <Legend />
        </div>

        {/* Bottom-right (above MapLibre nav): basemap + language toggles */}
        <div className="absolute bottom-4 right-16 flex flex-col items-end gap-3">
          <BasemapToggle />
          <LanguageToggle />
        </div>
      </div>
    </div>
  );
}
