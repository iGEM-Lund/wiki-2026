'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Lightbox } from './Lightbox';
import { MissingAltBanner } from './MissingAltBanner';

type FigureCarouselImage = { src: string; alt?: string };

type FigureCarouselProps = {
  images?: FigureCarouselImage[];
  speedSeconds?: number;
  // Hang every figure still on the string at once instead of travelling
  // along it (see stillLayout); speedSeconds is then unused.
  still?: boolean;
};

// Every photo gets the same image height and keeps its own aspect ratio
// (so portrait, square and landscape shots are never cropped to one shape);
// its card width follows from that. The shared height scales with the
// carousel's own width, so a phone gets smaller cards, capped at the desktop
// size. BASE_IMG_H is the desktop image height; PAD_X/PAD_Y are the card's
// white margin around the image: globals.css's .figure-carousel__card
// padding (12/10/28px).
const BASE_IMG_H = 280;
const MIN_SCALE = 0.58;
const WIDTH_FOR_FULL_SCALE = 470;
const PAD_X = 20;
const PAD_Y = 40;
// Aspect ratio (width / height) used until an image has loaded, and the
// range real ratios are clamped to, so an extreme panorama or sliver still
// gets a sensible card (only such outliers get cropped).
const DEFAULT_ASPECT = 240 / 280;
const MIN_ASPECT = 0.5;
const MAX_ASPECT = 3;
// Minimum horizontal gap between two neighbouring cards' edges. Gaps never
// drop below this, which is what rules out overlap at any width.
const GAP_PX = 24;
// Extra off-screen distance past each end of the string, so a card is fully
// hidden (swing and shadow included) before it wraps to the other side.
const EDGE_MARGIN = 24;
// String geometry, shared with the SVG path below: the string sits
// STRING_BASE px from the top at both ends and sags SAG px at the middle.
// CLIP_AT is how far below each card's top edge the string runs, where
// the clothes peg holds the card to it (must match the 10px pivot in
// globals.css's .figure-carousel__card). STRING_BASE leaves room above the
// string for the pegs, which stick up past the cards' top edges.
const STRING_BASE = 30;
const SAG = 60;
const CLIP_AT = 10;
const SWING_SECONDS = 2.4;
// Reduced motion: how long each set of frozen figures stays up before the
// next set replaces it.
const SWAP_SECONDS = 5;
// Still mode: the smallest image height a figure may shrink to so that
// everyone fits on one string; below it they wrap onto more strings.
const MIN_STILL_IMG_H = 130;
// Width assumed for the server render, before the real width is measured.
const DEFAULT_WIDTH = 720;
// Longest frame step the animation will take, so returning to a
// backgrounded tab doesn't make every card jump ahead.
const MAX_FRAME_SECONDS = 0.1;

type Size = { w: number; h: number };
type Position = { x: number; y: number };
// Everything that depends on the measured width and the images' ratios.
type Layout = {
  width: number;
  sizes: Size[];
  maxW: number;
  // Distance along the loop from the first card's center to each card's
  // center (moving layout; see computeLayout).
  offsets: number[];
  loop: number;
};

function clampAspect(aspect: number) {
  return Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, aspect));
}

// The image height every card gets at this carousel width.
function baseImgH(width: number) {
  return BASE_IMG_H * Math.min(1, Math.max(MIN_SCALE, width / WIDTH_FOR_FULL_SCALE));
}

function cardSize(width: number, aspect: number): Size {
  const a = clampAspect(aspect);
  let imgH = baseImgH(width);
  // A wide image on a narrow screen: shrink it (keeping its ratio) so the
  // card still fits on the string with a gap on either side.
  const maxImgW = width - 2 * GAP_PX - PAD_X;
  if (imgH * a > maxImgW) imgH = maxImgW / a;
  return { w: Math.round(imgH * a + PAD_X), h: Math.round(imgH + PAD_Y) };
}

