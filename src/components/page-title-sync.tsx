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
    const root = document.documentElement;
    const update = () => {
      // On the root, not the banner, so the floating outline (which pops in
      // as the banner collapses) can read it too.
      root.style.setProperty('--page-title-height', `${banner.offsetHeight}px`);
    };
    update();
    banner.dataset.collapsible = '';
    // Border box: the top padding grows with the top bar without
    // changing the content box.
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(banner, { box: 'border-box' });

    // Without scroll-driven animations (Firefox) the collapse is scrubbed
    // from here instead: how far it has got, as --collapse-p on the banner
    // and the top wave (on them, not the root, so a scroll doesn't restyle
    // the whole page). Same range as the scroll timeline: the first
    // --collapse-distance of scroll, which the banner computes to px.
    const top = banner.previousElementSibling?.classList.contains('page-title-top')
      ? (banner.previousElementSibling as HTMLElement)
      : null;
    let frame = 0;
    const scrub = () => {
      frame = 0;
      const distance = parseFloat(getComputedStyle(banner).getPropertyValue('--collapse-distance'));
      const progress = distance > 0 ? Math.min(Math.max(window.scrollY / distance, 0), 1) : 0;
      for (const el of [banner, top]) el?.style.setProperty('--collapse-p', String(progress));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(scrub);
    };
    const scrubbed = !CSS.supports('animation-timeline: scroll()');
    let scrubObserver: ResizeObserver | undefined;
    if (scrubbed) {
      scrub();
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      // The banner's height (so the distance) can change without a resize.
      scrubObserver = new ResizeObserver(schedule);
      scrubObserver.observe(banner);
    }

    return () => {
      resizeObserver.disconnect();
      if (scrubbed) {
        scrubObserver?.disconnect();
        cancelAnimationFrame(frame);
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        for (const el of [banner, top]) el?.style.removeProperty('--collapse-p');
      }
      delete banner.dataset.collapsible;
      root.style.removeProperty('--page-title-height');
    };
  }, []);

  return null;
}
