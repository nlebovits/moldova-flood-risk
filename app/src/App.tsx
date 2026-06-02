import { MapView } from './map/MapView';
import { RPSelector } from './components/RPSelector';
import { HeadlineStat } from './components/HeadlineStat';
import { ProvenanceChip } from './components/ProvenanceChip';
import { Legend } from './components/Legend';
import { BasemapToggle } from './components/BasemapToggle';
import { LanguageToggle } from './components/LanguageToggle';
import { useApp } from './store/state';
import { useEffect } from 'react';

/**
 * Full-bleed map. Chrome floats over with hairline borders and sharp
 * corners — nothing boxes the map in. Light theme by default.
 */
export default function App() {
  const { locale } = useApp();

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

        {/* Top-right: provenance chip */}
        <div className="absolute right-4 top-4">
          <ProvenanceChip />
        </div>

        {/* Top-left: headline stat (load-time only; can be dismissed later) */}
        <div className="absolute left-4 top-4 max-w-[560px]">
          <HeadlineStat />
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
