'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

// Below 48rem (see globals.css) the top bar has no room for the nav, so this
// toggle slides it in as a left-side drawer, same pattern as the
// page-outline drawer. Wider screens ignore `open` entirely and show the nav
// in the bar, its dropdowns opened by hover/focus; Escape dismisses one by
// dropping focus out of it.
export function MobileNav({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      const active = document.activeElement;
      if (
        event.key === 'Escape' &&
        active instanceof HTMLElement &&
        wrapRef.current?.contains(active)
      ) {
        active.blur();
      }
    }
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, []);

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
    <div
      className="site__nav-wrap"
      data-open={open}
      data-dismissed={dismissed}
      ref={wrapRef}
      onClick={(event) => {
        // Close on any link click, including links to the current page (no
        // pathname change). Desktop dropdowns would otherwise stay open
        // while hovered or focused, so they are suppressed until the
        // pointer leaves or focus comes back.
        const link = (event.target as HTMLElement).closest('a');
        if (!link) return;
        setOpen(false);
        setDismissed(true);
        link.blur();
      }}
      onPointerOut={(event) => {
        // Leaving a group (or the nav) re-arms the dropdowns.
        const group = (event.target as HTMLElement).closest('.site__nav-group');
        if (!group?.contains(event.relatedTarget as Node | null)) {
          setDismissed(false);
        }
      }}
      onFocus={() => setDismissed(false)}
    >
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
