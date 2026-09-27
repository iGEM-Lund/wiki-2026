'use client';

import { useEffect } from 'react';

// Matches the mobile breakpoint in globals.css, the only width at which the
// header is a top bar rather than the left sidebar.
const TOP_BAR_QUERY = '(max-width: 48rem)';

// How much of the top of the viewport the header covers: its height while
// it's a top bar, nothing while it's the sidebar.
export function headerOffset(header: HTMLElement) {
  return window.matchMedia(TOP_BAR_QUERY).matches ? header.getBoundingClientRect().height : 0;
}

// The top bar is fixed but not a fixed height (the brand can wrap), so
// anything that needs to clear it, the main column's top padding, the
// drawers, scroll-padding, reads the --header-height custom property this
// sets instead of a guessed constant. On the sidebar layout it's left at
// the stylesheet's 0.
export function HeaderHeightSync() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.site__header');
    if (!header) return;
    const root = document.documentElement;
    const update = () => {
      const offset = headerOffset(header);
      if (offset > 0) {
        root.style.setProperty('--header-height', `${offset}px`);
      } else {
        root.style.removeProperty('--header-height');
      }
    };
    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(header);
    return () => resizeObserver.disconnect();
  }, []);

  return null;
}
