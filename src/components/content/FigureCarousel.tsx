'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

type FigureCarouselImage = { src: string; alt?: string };

type FigureCarouselProps = {
  images?: FigureCarouselImage[];
  speedSeconds?: number;
};

// Card size scales with the carousel's own width (so a phone gets smaller
// cards instead of overlapping full-size ones), capped at the desktop size.
const MAX_CARD_W = 260;
const MIN_CARD_W = 150;
const CARD_W_FRACTION = 0.55;
const CARD_RATIO = 320 / 260;
// Minimum horizontal gap between two neighbouring cards. Spacing never
// drops below cardW + GAP_PX, which is what rules out overlap at any width.
const GAP_PX = 24;
// Extra off-screen distance past each end of the string, so a card is fully
// hidden (swing and shadow included) before it wraps to the other side.
const EDGE_MARGIN = 24;
// String geometry, shared with the SVG path below: the string sits
// STRING_BASE px from the top at both ends and sags SAG px at the middle.
// HOLE_OFFSET is where the punched hole sits below each card's top edge
// (must match the 12px in globals.css's photo-half mask and ring).
const STRING_BASE = 20;
const SAG = 60;
const HOLE_OFFSET = 12;
const SWING_SECONDS = 2.4;
// Reduced motion: how long each set of frozen figures stays up before the
// next set replaces it.
const SWAP_SECONDS = 5;
// Width assumed for the server render, before the real width is measured.
const DEFAULT_WIDTH = 720;
// Longest frame step the animation will take, so returning to a
// backgrounded tab doesn't make every card jump ahead.
const MAX_FRAME_SECONDS = 0.1;

type Geometry = { width: number; cardW: number; cardH: number; pitch: number };
type Position = { x: number; y: number };

function geometry(width: number): Geometry {
  const cardW = Math.round(Math.min(MAX_CARD_W, Math.max(MIN_CARD_W, width * CARD_W_FRACTION)));
  return { width, cardW, cardH: Math.round(cardW * CARD_RATIO), pitch: cardW + GAP_PX };
}

// Top-left corner of a card whose center sits at centerX px, following the
// string's parabola so the hole always lands on the drawn string. x is
// clamped only far outside the visible string (queued cards), where the
// unclamped parabola would send them hundreds of px off vertically.
function cardPosition(g: Geometry, centerX: number): Position {
  const x = Math.min(1.5, Math.max(-0.5, centerX / g.width));
  return {
    x: centerX - g.cardW / 2,
    y: STRING_BASE - HOLE_OFFSET + 4 * x * (1 - x) * SAG,
  };
}

// Frozen layout: as many cards as fit side by side without overlapping,
// evenly spread across the visible string. With more figures than slots,
// slot j shows figure (page * slots + j) mod count, so stepping `page`
// cycles every figure through; the rest are parked off-screen (still in
// the DOM, so their images stay loaded and their alt text stays readable).
function staticLayout(g: Geometry, count: number, page: number) {
  const slots = Math.max(1, Math.min(count, Math.floor((g.width + GAP_PX) / g.pitch)));
  const parked: Position = { x: -10 * g.width, y: 0 };
  const positions = new Array<Position>(count).fill(parked);
  for (let j = 0; j < slots; j++) {
    const index = (page * slots + j) % count;
    positions[index] = cardPosition(g, ((j + 0.5) * g.width) / slots);
  }
  return { positions, slots };
}

// Every card travels one shared closed loop, spaced exactly loop / count
// apart, so the spacing is always uniform. The loop is the visible string
// plus just enough off-screen room for one card to fully leave on the right
// and fully enter on the left, so a card that exits on the right reappears
// on the left right away. Only when count * pitch no longer fits in that is
// the loop lengthened, and the extra length becomes an invisible queue off
// the left end where cards wait their turn to enter.
function loopLength(g: Geometry, count: number) {
  return Math.max(g.width + g.cardW + 2 * EDGE_MARGIN, count * g.pitch);
}

// Center x where a card has fully left the string on the right; phase 0..1
// maps a card from (exitX - loop) up to exitX.
function exitX(g: Geometry) {
  return g.width + g.cardW / 2 + EDGE_MARGIN;
}

function movingPosition(g: Geometry, count: number, index: number, phase: number) {
  const u = (((phase - index / count) % 1) + 1) % 1;
  return cardPosition(g, exitX(g) - (1 - u) * loopLength(g, count));
}

// Phase that puts the first figure just inside the right end of the string
// with the rest following behind it, so the string starts out populated.
function initialPhase(g: Geometry, count: number) {
  const loop = loopLength(g, count);
  return 1 - (exitX(g) - (g.width - g.cardW / 2)) / loop;
}

// Matches globals.css: the OS setting wins, and the accessibility menu's
// data-motion attribute can additionally turn motion off.
function prefersReducedMotion() {
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.getAttribute('data-motion') === 'reduce'
  );
}

