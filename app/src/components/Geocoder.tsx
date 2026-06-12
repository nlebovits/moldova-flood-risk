import { useState } from 'react';
import { useApp } from '../store/state';
import { t } from '../lib/i18n';
import { getMap } from '../map/mapRegistry';

/**
 * Lightweight place search (top-left of the map). Hand-rolled rather than using
 * a plugin so it inherits the design system (sharp corners, hairline borders).
 *
 * Queries Nominatim on Enter only — its usage policy caps autocomplete at
 * ~1 req/s, so no per-keystroke lookups. Results scope to Moldova
 * (countrycodes=md); clicking one fits the map to its bounding box.
 */
interface NominatimResult {
  display_name: string;
  /** [south, north, west, east] as strings. */
  boundingbox: [string, string, string, string];
  lat: string;
  lon: string;
}

export function Geocoder() {
  const { locale } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search() {
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    setSearched(true);
    try {
      const url =
        'https://nominatim.openstreetmap.org/search' +
        `?format=json&countrycodes=md&limit=5&accept-language=${locale}` +
        `&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      setResults((await res.json()) as NominatimResult[]);
    } catch {
      setResults([]);
    } finally {
      setBusy(false);
    }
  }

  function go(r: NominatimResult) {
    const [south, north, west, east] = r.boundingbox.map(Number);
    getMap()?.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 60, duration: 700, maxZoom: 12 },
    );
    setResults([]);
    setQuery(r.display_name.split(',')[0]);
  }

  return (
    <div className="pointer-events-auto w-[260px]">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void search();
        }}
        placeholder={t(locale, 'geocoder.placeholder')}
        aria-label={t(locale, 'geocoder.placeholder')}
        className="w-full border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)]/95 px-3 py-2 font-mono text-[13px] text-[var(--color-fg-1)] shadow-[var(--shadow-2)] backdrop-blur-[2px] placeholder:text-[var(--color-fg-muted)] focus:outline-none"
      />

      {(busy || searched) && (
        <ul className="mt-px border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)] shadow-[var(--shadow-2)]">
          {busy && (
            <li className="px-3 py-2 font-mono text-[12px] text-[var(--color-fg-3)]">
              {t(locale, 'geocoder.searching')}
            </li>
          )}
          {!busy && results.length === 0 && (
            <li className="px-3 py-2 font-mono text-[12px] text-[var(--color-fg-3)]">
              {t(locale, 'geocoder.no_results')}
            </li>
          )}
          {!busy &&
            results.map((r) => (
              <li key={`${r.lat},${r.lon}`}>
                <button
                  type="button"
                  onClick={() => go(r)}
                  className="block w-full truncate border-t border-[var(--color-border)] px-3 py-2 text-left text-[13px] text-[var(--color-fg-2)] first:border-t-0 hover:bg-[var(--color-bg-sunken)] hover:text-[var(--color-fg-1)]"
                  title={r.display_name}
                >
                  {r.display_name}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
