'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { useCollapseOffscreen } from '@/lib/use-collapse-offscreen';

type CollapsibleTableProps = {
  rowCount: number;
  children?: ReactNode;
};

// How long the printout takes to unroll or roll back up; matches the
// roll's own transition in globals.css (.table-collapse__roll).
const UNROLL_MS = 400;
const UNROLL_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

// Matches globals.css: the OS setting wins, and the accessibility menu's
// data-motion attribute can additionally turn motion off.
function prefersReducedMotion() {
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.getAttribute('data-motion') === 'reduce'
  );
}

// A long table (see Table.tsx) showing only its first rows until the reader
// asks for the rest. The hidden rows' cell contents carry
// hidden="until-found", set here rather than in JSX since React renders any
// `hidden` value as the plain boolean attribute. Until this hydrates, CSS
// hides them the same way (see .table-cell__extra in globals.css).
//
// The collapsed printout's bottom edge is drawn rolled up
// (.table-collapse__roll). Showing the rest unrolls it: the body's height
// is animated from where it was to its new size (rows show or hide all at
// once, so without this the sheet would jump), while the roll shrinks
// away at the same pace below it. There's no button to hide them again:
// once opened and then scrolled out of view, the table rolls back up by
// itself without moving the page (see useCollapseOffscreen).
export function CollapsibleTable({ rowCount, children }: CollapsibleTableProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // The body's height just before a toggle, to animate from; null for a
  // change that shouldn't animate (find-in-page opening the table).
  const fromHeight = useRef<number | null>(null);
  const bodyId = useId();
  const close = useCallback(() => setOpen(false), []);
  useCollapseOffscreen(rootRef, open, close);

  // A layout effect, so the rows are already shown or hidden (and the new
  // height measurable) before the browser paints the change.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const body = bodyRef.current;
    if (!root || !body) return;
    for (const cell of root.querySelectorAll('.table-cell__extra')) {
      if (open) cell.removeAttribute('hidden');
      else cell.setAttribute('hidden', 'until-found');
    }
    const from = fromHeight.current;
    fromHeight.current = null;
    if (from === null || prefersReducedMotion()) return;
    const to = body.getBoundingClientRect().height;
    if (Math.abs(to - from) < 1) return;
    const animation = body.animate([{ height: `${from}px` }, { height: `${to}px` }], {
      duration: UNROLL_MS,
      easing: UNROLL_EASING,
    });
    // Clip the rows still to come (or already going) while the height
    // runs between the two sizes.
    body.style.overflow = 'hidden';
    const done = () => {
      body.style.overflow = '';
    };
    animation.addEventListener('finish', done);
    animation.addEventListener('cancel', done);
    return () => animation.cancel();
  }, [open]);

  // Find-in-page matched text in a hidden row: open the table before the
  // browser scrolls to it, synchronously so the rows have their real size.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onBeforeMatch = () => flushSync(() => setOpen(true));
    root.addEventListener('beforematch', onBeforeMatch);
    return () => root.removeEventListener('beforematch', onBeforeMatch);
  }, []);

  // Only ever opens: there's no button to close it again (see above). The
  // button disappears once it's used, so keyboard focus moves on to the
  // table it revealed rather than being dropped.
  const expand = (event: MouseEvent<HTMLButtonElement>) => {
    const hadFocus = document.activeElement === event.currentTarget;
    fromHeight.current = bodyRef.current?.getBoundingClientRect().height ?? null;
    flushSync(() => setOpen(true));
    if (hadFocus) bodyRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="table-collapse" data-open={open} ref={rootRef}>
      <div className="table-collapse__body" id={bodyId} ref={bodyRef} tabIndex={-1}>
        {children}
      </div>
      <span className="table-collapse__roll" aria-hidden="true" />
      {open ? null : (
        <button
          type="button"
          className="table-collapse__toggle"
          aria-expanded={false}
          aria-controls={bodyId}
          onClick={expand}
        >
          <span>{`Show all ${rowCount} rows`}</span>
          <ChevronDown className="table-collapse__icon" aria-hidden size={18} />
        </button>
      )}
    </div>
  );
}
