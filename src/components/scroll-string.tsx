'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { easeOut, taperedPath, type Cubic } from '@/lib/tapered-stroke';

// A string running down the left of the content with a knot that rides along it as the
// page scrolls. It replaces the native scrollbar on desktop (the flag set on
// <html> below is what globals.css keys the hiding off, so a failed hydration
// never leaves the page with no scrollbar at all). The knot is draggable and
// the string itself is clickable; wheel, keyboard and touch scrolling are
// still the browser's own, so this is purely a view onto the scroll position.
//
// Drawn like the h2 ornaments (src/components/section-heading.tsx): filled,
// tapered outlines at the headings' stroke weight in --heading, with the
// knot a crossing loop shaped after their awareness ribbon.
//
// It is also the page outline on wide screens: every h2 and h3 (card titles
// included) gets a small knot of its own, placed where the big knot
// sits when the page is scrolled to that heading, and sitting on the string's
// curve. The links are read from the outline TableOfContents renders (kept in
// the DOM, hidden by CSS while this is on) so the two can't disagree.

// Same weight as the heading ornaments (1 viewBox unit = 1px here).
const WEIGHT = 3.4;
const WIDTH = 28;
const CENTER = WIDTH / 2;
// The string sways around its centre line; the knot follows the same curve.
// The knot is rigid, so the string has to be close to straight across its
// span: a few long waves rather than many short ones (the track is roughly
// 700-1000px tall, so this is a 350-500px wavelength against a ~54px knot).
const SWAY = 5;
const WAVES = 2;
// The knot's own drawing is 50 units tall; it's scaled up (about the string's
// centre line, with the stroke weight left alone) so the loop reads at a
// glance next to the thin string.
const BANNER_GAP = 12;
// Room left between the string's end and the footer once it scrolls in.
const FOOTER_GAP = 24;
const KNOT_SCALE = 1.2;
const KNOT_HEIGHT = 50 * KNOT_SCALE;

const TRACK_HEIGHT = 1000;
const TRACK_STEPS = 240;
// Length, in px, over which each end of the string thins to nothing. Short,
// and in px rather than a share of the track, so that with the knot at
// either end only its tail is in the thinning part: the knot is drawn with
// the same thinning (see `endTaper`), so its tail fades into the string's
// tip instead of ending in a square stub.
const END_TAPER = 28;

const sway = (f: number) => SWAY * Math.sin(2 * Math.PI * WAVES * f);

// Share of full weight at `y` px down a track `height` px tall.
const endTaper = (y: number, height: number) =>
  easeOut(Math.min(1, Math.max(0, y / END_TAPER))) *
  easeOut(Math.min(1, Math.max(0, (height - y) / END_TAPER)));

// The string: one tapered outline, thin at both ends and full weight between.
// The SVG is stretched to the track's height (preserveAspectRatio none), so
// only the horizontal offsets below are width-sensitive, and those aren't
// stretched. The taper is in px, so this is redrawn when the track's height
// changes; the first paint assumes 1000px.
function stringPath(height: number) {
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= TRACK_STEPS; i++) {
    const f = i / TRACK_STEPS;
    const half = (WEIGHT / 2) * endTaper(f * height, height);
    const x = CENTER + sway(f);
    const y = (f * TRACK_HEIGHT).toFixed(2);
    left.push(`${(x - half).toFixed(2)} ${y}`);
    right.push(`${(x + half).toFixed(2)} ${y}`);
  }
  return `M${left.join(' L')} L${right.reverse().join(' L')} Z`;
}
const STRING_PATH = stringPath(TRACK_HEIGHT);

// The knot: in straight down the string's centre, a loop hanging off to the
// right (the ribbon's crossing, mirrored), and back out straight down the
// centre. The approach to the crossing is a long, shallow lean rather than
// a sideways swing, and each join has matching tangents, so nothing bends
// sharply outside the loop itself.
// prettier-ignore
const KNOT_BASE: Cubic[] = [
  [[14, 0], [14, 12], [13.8, 21.5], [12, 26]],
  [[12, 26], [10, 31], [-1, 33], [-1, 26]],
  [[-1, 26], [-1, 18], [10, 21], [12, 26]],
  [[12, 26], [14, 31], [14, 40], [14, 50]],
];
const KNOT = KNOT_BASE.map((curve) =>
  curve.map(([x, y]) => [CENTER - (x - CENTER) * KNOT_SCALE, y * KNOT_SCALE]),
) as Cubic[];
const KNOT_PATH = taperedPath(KNOT, () => WEIGHT);