// Each photo renders as TWO identically positioned halves rather than one
// card: figure-carousel__photo-half--behind (clipped to its own left half,
// z-index below the string) and --front (clipped to its own right half,
// z-index above the string). This is what makes the string read as passing
// "through" the photo: it's the same single drawn string, with the photo
// simply stacked around it differently on each side. The two halves share a
// plain wrapper that only carries the --x/--y custom properties they both
// translate by; the wrapper deliberately has no transform, opacity or
// z-index, since any of those would give it its own stacking context and
// stop the halves from sandwiching the string.
//
// Position is driven from JS (one requestAnimationFrame loop writing --x/--y
// straight to the DOM, no React re-renders) because both the loop length
// and the card size depend on the carousel's measured width. The gentle
// swing stays a CSS animation on the halves, which the site-wide reduced
// motion rule already switches off.
export function FigureCarousel({ images = [], speedSeconds = 25 }: FigureCarouselProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const photoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const count = images.length;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || count === 0) return;

    let g = geometry(root.clientWidth || DEFAULT_WIDTH);
    let reduce = prefersReducedMotion();
    let onScreen = true;
    let phase = initialPhase(g, count);
    let page = 0;
    let frame = 0;
    let lastTime = 0;
    let swapTimer: ReturnType<typeof setInterval> | undefined;

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
      for (let i = 0; i < count; i++) positions.push(movingPosition(g, count, i, phase));
      place(positions);
    }

    function placeStatic() {
      const layout = staticLayout(g, count, page);
      place(layout.positions);
      return layout.slots;
    }

    function tick(time: number) {
      const dt = lastTime ? Math.min(MAX_FRAME_SECONDS, (time - lastTime) / 1000) : 0;
      lastTime = time;
      // speedSeconds is the time to cross the visible string, so the speed
      // is width / speedSeconds px/s, expressed as a fraction of the loop.
      phase = (phase + (dt * g.width) / speedSeconds / loopLength(g, count)) % 1;
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
      if (reduce) {
        const slots = placeStatic();
        if (count > slots && onScreen) {
          swapTimer = setInterval(() => {
            page += 1;
            placeStatic();
          }, SWAP_SECONDS * 1000);
        }
      } else {
        placeMoving();
        if (onScreen) frame = requestAnimationFrame(tick);
      }
    }

    function applySize() {
      root!.style.setProperty('--card-w', `${g.cardW}px`);
      root!.style.setProperty('--card-h', `${g.cardH}px`);
    }

    applySize();
    start();

    const resize = new ResizeObserver(() => {
      const width = root.clientWidth;
      if (!width || width === g.width) return;
      g = geometry(width);
      applySize();
      start();
    });
    resize.observe(root);

    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      start();
    });
    visibility.observe(root);

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = () => {
      const next = prefersReducedMotion();
      if (next === reduce) return;
      reduce = next;
      if (!reduce) phase = initialPhase(g, count);
      start();
    };
    media.addEventListener('change', onMotionChange);
    const attributes = new MutationObserver(onMotionChange);
    attributes.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });

    return () => {
      stop();
      resize.disconnect();
      visibility.disconnect();
      attributes.disconnect();
      media.removeEventListener('change', onMotionChange);
    };
  }, [count, speedSeconds]);

  if (count === 0) return null;

  // Server render (and first client render): the frozen layout at an assumed
  // width, so nothing moves before JS has measured the real one.
  const initial = staticLayout(geometry(DEFAULT_WIDTH), count, 0).positions;

  return (
    <div className="figure-carousel" ref={rootRef}>
      <svg
        className="figure-carousel__string"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* A quadratic Bezier with its control point directly above the
            midpoint is exactly a parabola, and (because its x-component is
            then exactly linear in the curve parameter) its equation is
            y = STRING_BASE + 4 * x * (1 - x) * SAG for x in [0, 1]. That is
            the same equation cardPosition() uses, which is what keeps every
            photo's hole sitting exactly on this drawn string. */}
        <path d={`M 0,${STRING_BASE} Q 50,${STRING_BASE + 2 * SAG} 100,${STRING_BASE}`} />
      </svg>
      <div className="figure-carousel__track">
        {images.map((image, index) => {
          const wrapperStyle = {
            '--x': `${initial[index].x}px`,
            '--y': `${initial[index].y}px`,
          } as CSSProperties;
          const halfStyle: CSSProperties = { animationDelay: `${-(index / count) * SWING_SECONDS}s` };
          return (
            <div
              key={index}
              className="figure-carousel__photo"
              style={wrapperStyle}
              ref={(el) => {
                photoRefs.current[index] = el;
              }}
            >
              <div className="figure-carousel__photo-half figure-carousel__photo-half--behind" style={halfStyle}>
                <img src={image.src} alt={image.alt ?? ''} />
              </div>
              <div className="figure-carousel__photo-half figure-carousel__photo-half--front" style={halfStyle}>
                <img src={image.src} alt="" aria-hidden="true" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
