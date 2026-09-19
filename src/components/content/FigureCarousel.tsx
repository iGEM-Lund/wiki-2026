import type { CSSProperties } from 'react';

type FigureCarouselImage = { src: string; alt?: string };

type FigureCarouselProps = {
  images?: FigureCarouselImage[];
  speedSeconds?: number;
};

const SWING_SECONDS = 2.4;

// Fraction of the string's own length used as an off-screen travel buffer on
// EACH side (see globals.css's figure-carousel-move keyframes, which run
// -BUFFER to 1+BUFFER, not 0 to 1) -- must match that file's keyframes
// exactly, since the delay math below assumes it. Just enough to comfortably
// clear figure-carousel__photo's 260px width (globals.css) at a typical
// article-column width, so a photo's loop restart stays off-screen.
const BUFFER = 0.4;

// Fixed spacing between consecutive photos, as a fraction of the string's
// own visible length — NOT 1 / images.length. Spacing photos evenly across
// the visible string regardless of count would force them to overlap
// whenever images.length * cardWidth exceeds the string's own width (with a
// 260px card, that's as few as 4-5 images on a typical article column) —
// this instead gives every photo the same real-world gap no matter how many
// there are: few images end up sparse with visible gaps, many end up queued
// further back in the (invisible) buffer rather than crammed on top of each
// other, like a real clothesline that just runs out of room.
const GAP = 0.35;

// Pure CSS, no client JS: every photo continuously travels the string's
// parabola on its own infinite loop (globals.css's figure-carousel-move
// keyframes, which animate the --figure-carousel-t custom property that
// both this component's inline style and the shared CSS top/left calc()s
// read from), rather than one photo at a time swapping in and out. Photos
// are evenly spread along that shared loop by giving each a negative
// animation-delay proportional to its index (offset by GAP, not 1/count —
// see GAP above) — a well-established CSS trick for turning one looping
// animation into N evenly-spaced, independently looping copies — so
// multiple photos are always visible moving together.
//
// speedSeconds is how long a photo takes to cross the VISIBLE string
// (--figure-carousel-t: 0 to 1), which is what the Keystatic field
// describes — but the actual CSS animation-duration has to cover the WIDER
// -BUFFER..1+BUFFER range at the same constant speed, so it's scaled up by
// (1 + 2*BUFFER). animation-delay is derived the same way: a photo whose
// "natural" spread position is visible-fraction t should already be
// (t + BUFFER) * speedSeconds seconds into that wider cycle at load time
// (BUFFER accounts for the off-screen head start before t=0 is reached). A
// negative delay beyond a full cycle just wraps (CSS applies it modulo the
// duration), so this works unchanged how ever many images there are.
//
// Each photo also sets its OWN base --figure-carousel-t (its position if
// the animation weren't running) rather than relying on the @property's
// shared initial-value of 0. That matters under prefers-reduced-motion:
// globals.css's global reduced-motion rule forces every animation to a
// single near-instant iteration, and without animation-fill-mode: forwards,
// the property reverts to this base value afterward — so reduced-motion
// visitors see the photos settle into a static, evenly-spread arrangement
// instead of all piling up off-screen.
export function FigureCarousel({ images = [], speedSeconds = 25 }: FigureCarouselProps) {
  if (images.length === 0) return null;
  const totalDuration = speedSeconds * (1 + 2 * BUFFER);
  return (
    <div className="figure-carousel">
      <svg
        className="figure-carousel__string"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* A quadratic Bezier with its control point directly above the
            midpoint is exactly a parabola, and — because its x-component is
            then exactly linear in the curve parameter — its equation is
            y = 20 + 4 * x * (1 - x) * 60 for x in [0, 1]. That is the SAME
            equation figure-carousel__photo's `top` calc() uses (see
            globals.css), which is what keeps every photo's punched hole
            sitting exactly on this drawn string as both move/scale. */}
        <path d="M 0,20 Q 50,140 100,20" />
      </svg>
      <div className="figure-carousel__track">
        {images.map((image, index) => {
          const t = index * GAP;
          const moveDelay = -((t + BUFFER) * speedSeconds);
          const swingDelay = -(t * SWING_SECONDS);
          const style = {
            '--figure-carousel-t': t,
            animationDuration: `${totalDuration}s, ${SWING_SECONDS}s`,
            animationDelay: `${moveDelay}s, ${swingDelay}s`,
          } as CSSProperties;
          return (
            <div key={index} className="figure-carousel__photo" style={style}>
              <img src={image.src} alt={image.alt ?? ''} />
            </div>
          );
        })}
        {/* Painted in a separate pass, after every photo, so every dot is
            guaranteed to be on top of every photo regardless of index — see
            the "in front" half of the thread-through comment on
            figure-carousel__photo's mask in globals.css. */}
        {images.map((_, index) => {
          const t = index * GAP;
          const moveDelay = -((t + BUFFER) * speedSeconds);
          const style = {
            '--figure-carousel-t': t,
            animationDuration: `${totalDuration}s`,
            animationDelay: `${moveDelay}s`,
          } as CSSProperties;
          return <div key={index} className="figure-carousel__thread-front" style={style} aria-hidden="true" />;
        })}
      </div>
    </div>
  );
}
