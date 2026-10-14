'use client';

import { useEffect } from 'react';

// Brings the top bar in once the reader has scrolled past the home page's
// opening scene (see .site:has(.home) in globals.css), and takes it away
// again on the way back up.
export function HomeHeaderReveal() {
  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      const scene = document.querySelector('.women-line-scene');
      const past = scene ? scene.getBoundingClientRect().bottom < window.innerHeight * 0.5 : window.scrollY > window.innerHeight * 0.8;
      if (past) root.dataset.homeScrolled = '';
      else delete root.dataset.homeScrolled;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      delete root.dataset.homeScrolled;
    };
  }, []);
  return null;
}
