import type { CSSProperties } from 'react';

type FigureCarouselImage = { src: string; alt?: string };

type FigureCarouselProps = {
  images?: FigureCarouselImage[];
  speedSeconds?: number;
};

const SWING_SECONDS = 2.4;

// Pure CSS, no client JS: every photo continuously travels the string's
// parabola on its own infinite loop (globals.css's figure-carousel-move
// keyframes, which animate the --figure-carousel-t custom property that
// both this component's inline style and the shared CSS top/left calc()s
// read from), rather than one photo at a time swapping in and out. Photos
// are evenly spread along that shared loop by giving each a negative
// animation-delay proportional to its index — a well-established CSS trick
// for turning one looping animation into N evenly-spaced, independently
// looping copies — so multiple photos are always visible moving together.
//
// Each photo also sets its OWN base --figure-carousel-t (its position if
// the animation weren't running) rather than relying on the @property's
// shared initial-value of 0. That matters under prefers-reduced-motion:
// globals.css's global reduced-motion rule forces every animation to a
// single near-instant iteration, and without animation-fill-mode: forwards,
// the property reverts to this base value afterward — so reduced-motion
// visitors see the photos settle into a static, evenly-spread arrangement
// instead of all piling up off-screen at t=0.
export function FigureCarousel({ images = [], speedSeconds = 20 }: FigureCarouselProps) {
  if (images.length === 0) return null;
  return (
    <div className="figure-carousel">
      <svg
        className="figure-carousel__string"
        viewBox="0 0 100 90"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* A quadratic Bezier with its control point directly above the
            midpoint is exactly a parabola, and — because its x-component is
            then exactly linear in the curve parameter — its equation is
            y = 20 + 4 * x * (1 - x) * 50 for x in [0, 1]. That is the SAME
            equation figure-carousel__photo's `top` calc() uses (see
            globals.css), which is what keeps every photo's punched hole
            sitting exactly on this drawn string as both move/scale. */}
        <path d="M 0,20 Q 50,120 100,20" />
      </svg>
      <div className="figure-carousel__track">
        {images.map((image, index) => {
          const t = index / images.length;
          const moveDelay = -(t * speedSeconds);
          const swingDelay = -(t * SWING_SECONDS);
          const style = {
            '--figure-carousel-t': t,
            animationDuration: `${speedSeconds}s, ${SWING_SECONDS}s`,
            animationDelay: `${moveDelay}s, ${swingDelay}s`,
          } as CSSProperties;
          return (
            <div key={index} className="figure-carousel__photo" style={style}>
              <img src={image.src} alt={image.alt ?? ''} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
