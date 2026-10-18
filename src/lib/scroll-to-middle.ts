import type { MouseEvent } from 'react';

// Following an outline link puts its heading in the middle of the screen,
// where the outline counts it as being read (see ScrollString), rather than
// at the top, where the browser would leave it. Other links, and modified
// clicks (new tab, ...), are left to the browser.
export function scrollToMiddle(event: MouseEvent<HTMLElement>, id: string) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const el = document.getElementById(id);
  if (!el) return;
  event.preventDefault();
  const reduced =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.dataset.motion === 'reduce';
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const top = el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2;
  window.scrollTo({ top: Math.min(max, Math.max(0, top)), behavior: reduced ? 'instant' : 'smooth' });
  history.pushState(null, '', `#${id}`);
}
