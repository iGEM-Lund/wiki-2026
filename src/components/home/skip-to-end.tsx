'use client';

import { useState } from 'react';
import { ChevronsDown } from 'lucide-react';
import { skipScenes } from './scroll-play';

// How long the tag takes to tear off its pin before the page jumps.
const TEAR_MS = 450;

// Under the home page's title, "Skip introduction": skips the whole scroll
// story, straight to its end (the AnTigone mark and name, see
// antigone-reveal.tsx), shown finished. A paper tag on a pin like
// back-to-top's, torn off as it is clicked.
export function SkipToEnd() {
  const [ripped, setRipped] = useState(false);
  return (
    <button
      type="button"
      className="tag-button skip-to-end"
      data-ripped={ripped || undefined}
      onClick={() => {
        setRipped(true);
        window.setTimeout(() => {
          const reveal = document.querySelector<HTMLElement>('.antigone-reveal');
          if (!reveal) return;
          const rect = reveal.getBoundingClientRect();
          skipScenes();
          window.scrollTo({ top: rect.top + window.scrollY + rect.height - window.innerHeight, left: 0, behavior: 'instant' });
        }, TEAR_MS);
      }}
    >
      <span
        className="float-tag"
        onAnimationEnd={(event) => {
          if (event.animationName === 'float-tag-rip') setRipped(false);
        }}
      >
        <ChevronsDown size={18} aria-hidden="true" />
        <span className="float-tag__label">Skip introduction</span>
      </span>
    </button>
  );
}
