import { useMemo, useState } from 'react';
import { useApp } from '../store/state';
import { useData } from '../lib/data';
import { t, fmtNumber } from '../lib/i18n';
import { cn } from '../lib/utils';

const TOP_N = 8;

type SortKey = 'ha' | 'pct';

/**
 * §7-as-real — Expected Annual Loss per raion. Two metrics, both shown as
 * columns: absolute loss (ha/year) and its share of the raion's cropland
 * (%). Click a column header to re-rank by that metric — the bar tracks the
 * active one. Clicking a row selects that raion on the map (fly-to via the
 * MapView selection effect). REAL evidence: solid, DATE REALE.
 */
export function EalPanel() {
  const { locale, selectedAdminId, setSelectedAdmin } = useApp();
  const eal = useData((s) => s.eal);
  const adminByName = useData((s) => s.adminByName);
  const [sortBy, setSortBy] = useState<SortKey>('ha');

  const rows = useMemo(() => {
    if (!eal) return [];
    return Object.entries(eal.by_admin)
      .filter(([, v]) => v > 0)
      .map(([name, ha]) => {
        const totalAg = adminByName[name]?.total_ag_ha ?? 0;
        const pct = totalAg > 0 ? (ha / totalAg) * 100 : 0;
        return { name, ha, pct };
      })
      .sort((a, b) => (sortBy === 'ha' ? b.ha - a.ha : b.pct - a.pct))
      .slice(0, TOP_N);
  }, [eal, adminByName, sortBy]);

  if (!eal || rows.length === 0) return null;

  const metric = (r: { ha: number; pct: number }) => (sortBy === 'ha' ? r.ha : r.pct);
  const max = Math.max(...rows.map(metric), 1);

  return (
    <div className="border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)]">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <div className="re-eyebrow">{t(locale, 'eal.title')}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-[1.9rem] leading-none font-medium tracking-[-0.02em] text-[var(--color-accent)]">
            {fmtNumber(locale, eal.national_eal_ha_per_year, { maximumFractionDigits: 1 })}
          </span>
          <span className="re-meta font-mono">{t(locale, 'eal.unit_ha_per_year')}</span>
        </div>
        <div className="re-meta mt-1">{t(locale, 'eal.national')}</div>
      </div>

      <div className="px-4 py-2">
        <div className="re-eyebrow mb-1.5">{t(locale, 'eal.top_raioane')}</div>

        {/* Sortable column headers — click to re-rank by that metric. */}
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-1">
          <span className="w-[84px] shrink-0" />
          <span className="flex-1" />
          <SortHead
            label={t(locale, 'eal.col_ha')}
            active={sortBy === 'ha'}
            onClick={() => setSortBy('ha')}
            className="w-[52px]"
          />
          <SortHead
            label={t(locale, 'eal.col_pct')}
            active={sortBy === 'pct'}
            onClick={() => setSortBy('pct')}
            className="w-[46px]"
          />
        </div>

        <ul>
          {rows.map((r) => {
            const active = r.name === selectedAdminId;
            return (
              <li key={r.name}>
                <button
                  type="button"
                  onClick={() => setSelectedAdmin(r.name)}
                  className={cn(
                    'group flex w-full items-center gap-2 py-1 text-left transition-colors',
                    active
                      ? 'text-[var(--color-fg-1)]'
                      : 'text-[var(--color-fg-2)] hover:text-[var(--color-fg-1)]',
                  )}
                >
                  <span className="w-[84px] shrink-0 truncate text-[13px]" title={r.name}>
                    {r.name}
                  </span>
                  <span className="relative h-2 flex-1 bg-[var(--color-bg-sunken)]">
                    <span
                      className="absolute inset-y-0 left-0 bg-[var(--color-accent)] transition-[width]"
                      style={{ width: `${Math.max(4, (metric(r) / max) * 100)}%` }}
                    />
                  </span>
                  <span
                    className={cn(
                      'w-[52px] shrink-0 text-right font-mono text-[12px] tabular-nums',
                      sortBy === 'ha' ? '' : 'text-[var(--color-fg-3)]',
                    )}
                  >
                    {fmtNumber(locale, r.ha, { maximumFractionDigits: 0 })}
                  </span>
                  <span
                    className={cn(
                      'w-[46px] shrink-0 text-right font-mono text-[12px] tabular-nums',
                      sortBy === 'pct' ? '' : 'text-[var(--color-fg-3)]',
                    )}
                  >
                    {fmtNumber(locale, r.pct, { maximumFractionDigits: 1 })}%
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="border-t border-[var(--color-border)] px-4 py-2.5 text-right">
        <span className="re-meta">{t(locale, 'eal.pct_caption')}</span>
      </div>
    </div>
  );
}

/** A clickable column header that re-ranks the list by its metric. */
function SortHead({
  label,
  active,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 text-right font-mono text-[10px] uppercase tracking-[var(--tracking-eyebrow)] transition-colors',
        active
          ? 'text-[var(--color-fg-1)]'
          : 'text-[var(--color-fg-3)] hover:text-[var(--color-fg-2)]',
        className,
      )}
    >
      {active ? '▾ ' : ''}
      {label}
    </button>
  );
}
