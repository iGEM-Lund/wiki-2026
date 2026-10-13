'use client';

import { Globe } from 'lucide-react';
import { useEffect, useRef } from 'react';

// Gap left between the line's ends and the link and target it joins.
const END_GAP = 6;
// How long the line keeps following its target after appearing: the
// preview sign drops and swings into place over this long (see
// .site__nav-sign in globals.css).
const SETTLE_MS = 800;

// Where the globe for an external link sits, from the end of the link:
// this far across and up (or down, when there's no room above).
const GLOBE_DX = 58;
const GLOBE_DY = 38;

// A figure's line leaves from its top edge this far in from the corner
// (of its width), clear of a rounded corner.
const FIGURE_INSET = 0.2;

const normalize = (path: string) => (path.length > 1 ? path.replace(/\/$/, '') : path);

type Target = { el: HTMLElement; end: 'side' | 'bottom' | 'globe'; cleanup?: () => void };

// What the globe's line leaves from: a box, how far in from its corner,
// and where its top and bottom edges are (a tilted card's sit a little
// inside its bounding box).
type Origin = { left: number; right: number; top: number; bottom: number; inset: number };

// While a link in the page content is hovered or focused, a dashed line
// draws itself from the link to where the link goes:
// - a section of the same page: that section's knot on the scroll string,
//   whose name lights up (only where the string is on screen, wide screens,
//   and only for sections it lists);
// - another page in the nav: a sign with that page's name dropped under
//   its nav tag (the tag itself, or the group holding it), like the
//   current page's sign (only above 48rem, where the nav is a bar);
// - another site: a globe that pops up just beside the link.
// Anything else (pages not in the nav) gets no line. The line is redrawn
// as the page scrolls, since its ends move.
export function LinkArrow() {
  const svgRef = useRef<SVGSVGElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const revealRef = useRef<SVGPathElement>(null);
  const globeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const line = lineRef.current;
    const reveal = revealRef.current;
    const globe = globeRef.current;
    if (!svg || !line || !reveal || !globe) return;
    let link: HTMLAnchorElement | null = null;
    let target: Target | null = null;
    let frame = 0;
    let settleUntil = 0;

    function knotFor(a: HTMLAnchorElement): Target | null {
      const track = document.querySelector<HTMLElement>('.scroll-string');
      if (!track || track.dataset.hidden !== undefined || getComputedStyle(track).display === 'none')
        return null;
      // Ignores a text fragment (#id:~:text=…), which only picks the text
      // to scroll to.
      const id = a.hash.split(':~:')[0];
      const notch = [...track.querySelectorAll<HTMLAnchorElement>('.scroll-string__notch')].find(
        (n) => n.hash === id,
      );
      if (!notch || notch.hidden) return null;
      notch.dataset.pointed = '';
      return { el: notch, end: 'side', cleanup: () => delete notch.dataset.pointed };
    }

    function signFor(a: HTMLAnchorElement): Target | null {
      const nav = document.querySelector<HTMLElement>('.site__nav');
      const sign = nav?.querySelector<HTMLElement>('.site__nav-sign[data-preview]');
      if (!nav || !sign || getComputedStyle(sign).display === 'none') return null;
      const path = normalize(a.pathname);
      const entry = [...nav.querySelectorAll<HTMLAnchorElement>('a[href]')].find(
        (n) => normalize(n.pathname) === path,
      );
      const tag = entry?.closest<HTMLElement>('.site__nav > *');
      const title = entry?.textContent?.trim();
      if (!entry || !tag || !title) return null;
      sign.textContent = title;
      sign.style.left = `${tag.offsetLeft + tag.offsetWidth / 2}px`;
      sign.style.top = `${tag.offsetTop + tag.offsetHeight}px`;
      sign.dataset.shown = 'true';
      // Only one sign at a time: the current page's steps aside.
      nav.dataset.previewing = '';
      return {
        el: sign,
        end: 'bottom',
        cleanup: () => {
          delete sign.dataset.shown;
          delete nav.dataset.previewing;
        },
      };
    }

    function globeFor(): Target {
      globe!.dataset.shown = '';
      svg!.dataset.external = '';
      return {
        el: globe!,
        end: 'globe',
        cleanup: () => {
          delete globe!.dataset.shown;
          delete svg!.dataset.external;
        },
      };
    }

    // What the line leaves from: a linked figure (a polaroid's white
    // card, or a plain figure's image), or the end of a text link. A link
    // that wraps is left from its first line going up, its last going
    // down, so the line never crosses the link's own words.
    function originOf(a: HTMLAnchorElement, up: boolean): Origin {
      const figure = a.closest<HTMLElement>('.figure-with-caption');
      const img = figure && a.querySelector('img');
      if (figure && img) {
        const plain = figure.classList.contains('figure-with-caption--plain');
        const box = (plain ? img : figure).getBoundingClientRect();
        // A tilted card's corners sit a little inside its bounding box:
        // start just inside its edge so the line touches it.
        const into = plain ? 0 : 4;
        return {
          left: box.left,
          right: box.right,
          top: box.top + into,
          bottom: box.bottom - into,
          inset: box.width * FIGURE_INSET,
        };
      }
      const lines = [...a.getClientRects()].filter((r) => r.width > 0);
      const line = (up ? lines[0] : lines[lines.length - 1]) ?? a.getBoundingClientRect();
      return { left: line.left, right: line.right, top: line.top, bottom: line.bottom, inset: 10 };
    }

    // Puts the globe beside where the line leaves from (see originOf): up
    // and to the right, or below when the header is in the way, or to the
    // left near the screen's right edge.
    function placeGlobe(a: HTMLAnchorElement) {
      const r = globe!.offsetWidth / 2;
      const header = document.querySelector('.site__header')?.getBoundingClientRect().bottom ?? 0;
      const above = originOf(a, true);
      const up = above.top - GLOBE_DY - r - 8 > header;
      const from = up ? above : originOf(a, false);
      const right = from.right + GLOBE_DX + r + 8 < document.documentElement.clientWidth;
      const x1 = right
        ? Math.max(from.left, from.right - from.inset)
        : Math.min(from.right, from.left + from.inset);
      const y1 = up ? from.top - 2 : from.bottom + 2;
      const cx = x1 + (right ? GLOBE_DX : -GLOBE_DX);
      const cy = y1 + (up ? -GLOBE_DY : GLOBE_DY);
      globe!.style.left = `${cx}px`;
      globe!.style.top = `${cy}px`;
      return { x1, y1, cx, cy, r, right };
    }

    function targetFor(a: HTMLAnchorElement) {
      if (a.closest('.scroll-string, .toc')) return null;
      if (a.origin !== location.origin) return /^https?:$/.test(a.protocol) ? globeFor() : null;
      if (normalize(a.pathname) === normalize(location.pathname)) return a.hash ? knotFor(a) : null;
      return signFor(a);
    }

    function draw() {
      frame = 0;
      if (!link || !target) return;
      let d: string;
      if (target.end === 'globe') {
        // One even arc, a parabola: up (or down) from the end of the link,
        // bending all the way into the globe's side, arriving horizontally.
        const { x1, y1, cx, cy, r, right } = placeGlobe(link);
        const x2 = cx + (right ? -1 : 1) * (r + END_GAP);
        d = `M${x1} ${y1} Q${x1} ${cy} ${x2} ${cy}`;
        line!.setAttribute('d', d);
        reveal!.setAttribute('d', d);
        return;
      }
      const from = link.getBoundingClientRect();
      const to = target.el.getBoundingClientRect();
      if (target.end === 'side') {
        // To the knot's right side (the string is always left of the
        // column), arriving horizontally like a thread pulled across.
        // It leaves from under the link's middle (over it when the knot
        // is higher up), so it doesn't cross the words beside the link.
        const x2 = to.left + to.width / 2 + END_GAP + 4;
        const y2 = to.top + to.height / 2;
        const down = y2 >= from.top + from.height / 2;
        const x1 = from.left + from.width / 2;
        const y1 = down ? from.bottom + 2 : from.top - 2;
        const drop = Math.min(80, Math.abs(y2 - y1) / 2) * (down ? 1 : -1);
        const pull = Math.max(40, (x1 - x2) / 2);
        d = `M${x1} ${y1} C${x1} ${y1 + drop} ${x2 + pull} ${y2} ${x2} ${y2}`;
      } else {
        // Up from over the link's middle to the sign's bottom edge,
        // arriving vertically, as if the sign's string ran on down to it.
        const x1 = from.left + from.width / 2;
        const y1 = from.top - 2;
        const x2 = to.left + to.width / 2;
        const y2 = to.bottom + END_GAP;
        const rise = Math.max(40, (y1 - y2) / 2);
        d = `M${x1} ${y1} C${x1} ${y1 - rise} ${x2} ${y2 + rise} ${x2} ${y2}`;
      }
      line!.setAttribute('d', d);
      reveal!.setAttribute('d', d);
      // Follows the target while it settles (the sign's drop).
      if (performance.now() < settleUntil) schedule();
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(draw);
    }

    function show(a: HTMLAnchorElement) {
      const next = targetFor(a);
      if (!next) return;
      hide();
      link = a;
      target = next;
      settleUntil = performance.now() + SETTLE_MS;
      draw();
      // Restarts the draw-on animation.
      delete svg!.dataset.shown;
      void svg!.getBoundingClientRect();
      svg!.dataset.shown = '';
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
    }
    function hide() {
      target?.cleanup?.();
      link = target = null;
      delete svg!.dataset.shown;
      cancelAnimationFrame(frame);
      frame = 0;
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    }

    const linkIn = (e: Event) => {
      const a = (e.target as Element).closest?.<HTMLAnchorElement>('main a[href]');
      if (a && a !== link) show(a);
    };
    const linkOut = (e: Event) => {
      const next = (e as PointerEvent | FocusEvent).relatedTarget as Node | null;
      if (link && (!next || !link.contains(next))) hide();
    };
    document.addEventListener('pointerover', linkIn);
    document.addEventListener('focusin', linkIn);
    document.addEventListener('pointerout', linkOut);
    document.addEventListener('focusout', linkOut);
    return () => {
      hide();
      document.removeEventListener('pointerover', linkIn);
      document.removeEventListener('focusin', linkIn);
      document.removeEventListener('pointerout', linkOut);
      document.removeEventListener('focusout', linkOut);
    };
  }, []);

  return (
    <>
      <svg ref={svgRef} className="link-arrow" aria-hidden="true" focusable="false">
        <defs>
          <marker
            id="link-arrow-head"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M1 1 L9 5 L1 9" />
          </marker>
          {/* The draw-on: a solid copy of the line, revealed from the link
              to the target, masks the dashed one (dashes can't also be
              animated with a dash offset). Wide enough to uncover the
              arrowhead only as it arrives. */}
          <mask id="link-arrow-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            <path ref={revealRef} className="link-arrow__reveal" pathLength={1} />
          </mask>
        </defs>
        <path
          ref={lineRef}
          className="link-arrow__line"
          markerEnd="url(#link-arrow-head)"
          mask="url(#link-arrow-reveal)"
        />
      </svg>
      {/* Where an external link goes: off the wiki, out on the web. A
          fabric patch like the Badges component's. */}
      <span ref={globeRef} className="badge badge--crimson link-arrow__globe" aria-hidden="true">
        <Globe size={18} strokeWidth={1.75} />
      </span>
    </>
  );
}
