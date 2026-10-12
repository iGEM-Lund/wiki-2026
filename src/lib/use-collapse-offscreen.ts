'use client';

import { useEffect, type RefObject } from 'react';
import { flushSync } from 'react-dom';

// How long scrolling has to have stopped before an off-screen block closes.
// A timer rather than the `scrollend` event: after a jump, scrollend can
// fire before the IntersectionObserver has even reported the block as off
// screen, and then nothing would ever close it.
const SCROLL_IDLE_MS = 150;

// Closes an opened block (a card's Expandable, a long table) once the reader
// has scrolled it fully out of view, without moving what they're looking
// at. It closes only after it has been on screen at least once since
// opening, and only once scrolling has stopped for SCROLL_IDLE_MS, so it
// never interrupts a smooth in-page jump that passes over it. Closing is instant (data-snap
// switches off the roll and height transitions, see globals.css): a block
// that sits above the viewport loses height, which would pull the page up,
// so the scroll position is corrected by exactly that much. The browser's
// own scroll anchoring is suspended for that one adjustment, since it
// would otherwise apply the same correction a second time.
//
// `watchClosest` widens what has to be out of view to the nearest ancestor
// matching it (an Expandable's whole Card, not just its bottom part, so it
// doesn't close while the reader is still on the card's top half).
export function useCollapseOffscreen(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  close: () => void,
  watchClosest?: string,
) {
  useEffect(() => {
    const current = ref.current;
    if (!open || !current) return;
    const own: HTMLElement = current;
    const el: HTMLElement = (watchClosest && own.closest<HTMLElement>(watchClosest)) || own;
    let seen = false;
    let offscreen = false;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;

    function collapse() {
      if (!offscreen) return;
      const rect = el.getBoundingClientRect();
      // Scrolled back into view meanwhile: leave it open.
      if (rect.bottom > 0 && rect.top < window.innerHeight) return;
      const above = rect.bottom <= 0;
      // Layout heights (offsetHeight), not the bounding box: a card is
      // tilted, and its rotated box isn't exactly the height it takes up.
      const before = el.offsetHeight;
      const root = document.documentElement;
      own.setAttribute('data-snap', '');
      root.style.overflowAnchor = 'none';
      flushSync(close);
      if (above) {
        const after = el.offsetHeight;
        window.scrollBy({ top: after - before, behavior: 'instant' });
      }
      requestAnimationFrame(() => {
        own.removeAttribute('data-snap');
        root.style.overflowAnchor = '';
      });
    }

    // (Re)starts the wait for scrolling to settle; collapse() itself
    // checks the block is still off screen when it runs.
    const scheduleCollapse = () => {
      clearTimeout(idleTimer);
      if (offscreen && seen) idleTimer = setTimeout(collapse, SCROLL_IDLE_MS);
    };
    const observer = new IntersectionObserver(([entry]) => {
      offscreen = !entry.isIntersecting;
      if (entry.isIntersecting) seen = true;
      scheduleCollapse();
    });
    observer.observe(el);
    window.addEventListener('scroll', scheduleCollapse, { passive: true });

    return () => {
      observer.disconnect();
      clearTimeout(idleTimer);
      window.removeEventListener('scroll', scheduleCollapse);
    };
  }, [ref, open, close, watchClosest]);
}