// A heading's own knot: the same shape, small, with a lighter stroke. Its
// loop hangs to the left, the opposite way round to the big knot's.
// The big knot is --heading-minor (crimson) at its centre and fades to
// --heading (Depths) over this many px either way, along the knot and out
// onto the string either side of it, so it reads as the string being
// warmed by the knot rather than a sticker on it.
const KNOT_FADE = 90;
const KNOT_GRADIENT = 'scroll-string-knot-gradient';
const LINE_GRADIENT = 'scroll-string-line-gradient';

// The link's box (and so its hit area); the knot is centred in it.
const BEAD_HEIGHT = 24;
// Closest two knots may sit on the string; headings that are nearer than
// this on the page (or all pinned to the end of a short scroll) are spread.
const BEAD_GAP = 30;
// Just the big knot's loop, with stubs of strand only a few units long either
// side of the crossing, short enough to stay inside the string's width. Any
// longer and, where the big knot passes over, they show beside its strand.
// prettier-ignore
const BEAD_BASE: Cubic[] = [
  [[14, 21], [13.6, 22.7], [12.8, 24.3], [12, 26]],
  KNOT_BASE[1],
  KNOT_BASE[2],
  [[12, 26], [12.8, 27.7], [13.6, 29.3], [14, 31]],
];
// Top and bottom of the drawing above, loop included.
const BEAD_SPAN: [number, number] = [19.5, 32];
// Centred in the link's box at `scale`, with a stroke `weight` px thick.
function beadPath(scale: number, weight: number) {
  return taperedPath(
    BEAD_BASE.map((curve) =>
      curve.map(([x, y]) => [
        CENTER + (x - CENTER) * scale,
        (y - (BEAD_SPAN[0] + BEAD_SPAN[1]) / 2) * scale + BEAD_HEIGHT / 2,
      ]),
    ) as Cubic[],
    () => weight,
  );
}
// h2s get the larger knot, h3s a smaller one.
const BEAD_PATHS: Record<number, string> = {
  1: beadPath(0.7, 2.6),
  2: beadPath(0.45, 2),
};

type Notch = { id: string; text: string; depth: number; parent: number };

