'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

const SCROLL_THRESHOLD = 400;
// Matches the site's one mobile breakpoint (see globals.css).
const MOBILE_QUERY = '(max-width: 48rem)';

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      // On phones, wait for a full screen height of scroll rather than a
      // fixed pixel count, so the button doesn't pop in right after the
      // fixed header scrolls out of view.
      const threshold = window.matchMedia(MOBILE_QUERY).matches
        ? window.innerHeight
        : SCROLL_THRESHOLD;
      setVisible(window.scrollY > threshold);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="back-to-top"
      aria-label="Back to top"
      // No explicit `behavior` — this inherits the root's scroll-behavior
      // (smooth, or auto under reduced motion), matching every other
      // in-page jump on the site instead of hardcoding "smooth".
      onClick={() => window.scrollTo({ top: 0, left: 0 })}
    >
      <ArrowUp size={18} />
    </button>
  );
}
