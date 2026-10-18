import { compileMdxSnippet } from './compile-mdx-snippet';
import { SliceWheelClient, type SliceWheelClientSlice } from './SliceWheelClient';
import type { ReferenceLookup } from '@/lib/references';

type SliceWheelSlice = { title: string; body: string };
type SliceWheelProps = {
  slices?: SliceWheelSlice[];
  // Draws an arrow in every slice pointing clockwise into the next, for
  // cycles (Design, Build, Test, Learn).
  cycle?: boolean;
  // Injected by src/lib/mdx/render.ts, same as WorldMap: slice bodies are
  // raw MDX and may embed <Citation>.
  referenceLookup?: ReferenceLookup;
};

// The wheel is drawn in a viewBox centred on the origin, so turning it to a
// chosen slice (see .slice-wheel__spin in globals.css) is a rotation about
// the hub. It is a round patch, made the same way as the pillars'
// (.pillars__link): an overlocked edge out to RADIUS, a running stitch just
// inside it, and the slices sewn on inside that, out to SLICE_RADIUS.
const RADIUS = 90;
const OVERLOCK_WIDTH = 4;
const STITCH_RADIUS = 83.5;
const SLICE_RADIUS = 80;

function point(angle: number, radius: number): [number, number] {
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// A sector from the hub out to `radius`, or the whole circle for a lone
// slice. Neighbouring slices share their straight sides, so their outlines
// lie on top of each other and read as one seam.
function sectorPath(start: number, end: number, radius: number, whole: boolean): string {
  const r = round(radius);
  if (whole) return `M ${r} 0 A ${r} ${r} 0 1 1 ${-r} 0 A ${r} ${r} 0 1 1 ${r} 0 Z`;
  const [x0, y0] = point(start, radius);
  const [x1, y1] = point(end, radius);
  const largeArc = end - start > Math.PI ? 1 : 0;
  return `M 0 0 L ${round(x0)} ${round(y0)} A ${r} ${r} 0 ${largeArc} 1 ${round(x1)} ${round(y1)} Z`;
}

// A cycle's arrows: one per slice, a curved shaft round the empty ring
// between the hub and the labels, its head pointing clockwise at the next
// slice. ARROW_GAP keeps each arrow off the seams on either side, and the
// head is ARROW_HEAD long and twice ARROW_HALF_WIDTH wide.
const ARROW_GAP = 0.14;
const ARROW_HEAD = 7;
const ARROW_HALF_WIDTH = 4.5;

function cycleArrow(start: number, end: number, radius: number): { shaft: string; head: string } {
  const gap = Math.min(ARROW_GAP, (end - start) * 0.15);
  const from = start + gap;
  const to = end - gap;
  // The shaft stops where the head's base begins, so the round cap never
  // pokes out past the head's point.
  const headAngle = ARROW_HEAD / radius;
  const [x0, y0] = point(from, radius);
  const [x1, y1] = point(to - headAngle, radius);
  const r = round(radius);
  const largeArc = to - headAngle - from > Math.PI ? 1 : 0;
  const tip = point(to, radius);
  const outer = point(to - headAngle, radius + ARROW_HALF_WIDTH);
  const inner = point(to - headAngle, radius - ARROW_HALF_WIDTH);
  return {
    shaft: `M ${round(x0)} ${round(y0)} A ${r} ${r} 0 ${largeArc} 1 ${round(x1)} ${round(y1)}`,
    head: `M ${[tip, outer, inner].map(([x, y]) => `${round(x)} ${round(y)}`).join(' L ')} Z`,
  };
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

// Every line of a label follows its own arc, concentric with the wheel, so
// titles curve with the slice. The top half's arcs run clockwise and the
// bottom half's counterclockwise, which keeps text upright and left to right
// on both; it also flips which line sits outermost, since on the bottom
// half the top of the text faces the hub.
function arcPath(start: number, end: number, radius: number, bottom: boolean): string {
  const [x0, y0] = point(start, radius);
  const [x1, y1] = point(end, radius);
  const largeArc = end - start > Math.PI ? 1 : 0;
  const r = round(radius);
  return bottom
    ? `M ${round(x1)} ${round(y1)} A ${r} ${r} 0 ${largeArc} 0 ${round(x0)} ${round(y0)}`
    : `M ${round(x0)} ${round(y0)} A ${r} ${r} 0 ${largeArc} 1 ${round(x1)} ${round(y1)}`;
}

const LINE_HEIGHT = 1.2;
const MAX_LINES = 3;
const MIN_FONT_SIZE = 4;

export async function SliceWheel({ slices = [], cycle = false, referenceLookup = {} }: SliceWheelProps) {
  const count = slices.length;
  if (count === 0) return null;

  const step = (2 * Math.PI) / count;
  // With one or two slices an arc would be a half circle or more and the
  // text would run sideways, so those keep straight, centred labels.
  const curved = count >= 3;
  const straightRadius = count === 1 ? 0 : SLICE_RADIUS * 0.55;
  // Curved labels hang from just inside the slice's outline: every label's
  // outermost line sits on this same arc.
  const outerLineRadius = (fontSize: number) => SLICE_RADIUS - 6 - fontSize / 2;

  // How much text a line holds at this font size: the arc's length (less
  // some padding off the seams between slices) when curved, a fixed width
  // when straight. A curved label's lines get shorter toward the hub, so a
  // label of `lineCount` lines is measured at its innermost one.
  const lineCapacity = (fontSize: number, lineCount: number) =>
    curved
      ? (outerLineRadius(fontSize) - (lineCount - 1) * LINE_HEIGHT * fontSize) * step * 0.8
      : SLICE_RADIUS * 1.3;

  // Wraps a title into as few lines as it fits in at this font size, or
  // null if even MAX_LINES lines (or a single word too long to wrap) don't.
  const wrapAt = (title: string, fontSize: number): string[] | null => {
    for (let lineCount = 1; lineCount <= MAX_LINES; lineCount++) {
      const capacity = lineCapacity(fontSize, lineCount);
      const lines = wrapTitle(title, Math.max(1, Math.floor(capacity / (fontSize * CHAR_WIDTH))));
      if (lines.length <= lineCount && lines.every((line) => line.length * fontSize * CHAR_WIDTH <= capacity)) {
        return lines;
      }
    }
    return null;
  };

  // One font size for the whole wheel, so every slice reads the same: the
  // largest at which every title fits.
  let fontSize = count > 8 ? 7 : 9;
  let wrapped = slices.map((slice) => wrapAt(slice.title ?? '', fontSize));
  while (fontSize > MIN_FONT_SIZE && wrapped.includes(null)) {
    fontSize -= 0.25;
    wrapped = slices.map((slice) => wrapAt(slice.title ?? '', fontSize));
  }

  // One ring for every slice's arrow: halfway out, or further in if a long
  // label reaches down that far. Only with curved labels: one or two
  // slices' straight, centred labels sit right where the ring would be.
  const deepestLabel = Math.max(...wrapped.map((lines) => lines?.length ?? MAX_LINES));
  const arrowRadius =
    cycle && curved
      ? Math.min(
          SLICE_RADIUS * 0.45,
          outerLineRadius(fontSize) - (deepestLabel - 1) * LINE_HEIGHT * fontSize - fontSize / 2 - ARROW_HALF_WIDTH - 2,
        )
      : 0;

  const rendered: SliceWheelClientSlice[] = [];
  for (const [index, slice] of slices.entries()) {
    // Start at 12 o'clock and go clockwise, the way a clock (and most
    // readers) would count the slices.
    const start = -Math.PI / 2 + index * step;
    const middle = start + step / 2;
    // Past MIN_FONT_SIZE a title that still doesn't fit just overflows.
    const lines = wrapped[index] ?? wrapTitle(slice.title ?? '', 1);
    const lineGap = LINE_HEIGHT * fontSize;
    // Both ways round, since the wheel turns: the title is set for the top
    // half, or for the bottom half, depending on where the slice ends up.
    const arcsFor = (bottom: boolean) =>
      lines.map((_, line) => {
        // Line 0 is outermost on the top half; on the bottom half, where
        // the text's top faces the hub, the last line is.
        const depth = bottom ? lines.length - 1 - line : line;
        return arcPath(start, start + step, outerLineRadius(fontSize) - depth * lineGap, bottom);
      });
    const arcs = curved ? { top: arcsFor(false), bottom: arcsFor(true) } : null;
    const [labelX, labelY] = point(middle, straightRadius);
    const Body = await compileMdxSnippet(slice.body ?? '', referenceLookup, 'slice-wheel__error', 'slice');
    rendered.push({
      id: `slice-${index}`,
      title: slice.title,
      path: sectorPath(start, start + step, SLICE_RADIUS, count === 1),
      middle: round((middle * 180) / Math.PI),
      arrow: arrowRadius > 0 ? cycleArrow(start, start + step, arrowRadius) : null,
      label: { x: round(labelX), y: round(labelY), lines, arcs, fontSize },
      body: <Body />,
    });
  }

  return (
    <SliceWheelClient
      radius={RADIUS}
      overlockWidth={OVERLOCK_WIDTH}
      stitchRadius={STITCH_RADIUS}
      slices={rendered}
    />
  );
}
