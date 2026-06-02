import { useState } from 'react';
import { useApp } from '../store/state';
import { t } from '../lib/i18n';

export function ProvenanceChip() {
  const { locale } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="stamp-real px-3 py-2 border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)]/95 backdrop-blur-[2px] hover:bg-[var(--color-bg-sunken)] transition-colors"
        aria-expanded={open}
      >
        {t(locale, 'provenance.chip')}
      </button>
      {open && (
        <div className="max-w-[320px] border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)] p-4 shadow-[0_8px_24px_rgba(38,56,58,0.12)]">
          <div className="re-eyebrow mb-2">
            {t(locale, 'provenance.about_title')}
          </div>
          <p className="re-body-sm">
            {t(locale, 'provenance.about_body')}
          </p>
          <p className="re-meta mt-3">
            © European Union, Copernicus EMS · JRC GloFAS v2.1.2 · CC BY 4.0
            <br />
            Field boundaries: Fields of The World · CC BY 4.0
          </p>
        </div>
      )}
    </div>
  );
}
