import type { ReactNode } from 'react';
import { PageTitleSync } from '@/components/page-title-sync';

// The banner's bottom edge: one gentle wave across the full width, in a
// 100 x 56 viewBox that stretches sideways only (1 vertical unit = 1/16 rem).
type Wave = [number, number][];
const EDGE: Wave = [
  [0, 6],
  [30, 40],
  [70, -8],
  [100, 20],
];
// The top edge is a different wave (it crests where the bottom one dips), so
// the two don't read as a mirrored copy of each other.
const TOP_EDGE: Wave = [
  [0, 26],
  [32, -10],
  [68, 42],
  [100, 2],
];
const EDGE_HEIGHT = 56;
// The top edge gets more room (5rem) so its outermost stripes are drawn in full
// rather than running off the end of the graphic against the header.
const TOP_EDGE_HEIGHT = 80;

// Below the edge the banner breaks into stripes of the same wave, each
// thinner and further from the last, so it dissolves into the page rather
// than stopping. Given as [gap above, stripe thickness] from the edge down.
const STRIPES: [number, number][] = [
  [4, 6],
  [7, 4],
  [10, 2],
];

// The wave shifted down by `dy`, traced left to right (or back).
function wave(edge: Wave, dy: number, reverse = false): string {
  const [p0, p1, p2, p3] = edge.map(([x, y]) => `${x} ${y + dy}`);
  return reverse ? `L${p3} C${p2} ${p1} ${p0}` : `M${p0} C${p1} ${p2} ${p3}`;
}

// The parts of the banner's bottom band that show the page instead of the
// banner: every gap between stripes, and everything below the last one.
// Painting these in the page color over the banner (rather than masking the
// banner) keeps its gradient continuous across the stripes.
function edgeCutout(edge: Wave, height: number): string {
  const bands: string[] = [];
  let offset = 0;
  for (const [gap, stripe] of STRIPES) {
    bands.push(`${wave(edge, offset)} ${wave(edge, offset + gap, true)} Z`);
    offset += gap + stripe;
  }
  bands.push(`${wave(edge, offset)} L100 ${height} L0 ${height} Z`);
  return bands.join(' ');
}

const EDGE_PATH = edgeCutout(EDGE, EDGE_HEIGHT);
const TOP_EDGE_PATH = edgeCutout(TOP_EDGE, TOP_EDGE_HEIGHT);

// The page's h1: a banner spanning the whole content pane whose top and
// bottom edges are waves that break up into thinner and thinner stripes of
// themselves. As the page scrolls it collapses into a slim bar pinned under
// the header. The page's sections are listed by the scroll string (or the
// outline button on narrow screens), not here.
export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Its own element, before the banner and overlapping it, so it can
          pin under the header on its own while the banner scrolls beneath
          it (see .page-title-top in globals.css). */}
      <div className="page-title-top" aria-hidden="true">
        <svg viewBox={`0 0 100 ${TOP_EDGE_HEIGHT}`} preserveAspectRatio="none">
          <path d={TOP_EDGE_PATH} />
        </svg>
      </div>
      <div className="page-title">
        <h1 className="page-title__heading">{children}</h1>
        <svg
          className="page-title__edge"
          viewBox={`0 0 100 ${EDGE_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={EDGE_PATH} />
        </svg>
        <PageTitleSync />
      </div>
    </>
  );
}
