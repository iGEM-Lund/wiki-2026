import type { ReactNode } from 'react';
import { PageTitleSync } from '@/components/page-title-sync';

// The banner's bottom edge: one gentle wave across the full width, in a
// 100 x 56 viewBox that stretches sideways only (1 vertical unit = 1/16 rem).
const EDGE: [number, number][] = [[0, 6], [30, 40], [70, -8], [100, 20]];
const EDGE_HEIGHT = 56;

// Below the edge the banner breaks into stripes of the same wave, each
// thinner and further from the last, so it dissolves into the page rather
// than stopping. Given as [gap above, stripe thickness] from the edge down.
const STRIPES: [number, number][] = [
  [4, 6],
  [7, 4],
  [10, 2],
];

// The wave shifted down by `dy`, traced left to right (or back).
function wave(dy: number, reverse = false): string {
  const [p0, p1, p2, p3] = EDGE.map(([x, y]) => `${x} ${y + dy}`);
  return reverse ? `L${p3} C${p2} ${p1} ${p0}` : `M${p0} C${p1} ${p2} ${p3}`;
}

// The parts of the banner's bottom band that show the page instead of the
// banner: every gap between stripes, and everything below the last one.
// Painting these in the page color over the banner (rather than masking the
// banner) keeps its gradient continuous across the stripes.
function edgeCutout(): string {
  const bands: string[] = [];
  let offset = 0;
  for (const [gap, stripe] of STRIPES) {
    bands.push(`${wave(offset)} ${wave(offset + gap, true)} Z`);
    offset += gap + stripe;
  }
  bands.push(`${wave(offset)} L100 ${EDGE_HEIGHT} L0 ${EDGE_HEIGHT} Z`);
  return bands.join(' ');
}

const EDGE_PATH = edgeCutout();

// The page's h1: a banner spanning the whole content pane whose bottom edge
// is a wave that breaks up into thinner and thinner stripes of itself. As
// the page scrolls it collapses into a slim bar pinned to the top.
export function PageTitle({ children }: { children: ReactNode }) {
  return (
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
  );
}
