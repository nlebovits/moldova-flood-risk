import { useApp, RPS } from '../store/state';
import { t, fmtPct, fmtDepth, fmtHa } from '../lib/i18n';
import { fieldPct, fieldDepth } from '../lib/types';
import { cn } from '../lib/utils';

/**
 * §4 — per-field exposure profile. Shown on field click. Reads the baked
 * tile attributes directly (no lookup); a 6-row table of pct inundated ×
 * mean depth per return period. REAL evidence: solid, DATE REALE.
 */
export function FieldPanel() {
  const { locale, selectedField, selectedRP, clearSelection } = useApp();
  if (!selectedField) return null;

  return (
    <div className="border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)]">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <div>
          <div className="re-eyebrow">{t(locale, 'field_panel.title')}</div>
          <div className="re-meta mt-0.5 font-mono">
            #{selectedField.id} · {fmtHa(locale, selectedField.area_ha)}
          </div>
        </div>
        <button
          type="button"
          onClick={clearSelection}
          aria-label={t(locale, 'ui.close')}
          className="font-mono text-[13px] leading-none text-[var(--color-fg-3)] hover:text-[var(--color-fg-1)]"
        >
          ✕
        </button>
      </div>

      <table className="w-full border-collapse font-mono text-[12px]">
        <thead>
          <tr className="text-[var(--color-fg-3)]">
            <th className="px-4 py-1.5 text-left font-medium">{t(locale, 'field_panel.rp_column')}</th>
            <th className="px-2 py-1.5 text-right font-medium">{t(locale, 'field_panel.pct_inundated')}</th>
            <th className="px-4 py-1.5 text-right font-medium">{t(locale, 'field_panel.depth')}</th>
          </tr>
        </thead>
        <tbody>
          {RPS.map((rp) => {
            const pct = fieldPct(selectedField, rp);
            const depth = fieldDepth(selectedField, rp);
            const active = rp === selectedRP;
            return (
              <tr
                key={rp}
                className={cn(
                  'border-t border-[var(--color-border)]',
                  active && 'bg-[var(--color-bg-sunken)]',
                )}
              >
                <td className="px-4 py-1.5 text-left text-[var(--color-fg-2)]">RP{rp}</td>
                <td
                  className={cn(
                    'px-2 py-1.5 text-right tabular-nums',
                    pct > 0 ? 'text-[var(--color-fg-1)]' : 'text-[var(--color-fg-muted)]',
                  )}
                >
                  {fmtPct(locale, pct, 0)}
                </td>
                <td
                  className={cn(
                    'px-4 py-1.5 text-right tabular-nums',
                    depth > 0 ? 'text-[var(--color-fg-1)]' : 'text-[var(--color-fg-muted)]',
                  )}
                >
                  {depth > 0 ? fmtDepth(locale, depth) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="border-t border-[var(--color-border)] px-4 py-2.5 text-right">
        <span className="re-meta">{t(locale, 'field_panel.indicative_note')}</span>
      </div>
    </div>
  );
}
