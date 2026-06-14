import { useEffect, useState } from 'react';
import { useApp } from '../store/state';
import { t } from '../lib/i18n';
import { setOnboardingDismissed } from '../lib/onboarding';
import { cn } from '../lib/utils';

/**
 * First-run, click-through tutorial. Four concept slides:
 *   1. what this is        2. open data only
 *   3. open / serverless   4. reproducible & portable
 *
 * Modelled on the sidebar panels (hairline border, raised bg, sharp corners).
 * Interface chrome is Lagoon-only (`--color-accent`); tangerine is reserved
 * for PROPOSED elsewhere and never appears here. Dismissal persists via
 * localStorage when "don't show again" is left checked. Open state lives in
 * the store so the map's "?" control can re-open it.
 */

const TOTAL = 4;
const REPO_URL = 'https://github.com/nlebovits/moldova-flood-risk';
const SOURCECOOP_URL = 'https://source.coop/';

export function OnboardingTutorial() {
  const { locale, tutorialOpen, setTutorialOpen } = useApp();
  // State resets to these defaults on every open: App keys this component on
  // `tutorialOpen`, so re-opening (first visit or the "?" control) remounts it.
  const [step, setStep] = useState(0); // 0-indexed slide
  const [dontShow, setDontShow] = useState(true);

  // Any close path honours the checkbox, then hides the overlay.
  function close() {
    if (dontShow) setOnboardingDismissed(true);
    setTutorialOpen(false);
  }

  function next() {
    if (step < TOTAL - 1) setStep((s) => s + 1);
    else close();
  }
  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  // Keyboard: Esc closes, arrows page through slides.
  useEffect(() => {
    if (!tutorialOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') back();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialOpen, step, dontShow]);

  if (!tutorialOpen) return null;

  const n = step + 1; // 1-indexed for i18n keys
  const last = step === TOTAL - 1;
  const titleId = 'tutorial-title';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Backdrop — click to dismiss. */}
      <button
        type="button"
        aria-label={t(locale, 'ui.close')}
        onClick={close}
        className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-[2px]"
      />

      {/* Card */}
      <div className="relative w-full max-w-[560px] border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)] shadow-[var(--shadow-2)]">
        {/* Header: step label + close */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-3">
          <div className="re-eyebrow">{t(locale, 'tutorial.step_label', { n, total: TOTAL })}</div>
          <button
            type="button"
            onClick={close}
            aria-label={t(locale, 'ui.close')}
            className="font-mono text-[13px] leading-none text-[var(--color-fg-3)] hover:text-[var(--color-fg-1)]"
          >
            ✕
          </button>
        </div>

        {/* Body: current slide */}
        <div className="px-5 py-5">
          <h2 id={titleId} className="re-h4 text-[var(--color-fg-1)]">
            {t(locale, `tutorial.slides.${n}.title`)}
          </h2>
          <p className="re-body-sm mt-2 text-[var(--color-fg-2)]">
            {t(locale, `tutorial.slides.${n}.body`)}
          </p>

          {/* Slide 2 — the three open datasets (verified attribution strings). */}
          {n === 2 && (
            <ul className="mt-3 flex flex-col gap-px border border-[var(--color-border)] font-mono text-[12px]">
              {(['jrc', 'ftw', 'overture'] as const).map((k) => (
                <li
                  key={k}
                  className="border-b border-[var(--color-border)] px-3 py-2 text-[var(--color-fg-2)] last:border-b-0"
                >
                  {t(locale, `sources.${k}`)}
                </li>
              ))}
            </ul>
          )}

          {/* Slide 3 — where the data is hosted. */}
          {n === 3 && (
            <a
              href={SOURCECOOP_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block font-mono text-[12px] text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              {t(locale, 'tutorial.sourcecoop_link')} ↗
            </a>
          )}

          {/* Slide 4 — link to the open source. */}
          {n === 4 && (
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block font-mono text-[12px] text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              {t(locale, 'tutorial.repo_link')} ↗
            </a>
          )}
        </div>

        {/* Footer: dots + checkbox (left), Back / Next (right) */}
        <div className="flex items-center justify-between gap-4 border-t border-[var(--color-border)] px-5 py-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5" aria-hidden>
              {Array.from({ length: TOTAL }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 w-1.5',
                    i === step
                      ? 'bg-[var(--color-accent)]'
                      : 'border border-[var(--color-border-strong)]',
                  )}
                />
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-2 font-mono text-[11px] text-[var(--color-fg-3)]">
              <input
                type="checkbox"
                checked={dontShow}
                onChange={(e) => setDontShow(e.target.checked)}
                className="h-3 w-3 accent-[var(--color-accent)]"
              />
              {t(locale, 'tutorial.dont_show')}
            </label>
          </div>

          <div className="flex border border-[var(--color-border-strong)]">
            {step > 0 && (
              <button
                type="button"
                onClick={back}
                className="border-r border-[var(--color-border)] px-4 py-2 font-mono text-[12px] text-[var(--color-fg-2)] transition-colors hover:bg-[var(--color-bg-sunken)]"
              >
                {t(locale, 'tutorial.back')}
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="bg-[var(--color-accent)] px-4 py-2 font-mono text-[12px] text-white transition-colors hover:opacity-90"
            >
              {last ? t(locale, 'tutorial.start') : t(locale, 'tutorial.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
