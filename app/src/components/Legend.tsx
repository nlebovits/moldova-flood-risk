import { useApp } from '../store/state';
import { t } from '../lib/i18n';
import { HYDRO_HEX, HYDRO_BREAKS_M } from '../data/floodRamp';

export function Legend() {
  const { locale, selectedRP } = useApp();

  return (
    <div className="pointer-events-auto max-w-[280px] border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)]/95 backdrop-blur-[2px] px-4 py-3 shadow-[0_2px_6px_rgba(38,56,58,0.08)]">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="re-eyebrow">{t(locale, 'legend.title')}</span>
        <span className="font-mono text-[11px] text-[var(--color-fg-3)]">
          RP{selectedRP}
        </span>
      </div>

      <div className="flex h-3 w-full">
        {HYDRO_HEX.map((c) => (
          <div key={c} className="flex-1" style={{ background: c }} />
        ))}
      </div>

      <div className="mt-1 flex w-full justify-between font-mono text-[10px] text-[var(--color-fg-3)]">
        <span>{t(locale, 'legend.low')}</span>
        <span>{t(locale, 'legend.high')}</span>
      </div>

      <div className="mt-2 grid grid-cols-6 font-mono text-[9px] text-[var(--color-fg-muted)]">
        {[...HYDRO_BREAKS_M, '4+'].map((b, i) => (
          <span key={i} className="text-left">
            {typeof b === 'number' ? `<${b}` : b} m
          </span>
        ))}
      </div>
    </div>
  );
}
