import { useApp } from '../store/state';
import { t } from '../lib/i18n';

/**
 * §10–11 — proposed layer toggles. All disabled ghosts: the pluvial layer is
 * absent from the current data; building footprints and critical
 * infrastructure extend with project data. Non-interactive, PROPUS treatment.
 */
interface Stub {
  labelKey: string;
  noteKey: string;
}

const STUBS: Stub[] = [
  { labelKey: 'layers.pluvial', noteKey: 'layers.pluvial_unavailable' },
  { labelKey: 'layers.footprints', noteKey: 'layers.extends_note' },
  { labelKey: 'layers.infrastructure', noteKey: 'layers.extends_note' },
];

export function LayerControls() {
  const { locale } = useApp();

  return (
    <div className="border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)]/95 backdrop-blur-[2px]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-2.5">
        <span className="re-eyebrow">{t(locale, 'layers.title')}</span>
        <span className="stamp-proposed">{t(locale, 'stamps.proposed')}</span>
      </div>

      <ul className="px-4 py-2">
        {STUBS.map((s, i) => (
          <li
            key={i}
            className="flex items-center gap-3 border-t border-[var(--color-border)] py-2 first:border-t-0"
          >
            {/* Ghost toggle — visibly disabled, never wired. */}
            <span
              aria-hidden
              className="proposed-border relative h-3.5 w-7 shrink-0 opacity-60"
            >
              <span className="absolute left-0.5 top-0.5 h-2.5 w-2.5 bg-[var(--color-proposed)] opacity-60" />
            </span>
            <span className="min-w-0">
              <span className="block re-body-sm text-[var(--color-fg-2)]">
                {t(locale, s.labelKey)}
              </span>
              <span className="block re-meta italic text-[var(--color-fg-muted)]">
                {t(locale, s.noteKey)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
