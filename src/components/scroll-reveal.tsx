'use client';

import { useEffect } from 'react';

type Reveal = 'faded' | 'drawn';

// What fades in: every block of the page content and every paragraph, even
// ones inside those blocks, so a long card fills in as it scrolls up. The
// title banner has its own collapse; h2s fade their text only (the
// flourishes draw instead), so they're targeted separately.
const FADE_TARGETS = 'article > :not(.page-title, .section-heading), article p';
const HEADINGS = '.section-heading';

// Where each part of the entrance triggers, as a share of the viewport from
// the bottom: everything fades in, then the h2 flourishes draw.
const TRIGGERS: { state: Reveal; share: number; selector: string }[] = [
  { state: 'faded', share: 0.1, selector: `${FADE_TARGETS}, ${HEADINGS}` },
  { state: 'drawn', share: 0.2, selector: HEADINGS },
];

// Triggers the page content's entrance (see [data-reveal] in globals.css)
// as each element scrolls up past each trigger line, and reverses it as it
// scrolls back down below it. Each part plays out in full on its own once
// triggered. Anything too close to the end of the page to ever get that far
// is revealed while the footer is in view (it's short, so by then there's
// hardly any page left to scroll).
export function ScrollReveal() {
  useEffect(() => {
    const past = new Map<HTMLElement, Set<Reveal>>();
    const atEnd = new Set<HTMLElement>();
    const apply = (el: HTMLElement) => {
      const lines = past.get(el)!;
      const drawn = lines.has('drawn') || (atEnd.has(el) && el.matches(HEADINGS));
      const faded = lines.has('faded') || atEnd.has(el);
      const state = drawn ? 'drawn' : faded ? 'faded' : null;
      if (state) el.dataset.reveal = state;
      else delete el.dataset.reveal;
    };

    // Each zone reaches from far above the viewport down to its trigger
    // line, so an element counts as past it even if a jump (an outline
    // link, a reload mid-page) carried it straight over the viewport.
    const observers = TRIGGERS.map(({ state, share, selector }) => {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const el = entry.target as HTMLElement;
            if (entry.isIntersecting) past.get(el)!.add(state);
            else past.get(el)!.delete(state);
            apply(el);
          }
        },
        { rootMargin: `100000px 0px -${share * 100}% 0px` },
      );
      for (const el of document.querySelectorAll<HTMLElement>(selector)) {
        if (!past.has(el)) past.set(el, new Set());
        observer.observe(el);
      }
      return observer;
    });

    const footer = document.querySelector('.site__footer');
    if (footer) {
      const endObserver = new IntersectionObserver(([entry]) => {
        atEnd.clear();
        if (entry.isIntersecting) {
          for (const el of past.keys()) {
            if (el.getBoundingClientRect().top < window.innerHeight) atEnd.add(el);
          }
        }
        past.forEach((_, el) => apply(el));
      });
      endObserver.observe(footer);
      observers.push(endObserver);
    }

    return () => {
      for (const observer of observers) observer.disconnect();
    };
  }, []);

  return null;
}
