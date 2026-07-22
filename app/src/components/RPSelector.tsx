import { useApp, RPS } from '../store/state';
import { t } from '../lib/i18n';
import { cn } from '../lib/utils';
import { InfoTip } from './InfoTip';

export function RPSelector() {
  const { selectedRP, setRP, locale } = useApp();
  return (
    <div className="flex flex-col gap-1">
      <span className="re-eyebrow flex items-center gap-1.5 text-[var(--color-fg-3)]">
        {t(locale, 'rp.label')}
        <InfoTip
          label={t(locale, 'rp.label')}
          text={t(locale, 'rp.info')}
          href="https://en.wikipedia.org/wiki/Return_period"
          linkLabel={t(locale, 'rp.info_link')}
        />
      </span>
      <div className="flex w-full border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)]">
        {RPS.map((rp) => {
          const active = rp === selectedRP;
          return (
            <button
              key={rp}
              type="button"
              onClick={() => setRP(rp)}
              className={cn(
                'flex-1 font-mono text-[13px] tracking-wide transition-colors duration-200',
                'border-l border-[var(--color-border)] first:border-l-0',
                'px-2 py-2',
                active
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-transparent text-[var(--color-fg-2)] hover:bg-[var(--color-bg-sunken)] hover:text-[var(--color-fg-1)]',
              )}
              aria-pressed={active}
              title={t(locale, 'rp.years_template', { n: rp })}
            >
              RP{rp}
            </button>
          );
        })}
      </div>
    </div>
  );
}
