import { useApp } from '../store/state';
import { useData } from '../lib/data';
import { t, fmtHa, fmtPct, fmtNumber } from '../lib/i18n';
import { adminExposedHa, adminFieldsTouched, adminPctExposed } from '../lib/types';

/**
 * §5 — raion exposure summary. Shown on admin click. Reacts to the RP
 * selector: total ag area is fixed, exposure figures track the chosen RP.
 * REAL evidence: solid, DATE REALE. Key exposure figures in Lagoon accent.
 */
export function AdminPanel() {
  const { locale, selectedAdminId, selectedRP, clearSelection } = useApp();
  const adminByName = useData((s) => s.adminByName);
  if (!selectedAdminId) return null;

  const a = adminByName[selectedAdminId];
  if (!a) return null;

  const exposed = adminExposedHa(a, selectedRP);
  const touched = adminFieldsTouched(a, selectedRP);
  const pct = adminPctExposed(a, selectedRP);

  return (
    <div className="border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)]">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <div>
          <div className="re-eyebrow">{t(locale, 'admin_panel.title')}</div>
          <div className="re-h5 mt-0.5">{a.name}</div>
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

      <dl className="px-4 py-3">
        <Row label={t(locale, 'admin_panel.total_ag')}>
          <span className="font-mono tabular-nums text-[var(--color-fg-1)]">
            {fmtHa(locale, a.total_ag_ha)}
          </span>
        </Row>
        <Row label={t(locale, 'admin_panel.exposed_template', { n: selectedRP })}>
          <span className="font-mono tabular-nums text-[var(--color-accent)]">
            {fmtHa(locale, exposed)}
          </span>
        </Row>
        <Row label={t(locale, 'admin_panel.cropland_share')}>
          <span className="font-mono tabular-nums text-[var(--color-accent)]">
            {fmtPct(locale, pct, 2)}
          </span>
        </Row>
        <Row label={t(locale, 'admin_panel.fields_touched')}>
          <span className="font-mono tabular-nums text-[var(--color-fg-1)]">
            {fmtNumber(locale, touched)}
          </span>
        </Row>
      </dl>

      <div className="border-t border-[var(--color-border)] px-4 py-2.5 text-right">
        <span className="re-meta font-mono">RP{selectedRP}</span>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-[var(--color-border)] py-2 first:border-t-0">
      <dt className="text-[13px] text-[var(--color-fg-2)]">{label}</dt>
      <dd className="text-[13px]">{children}</dd>
    </div>
  );
}
