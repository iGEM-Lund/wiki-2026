'use client';

import { useEffect } from 'react';

// What triggers on scroll: h2s (they fade their text and draw their
// flourishes) and the pillars row that stands in for an h2 (its patches
// are pressed on). The
// title banner has its own collapse. Everything else under a top-level
// heading or pillars row fades in as one group once that has been
// triggered and its text is in (delay in globals.css), or under a pillars
// row once its patches are pressed on (--reveal-delay); content above the
// first one comes in
// when the title's arrival is done.
const TARGETS = 'article .section-heading, article > .pillars-section';
const BLOCKS = 'article > :not(.page-title, .page-title-top, .section-heading, .pillars-section)';

// Where the entrance triggers, as a share of the viewport from the bottom.
const TRIGGER_SHARE = 0.1;

// The page title banner plays an arrival before the content may appear: the
// stroke, then the title (timings in globals.css, "Arrival"). Content
// entrances are held until it's done, at 0.8 seconds.
function introSeconds(): number {
  if (window.scrollY > 0) return 0;
  const root = document.documentElement;
  if (root.dataset.motion === 'reduce') return 0;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
  if (!document.querySelector('.page-title')) return 0;
  return 0.8;
}

// Triggers the page content's entrance (see [data-reveal] in globals.css)
// as each element scrolls up past the trigger line. Each entrance plays out
// in full on its own once triggered, and stays: scrolling back up does not
// reverse it. Anything too close to the end of the page to ever get
// that far is revealed while the footer is in view (it's short, so by then
// there's hardly any page left to scroll).
export function ScrollReveal() {
  useEffect(() => {
    const past = new Set<HTMLElement>();
    const atEnd = new Set<HTMLElement>();
    const targets = [...document.querySelectorAll<HTMLElement>(TARGETS)];
    let held = introSeconds() > 0;

    // Each top-level block belongs to the nearest top-level h2 above it
    // (null above the first one).
    const groups = new Map<HTMLElement | null, HTMLElement[]>();
    let leader: HTMLElement | null = null;
    for (const child of document.querySelectorAll<HTMLElement>('article > *')) {
      if (child.matches('.section-heading, .pillars-section')) {
        leader = child;
      } else if (child.matches(BLOCKS)) {
        const group = groups.get(leader) ?? [];
        group.push(child);
        groups.set(leader, group);
        if (leader) {
          child.dataset.afterHeading = '';
          if (leader.matches('.pillars-section')) {
            // Wait for the last pillar's patch to be pressed on: the stagger
            // is 0.25s a step out from the active one, each press takes
            // 0.55s and is nearly settled by 0.45s.
            const steps = [...leader.querySelectorAll<HTMLElement>('.pillars__item')].map(
              (item) => Number(item.style.getPropertyValue('--pillar-distance')) || 0,
            );
            child.style.setProperty('--reveal-delay', `${0.45 + Math.max(0, ...steps) * 0.25}s`);
          }
        }
      }
    }
    const setGroup = (key: HTMLElement | null, on: boolean) => {
      for (const block of groups.get(key) ?? []) {
        if (on) block.dataset.reveal = '';
        else delete block.dataset.reveal;
      }
    };
    const apply = (el: HTMLElement) => {
      const on = !held && (past.has(el) || atEnd.has(el));
      if (on) el.dataset.reveal = '';
      else delete el.dataset.reveal;
      setGroup(el, on);
    };
    setGroup(null, !held);

    // The zone reaches from far above the viewport down to the trigger
    // line, so an element counts as past it even if a jump (an outline
    // link, a reload mid-page) carried it straight over the viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          // Sticky: once an entrance has been triggered it stays, so
          // scrolling back up never takes it away again.
          if (entry.isIntersecting) past.add(el);
          apply(el);
        }
      },
      { rootMargin: `100000px 0px -${TRIGGER_SHARE * 100}% 0px` },
    );
    for (const el of targets) observer.observe(el);
    const observers = [observer];

    const footer = document.querySelector('.site__footer');
    if (footer) {
      const endObserver = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          for (const el of targets) {
            if (el.getBoundingClientRect().top < window.innerHeight) atEnd.add(el);
          }
        }
        targets.forEach(apply);
      });
      endObserver.observe(footer);
      observers.push(endObserver);
    }

    const release = held
      ? window.setTimeout(() => {
          held = false;
          setGroup(null, true);
          targets.forEach(apply);
        }, introSeconds() * 1000)
      : undefined;

    return () => {
      window.clearTimeout(release);
      for (const observer of observers) observer.disconnect();
    };
  }, []);

  return null;
}
