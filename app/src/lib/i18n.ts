/**
 * i18n loader + helpers.
 * Strings live in repo-root `i18n/{ro,en}.json` (imported at build time).
 * RO is the default locale; numbers formatted via Intl.NumberFormat.
 */

import ro from '../../../i18n/ro.json';
import en from '../../../i18n/en.json';
import type { Locale } from '../store/state';

export const DICTS = { ro, en } as const;
type Dict = typeof ro;

/** Look up a dotted key path like "headline.stat_template". */
export function t(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const parts = key.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = DICTS[locale];
  for (const p of parts) {
    if (cur == null) return key;
    cur = cur[p];
  }
  if (typeof cur !== 'string') return key;
  if (!vars) return cur;
  return cur.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`,
  );
}

/** RO uses comma decimal + space thousands; EN uses dot decimal + comma thousands. */
export function fmtNumber(locale: Locale, n: number, opts?: Intl.NumberFormatOptions): string {
  const tag = locale === 'ro' ? 'ro-RO' : 'en-US';
  return new Intl.NumberFormat(tag, opts).format(n);
}

export function fmtPct(locale: Locale, n: number, fractionDigits = 1): string {
  return fmtNumber(locale, n, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }) + '%';
}

export function fmtHa(locale: Locale, n: number): string {
  return fmtNumber(locale, Math.round(n)) + ' ha';
}

export function fmtDepth(locale: Locale, n: number): string {
  return fmtNumber(locale, n, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' m';
}

export type { Dict };
