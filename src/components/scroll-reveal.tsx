'use client';

import { useEffect } from 'react';

// What fades in: every block of the page content and every paragraph, even
// ones inside those blocks, so a long card fills in as it scrolls up. The
// title banner has its own collapse; h2s fade their text and draw their
// flourishes instead, so they're targeted separately.
const TARGETS = 'article > :not(.page-title, .page-title-top, .section-heading), article p:not(.page-title *), .section-heading';

// Where the entrance triggers, as a share of the viewport from the bottom.
const TRIGGER_SHARE = 0.1;

// The page title banner plays an arrival before the content may appear: the
// stroke, the title, then the section list one line at a time (timings in
// globals.css, "Arrival"). Content entrances are held until the list is
// nearly done, in seconds: the title is done at 0.8, the list starts at 0.9
// with 0.07 per section, and the content comes in while its last line is
// still fading.
function introSeconds(): number {
  if (window.scrollY > 0) return 0;
  const root = document.documentElement;
  if (root.dataset.motion === 'reduce') return 0;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
  const outline = document.querySelector('.page-title__outline');
  if (!document.querySelector('.page-title')) return 0;
  const sections = document.querySelectorAll('.page-title__outline li').length;
  if (!outline || sections === 0 || getComputedStyle(outline).display === 'none') return 0.8;
  return 0.9 + (sections - 1) * 0.07 + 0.15;
}

// Triggers the page content's entrance (see [data-reveal] in globals.css)
// as each element scrolls up past the trigger line, and reverses it as it
// scrolls back down below it. Each entrance plays out in full on its own
// once triggered. Anything too close to the end of the page to ever get
// that far is revealed while the footer is in view (it's short, so by then
// there's hardly any page left to scroll).
export function ScrollReveal() {
  useEffect(() => {
    const past = new Set<HTMLElement>();
    const atEnd = new Set<HTMLElement>();
    const targets = [...document.querySelectorAll<HTMLElement>(TARGETS)];
    let held = introSeconds() > 0;
    const apply = (el: HTMLElement) => {
      if (!held && (past.has(el) || atEnd.has(el))) el.dataset.reveal = '';
      else delete el.dataset.reveal;
    };

    // The zone reaches from far above the viewport down to the trigger
    // line, so an element counts as past it even if a jump (an outline
    // link, a reload mid-page) carried it straight over the viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) past.add(el);
          else past.delete(el);
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
        atEnd.clear();
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
