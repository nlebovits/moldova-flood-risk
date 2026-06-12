import { useApp } from '../store/state';
import { t } from '../lib/i18n';
import { HYDRO_HEX } from '../data/floodRamp';

/**
 * §9 — "what this becomes". Side-by-side: the floor is today's real
 * capability (JRC 90 m, fluvial); the ceiling is a proposed Fathom-grade
 * national map (~30 m, pluvial + fluvial). Only the ceiling wears PROPUS.
 */
export function BecomesPanel() {
  const { locale } = useApp();

  return (
    <div className="border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)]/95 backdrop-blur-[2px]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-2.5">
        <span className="re-eyebrow">{t(locale, 'becomes.title')}</span>
        <span className="stamp-proposed">{t(locale, 'stamps.proposed')}</span>
      </div>

      <div className="grid grid-cols-2">
        {/* Floor — today, real */}
        <div className="border-r border-[var(--color-border)] px-4 py-3">
          <div className="mb-2 flex h-2 w-full">
            {HYDRO_HEX.map((c) => (
              <div key={c} className="flex-1" style={{ background: c }} />
            ))}
          </div>
          <div className="re-body-sm font-medium text-[var(--color-fg-1)]">
            {t(locale, 'becomes.floor_title')}
          </div>
          <div className="mt-1.5">
            <span className="stamp-real">{t(locale, 'stamps.real')}</span>
          </div>
        </div>

        {/* Ceiling — proposed */}
        <div className="proposed-hatch px-4 py-3">
          <div className="proposed-border mb-2 h-2 w-full" />
          <div className="re-body-sm font-medium text-[var(--color-fg-1)]">
            {t(locale, 'becomes.ceiling_title')}
          </div>
          <div className="re-meta mt-1">{t(locale, 'becomes.ceiling_desc')}</div>
        </div>
      </div>
    </div>
  );
}
