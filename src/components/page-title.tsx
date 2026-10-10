import type { CSSProperties, ReactNode } from 'react';
import { PageTitleSync } from '@/components/page-title-sync';
import type { HeadingNode } from '@/lib/headings';

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
function edgeCutout(edge: Wave): string {
  const bands: string[] = [];
  let offset = 0;
  for (const [gap, stripe] of STRIPES) {
    bands.push(`${wave(edge, offset)} ${wave(edge, offset + gap, true)} Z`);
    offset += gap + stripe;
  }
  bands.push(`${wave(edge, offset)} L100 ${EDGE_HEIGHT} L0 ${EDGE_HEIGHT} Z`);
  return bands.join(' ');
}

const EDGE_PATH = edgeCutout(EDGE);
const TOP_EDGE_PATH = edgeCutout(TOP_EDGE);

// The page's h1: a banner spanning the whole content pane whose top and
// bottom edges are waves that break up into thinner and thinner stripes of
// themselves. While the page is scrolled to the top it also lists the
// page's sections under the title; as the page scrolls it collapses into a
// slim bar pinned under the header and that list pops out into the floating
// outline (TableOfContents) instead.
export function PageTitle({
  children,
  outline = [],
}: {
  children: ReactNode;
  outline?: HeadingNode[];
}) {
  return (
    <div
      className={outline.length > 0 ? 'page-title page-title--outline' : 'page-title'}
      // Room for the list before PageTitleSync has measured it: the title
      // plus a line (with spacing) per section.
      style={
        outline.length > 0
          ? ({
              '--page-title-outline-h': `${(2 + outline.length * 1.8).toFixed(1)}rem`,
            } as CSSProperties)
          : undefined
      }
    >
      <svg
        className="page-title__edge-top"
        viewBox={`0 0 100 ${EDGE_HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={TOP_EDGE_PATH} />
      </svg>
      <h1 className="page-title__heading">{children}</h1>
      {outline.length > 0 ? (
        <nav className="page-title__outline" aria-label="Page sections">
          <p className="toc__title">On this page</p>
          <ol>
            {outline.map((node) => (
              <li key={node.id}>
                <a href={`#${node.id}`}>{node.text}</a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
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
