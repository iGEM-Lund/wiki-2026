'use client';

import { useEffect, type RefObject } from 'react';
import { flushSync } from 'react-dom';

// Opens a collapsed block when the address points at something inside it
// (a Ref's figure or card, a heading link), on arriving at the page and on
// every later jump, then scrolls to the target, which the closed block had
// no room for. `open` is called inside flushSync so the target has its
// height by the time it is scrolled to.
export function useOpenOnHash(ref: RefObject<HTMLElement | null>, isOpen: boolean, open: () => void) {
  useEffect(() => {
    if (isOpen) return;
    function check() {
      const root = ref.current;
      // Ignores a text fragment (#id:~:text=…), which only picks text.
      const id = decodeURIComponent(window.location.hash.slice(1).split(':~:')[0]);
      if (!root || !id) return;
      const target = document.getElementById(id);
      if (!target || !root.contains(target)) return;
      flushSync(open);
      target.scrollIntoView();
    }
    check();
    window.addEventListener('hashchange', check);
    window.addEventListener('popstate', check);
    return () => {
      window.removeEventListener('hashchange', check);
      window.removeEventListener('popstate', check);
    };
  }, [ref, isOpen, open]);
}
