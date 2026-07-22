import { useApp } from '../store/state';
import { t } from '../lib/i18n';
import { FTW_COUNTRY_PARQUET, JRC_TILES } from '../config';
import { getJrcFloodUrls } from '../map/flood';
import { ADMIN_GEOJSON_URL } from '../map/sources';

/**
 * Provenance block at the foot of the sidebar: the data behind the map, each
 * row with a direct download of the Moldova-scoped file it draws from — not a
 * catalog root. The JRC row streams the flood-depth tiles for the return period
 * on screen, so its links track the selected RP.
 */
type Download = { label: string; href: string };

interface Source {
  key: string;
  href: string;
  downloads: Download[];
}

export function DataSources() {
  const { locale, selectedRP } = useApp();

  // The JRC flood layer covers Moldova with a small set of 10° tiles; link each
  // one for the return period currently shown on the map.
  const jrcUrls = getJrcFloodUrls(selectedRP);
  const jrcDownloads: Download[] = JRC_TILES.map(([, tile], i) => ({
    label: tile,
    href: jrcUrls[i],
  }));

  const sources: Source[] = [
    {
      key: 'sources.jrc',
      href: 'https://data.jrc.ec.europa.eu/collection/id-0054',
      downloads: jrcDownloads,
    },
    {
      key: 'sources.ftw',
      href: 'https://source.coop/ftw/global-data',
      downloads: [{ label: t(locale, 'sources.download'), href: FTW_COUNTRY_PARQUET }],
    },
    {
      key: 'sources.overture',
      href: 'https://overturemaps.org',
      downloads: [{ label: t(locale, 'sources.download'), href: ADMIN_GEOJSON_URL }],
    },
  ];

  return (
    <div className="border-t border-[var(--color-border)] pt-3">
      <div className="re-eyebrow mb-2 text-[var(--color-fg-3)]">
        {t(locale, 'sources.title')}
      </div>
      <ul className="flex flex-col gap-2">
        {sources.map(({ key, href, downloads }) => (
          <li key={key} className="flex items-start justify-between gap-3">
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="source-mono underline decoration-[var(--color-border-strong)] underline-offset-2 hover:decoration-[var(--color-lagoon)]"
            >
              {t(locale, key)}
            </a>
            <span className="mt-0.5 flex shrink-0 items-center gap-1.5">
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
                className="text-[var(--color-fg-3)]"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="M7 10l5 5 5-5" />
                <path d="M12 15V3" />
              </svg>
              {downloads.map((d, i) => (
                <span key={d.href} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <span aria-hidden className="text-[var(--color-border-strong)]">
                      ·
                    </span>
                  )}
                  <a
                    href={d.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${t(locale, 'sources.download')} — ${t(locale, key)} ${d.label}`}
                    className="source-mono text-[10px] uppercase tracking-[var(--tracking-eyebrow)] text-[var(--color-fg-3)] transition-colors hover:text-[var(--color-lagoon)]"
                  >
                    {d.label}
                  </a>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
