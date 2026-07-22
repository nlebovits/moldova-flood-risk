import { useApp } from '../store/state';
import { t } from '../lib/i18n';
import { DATA_CDN_BASE, JRC_CATALOG_BASE } from '../config';
import { OVERTURE_DIVISIONS_PMTILES } from '../map/sources';

/**
 * Single provenance block at the foot of the sidebar. One honest list of the
 * data sources + licenses behind the map. Each row links its provider and
 * offers a direct download of the exact artifact the map streams — the JRC
 * depth catalog, the computed field-exposure tiles, and the Overture divisions.
 */
const LINKS: { key: string; href: string; download: string }[] = [
  {
    key: 'sources.jrc',
    href: 'https://data.jrc.ec.europa.eu/collection/id-0054',
    // The Source Cooperative catalog the flood layer streams from.
    download: JRC_CATALOG_BASE,
  },
  {
    key: 'sources.ftw',
    href: 'https://source.coop/ftw/global-data',
    // Our computed field-exposure tiles (flood attributes baked in).
    download: `${DATA_CDN_BASE}/fields.pmtiles`,
  },
  {
    key: 'sources.overture',
    href: 'https://overturemaps.org',
    // Strip the pmtiles:// protocol prefix to a plain downloadable URL.
    download: OVERTURE_DIVISIONS_PMTILES.replace(/^pmtiles:\/\//, ''),
  },
];

export function DataSources() {
  const { locale } = useApp();

  return (
    <div className="border-t border-[var(--color-border)] pt-3">
      <div className="re-eyebrow mb-2 text-[var(--color-fg-3)]">
        {t(locale, 'sources.title')}
      </div>
      <ul className="flex flex-col gap-1.5">
        {LINKS.map(({ key, href, download }) => (
          <li key={key} className="flex items-start justify-between gap-3">
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="source-mono underline decoration-[var(--color-border-strong)] underline-offset-2 hover:decoration-[var(--color-lagoon)]"
            >
              {t(locale, key)}
            </a>
            <a
              href={download}
              target="_blank"
              rel="noreferrer"
              aria-label={`${t(locale, 'sources.download')} — ${t(locale, key)}`}
              title={t(locale, 'sources.download')}
              className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[var(--color-fg-3)] transition-colors hover:text-[var(--color-lagoon)]"
            >
              {/* Lucide `download` glyph, inline so it inherits currentColor. */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="square"
                strokeLinejoin="miter"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="M7 10l5 5 5-5" />
                <path d="M12 15V3" />
              </svg>
              <span className="source-mono text-[10px] uppercase tracking-[var(--tracking-eyebrow)]">
                {t(locale, 'sources.download')}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
