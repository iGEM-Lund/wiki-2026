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
    const outline = banner.querySelector<HTMLElement>('.page-title__outline');
    const root = document.documentElement;
    const update = () => {
      // On the root, not the banner, so the floating outline (which pops in
      // as the banner collapses) can read it too.
      root.style.setProperty('--page-title-height', `${banner.offsetHeight}px`);
      // The section list wraps to as many rows as it needs, and the banner's
      // bottom padding has to make room for them.
      if (outline) banner.style.setProperty('--page-title-outline-h', `${outline.offsetHeight}px`);
    };
    update();
    banner.dataset.collapsible = '';
    // Border box: the top padding grows with the top bar without
    // changing the content box.
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(banner, { box: 'border-box' });
    if (outline) resizeObserver.observe(outline);
    return () => {
      resizeObserver.disconnect();
      delete banner.dataset.collapsible;
      root.style.removeProperty('--page-title-height');
      banner.style.removeProperty('--page-title-outline-h');
    };
  }, []);

  return null;
}
