import { useApp, type Basemap } from '../store/state';
import { t } from '../lib/i18n';
import { cn } from '../lib/utils';
import { HYDRO_HEX, HYDRO_BREAKS_M } from '../data/floodRamp';

const BASEMAPS: { value: Basemap; key: string }[] = [
  { value: 'positron', key: 'basemap.positron' },
  { value: 'positron-dark', key: 'basemap.positron_dark' },
  { value: 'satellite', key: 'basemap.satellite' },
];

/**
 * Bottom-left map legend: the Hydro flood-depth ramp + breaks + the active RP,
 * with the basemap switcher folded in beneath (light / dark / satellite). The
 * dark-chrome class toggle lives in App, driven by the selected basemap.
 */
export function Legend() {
  const { locale, selectedRP, basemap, setBasemap } = useApp();

  return (
    <div className="pointer-events-auto max-w-[280px] border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)]/95 backdrop-blur-[2px] px-4 py-3 shadow-[var(--shadow-2)]">
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

      {/* Basemap switcher — folded into the legend. */}
      <div className="mt-3 border-t border-[var(--color-border)] pt-2">
        <span className="re-eyebrow text-[var(--color-fg-3)]">
          {t(locale, 'basemap.label')}
        </span>
        <div className="mt-1 flex border border-[var(--color-border-strong)]">
          {BASEMAPS.map((o, i) => {
            const active = basemap === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setBasemap(o.value)}
                className={cn(
                  'flex-1 font-mono text-[11px] px-2 py-1.5 transition-colors',
                  i > 0 && 'border-l border-[var(--color-border)]',
                  active
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'hover:bg-[var(--color-bg-sunken)] text-[var(--color-fg-2)]',
                )}
                aria-pressed={active}
              >
                {t(locale, o.key)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
