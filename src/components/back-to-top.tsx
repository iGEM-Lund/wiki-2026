'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

const SCROLL_THRESHOLD = 400;

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > SCROLL_THRESHOLD);
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
