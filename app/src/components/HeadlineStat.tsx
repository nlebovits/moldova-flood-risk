import { useEffect, useState } from 'react';
import { useApp } from '../store/state';
import { useData } from '../lib/data';
import { t, fmtPct } from '../lib/i18n';

/**
 * Headline stat. The number is the only thing in Lagoon; the sentence is in
 * Ponderosa. Reactive to the RP selector: reads the real ag-exposed share for
 * the selected return period from summary.json's `by_rp` table and interpolates
 * the RP into the sentence ("1-in-{rp}"). Fades up 8px / 320ms per motion spec.
 */
export function HeadlineStat() {
  const { locale, selectedRP } = useApp();
  const summary = useData((s) => s.summary);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Hold the headline until the real figures are in — no placeholder number.
  if (!summary) return null;

  const stat = summary.by_rp[String(selectedRP)];
  if (!stat) return null;

  const pctLabel = fmtPct(locale, stat.pct_ag_exposed, 1);

  const tmpl = t(locale, 'headline.stat_template', { pct: '__PCT__', rp: selectedRP });
  // Split at __PCT__ so we can style the number specifically.
  const [pre, post] = tmpl.split('__PCT__');

  return (
    <p
      className={
        're-h3 transition-all duration-[320ms] ' +
        (mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')
      }
    >
      <span className="text-[var(--color-fg-1)]">{pre.trim()}</span>{' '}
      <span className="font-display text-[var(--color-accent)] text-[2.5rem] leading-[1] font-medium tracking-[-0.02em]">
        {pctLabel}
      </span>{' '}
      <span className="text-[var(--color-fg-1)]">{post.trim()}</span>
    </p>
  );
}
