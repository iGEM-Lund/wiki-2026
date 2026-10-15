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

// The wheel is drawn in a viewBox centred on the origin, so a hovered
// slice's scale (see .slice-wheel__lifted in globals.css) grows it straight
// out from the hub. It is a round patch, made the same way as the pillars'
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

// How far the text keeps off the lifted slice's outline, in wheel units.
const TEXT_MARGIN = 5;
// The text's size and leading, in wheel units (see .slice-wheel__text-content
// in globals.css), and a rough average letter width for it: enough to guess
// how much of the wedge a slice's text will fill.
const TEXT_FONT_SIZE = 6;
const TEXT_LINE_HEIGHT = 1.35;
const TEXT_CHAR_WIDTH = 0.55;
// Height of each step of the staircase the text is wrapped to.
const TEXT_ROW = 2;

// Where a horizontal line at `y` enters and leaves a convex polygon, or
// null if it misses it.
function span(polygon: [number, number][], y: number): [number, number] | null {
  let left = Infinity;
  let right = -Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const [x0, y0] = polygon[i];
    const [x1, y1] = polygon[(i + 1) % polygon.length];
    if ((y < Math.min(y0, y1)) || (y > Math.max(y0, y1)) || y0 === y1) continue;
    const x = x0 + ((y - y0) / (y1 - y0)) * (x1 - x0);
    left = Math.min(left, x);
    right = Math.max(right, x);
  }
  return left <= right ? [left, right] : null;
}

