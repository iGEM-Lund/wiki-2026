'use client';

import { useRef, type FocusEvent, type PointerEvent } from 'react';

// How long a closing tag takes to fade (the 0.15s opacity transition on
// .term-tip__bubble / .citation__sign), before it's taken out of the top
// layer.
const FADE_MS = 200;

// Where the tag hangs: centred under its anchor, in viewport coordinates
// (see the [popover] rule for .term-tip__bubble and .citation__sign in
// globals.css). An anchor broken over several lines has one box per line;
// the tag hangs from the line the pointer is on (the first, for focus), not
// from the bounding box of them all, which would put it in mid-air.
function place(anchor: HTMLElement, tag: HTMLElement, point?: { x: number; y: number }) {
  const lines = Array.from(anchor.getClientRects()).filter((r) => r.width > 0 || r.height > 0);
  let box = lines[0] ?? anchor.getBoundingClientRect();
  if (point && lines.length > 1) {
    const distance = (r: DOMRect) =>
      Math.hypot(
        Math.max(r.left - point.x, 0, point.x - r.right),
        Math.max(r.top - point.y, 0, point.y - r.bottom),
      );
    box = lines.reduce((best, r) => (distance(r) < distance(best) ? r : best));
  }
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
  const pointer = useRef<{ x: number; y: number } | undefined>(undefined);

  function open(event: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>) {
    const anchor = event.currentTarget;
    const tag = anchor.querySelector<HTMLElement>(tagSelector);
    if (!tag) return;
    window.clearTimeout(closing.current);
    pointer.current = 'clientX' in event ? { x: event.clientX, y: event.clientY } : undefined;
    if (tag.matches(':popover-open')) return;
    place(anchor, tag, pointer.current);
    tag.showPopover();
    const follow = () => place(anchor, tag, pointer.current);
    window.addEventListener('scroll', follow, { capture: true, passive: true });
    window.addEventListener('resize', follow, { passive: true });
    stopTracking.current = () => {
      window.removeEventListener('scroll', follow, { capture: true });
      window.removeEventListener('resize', follow);
    };
  }

  // Moving down onto another line of a wrapped anchor re-hangs the tag there.
  function move(event: PointerEvent<HTMLElement>) {
    const anchor = event.currentTarget;
    const tag = anchor.querySelector<HTMLElement>(tagSelector);
    if (!tag?.matches(':popover-open')) return;
    pointer.current = { x: event.clientX, y: event.clientY };
    place(anchor, tag, pointer.current);
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

  return {
    onPointerEnter: open,
    onPointerMove: move,
    onPointerLeave: close,
    onFocus: open,
    onBlur: close,
  };
}