// Every card travels one shared closed loop with equal gaps between card
// edges, so the spacing is always uniform whatever the cards' widths. The
// loop is the visible string plus just enough off-screen room for the
// widest card to fully leave on the right and fully enter on the left, so
// a card that exits on the right reappears on the left right away. Only
// when the cards plus minimum gaps no longer fit in that is the loop
// lengthened, and the extra length becomes an invisible queue off the left
// end where cards wait their turn to enter.
function computeLayout(width: number, aspects: number[]): Layout {
  const sizes = aspects.map((a) => cardSize(width, a));
  const maxW = Math.max(...sizes.map((s) => s.w));
  const total = sizes.reduce((sum, s) => sum + s.w, 0);
  const loop = Math.max(width + maxW + 2 * EDGE_MARGIN, total + sizes.length * GAP_PX);
  const gap = (loop - total) / sizes.length;
  const offsets = [0];
  for (let i = 1; i < sizes.length; i++) {
    offsets.push(offsets[i - 1] + sizes[i - 1].w / 2 + gap + sizes[i].w / 2);
  }
  return { width, sizes, maxW, offsets, loop };
}

// Top-left corner of a card whose center sits at centerX px, following the
// string's parabola so the peg always clips onto the drawn string.
// Past either end of the string (where the drawn string stops) a card keeps
// the end height instead of climbing the parabola out through the top edge.
function cardPosition(l: Layout, index: number, centerX: number): Position {
  const x = Math.min(1, Math.max(0, centerX / l.width));
  return {
    x: centerX - l.sizes[index].w / 2,
    y: STRING_BASE - CLIP_AT + 4 * x * (1 - x) * SAG,
  };
}

// Frozen layout: starting from figure `first`, as many cards as fit side by
// side without overlapping, spread across the visible string with equal
// gaps. Returns how many were shown, so the next set can start right after
// them and every figure gets its turn; the rest are parked off-screen
// (still in the DOM, so their images stay loaded and their alt text stays
// readable).
function staticLayout(l: Layout, first: number) {
  const count = l.sizes.length;
  const shown: number[] = [first % count];
  let used = l.sizes[first % count].w;
  while (shown.length < count) {
    const next = (first + shown.length) % count;
    if (used + GAP_PX + l.sizes[next].w > l.width) break;
    used += GAP_PX + l.sizes[next].w;
    shown.push(next);
  }
  const gap = (l.width - used) / shown.length;
  const positions = new Array<Position>(count).fill({ x: -10 * l.width, y: 0 });
  let left = gap / 2;
  for (const index of shown) {
    positions[index] = cardPosition(l, index, left + l.sizes[index].w / 2);
    left += l.sizes[index].w + gap;
  }
  return { positions, shown: shown.length };
}

// Still layout: every figure hanging on the string at once, in order,
// spread with equal gaps like staticLayout. They share one image height,
// as large as the moving size allows but small enough that each string's
// cards (plus at least GAP_PX between them) fit its width. When that would
// make them smaller than MIN_STILL_IMG_H, they're split, in order, over as
// few strings as keep them at least that big, stacked one below the other
// (each string's row is ROW_EXTRA px taller than the cards, matching the
// height globals.css gives .figure-carousel per row).
const ROW_EXTRA = 100;

type StillLayout = { sizes: Size[]; positions: Position[]; rows: number };

// Contiguous groups of card indices, split so each group's total aspect
// ratio (and so its total width at a shared height) is as even as possible.
function splitRows(aspects: number[], rows: number): number[][] {
  const total = aspects.reduce((sum, a) => sum + a, 0);
  const groups: number[][] = [[]];
  let sum = 0;
  aspects.forEach((a, i) => {
    const target = (total * groups.length) / rows;
    const current = groups[groups.length - 1];
    // Start the next group when this card lands closer to the boundary
    // past it than before it, leaving at least one card per group left.
    if (current.length > 0 && groups.length < rows && sum + a / 2 > target) groups.push([]);
    groups[groups.length - 1].push(i);
    sum += a;
  });
  return groups;
}

