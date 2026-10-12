'use client';

import { useEffect, useRef } from 'react';

// Figures narrower than this are held by a single strip of tape (see
// [data-small] in globals.css) instead of one at each top corner.
const SMALL_PX = 220;

// Renders nothing: watches its parent <figure> and flags it as small, since
// CSS alone can't react to the width a fit-content element ends up with.
export function SmallFigureWatcher() {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const figure = marker.current?.parentElement;
    if (!figure) return;
    const update = () => {
      figure.toggleAttribute('data-small', figure.offsetWidth < SMALL_PX);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(figure);
    return () => observer.disconnect();
  }, []);
  return <span ref={marker} hidden />;
}
