'use client';

import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { useCollapseOffscreen } from '@/lib/use-collapse-offscreen';

type ExpandableProps = {
  defaultOpen?: boolean;
  children?: ReactNode;
};

// Content hidden behind a "Read more" button, usually placed at the end of a
// Card. The body opens by animating grid-template-rows from 0fr to 1fr (see
// .expandable__body in globals.css), which transitions to the content's real
// height without measuring it in JS. `inert` keeps the collapsed body out of
// the tab order and the accessibility tree while it's visually hidden.
// At the end of a Card the hidden part is drawn as the card's bottom edge
// rolled up (.expandable__roll): opening it unrolls the card down to its
// full length. There's no button to close it again: once the reader has
// opened it and then scrolled its card (or itself, outside a card) out of
// view, it rolls back up by itself without moving the page (see
// useCollapseOffscreen). One a writer set to start open simply stays open.
// The button disappears once it's used, so keyboard focus moves on to the
// content it revealed rather than being dropped.
export function Expandable({ defaultOpen = false, children }: ExpandableProps) {
  const [open, setOpen] = useState(defaultOpen);
  // Opened by the reader rather than by the writer's defaultOpen.
  const [openedByReader, setOpenedByReader] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const bodyId = useId();
  const close = useCallback(() => setOpen(false), []);
  useCollapseOffscreen(rootRef, open && openedByReader, close, '.card');

  return (
    <div className="expandable" data-open={open} ref={rootRef}>
      <div className="expandable__body" id={bodyId} inert={!open}>
        <div className="expandable__body-inner" ref={innerRef} tabIndex={-1}>
          {children}
        </div>
      </div>
      <span className="expandable__roll" aria-hidden="true" />
      {open ? null : (
        <button
          type="button"
          className="expandable__toggle"
          aria-expanded={false}
          aria-controls={bodyId}
          onClick={(event) => {
            const hadFocus = document.activeElement === event.currentTarget;
            setOpenedByReader(true);
            flushSync(() => setOpen(true));
            if (hadFocus) innerRef.current?.focus({ preventScroll: true });
          }}
        >
          <span>Read more</span>
          <ChevronDown className="expandable__icon" aria-hidden size={18} />
        </button>
      )}
    </div>
  );
}