function stillLayout(width: number, rawAspects: number[]): StillLayout {
  const aspects = rawAspects.map(clampAspect);
  const count = aspects.length;
  // The image height at which a group of cards exactly fills the width.
  const fit = (group: number[]) =>
    (width - group.length * (PAD_X + GAP_PX)) / group.reduce((sum, i) => sum + aspects[i], 0);
  let groups = [aspects.map((_, i) => i)];
  let imgH = Math.min(baseImgH(width), fit(groups[0]));
  for (let rows = 2; rows <= count && imgH < MIN_STILL_IMG_H; rows++) {
    groups = splitRows(aspects, rows);
    imgH = Math.min(baseImgH(width), ...groups.map(fit));
  }
  const sizes = aspects.map((a) => ({ w: Math.round(imgH * a + PAD_X), h: Math.round(imgH + PAD_Y) }));
  const pitch = Math.max(...sizes.map((size) => size.h)) + ROW_EXTRA;
  const positions = new Array<Position>(count);
  groups.forEach((group, row) => {
    const used = group.reduce((sum, i) => sum + sizes[i].w, 0);
    const gap = (width - used) / group.length;
    let left = gap / 2;
    for (const i of group) {
      const centerX = left + sizes[i].w / 2;
      const x = Math.min(1, Math.max(0, centerX / width));
      positions[i] = {
        x: left,
        y: row * pitch + STRING_BASE - CLIP_AT + 4 * x * (1 - x) * SAG,
      };
      left += sizes[i].w + gap;
    }
  });
  return { sizes, positions, rows: groups.length };
}

// Center x where the widest card has fully left the string on the right;
// phase 0..1 maps a card from (exitX - loop) up to exitX.
function exitX(l: Layout) {
  return l.width + l.maxW / 2 + EDGE_MARGIN;
}

function movingPosition(l: Layout, index: number, phase: number) {
  const u = (((phase - l.offsets[index] / l.loop) % 1) + 1) % 1;
  return cardPosition(l, index, exitX(l) - (1 - u) * l.loop);
}

// Phase that puts the first figure just inside the right end of the string
// with the rest following behind it, so the string starts out populated.
function initialPhase(l: Layout) {
  return 1 - (exitX(l) - (l.width - l.sizes[0].w / 2)) / l.loop;
}

// Matches globals.css: the OS setting wins, and the accessibility menu's
// data-motion attribute can additionally turn motion off.
function prefersReducedMotion() {
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.getAttribute('data-motion') === 'reduce'
  );
}

