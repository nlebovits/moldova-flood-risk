import { useMemo } from 'react';
import { useApp } from '../store/state';
import { useData } from '../lib/data';
import { t, fmtNumber } from '../lib/i18n';
import { cn } from '../lib/utils';

const TOP_N = 8;

/**
 * §7-as-real — Expected Annual Loss in hectares/year (no economic €,
 * out of scope). National total + a ranked list of the most-at-risk
 * raioane. Clicking a row selects that raion on the map (fly-to via the
 * MapView selection effect). REAL evidence: solid, DATE REALE.
 */
export function EalPanel() {
  const { locale, selectedAdminId, setSelectedAdmin } = useApp();
  const eal = useData((s) => s.eal);

  const ranked = useMemo(() => {
    if (!eal) return [];
    return Object.entries(eal.by_admin)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N);
  }, [eal]);

  if (!eal || ranked.length === 0) return null;

  const max = ranked[0][1];
  const unit = t(locale, 'eal.unit_ha_per_year');

  return (
    <div className="pointer-events-auto w-[320px] border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)]/97 backdrop-blur-[2px] shadow-[0_8px_24px_rgba(38,56,58,0.12)]">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <div className="re-eyebrow">{t(locale, 'eal.title')}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-[1.9rem] leading-none font-medium tracking-[-0.02em] text-[var(--color-accent)]">
            {fmtNumber(locale, eal.national_eal_ha_per_year, { maximumFractionDigits: 1 })}
          </span>
          <span className="re-meta font-mono">{unit}</span>
        </div>
        <div className="re-meta mt-1">{t(locale, 'eal.national')}</div>
      </div>

      <div className="px-4 py-2">
        <div className="re-eyebrow mb-1.5">{t(locale, 'eal.top_raioane')}</div>
        <ul>
          {ranked.map(([name, value]) => {
            const active = name === selectedAdminId;
            return (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => setSelectedAdmin(name)}
                  className={cn(
                    'group flex w-full items-center gap-2 py-1 text-left transition-colors',
                    active ? 'text-[var(--color-fg-1)]' : 'text-[var(--color-fg-2)] hover:text-[var(--color-fg-1)]',
                  )}
                >
                  <span className="w-[96px] shrink-0 truncate text-[13px]">{name}</span>
                  <span className="relative h-2 flex-1 bg-[var(--color-bg-sunken)]">
                    <span
                      className="absolute inset-y-0 left-0 bg-[var(--color-accent)] transition-[width]"
                      style={{ width: `${Math.max(4, (value / max) * 100)}%` }}
                    />
                  </span>
                  <span className="w-[52px] shrink-0 text-right font-mono text-[12px] tabular-nums">
                    {fmtNumber(locale, value, { maximumFractionDigits: 1 })}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] px-4 py-2.5">
        <span className="stamp-real">{t(locale, 'stamps.real')}</span>
        <span className="re-meta">{unit}</span>
      </div>
    </div>
  );
}
