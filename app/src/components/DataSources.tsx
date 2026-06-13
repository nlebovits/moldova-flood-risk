import { useApp } from '../store/state';
import { t } from '../lib/i18n';

/**
 * Single provenance block at the foot of the sidebar. One honest list of the
 * data sources + licenses behind the map.
 */
const LINKS = [
  { key: 'sources.jrc', href: 'https://data.jrc.ec.europa.eu/collection/id-0054' },
  { key: 'sources.ftw', href: 'https://source.coop/ftw/global-data' },
  { key: 'sources.overture', href: 'https://overturemaps.org' },
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
              className="source-mono underline decoration-[var(--color-border-strong)] underline-offset-2 hover:decoration-[var(--color-lagoon)]"
            >
              {t(locale, key)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
