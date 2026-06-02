import { useApp, type Locale } from '../store/state';
import { cn } from '../lib/utils';

const OPTIONS: { value: Locale; label: string }[] = [
  { value: 'ro', label: 'RO' },
  { value: 'en', label: 'EN' },
];

export function LanguageToggle() {
  const { locale, setLocale } = useApp();
  return (
    <div className="pointer-events-auto flex border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)]/95 backdrop-blur-[2px]">
      {OPTIONS.map((o, i) => {
        const active = locale === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => setLocale(o.value)}
            className={cn(
              'font-mono text-[11px] px-3 py-1.5 transition-colors',
              i > 0 && 'border-l border-[var(--color-border)]',
              active
                ? 'bg-[var(--color-accent)] text-white'
                : 'hover:bg-[var(--color-bg-sunken)] text-[var(--color-fg-2)]',
            )}
            aria-pressed={active}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
