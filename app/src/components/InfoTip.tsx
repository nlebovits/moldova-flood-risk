import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../lib/utils';

/**
 * A small ⓘ affordance that reveals a short explanatory note. Shows on hover
 * and keyboard focus, toggles on click, and closes on Escape or outside click.
 * Sharp corners and a hairline border, per the design language — no SaaS pill.
 *
 * The trigger is a real <button> carrying the note via aria-describedby, so
 * screen readers announce it. Used beside the return-period and expected-annual-
 * loss labels to explain terms that aren't self-evident.
 */
export function InfoTip({
  text,
  label,
  className,
  align = 'start',
}: {
  /** The explanatory copy shown in the popover. */
  text: string;
  /** Accessible name for the trigger (e.g. "What does this mean?"). */
  label: string;
  className?: string;
  /** Horizontal anchor of the popover relative to the trigger. */
  align?: 'start' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const panelId = useId();

  // Close on Escape or a click outside the trigger + panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  return (
    <span
      ref={rootRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={cn(
          'inline-flex h-4 w-4 items-center justify-center align-middle',
          'text-[var(--color-fg-3)] transition-colors hover:text-[var(--color-lagoon)]',
          'focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--color-lagoon)]',
        )}
      >
        {/* Lucide `info` glyph, inline so it inherits currentColor. */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
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

      {open && (
        <span
          id={panelId}
          role="tooltip"
          className={cn(
            'absolute top-[calc(100%+6px)] z-50 w-64 max-w-[min(18rem,70vw)]',
            'border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)]',
            'px-3 py-2 text-[12px] leading-snug text-[var(--color-fg-2)]',
            'shadow-[0_2px_10px_rgba(0,0,0,0.18)]',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {text}
        </span>
      )}
    </span>
  );
}
