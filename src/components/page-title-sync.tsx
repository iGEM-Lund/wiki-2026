'use client';

import { useEffect } from 'react';

// The page title banner collapses into a slim bar as the page scrolls (see
// .page-title[data-collapsible] in globals.css), which needs to know how far
// to scroll it before it pins: its own height, which depends on how many
// lines the title wraps to. CSS can't read that, so this sets it as
// --page-title-height, and only then marks the banner collapsible, so until
// it's measured the banner just scrolls away as before.
export function PageTitleSync() {
  useEffect(() => {
    const banner = document.querySelector<HTMLElement>('.page-title');
    if (!banner) return;
    const update = () => {
      banner.style.setProperty('--page-title-height', `${banner.offsetHeight}px`);
    };
    update();
    banner.dataset.collapsible = '';
    // Border box: the top padding grows with the mobile top bar without
    // changing the content box.
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(banner, { box: 'border-box' });
    return () => {
      resizeObserver.disconnect();
      delete banner.dataset.collapsible;
      banner.style.removeProperty('--page-title-height');
    };
  }, []);

  return null;
}
