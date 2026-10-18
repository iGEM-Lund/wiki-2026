'use client';

import Link from 'next/link';
import { type FocusEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { useHangingPopover } from '@/lib/use-hanging-popover';
import { isOnScreen } from '@/lib/on-screen';

type CitationLinkProps = {
  href: string;
  children: ReactNode;
  // A Ref's target id: when that object is on screen as the link is
  // hovered or focused, no sign is hung; the content links' dashed line
  // points to it instead (src/components/link-arrow.tsx).
  pointTo?: string;
  // The sign is hung even when the target is on screen (a card's preview).
  alwaysSign?: boolean;
  // The target is on another page: a plain page navigation, no tearing off
  // of the sign (there is no page here to scroll).
  crossPage?: boolean;
};

// The tug and tear at the start of citation-sign-rip (its first 30%, of 1s
// in globals.css), which happen with the page still.
const TEAR_MS = 300;

function reducedMotion(): boolean {
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.dataset.motion === 'reduce'
  );
}

// The hover sign is a popover, hung under the citation by
// useHangingPopover so nothing around the citation can clip it.
//
// Following a citation tears its hover sign off the string, like the back
// to top tag: the sign is copied out to a fixed spot on the screen, where
// it's tugged and torn loose with the page held still, and only then does
// the page scroll down to the reference while the sign falls away in front
// of it (see .citation__sign--falling in globals.css). The original stays
// hidden until the pointer leaves the link or it's focused again, so the
// sign isn't hanging there again the instant it fell.
export function CitationLink({ href, children, pointTo, alwaysSign, crossPage }: CitationLinkProps) {
  const hanging = useHangingPopover('.citation__sign', ':hover, :focus-visible');

  function open(event: PointerEvent<HTMLAnchorElement> | FocusEvent<HTMLAnchorElement>) {
    const link = event.currentTarget;
    const target = pointTo ? document.getElementById(pointTo) : null;
    if (!alwaysSign && target && isOnScreen(target)) {
      link.dataset.pointing = '';
      return;
    }
    delete link.dataset.pointing;
    if (event.type === 'focus') hanging.onFocus(event as FocusEvent<HTMLAnchorElement>);
    else hanging.onPointerEnter(event as PointerEvent<HTMLAnchorElement>);
  }

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    const link = event.currentTarget;
    if (crossPage) return;
    // Pointing at an object on screen: no sign to tear, just the jump.
    if (link.dataset.pointing !== undefined) return;
    const sign = link.querySelector<HTMLElement>('.citation__sign');
    if (!sign || Number(getComputedStyle(sign).opacity) < 0.5) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    // Only tear off a sign that is really hung under the link. One that
    // isn't open (or has no box) sits at the screen's corner, and the copy
    // would fall from there.
    const box = sign.getBoundingClientRect();
    const hung = typeof sign.showPopover !== 'function' || sign.matches(':popover-open');
    if (!hung || box.width === 0 || box.height === 0) return;
    // The copy hangs in a holder that carries its shadow, which the copy's
    // own clip-path (the tear) would cut off.
    const holder = document.createElement('div');
    holder.className = 'citation__sign-fall';
    holder.style.left = `${box.left + box.width / 2}px`;
    // The box is the tilted sign's bounds; its untilted top sits half the
    // difference in height inside them.
    holder.style.top = `${box.top + (box.height - sign.offsetHeight) / 2}px`;
    const falling = sign.cloneNode(true) as HTMLElement;
    falling.removeAttribute('popover');
    falling.classList.add('citation__sign--falling');
    falling.addEventListener('animationend', () => holder.remove(), {
      once: true,
    });
    holder.append(falling);
    // Into .site rather than <body>, which the site's fonts and colours
    // are set on.
    (link.closest('.site') ?? document.body).append(holder);

    // Shown again once the pointer leaves, or the link is focused again
    // (keyboard and touch readers may never "leave"; the jump itself
    // already takes focus off the link).
    link.dataset.ripped = '';
    const done = new AbortController();
    const restore = () => {
      delete link.dataset.ripped;
      done.abort();
    };
    link.addEventListener('mouseleave', restore, { signal: done.signal });
    link.addEventListener('focus', restore, { signal: done.signal });

    if (reducedMotion()) return;
    // Hold the jump until the sign has come loose. Setting the hash, as the
    // link itself would, keeps the history entry and the :target highlight.
    event.preventDefault();
    window.setTimeout(() => {
      window.location.hash = href;
    }, TEAR_MS);
  }

  if (crossPage) {
    return (
      <Link
        className="citation"
        href={href}
        onPointerEnter={open}
        onPointerMove={hanging.onPointerMove}
        onPointerLeave={hanging.onPointerLeave}
        onFocus={open}
        onBlur={hanging.onBlur}
      >
        {children}
      </Link>
    );
  }

  return (
    <a
      className="citation"
      href={href}
      onClick={onClick}
      onPointerEnter={open}
      onPointerMove={hanging.onPointerMove}
      onPointerLeave={hanging.onPointerLeave}
      onFocus={open}
      onBlur={hanging.onBlur}
    >
      {children}
    </a>
  );
}
