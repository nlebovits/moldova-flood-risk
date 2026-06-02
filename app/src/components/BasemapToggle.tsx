import { useApp, type Basemap } from '../store/state';
import { t } from '../lib/i18n';
import { cn } from '../lib/utils';
import { useEffect } from 'react';

/** Spec: dark / satellite basemap flips chrome to dark theme tokens. */
function basemapIsDark(b: Basemap): boolean {
  return b === 'positron-dark' || b === 'satellite';
}

const OPTIONS: { value: Basemap; key: string }[] = [
  { value: 'positron',      key: 'basemap.positron' },
  { value: 'positron-dark', key: 'basemap.positron_dark' },
  { value: 'satellite',     key: 'basemap.satellite' },
];

export function BasemapToggle() {
  const { locale, basemap, setBasemap } = useApp();

  // Spec: dark basemap flips chrome to dark theme tokens.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', basemapIsDark(basemap));
  }, [basemap]);

  return (
    <div className="pointer-events-auto flex flex-col gap-1">
      <span className="re-eyebrow font-mono">{t(locale, 'basemap.label')}</span>
      <div className="flex flex-col border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)]/95 backdrop-blur-[2px]">
        {OPTIONS.map((o, i) => {
          const active = basemap === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setBasemap(o.value)}
              className={cn(
                'font-mono text-[11px] px-3 py-1.5 text-left transition-colors',
                i > 0 && 'border-t border-[var(--color-border)]',
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
  );
}
