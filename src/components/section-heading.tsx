import { useId, type ComponentPropsWithoutRef, type CSSProperties } from 'react';
import { HeadingText } from '@/components/heading-text';
import { centerlinePath, easeOut, taperedPath, type Cubic } from '@/lib/tapered-stroke';

// Full stroke weight in viewBox units. Both SVGs are 2rem tall over 32 units
// (1 unit = 1/16 rem), so 3.4 is ~0.12em of the 1.75rem h2: Fredoka's
// measured stem width at weight 500.
const WEIGHT = 3.4;

// Centerline of the ribbon piece: a flat lead-in from the heading text, the
// loop of the PMOS awareness ribbon, then out to the right edge at y=26.
const RIBBON: Cubic[] = [
  [[0, 26], [24, 26], [42, 25], [50, 21]],
  [[50, 21], [52, 19.33], [54, 17.67], [56, 16]],
  [[56, 16], [62, 11], [62, 3], [56, 3]],
  [[56, 3], [50, 3], [50, 11], [56, 16]],
  [[56, 16], [60, 20], [66, 26], [80, 26]],
];
// The lead-in (the first two segments) thickens up to full weight; the loop
// and everything after it stays at full weight.
const RIBBON_TAPER_SEGMENTS = 2;

// Centerline of the stretched line: from the ribbon's end, a gentle rise
// that levels off and then droops slightly at the outer edge.
const LINE: Cubic[] = [
  [[0, 26], [30, 26], [50, 16], [75, 16]],
  [[75, 16], [88, 16], [96, 18], [100, 21]],
];

const RIBBON_PATH = taperedPath(RIBBON, (u) => {
  const lead = (u * RIBBON.length) / RIBBON_TAPER_SEGMENTS;
  return WEIGHT * (lead < 1 ? easeOut(lead) : 1);
});
const LINE_PATH = taperedPath(LINE, (_, [x]) => WEIGHT * easeOut(1 - x / 100), { vertical: true });

// Draw-in (see .section-heading__head in globals.css): each piece is masked
// by strokes along its centerline that grow outward with scroll. They're
// stacked from wide to narrow, each narrower one reaching a little further,
// so where the drawing has got to the stroke thins out to nothing rather
// than stopping flat. The widest is a bit over full weight, so once drawn
// the mask covers the whole piece.
const HEAD_LAYERS = 6;
const HEAD_WEIGHT = WEIGHT + 1;
const RIBBON_CENTERLINE = centerlinePath(RIBBON);
const LINE_CENTERLINE = centerlinePath(LINE);

function Piece({ path, centerline, mask }: { path: string; centerline: string; mask: string }) {
  return (
    <>
      <mask id={mask}>
        {Array.from({ length: HEAD_LAYERS }, (_, layer) => (
          <path
            key={layer}
            className="section-heading__head"
            d={centerline}
            pathLength={1}
            strokeWidth={(HEAD_WEIGHT * (HEAD_LAYERS - layer)) / HEAD_LAYERS}
            style={{ '--layer': layer / (HEAD_LAYERS - 1) } as CSSProperties}
          />
        ))}
      </mask>
      <path d={path} mask={`url(#${mask})`} />
    </>
  );
}

// One side's ornament, drawn as the right-hand side: a single continuous
// stroke that starts at zero width near the heading text, thickens to full
// heading weight as it loops into the PMOS awareness ribbon, then thins back
// to nothing as it curves out toward the outer edge. The left side is the
// same element mirrored in CSS. It's split into two SVGs only so the ribbon
// keeps its shape while the line stretches to fill the row; they meet at
// (right edge, y=26) at full weight with a matching horizontal tangent.
// Both viewBoxes start at y=8, so the inner end (y=26) sits just below the
// row's vertical center, where it reads level with the heading text.
function Flourish({ side }: { side: 'left' | 'right' }) {
  const id = useId();
  return (
    <span className={`section-heading__flourish section-heading__flourish--${side}`} aria-hidden="true">
      <svg className="section-heading__ribbon" viewBox="0 8 80 32">
        <Piece path={RIBBON_PATH} centerline={RIBBON_CENTERLINE} mask={`${id}-ribbon`} />
      </svg>
      <svg className="section-heading__line" viewBox="0 8 100 32" preserveAspectRatio="none">
        <Piece path={LINE_PATH} centerline={LINE_CENTERLINE} mask={`${id}-line`} />
      </svg>
    </span>
  );
}

// Every h2, both MDX-authored ones and the page's own "References" heading.
// The id from rehype-slug passes through in `props`, so outline links and
// anchors keep resolving.
export function SectionHeading({ children, className, ...props }: ComponentPropsWithoutRef<'h2'>) {
  // A stray empty `##` in the content would otherwise show bare ornaments.
  if (children == null || children === '') return <h2 {...props} className={className} />;
  return (
    <h2 {...props} className={className ? `section-heading ${className}` : 'section-heading'}>
      <Flourish side="left" />
      <HeadingText>{children}</HeadingText>
      <Flourish side="right" />
    </h2>
  );
}