// Each photo is a polaroid hanging from the string by a wooden clothes peg
// (drawn by globals.css on the card itself, so peg and card always swing
// together), in front of the string so the string runs in behind it.
// The card sits in a plain wrapper that only carries the --x/--y custom
// properties it translates by.
//
// Position is driven from JS (one requestAnimationFrame loop writing --x/--y
// straight to the DOM, no React re-renders) because both the loop length
// and the card sizes depend on the carousel's measured width and on each
// image's real aspect ratio, which is only known once it has loaded. The gentle
// swing stays a CSS animation on the halves, which the site-wide reduced
// motion rule already switches off.
//
// Hovering or keyboard-focusing a photo pauses the carousel (and globals.css
// zooms that photo in slightly); clicking it opens it in the Lightbox, which
// also keeps the carousel paused while open. The card is a real <button>
// (named by its image's alt text) so this works by keyboard too.
export function FigureCarousel({ images = [], speedSeconds = 25, still = false }: FigureCarouselProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const photoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hoveredRef = useRef(false);
  const lightboxOpenRef = useRef(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const count = images.length;
  // How many strings a still carousel needs (one string per row of
  // figures); a moving one always has the one.
  const [rows, setRows] = useState(() =>
    still && count > 0 ? stillLayout(DEFAULT_WIDTH, new Array<number>(count).fill(DEFAULT_ASPECT)).rows : 1,
  );

  useEffect(() => {
    lightboxOpenRef.current = openIndex !== null;
  }, [openIndex]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || count === 0) return;

    const aspects = new Array<number>(count).fill(DEFAULT_ASPECT);
    let l = computeLayout(root.clientWidth || DEFAULT_WIDTH, aspects);
    let reduce = prefersReducedMotion();
    let onScreen = true;
    let phase = initialPhase(l);
    let first = 0;
    let frame = 0;
    let lastTime = 0;
    let swapTimer: ReturnType<typeof setInterval> | undefined;
    const paused = () => hoveredRef.current || lightboxOpenRef.current;

    function place(positions: Position[]) {
      positions.forEach((p, i) => {
        const el = photoRefs.current[i];
        if (!el) return;
        el.style.setProperty('--x', `${p.x}px`);
        el.style.setProperty('--y', `${p.y}px`);
      });
    }

    function placeMoving() {
      const positions: Position[] = [];
      for (let i = 0; i < count; i++) positions.push(movingPosition(l, i, phase));
      place(positions);
    }

    function placeStatic() {
      const layout = staticLayout(l, first);
      place(layout.positions);
      return layout.shown;
    }

    function tick(time: number) {
      const dt = lastTime && !paused() ? Math.min(MAX_FRAME_SECONDS, (time - lastTime) / 1000) : 0;
      lastTime = time;
      // speedSeconds is the time to cross the visible string, so the speed
      // is width / speedSeconds px/s, expressed as a fraction of the loop.
      phase = (phase + (dt * l.width) / speedSeconds / l.loop) % 1;
      placeMoving();
      frame = requestAnimationFrame(tick);
    }

    function stop() {
      cancelAnimationFrame(frame);
      lastTime = 0;
      clearInterval(swapTimer);
      swapTimer = undefined;
    }

    function start() {
      stop();
      if (still) {
        const layout = stillLayout(l.width, aspects);
        layout.sizes.forEach((size, i) => {
          const el = photoRefs.current[i];
          if (!el) return;
          el.style.setProperty('--w', `${size.w}px`);
          el.style.setProperty('--h', `${size.h}px`);
        });
        root!.style.setProperty('--card-h', `${Math.max(...layout.sizes.map((s) => s.h))}px`);
        place(layout.positions);
        setRows(layout.rows);
        return;
      }
      if (reduce) {
        let shown = placeStatic();
        if (count > shown && onScreen) {
          swapTimer = setInterval(() => {
            if (paused()) return;
            first = (first + shown) % count;
            shown = placeStatic();
          }, SWAP_SECONDS * 1000);
        }
      } else {
        placeMoving();
        if (onScreen) frame = requestAnimationFrame(tick);
      }
    }

    function applySizes() {
      l.sizes.forEach((size, i) => {
        const el = photoRefs.current[i];
        if (!el) return;
        el.style.setProperty('--w', `${size.w}px`);
        el.style.setProperty('--h', `${size.h}px`);
      });
      root!.style.setProperty('--card-h', `${Math.max(...l.sizes.map((s) => s.h))}px`);
    }

    // Recompute the layout (new width or a newly known aspect ratio) while
    // keeping the carousel where it is along its loop.
    function relayout(width: number) {
      l = computeLayout(width, aspects);
      applySizes();
      start();
    }

    applySizes();
    start();

    const resize = new ResizeObserver(() => {
      const width = root.clientWidth;
      if (width && width !== l.width) relayout(width);
    });
    resize.observe(root);

    // Read each image's real aspect ratio as soon as it is known (it may
    // already have loaded before this effect ran).
    const imageCleanups: (() => void)[] = [];
    photoRefs.current.slice(0, count).forEach((el, i) => {
      const img = el?.querySelector('img');
      if (!img) return;
      const read = () => {
        if (!img.naturalWidth || !img.naturalHeight) return;
        const aspect = img.naturalWidth / img.naturalHeight;
        if (Math.abs(aspect - aspects[i]) < 0.001) return;
        aspects[i] = aspect;
        relayout(l.width);
      };
      if (img.complete) read();
      img.addEventListener('load', read);
      imageCleanups.push(() => img.removeEventListener('load', read));
    });

    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      start();
    });
    visibility.observe(root);

    // Pause while the pointer is over a photo or keyboard focus is on one.
    // Events bubble up from the cards, so one listener on the root covers
    // every photo.
    const onPhoto = (target: EventTarget | null) =>
      target instanceof Element && target.closest('.figure-carousel__card') !== null;
    const onPointerOver = (event: PointerEvent) => {
      hoveredRef.current = onPhoto(event.target);
    };
    const onPointerLeave = () => {
      hoveredRef.current = false;
    };
    // Keyboard focus only (:focus-visible): a mouse click also focuses the
    // button, and focus returns to it when the Lightbox closes, which would
    // otherwise leave the carousel paused until the visitor clicked elsewhere.
    const onFocusIn = (event: FocusEvent) => {
      hoveredRef.current =
        onPhoto(event.target) && (event.target as Element).matches(':focus-visible');
    };
    const onFocusOut = () => {
      hoveredRef.current = false;
    };
    root.addEventListener('pointerover', onPointerOver);
    root.addEventListener('pointerleave', onPointerLeave);
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = () => {
      const next = prefersReducedMotion();
      if (next === reduce) return;
      reduce = next;
      if (!reduce) phase = initialPhase(l);
      start();
    };
    media.addEventListener('change', onMotionChange);
    const attributes = new MutationObserver(onMotionChange);
    attributes.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });

    return () => {
      stop();
      imageCleanups.forEach((cleanup) => cleanup());
      resize.disconnect();
      visibility.disconnect();
      attributes.disconnect();
      media.removeEventListener('change', onMotionChange);
      root.removeEventListener('pointerover', onPointerOver);
      root.removeEventListener('pointerleave', onPointerLeave);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
    };
  }, [count, speedSeconds, still]);

  if (count === 0) return null;

  // Server render (and first client render): the frozen (or still) layout
  // at an assumed width, so nothing moves before JS has measured the real
  // one.
  const defaultAspects = new Array<number>(count).fill(DEFAULT_ASPECT);
  const initialLayout = computeLayout(DEFAULT_WIDTH, defaultAspects);
  const initialStill = still ? stillLayout(DEFAULT_WIDTH, defaultAspects) : null;
  const initial = initialStill ? initialStill.positions : staticLayout(initialLayout, 0).positions;
  const initialSizes = initialStill ? initialStill.sizes : initialLayout.sizes;

  return (
    <div
      className={still ? 'figure-carousel figure-carousel--still' : 'figure-carousel'}
      ref={rootRef}
      style={{ '--rows': rows } as CSSProperties}
    >
      {Array.from({ length: rows }, (_, row) => (
        <svg
          key={row}
          className="figure-carousel__string"
          style={{ '--row': row } as CSSProperties}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* A quadratic Bezier with its control point directly above the
              midpoint is exactly a parabola, and (because its x-component
              is then exactly linear in the curve parameter) its equation is
              y = STRING_BASE + 4 * x * (1 - x) * SAG for x in [0, 1]. That
              is the same equation cardPosition() (and stillLayout) use,
              which is what keeps every photo's peg sitting exactly on this
              drawn string. */}
          <path d={`M 0,${STRING_BASE} Q 50,${STRING_BASE + 2 * SAG} 100,${STRING_BASE}`} />
        </svg>
      ))}
      <div className="figure-carousel__track">
        {images.map((image, index) => {
          const wrapperStyle = {
            '--x': `${initial[index].x}px`,
            '--y': `${initial[index].y}px`,
            '--w': `${initialSizes[index].w}px`,
            '--h': `${initialSizes[index].h}px`,
          } as CSSProperties;
          const cardStyle: CSSProperties = { animationDelay: `${-(index / count) * SWING_SECONDS}s` };
          return (
            <div
              key={index}
              className="figure-carousel__photo"
              style={wrapperStyle}
              ref={(el) => {
                photoRefs.current[index] = el;
              }}
              onClick={() => setOpenIndex(index)}
            >
              <button
                type="button"
                className="figure-carousel__card"
                style={cardStyle}
                aria-label={image.alt ? undefined : `Enlarge figure ${index + 1}`}
              >
                <img src={image.src} alt={image.alt ?? ''} />
                <MissingAltBanner alt={image.alt} />
              </button>
            </div>
          );
        })}
      </div>
      {openIndex !== null ? (
        <Lightbox src={images[openIndex].src} alt={images[openIndex].alt} onClose={() => setOpenIndex(null)} />
      ) : null}
    </div>
  );
}
