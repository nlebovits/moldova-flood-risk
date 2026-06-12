import { useApp } from '../store/state';
import { t } from '../lib/i18n';

/**
 * Single provenance block at the foot of the sidebar. Replaces the scattered
 * per-panel "DATE REALE" stamps with one honest list of sources + licenses,
 * plus the persistent "JRC 90 m · fluvial only" caveat.
 */
const LINKS = [
  { key: 'sources.jrc', href: 'https://data.jrc.ec.europa.eu/collection/id-0054' },
  { key: 'sources.ftw', href: 'https://source.coop/ftw/global-data' },
  { key: 'sources.gadm', href: 'https://gadm.org' },
];

export function DataSources() {
  const { locale } = useApp();

  return (
    <div className="border-t border-[var(--color-border)] pt-3">
      <div className="re-eyebrow mb-2 text-[var(--color-fg-3)]">
        {t(locale, 'sources.title')}
      </div>
      <ul className="flex flex-col gap-1.5">
        {LINKS.map(({ key, href }) => (
          <li key={key}>
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="re-body-sm text-[var(--color-link)] underline decoration-[var(--color-border-strong)] underline-offset-2 hover:decoration-[var(--color-link)]"
            >
              {t(locale, key)}
            </a>
          </li>
        ))}
      </ul>
      <div className="stamp-real mt-3">{t(locale, 'sources.caveat')}</div>
    </div>
  );
}
