'use client';

import { ChevronsDown } from 'lucide-react';
import { skipScenes } from './scroll-play';

// Under the home page's title, "Skip introduction": skips the whole scroll
// story, straight to its end (the AnTigone mark and name, see
// antigone-reveal.tsx), shown finished.
export function SkipToEnd() {
  return (
    <button
      type="button"
      className="skip-to-end"
      onClick={() => {
        const reveal = document.querySelector<HTMLElement>('.antigone-reveal');
        if (!reveal) return;
        const rect = reveal.getBoundingClientRect();
        skipScenes();
        window.scrollTo({ top: rect.top + window.scrollY + rect.height - window.innerHeight, left: 0, behavior: 'instant' });
      }}
    >
      Skip introduction
      <ChevronsDown size={18} aria-hidden="true" />
    </button>
  );
}
