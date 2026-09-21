'use client';

import { useEffect } from 'react';

// The header is fixed but not a fixed height (nav content can wrap), so
// anything that needs to clear it, its own top padding, the TOC's offset,
// reads the --header-height custom property this sets instead of a guessed
// constant.
export function HeaderHeightSync() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.site__header');
    if (!header) return;
    const update = () => {
      document.documentElement.style.setProperty(
        '--header-height',
        `${header.getBoundingClientRect().height}px`,
      );
    };
    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(header);
    return () => resizeObserver.disconnect();
  }, []);

  return null;
}