export function ScrollString() {
  const trackRef = useRef<HTMLDivElement>(null);
  const notchesRef = useRef<HTMLElement>(null);
  const draggingRef = useRef(false);
  const pathname = usePathname();
  const [notches, setNotches] = useState<Notch[]>([]);
  // The effect's own helpers, so a change of notches can trigger a relayout.
  const relayoutRef = useRef<() => void>(() => {});

  // A new page plays its banner's arrival again: hide the string before the
  // new page first paints, so the old page's string doesn't show over it
  // until the effect below has caught up.
  useLayoutEffect(() => {
    trackRef.current?.setAttribute('data-hidden', '');
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const track = trackRef.current;
    if (!track) return;

    const header = document.querySelector<HTMLElement>('.site__header');
    const footer = document.querySelector<HTMLElement>('.site__footer');
    const knotPath = track.querySelector('.scroll-string__knot path');
    const lineGradient = track.querySelector(`#${LINE_GRADIENT}`);
    const linePath = track.querySelector('.scroll-string__line path');
    let linePathHeight = TRACK_HEIGHT;
    if (!knotPath) return;
    const nav = notchesRef.current;
    let meta: Notch[] = [];
    // Each heading's top in the document, and how far the reader's scroll
    // has to land short of it (scroll-padding-top) when following a link.
    let offsets: number[] = [];
    let scrollPad = 0;
    // The stylesheet's `bottom` (update() overrides it inline), from the
    // registered --string-bottom, which computes to px.
    const readBottomGap = () =>
      parseFloat(getComputedStyle(track).getPropertyValue('--string-bottom')) || 0;
    let bottomGap = readBottomGap();

    // The outline links TableOfContents renders: depth is the number of
    // lists they sit inside, a depth 2 link belongs to the last depth 1.
    function scan() {
      const panel = document.querySelector('.toc__panel');
      const found: Notch[] = [];
      let lastTop = -1;
      panel?.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
        let depth = 0;
        for (let el = a.parentElement; el && el !== panel; el = el.parentElement) {
          if (el.tagName === 'OL') depth++;
        }
        const id = decodeURIComponent(a.getAttribute('href')!.slice(1));
        // A heading that isn't on the page has no place on the string, and
        // placing it at the end would push every later knot down after it.
        if (!id || !document.getElementById(id)) return;
        if (depth === 1) lastTop = found.length;
        found.push({ id, text: a.textContent ?? '', depth, parent: depth === 1 ? -1 : lastTop });
      });
      const same = found.length === meta.length && found.every((n, i) => n.id === meta[i].id);
      if (!same) {
        meta = found;
        setNotches(found);
      }
    }
    function measure() {
      bottomGap = readBottomGap();
      scrollPad = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
      // Where following the link lands: some targets (the pillar sections)
      // add their own scroll-margin-top on top of the page's padding.
      offsets = meta.map((n) => {
        const el = document.getElementById(n.id);
        if (!el) return Infinity;
        const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
        return el.getBoundingClientRect().top + window.scrollY - margin;
      });
    }
    // Moves each heading's knot to where the big knot sits when the page is
    // scrolled to it, on the string's curve, and marks the heading being
    // read and its section's heading.
    function layoutNotches(max: number) {
      if (!nav || meta.length === 0) return;
      const els = Array.from(nav.children) as HTMLElement[];
      if (els.length !== meta.length) return;
      const reading = window.scrollY + 2;
      let active = -1;
      meta.forEach((_, i) => {
        if (offsets[i] - scrollPad <= reading) active = i;
      });
      if (max > 0 && window.scrollY >= max - 1 && meta.length > 0) active = meta.length - 1;
      const chain = new Set<number>();
      if (active >= 0) {
        chain.add(active);
        if (meta[active].parent >= 0) chain.add(meta[active].parent);
      }
      const ys = meta.map((_, i) => {
        const p = Math.min(1, Math.max(0, (offsets[i] - scrollPad) / max));
        return p * (trackHeight - KNOT_HEIGHT) + KNOT_HEIGHT / 2;
      });
      // Keep knots apart: forward from the top, then back from the bottom
      // for any that ended up past the end of the string. Names that wrap
      // onto more lines need more room than a knot (labels are centred on
      // their knot, so a pair needs half of each one's height).
      const halves = els.map((el) => {
        const label = el.lastElementChild as HTMLElement | null;
        return (label?.offsetHeight ?? 0) / 2;
      });
      const gap = (a: number, b: number) => Math.max(BEAD_GAP, halves[a] + halves[b] + 4);
      const order = meta.map((_, i) => i);
      for (let k = 1; k < order.length; k++) {
        ys[order[k]] = Math.max(ys[order[k]], ys[order[k - 1]] + gap(order[k - 1], order[k]));
      }
      const limit = trackHeight - BEAD_HEIGHT / 2;
      for (let k = order.length - 1; k >= 0; k--) {
        const ceil =
          k === order.length - 1 ? limit : ys[order[k + 1]] - gap(order[k], order[k + 1]);
        ys[order[k]] = Math.min(ys[order[k]], ceil);
      }

      els.forEach((el, i) => {
        el.hidden = false;
        const y = ys[i];
        const f = y / trackHeight;
        const slope =
          (SWAY * 2 * Math.PI * WAVES * Math.cos(2 * Math.PI * WAVES * f)) / trackHeight;
        el.style.transform = `translate(${sway(f).toFixed(2)}px, ${(y - BEAD_HEIGHT / 2).toFixed(1)}px)`;
        const bead = el.firstElementChild as SVGElement | null;
        if (bead)
          bead.style.transform = `rotate(${((-Math.atan(slope) * 180) / Math.PI).toFixed(2)}deg)`;
        if (chain.has(i)) el.dataset.on = '';
        else delete el.dataset.on;
        if (i === active) el.dataset.active = '';
        else delete el.dataset.active;
      });
    }
    relayoutRef.current = () => {
      measure();
      schedule();
    };
    let frame = 0;
    let trackHeight = track.clientHeight;
    function update() {
      frame = 0;
      // The string starts below the header and, while the page's title banner
      // is on screen, below that too (it scrolls, so this is re-read
      // every frame). Its bottom edge is --string-bottom in
      // globals.css above the viewport's (read from there, it's in rem, and
      // clears the back-to-top button).
      const banner = document.querySelector<HTMLElement>('.page-title');
      if (!introDone) {
        track!.dataset.hidden = '';
        return;
      }
      const top = Math.min(
        window.innerHeight * 0.7,
        Math.max(
          header ? header.getBoundingClientRect().bottom : 0,
          banner ? banner.getBoundingClientRect().bottom + BANNER_GAP : 0,
        ),
      );
      // And it ends above the footer once that scrolls into view, so the
      // string shortens instead of running over it.
      const bottom = Math.min(
        window.innerHeight - bottomGap,
        footer ? footer.getBoundingClientRect().top - FOOTER_GAP : Infinity,
      );
      track!.style.top = `${top.toFixed(1)}px`;
      track!.style.bottom = `${(window.innerHeight - bottom).toFixed(1)}px`;
      trackHeight = bottom - top;
      const max = root.scrollHeight - window.innerHeight;
      if (max <= 0 || trackHeight <= KNOT_HEIGHT) {
        track!.dataset.hidden = '';
        return;
      }
      delete track!.dataset.hidden;
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      if (linePath && Math.abs(trackHeight - linePathHeight) > 0.5) {
        linePath.setAttribute('d', stringPath(trackHeight));
        linePathHeight = trackHeight;
      }
      // The knot is redrawn every frame with each of its control points
      // moved sideways by the string's own sway at that height, so both ends
      // (and their direction) land exactly on the string however much it
      // curves across the knot's span. A rigid shift-and-tilt can't do that.
      const knotTop = p * (trackHeight - KNOT_HEIGHT);
      const warped = KNOT.map((curve) =>
        curve.map(([x, y]) => [x + sway((knotTop + y) / trackHeight), y]),
      ) as Cubic[];
      knotPath!.setAttribute(
        'd',
        taperedPath(warped, (_, [, y]) => WEIGHT * endTaper(knotTop + y, trackHeight)),
      );
      track!.style.setProperty('--p', String(p));
      // The string's colour is a gradient centred on the knot, in the
      // string drawing's own units (it's stretched to the track's height).
      if (lineGradient) {
        const centre = knotTop + KNOT_HEIGHT / 2;
        const unit = TRACK_HEIGHT / trackHeight;
        lineGradient.setAttribute('y1', ((centre - KNOT_FADE) * unit).toFixed(1));
        lineGradient.setAttribute('y2', ((centre + KNOT_FADE) * unit).toFixed(1));
      }
      layoutNotches(max);
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    // The string (and with it the page outline) waits for the title
    // banner's arrival, the brush stroke and then the title fading in, so
    // it comes in once the banner has settled. Already finished, cut short
    // or never played (reduced motion): there's nothing to wait for.
    let introDone = false;
    let cancelled = false;
    const titleBanner = document.querySelector('.page-title');
    const intro = (titleBanner?.getAnimations({ subtree: true }) ?? []).filter(
      (a) =>
        a instanceof CSSAnimation &&
        (a.animationName === 'page-title-brush' || a.animationName === 'page-title-text-in'),
    );
    Promise.all(intro.map((a) => a.finished.catch(() => undefined))).then(() => {
      if (cancelled) return;
      introDone = true;
      schedule();
    });

    root.dataset.scrollString = '';
    scan();
    measure();
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // Images, expandables and lazily rendered figures change page height
    // without a scroll or resize event.
    const observer = new ResizeObserver(() => {
      trackHeight = track.clientHeight;
      // New page content (client navigation) or a changed layout: the
      // outline and every heading's position may have moved.
      scan();
      measure();
      schedule();
    });
    observer.observe(document.body);
    observer.observe(track);

    return () => {
      cancelled = true;
      delete root.dataset.scrollString;
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
    // A new page: the outline is read again once its content is in.
  }, [pathname]);

  // The notch elements only exist after their state has rendered.
  useEffect(() => {
    relayoutRef.current();
  }, [notches]);

  // Pointer position to scroll position. The knot's centre follows the
  // pointer, so the usable travel is the track minus one knot height.
  function scrollToPointer(clientY: number, instant: boolean) {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const travel = rect.height - KNOT_HEIGHT;
    if (travel <= 0) return;
    const p = Math.min(1, Math.max(0, (clientY - rect.top - KNOT_HEIGHT / 2) / travel));
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({
      top: p * max,
      left: 0,
      behavior: instant ? 'instant' : undefined,
    });
  }

  return (
    <div
      ref={trackRef}
      className="scroll-string"
      // Hidden until the first scroll update decides it should show, so it
      // doesn't flash in and fade out on a page that's at the top.
      data-hidden=""
      onPointerDown={(e) => {
        // A heading's knot is a link: let it be one.
        if ((e.target as HTMLElement).closest('.scroll-string__notches')) return;
        draggingRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        // Grabbing the knot should not jump it; clicking bare string should.
        const onKnot = (e.target as HTMLElement).closest('.scroll-string__knot');
        if (!onKnot) scrollToPointer(e.clientY, false);
        e.currentTarget.dataset.dragging = '';
      }}
      onPointerMove={(e) => {
        if (draggingRef.current) scrollToPointer(e.clientY, true);
      }}
      onPointerUp={(e) => {
        draggingRef.current = false;
        delete e.currentTarget.dataset.dragging;
      }}
      onPointerCancel={(e) => {
        draggingRef.current = false;
        delete e.currentTarget.dataset.dragging;
      }}
    >
      <svg
        className="scroll-string__line"
        viewBox={`0 0 ${WIDTH} ${TRACK_HEIGHT}`}
        preserveAspectRatio="none"
        focusable="false"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={LINE_GRADIENT}
            gradientUnits="userSpaceOnUse"
            x1="0"
            x2="0"
            y1="0"
            y2={TRACK_HEIGHT}
          >
            <stop offset="0" style={{ stopColor: 'var(--heading)' }} />
            <stop offset="0.5" style={{ stopColor: 'var(--heading-minor)' }} />
            <stop offset="1" style={{ stopColor: 'var(--heading)' }} />
          </linearGradient>
        </defs>
        <path d={STRING_PATH} style={{ fill: `url(#${LINE_GRADIENT})` }} />
      </svg>
      <nav className="scroll-string__notches" aria-label="Page outline" ref={notchesRef}>
        {notches.map((n) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            className="scroll-string__notch"
            data-depth={n.depth}
            // Until the first layout pass places it.
            hidden
          >
            <svg
              viewBox={`0 0 ${WIDTH} ${BEAD_HEIGHT}`}
              width={WIDTH}
              height={BEAD_HEIGHT}
              aria-hidden="true"
              focusable="false"
            >
              <path d={BEAD_PATHS[n.depth] ?? BEAD_PATHS[1]} />
            </svg>
            <span className="scroll-string__label">{n.text}</span>
          </a>
        ))}
      </nav>
      <svg
        className="scroll-string__knot"
        viewBox={`0 0 ${WIDTH} ${KNOT_HEIGHT}`}
        width={WIDTH}
        height={KNOT_HEIGHT}
        focusable="false"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={KNOT_GRADIENT}
            gradientUnits="userSpaceOnUse"
            x1="0"
            x2="0"
            y1={KNOT_HEIGHT / 2 - KNOT_FADE}
            y2={KNOT_HEIGHT / 2 + KNOT_FADE}
          >
            <stop offset="0" style={{ stopColor: 'var(--heading)' }} />
            <stop offset="0.5" style={{ stopColor: 'var(--heading-minor)' }} />
            <stop offset="1" style={{ stopColor: 'var(--heading)' }} />
          </linearGradient>
        </defs>
        <path d={KNOT_PATH} style={{ fill: `url(#${KNOT_GRADIENT})` }} />
      </svg>
    </div>
  );
}
