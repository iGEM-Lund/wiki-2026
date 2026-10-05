import { compileMdxSnippet } from './compile-mdx-snippet';
import { SliceWheelClient, type SliceWheelClientSlice } from './SliceWheelClient';

type SliceWheelSlice = { title: string; body: string };
type SliceWheelProps = {
  slices?: SliceWheelSlice[];
  // Injected by src/lib/mdx/render.ts, same as WorldMap: slice bodies are
  // raw MDX and may embed <Citation>.
  referenceLookup?: Record<string, { shortForm: string }>;
};

// The wheel is drawn in a viewBox centred on the origin, so a slice's hover
// scale (see .slice-wheel__slice in globals.css) grows it straight outward
// from the hub. RADIUS leaves headroom inside the viewBox for that growth.
const RADIUS = 90;

// Brand kit pairs, cycled around the wheel: teal and pink alternate, so
// neighbours never share a hue family. `ink` is the label colour on that
// fill, and the popup header reuses both so it reads as "this slice, opened".
const PALETTE = [
  { fill: 'var(--color-peacock)', ink: 'var(--color-pearl)' },
  { fill: 'var(--color-rose)', ink: 'var(--color-depths)' },
  { fill: 'var(--color-depths)', ink: 'var(--color-pearl)' },
  { fill: 'var(--color-blush)', ink: 'var(--color-crimson)' },
];

function point(angle: number, radius: number): [number, number] {
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function slicePath(start: number, end: number): string {
  const [x0, y0] = point(start, RADIUS);
  const [x1, y1] = point(end, RADIUS);
  const largeArc = end - start > Math.PI ? 1 : 0;
  return `M 0 0 L ${round(x0)} ${round(y0)} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${round(x1)} ${round(y1)} Z`;
}

// SVG text doesn't wrap, so titles are broken into lines here, greedily by
// an estimated character width: Fredoka averages a little under 0.6em per
// character. An estimate is enough, since the label only needs to stay
// inside its slice, not fit it exactly.
const CHAR_WIDTH = 0.58;

function wrapTitle(title: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of title.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function SliceWheel({ slices = [], referenceLookup = {} }: SliceWheelProps) {
  const count = slices.length;
  if (count === 0) return null;

  const step = (2 * Math.PI) / count;
  // Labels sit a little past half the radius, where a slice is wide enough
  // to hold them; a lone slice (the whole disc) centres its label instead.
  const labelRadius = count === 1 ? 0 : count === 2 ? RADIUS * 0.5 : RADIUS * 0.6;
  const labelWidth =
    count <= 2 ? RADIUS * 1.2 : Math.min(RADIUS, 2 * labelRadius * Math.sin(step / 2) * 0.85);
  const baseFontSize = count > 8 ? 7 : 9;
  const maxChars = Math.max(6, Math.floor(labelWidth / (baseFontSize * CHAR_WIDTH)));

  const rendered: SliceWheelClientSlice[] = [];
  for (const [index, slice] of slices.entries()) {
    // Start at 12 o'clock and go clockwise, the way a clock (and most
    // readers) would count the slices.
    const start = -Math.PI / 2 + index * step;
    const middle = start + step / 2;
    const [labelX, labelY] = point(middle, labelRadius);
    const [nudgeX, nudgeY] = point(middle, count === 1 ? 0 : 4);
    // With a slice count of 4n + 1 the cycle would put the last slice next
    // to a same-coloured first one; give it Depths instead.
    const colorIndex = count > 1 && index === count - 1 && index % PALETTE.length === 0 ? 2 : index % PALETTE.length;
    const lines = wrapTitle(slice.title, maxChars);
    // A single word longer than a line can't wrap; shrink that label until
    // its longest line fits instead of letting it spill into the next slice.
    const longest = Math.max(...lines.map((line) => line.length), 1);
    const fontSize = round(Math.max(5, Math.min(baseFontSize, labelWidth / (longest * CHAR_WIDTH))));
    const Body = await compileMdxSnippet(slice.body ?? '', referenceLookup, 'slice-wheel__error', 'slice');
    rendered.push({
      id: `slice-${index}`,
      title: slice.title,
      path: count === 1 ? null : slicePath(start, start + step),
      color: PALETTE[colorIndex],
      label: { x: round(labelX), y: round(labelY), lines, fontSize },
      nudge: { x: round(nudgeX), y: round(nudgeY) },
      body: <Body />,
    });
  }

  return <SliceWheelClient radius={RADIUS} slices={rendered} />;
}
