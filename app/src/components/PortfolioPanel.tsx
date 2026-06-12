import { useMemo, useState } from 'react';
import { useApp } from '../store/state';
import { useData } from '../lib/data';
import { t, fmtNumber } from '../lib/i18n';
import { pointInGeometry } from '../lib/geo';
import { adminPctExposed, type AdminProps, type Parcel } from '../lib/types';

/**
 * §8 — portfolio intake (PROPOSED). The upload affordance is genuinely live:
 * it parses the bundled sample CSV and point-in-polygon joins each parcel to
 * a raion. But the join to *exposure* is indicative, so the readout wears the
 * PROPUS treatment (hatch, dashed tangerine border, stamp).
 */
interface Joined {
  parcel: Parcel;
  raion: string | null;
}

function parseCsv(text: string): Parcel[] {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(',');
  const idx = (k: string) => header.indexOf(k);
  return lines.slice(1).map((line) => {
    const c = line.split(',');
    return {
      parcel_id: c[idx('parcel_id')],
      lat: Number(c[idx('lat')]),
      lon: Number(c[idx('lon')]),
      crop: c[idx('crop')],
      value_eur: Number(c[idx('value_eur')]),
    };
  });
}

interface AdminFeature {
  properties: AdminProps;
  geometry: { type: string; coordinates: unknown };
}

export function PortfolioPanel() {
  const { locale, selectedRP } = useApp();
  const setPortfolio = useApp((s) => s.setPortfolio);
  const adminByName = useData((s) => s.adminByName);

  const [joined, setJoined] = useState<Joined[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const [csvText, fc] = await Promise.all([
        fetch('/data/sample_portfolio.csv').then((r) => r.text()),
        fetch('/data/admin.geojson').then(
          (r) => r.json() as Promise<{ features: AdminFeature[] }>,
        ),
      ]);
      const rows = parseCsv(csvText);
      const assigned: Joined[] = rows.map((parcel) => {
        const hit = fc.features.find((f) =>
          pointInGeometry(parcel.lon, parcel.lat, f.geometry),
        );
        return { parcel, raion: hit?.properties.name ?? null };
      });
      setJoined(assigned);
      setPortfolio(rows);
    } finally {
      setBusy(false);
    }
  }

  const summary = useMemo(() => {
    if (joined.length === 0) return null;
    const exposed = joined.filter(
      (j) => j.raion && adminPctExposed(adminByName[j.raion] ?? ({} as AdminProps), selectedRP) > 0,
    );
    const byRaion = new Map<string, number>();
    for (const j of joined) {
      if (!j.raion) continue;
      byRaion.set(j.raion, (byRaion.get(j.raion) ?? 0) + 1);
    }
    const concentration = [...byRaion.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { total: joined.length, exposed: exposed.length, concentration };
  }, [joined, adminByName, selectedRP]);

  return (
    <div className="proposed-border bg-[var(--color-bg-raised)]/95 backdrop-blur-[2px]">
      <div className="proposed-hatch flex items-center justify-between gap-2 border-b border-dashed border-[var(--color-proposed)] px-4 py-2.5">
        <span className="re-eyebrow text-[var(--color-fg-1)]">{t(locale, 'portfolio.title')}</span>
        <span className="stamp-proposed">{t(locale, 'stamps.proposed')}</span>
      </div>

      <div className="px-4 py-3">
        {!summary && (
          <p className="re-body-sm mb-3">{t(locale, 'portfolio.hint')}</p>
        )}

        <button
          type="button"
          onClick={load}
          disabled={busy}
          className="proposed-border w-full px-3 py-2 font-mono text-[12px] text-[var(--color-proposed)] hover:bg-[color-mix(in_srgb,var(--color-proposed)_10%,transparent)] disabled:opacity-50"
        >
          {busy ? '…' : t(locale, 'portfolio.load')}
        </button>

        {summary && (
          <dl className="mt-3">
            <div className="flex items-baseline justify-between gap-3 py-1.5">
              <dt className="re-body-sm">{t(locale, 'portfolio.parcels_loaded')}</dt>
              <dd className="font-mono tabular-nums text-[var(--color-fg-1)]">
                {fmtNumber(locale, summary.total)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-[var(--color-border)] py-1.5">
              <dt className="re-body-sm">
                {t(locale, 'portfolio.parcels_exposed_template', { n: selectedRP })}
              </dt>
              <dd className="proposed-editable text-[13px] tabular-nums">{summary.exposed}</dd>
            </div>

            <div className="mt-2 border-t border-[var(--color-border)] pt-2">
              <div className="re-eyebrow mb-1">{t(locale, 'portfolio.concentration_by_raion')}</div>
              <ul className="font-mono text-[12px]">
                {summary.concentration.map(([name, n]) => (
                  <li key={name} className="flex justify-between py-0.5 text-[var(--color-fg-2)]">
                    <span>{name}</span>
                    <span className="tabular-nums">{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}
