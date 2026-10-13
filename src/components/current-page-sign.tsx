'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Sign = { title: string; left: number; top: number };

// Once the page's title banner has scrolled up out of view, a sign with the
// page's title drops down on a short string from the current page's nav tag
// (a direct link, or the group holding it), so the reader still knows where
// they are. Hidden when the page has no banner or isn't in the nav, and on
// phones, where the nav is a drawer (see .site__nav-sign in globals.css).
// Rendered inside .site__nav, which is what its position is relative to.
export function CurrentPageSign() {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const [sign, setSign] = useState<Sign | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const nav = ref.current?.parentElement;
    const banner = document.querySelector<HTMLElement>('.page-title');
    const title = banner?.querySelector('.page-title__heading')?.textContent?.trim();
    const tag = nav?.querySelector<HTMLElement>(
      ':scope > a[aria-current="page"], :scope > .site__nav-group:has(a[aria-current="page"])',
    );
    setShown(false);
    if (!nav || !banner || !title || !tag) {
      setSign(null);
      return;
    }

    // Hangs from the middle of the tag's bottom edge (offsets ignore the
    // tag's tilt, which barely moves that point).
    const place = () =>
      setSign({ title, left: tag.offsetLeft + tag.offsetWidth / 2, top: tag.offsetTop + tag.offsetHeight });
    place();
    const resizeObserver = new ResizeObserver(place);
    resizeObserver.observe(nav);
    resizeObserver.observe(tag);

    // "Out of view" means fully above the bottom of the fixed header.
    const header = document.querySelector<HTMLElement>('.site__header');
    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        const coveredTop = entry.rootBounds?.top ?? headerHeight;
        setShown(!entry.isIntersecting && entry.boundingClientRect.bottom <= coveredTop);
      },
      { rootMargin: `-${headerHeight}px 0px 0px 0px` },
    );
    intersectionObserver.observe(banner);

    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [pathname]);

  return (
    <div
      ref={ref}
      className="site__nav-sign"
      aria-hidden="true"
      data-shown={sign && shown ? 'true' : undefined}
      style={sign ? { left: sign.left, top: sign.top } : undefined}
    >
      {sign?.title}
    </div>
  );
}
