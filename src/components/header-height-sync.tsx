'use client';

import { useEffect } from 'react';

// How much of the top of the viewport the header covers.
export function headerOffset(header: HTMLElement) {
  return header.getBoundingClientRect().height;
}

// The top bar is fixed but not a fixed height (the brand can wrap on narrow
// screens), so anything that needs to clear it, the main column's top
// padding, the drawers, scroll-padding, reads the --header-height custom
// property this sets instead of a guessed constant.
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
