import { useEffect, useState } from 'react';
import { useApp } from '../store/state';
import { t, fmtPct } from '../lib/i18n';

// Spec placeholder until precompute (task 2) ships summary.json with the
// real per-RP100 ag share computed from FTW × JRC zonal stats.
const HEADLINE_PCT_PLACEHOLDER = 38;

/**
 * On-load headline stat. The number is the only thing in Lagoon; the
 * sentence is in Ponderosa. Fades up 8px / 320ms per spec motion rules.
 */
export function HeadlineStat() {
  const { locale } = useApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const pctLabel = fmtPct(locale, HEADLINE_PCT_PLACEHOLDER, 0);

  const tmpl = t(locale, 'headline.stat_template', { pct: '__PCT__' });
  // Split at __PCT__ so we can style the number specifically.
  const [pre, post] = tmpl.split('__PCT__');

  return (
    <div
      className={
        'pointer-events-auto max-w-[520px] border border-[var(--color-border)] bg-[var(--color-bg-raised)]/95 px-6 py-5 shadow-[0_8px_24px_rgba(38,56,58,0.10)] backdrop-blur-[2px] transition-all duration-[320ms] ' +
        (mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')
      }
    >
      <p className="re-h3">
        <span className="text-[var(--color-fg-1)]">{pre.trim()}</span>{' '}
        <span className="font-display text-[var(--color-accent)] text-[2.5rem] leading-[1] font-medium tracking-[-0.02em]">
          {pctLabel}
        </span>{' '}
        <span className="text-[var(--color-fg-1)]">{post.trim()}</span>
      </p>
      <div className="mt-3">
        <span className="stamp-real">{t(locale, 'stamps.real')}</span>
        <span className="re-meta ml-3">· JRC 90 m · fluvial · {new Date().getFullYear()}</span>
      </div>
    </div>
  );
}