// The box the text goes in, and the staircase of floats down either side
// of it that wrap the text to the wedge between `inner` and `outer` (less
// TEXT_MARGIN off its straight sides). CSS can only wrap text around
// floats, and a float's shape-outside is clipped to its own box, so the
// shape is built from one thin pair of floats per TEXT_ROW: each as wide as
// the part of that row outside the wedge (see SliceWheelClient).
// Rows before `top` are blocked off whole, which moves the text down to sit
// around the middle of the wedge rather than at its top: how far is a guess
// from the length of the slice's text, measured against the room each row
// has.
function textRegion(start: number, end: number, inner: number, outer: number, body: string) {
  const outerTrim = Math.asin(TEXT_MARGIN / outer);
  const offset = (angle: number, radius: number, side: 1 | -1): [number, number] => {
    const [x, y] = point(angle, radius);
    // Inward, square to the wedge's straight side at `angle`.
    return [x - side * Math.sin(angle) * TEXT_MARGIN, y + side * Math.cos(angle) * TEXT_MARGIN];
  };
  // The wedge, its inner edge a straight chord. With one or two slices it
  // would be half the wheel or more, and no longer convex: there the text
  // takes the part of the circle past a chord `inner` out from the hub,
  // square to the slice's middle, which keeps it clear of the straight,
  // centred title.
  const samples = 16;
  const polygon: [number, number][] = [];
  if (end - start < Math.PI - 1e-6) {
    polygon.push(offset(start, inner, 1));
    for (let i = 0; i <= samples; i++) {
      polygon.push(point(start + outerTrim + ((end - start - 2 * outerTrim) * i) / samples, outer));
    }
    polygon.push(offset(end, inner, -1));
  } else {
    const middle = (start + end) / 2;
    const half = Math.acos(Math.min(1, inner / outer));
    for (let i = 0; i <= samples; i++) {
      polygon.push(point(middle - half + (2 * half * i) / samples, outer));
    }
  }

  const xs = polygon.map(([x]) => x);
  const ys = polygon.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const width = Math.max(...xs) - x;
  const height = Math.max(...ys) - y;

  // Each row's room is what's left at both its top and its bottom edge,
  // so no line of text pokes out where the wedge narrows.
  const rowCount = Math.ceil(height / TEXT_ROW);
  const rooms: [number, number][] = [];
  for (let row = 0; row < rowCount; row++) {
    const top = span(polygon, y + row * TEXT_ROW);
    const bottom = span(polygon, y + Math.min((row + 1) * TEXT_ROW, height));
    const left = Math.max(top?.[0] ?? Infinity, bottom?.[0] ?? Infinity) - x;
    const right = x + width - Math.min(top?.[1] ?? -Infinity, bottom?.[1] ?? -Infinity);
    rooms.push(left + right < width ? [left, right] : [width / 2, width / 2]);
  }

  // How much area the text needs: its letters at their average width over
  // a full line height, plus a quarter for ragged line ends and breaks.
  const letters = body.replace(/<[^>]*>|[*_#`>\[\]()-]/g, '').length;
  const needed = letters * TEXT_FONT_SIZE * TEXT_CHAR_WIDTH * TEXT_FONT_SIZE * TEXT_LINE_HEIGHT * 1.25;
  const area = (row: number) => Math.max(0, width - rooms[row][0] - rooms[row][1]) * TEXT_ROW;
  // The first and last rows with any room at all, and the row the wedge's
  // area is centred on: the text's block is centred there, as far as the
  // wedge's own ends allow.
  const open = rooms.map((_, row) => area(row) > 0);
  const first = open.indexOf(true);
  const last = open.lastIndexOf(true);
  let total = 0;
  let weighted = 0;
  for (let row = first; row <= last; row++) {
    total += area(row);
    weighted += area(row) * row;
  }
  const centre = total > 0 ? weighted / total : (first + last) / 2;
  let top = first;
  if (needed < total) {
    // Grow a window of rows out from the centre, a row at a time on
    // whichever side keeps it closer to centred, until it holds the text.
    let from = Math.round(centre);
    let to = from;
    let held = area(from);
    while (held < needed && (from > first || to < last)) {
      const growUp = from > first && (to >= last || centre - from <= to - centre);
      if (growUp) held += area(--from);
      else held += area(++to);
    }
    top = from;
  }
  const rows = rooms.map(([left, right], row) =>
    row < top ? { left: round(width / 2), right: round(width / 2) } : { left: round(left), right: round(right) },
  );

  return { x: round(x), y: round(y), width: round(width), height: round(height), row: TEXT_ROW, rows };
}

const LINE_HEIGHT = 1.2;
// On hover a slice's title scales down toward the hub by this much, to leave
// the rest of the slice to the text (see .slice-wheel__lifted-title).
const TITLE_SCALE = 0.7;
const MAX_LINES = 3;
const MIN_FONT_SIZE = 4;

export async function SliceWheel({ slices = [], cycle = false, referenceLookup = {} }: SliceWheelProps) {
  const count = slices.length;
  if (count === 0) return null;

  const step = (2 * Math.PI) / count;
  // How far past the patch a hovered slice reaches: more slices, narrower
  // wedges, so a longer reach to keep the same room for text.
  const extension = count <= 5 ? 100 : count <= 8 ? 115 : 130;
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
    const bottom = Math.sin(middle) > 1e-6;
    const lineGap = LINE_HEIGHT * fontSize;
    const arcs = curved
      ? lines.map((_, line) => {
          // Line 0 is outermost on the top half; on the bottom half, where
          // the text's top faces the hub, the last line is.
          const depth = bottom ? lines.length - 1 - line : line;
          return arcPath(start, start + step, outerLineRadius(fontSize) - depth * lineGap, bottom);
        })
      : null;
    // Hovering lifts the slice off the patch and stretches it out past the
    // edge; its text sits in the stretched part. The title shrinks toward
    // the hub (TITLE_SCALE), and the text takes everything from just outside
    // it to the end of the slice, wrapped to the wedge's own shape (see
    // textRegion).
    const textInner = (curved ? SLICE_RADIUS - 6 : straightRadius + (lines.length * lineGap) / 2) * TITLE_SCALE + 10;
    const text = textRegion(start, start + step, textInner, RADIUS + extension - TEXT_MARGIN, slice.body ?? '');
    const [labelX, labelY] = point(middle, straightRadius);
    const Body = await compileMdxSnippet(slice.body ?? '', referenceLookup, 'slice-wheel__error', 'slice');
    rendered.push({
      id: `slice-${index}`,
      title: slice.title,
      path: sectorPath(start, start + step, SLICE_RADIUS, count === 1),
      hitPath: sectorPath(start, start + step, RADIUS + 10, count === 1),
      liftedPath: sectorPath(start, start + step, RADIUS + extension, count === 1),
      arrow: arrowRadius > 0 ? cycleArrow(start, start + step, arrowRadius) : null,
      label: { x: round(labelX), y: round(labelY), lines, arcs, fontSize },
      text,
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
