import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils';

const CLOSE_DELAY = 140;

/**
 * A small ⓘ affordance that reveals a short explanation. The panel renders in a
 * portal on document.body with fixed positioning, so the scrolling sidebar (and
 * its `overflow` clipping) can never crop it — it clamps itself to the viewport
 * and flips above the trigger when there isn't room below.
 *
 * The trigger is a real <button> carrying the note via aria-describedby. Pass
 * `\n\n`-separated paragraphs in `text`; an optional `href` + `linkLabel` append
 * a "learn more" link. Used beside the return-period and expected-annual-loss
 * labels to explain terms in plain language.
 */
export function InfoTip({
  text,
  label,
  href,
  linkLabel,
  className,
}: {
  /** Explanation copy. Split into paragraphs on blank lines (`\n\n`). */
  text: string;
  /** Accessible name for the trigger. */
  label: string;
  /** Optional "learn more" link target. */
  href?: string;
  /** Visible label for the link (required for the link to render). */
  linkLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const panelId = useId();

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY);
  }, [cancelClose]);

  // Anchor the panel below the trigger, clamped to the viewport; flip above if
  // it would spill off the bottom. The panel is positioned imperatively (writing
  // to its style) rather than through state, so measuring the DOM after layout
  // costs no extra render.
  const place = useCallback(() => {
    const trg = triggerRef.current;
    const pnl = panelRef.current;
    if (!trg || !pnl) return;
    const r = trg.getBoundingClientRect();
    const margin = 8;
    const gap = 6;
    const pw = pnl.offsetWidth;
    const ph = pnl.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.min(Math.max(r.left, margin), Math.max(margin, vw - pw - margin));
    let top = r.bottom + gap;
    if (top + ph > vh - margin && r.top - gap - ph >= margin) {
      top = r.top - gap - ph;
    }
    top = Math.min(Math.max(top, margin), Math.max(margin, vh - ph - margin));
    pnl.style.top = `${Math.round(top)}px`;
    pnl.style.left = `${Math.round(left)}px`;
    pnl.style.visibility = 'visible';
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onReflow = () => place();
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  }, [open, place]);

  // Close on Escape or a pointer down outside both the trigger and the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  useEffect(() => cancelClose, [cancelClose]);

  const paragraphs = text.split(/\n{2,}/);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? panelId : undefined}
        onClick={() => {
          cancelClose();
          setOpen(true);
        }}
        onFocus={() => {
          cancelClose();
          setOpen(true);
        }}
        onBlur={scheduleClose}
        onMouseEnter={() => {
          cancelClose();
          setOpen(true);
        }}
        onMouseLeave={scheduleClose}
        className={cn(
          'inline-flex h-4 w-4 items-center justify-center align-middle',
          'text-[var(--color-fg-3)] transition-colors hover:text-[var(--color-lagoon)]',
          'focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--color-lagoon)]',
          className,
        )}
      >
        {/* Lucide `info` glyph, inline so it inherits currentColor. */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="square"
          strokeLinejoin="miter"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="tooltip"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            style={{ position: 'fixed', top: 0, left: 0, visibility: 'hidden' }}
            className={cn(
              'z-[2000] w-[300px] max-w-[calc(100vw-16px)]',
              'border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)]',
              'px-3.5 py-3 text-[13px] leading-relaxed text-[var(--color-fg-1)]',
              'shadow-[0_4px_16px_rgba(0,0,0,0.22)]',
            )}
          >
            {paragraphs.map((p, i) => (
              <p key={i} className={i < paragraphs.length - 1 ? 'mb-2' : undefined}>
                {p}
              </p>
            ))}
            {href && linkLabel && (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  'mt-2.5 inline-block font-mono text-[11px] uppercase',
                  'tracking-[var(--tracking-eyebrow)] text-[var(--color-lagoon)]',
                  'underline decoration-[var(--color-border-strong)] underline-offset-2',
                  'hover:decoration-[var(--color-lagoon)]',
                )}
              >
                {linkLabel} ↗
              </a>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
