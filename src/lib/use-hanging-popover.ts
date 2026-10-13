'use client';

import { useRef, type FocusEvent, type PointerEvent } from 'react';

// How long a closing tag takes to fade (the 0.15s opacity transition on
// .term-tip__bubble / .citation__sign), before it's taken out of the top
// layer.
const FADE_MS = 200;

// Where the tag hangs: centred under its anchor, in viewport coordinates
// (see the [popover] rule for .term-tip__bubble and .citation__sign in
// globals.css).
function place(anchor: HTMLElement, tag: HTMLElement) {
  const box = anchor.getBoundingClientRect();
  tag.style.setProperty('--anchor-x', `${box.left + box.width / 2}px`);
  tag.style.setProperty('--anchor-y', `${box.bottom}px`);
}

// A paper tag hung on a string under an inline anchor (a Tooltip's term, a
// Citation), opened as a popover in the top layer while the anchor is
// hovered or focused, so no card, collapsed section or scrolling table
// around it can clip it. It's placed under the anchor by hand and kept
// there while anything scrolls; whether it shows, and its swing, are CSS
// (keyed on the anchor's :hover/:focus), and `shownWhile` is that same
// selector, so it isn't closed while CSS still shows it.
//
// `tagSelector` finds the tag inside the anchor; spread the returned
// handlers onto the anchor.
export function useHangingPopover(tagSelector: string, shownWhile: string) {
  const closing = useRef<number | undefined>(undefined);
  const stopTracking = useRef<(() => void) | undefined>(undefined);

  function open(event: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>) {
    const anchor = event.currentTarget;
    const tag = anchor.querySelector<HTMLElement>(tagSelector);
    if (!tag) return;
    window.clearTimeout(closing.current);
    if (tag.matches(':popover-open')) return;
    place(anchor, tag);
    tag.showPopover();
    const follow = () => place(anchor, tag);
    window.addEventListener('scroll', follow, { capture: true, passive: true });
    window.addEventListener('resize', follow, { passive: true });
    stopTracking.current = () => {
      window.removeEventListener('scroll', follow, { capture: true });
      window.removeEventListener('resize', follow);
    };
  }

  function close(event: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>) {
    const anchor = event.currentTarget;
    window.clearTimeout(closing.current);
    closing.current = window.setTimeout(() => {
      const tag = anchor.querySelector<HTMLElement>(tagSelector);
      if (!tag?.matches(':popover-open') || anchor.matches(shownWhile)) return;
      tag.hidePopover();
      stopTracking.current?.();
    }, FADE_MS);
  }

  return { onPointerEnter: open, onPointerLeave: close, onFocus: open, onBlur: close };
}
