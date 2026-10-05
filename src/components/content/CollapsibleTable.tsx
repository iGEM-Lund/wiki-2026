'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { ChevronDown } from 'lucide-react';

type CollapsibleTableProps = {
  rowCount: number;
  children?: ReactNode;
};

// A long table (see Table.tsx) showing only its first rows until the reader
// asks for the rest. The hidden rows' cell contents carry
// hidden="until-found", set here rather than in JSX since React renders any
// `hidden` value as the plain boolean attribute. Until this hydrates, CSS
// hides them the same way (see .table-cell__extra in globals.css).
export function CollapsibleTable({ rowCount, children }: CollapsibleTableProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyId = useId();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    for (const cell of root.querySelectorAll('.table-cell__extra')) {
      if (open) cell.removeAttribute('hidden');
      else cell.setAttribute('hidden', 'until-found');
    }
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

  const toggle = () => {
    const closing = open;
    setOpen(!open);
    // Collapsing from the bottom of a long table pulls the page up past
    // its start; bring the table back into view.
    if (closing) {
      requestAnimationFrame(() => {
        const root = rootRef.current;
        if (root && root.getBoundingClientRect().top < 0) root.scrollIntoView();
      });
    }
  };

  return (
    <div className="table-collapse" data-open={open} ref={rootRef}>
      <div className="table-collapse__body" id={bodyId}>
        {children}
      </div>
      <button
        type="button"
        className="table-collapse__toggle"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={toggle}
      >
        <span>{open ? 'Show fewer rows' : `Show all ${rowCount} rows`}</span>
        <ChevronDown className="table-collapse__icon" aria-hidden size={18} />
      </button>
    </div>
  );
}
