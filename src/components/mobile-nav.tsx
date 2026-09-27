'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

// Below 48rem (see globals.css) the nav sidebar would eat most of the
// screen, so the header becomes a top bar and this toggle slides the nav in
// as a left-side drawer, same pattern as the page-outline drawer. Wider
// screens ignore `open` entirely and keep the always-visible sidebar.
export function MobileNav({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="site__nav-wrap" data-open={open} ref={wrapRef}>
      <button
        type="button"
        className="site__nav-toggle"
        aria-expanded={open}
        aria-controls="site-nav"
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {children}
    </div>
  );
}
