'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// A wrapped heading's box stays as wide as the space it was offered, even
// though text-wrap: balance leaves its lines shorter, which strands the
// flourishes at the box's edges instead of beside the text. This shrinks the
// box to its longest line (and back again whenever the layout changes).
export function HeadingText({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.width = '';
      const range = document.createRange();
      range.selectNodeContents(el);
      let widest = 0;
      for (const rect of range.getClientRects()) widest = Math.max(widest, rect.width);
      // A little slack so subpixel rounding can't push the last word down.
      if (widest > 0 && widest < el.getBoundingClientRect().width) el.style.width = `${Math.ceil(widest) + 2}px`;
    };
    fit();
    const observer = new ResizeObserver(() => fit());
    observer.observe(el.parentElement ?? el);
    document.fonts?.ready.then(fit);
    return () => observer.disconnect();
  }, [children]);

  return (
    <span ref={ref} className="section-heading__text">
      {children}
    </span>
  );
}
