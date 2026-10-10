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

// The gap between slices is cut out of the shape itself rather than drawn
// over it in the background colour, so a slice has no outline of its own.
// Each straight side is pulled in parallel by half of SLICE_GAP, which moves
// the tip out along the bisector to where those two sides meet.
function slicePath(start: number, end: number): string {
  const half = SLICE_GAP / 2;
  const trim = Math.asin(half / SOLID_RADIUS);
  const [x0, y0] = point(start + trim, SOLID_RADIUS);
  const [x1, y1] = point(end - trim, SOLID_RADIUS);
  const [tipX, tipY] = point((start + end) / 2, half / Math.sin((end - start) / 2));
  const largeArc = end - start - 2 * trim > Math.PI ? 1 : 0;
  const r = round(SOLID_RADIUS);
  return `M ${round(tipX)} ${round(tipY)} L ${round(x0)} ${round(y0)} A ${r} ${r} 0 ${largeArc} 1 ${round(x1)} ${round(y1)} Z`;
}

// A plain sector from the hub out to the edge of the viewBox, with no gap
// cut out: see .slice-wheel__hit.
function hitPath(start: number, end: number): string {
  const radius = RADIUS + 10;
  const [x0, y0] = point(start, radius);
  const [x1, y1] = point(end, radius);
  const largeArc = end - start > Math.PI ? 1 : 0;
  return `M 0 0 L ${round(x0)} ${round(y0)} A ${radius} ${radius} 0 ${largeArc} 1 ${round(x1)} ${round(y1)} Z`;
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

// A slice is solid out to SOLID_RADIUS, then breaks up into thinner and
// thinner concentric stripes of itself, the same way the page title
// banner's wavy edge does (src/components/page-title.tsx). Widths are
// outermost last; each stripe is preceded by a STRIPE_GAP of background.
const STRIPE_WIDTHS = [5, 3, 1.6];
const STRIPE_GAP = 2.4;
const SOLID_RADIUS = RADIUS - STRIPE_WIDTHS.reduce((sum, width) => sum + width + STRIPE_GAP, 0);
// Background left between neighbouring slices, and between their stripes.
const SLICE_GAP = 2;

function stripes(start: number, end: number, whole: boolean): SliceWheelClientSlice['stripes'] {
  let inner = SOLID_RADIUS;
  return STRIPE_WIDTHS.map((width, index) => {
    const radius = inner + STRIPE_GAP + width / 2;
    inner += STRIPE_GAP + width;
    const r = round(radius);
    if (whole) return { d: `M ${r} 0 A ${r} ${r} 0 1 1 ${-r} 0 A ${r} ${r} 0 1 1 ${r} 0`, width, k: index + 1 };
    // Trim each end by half the slice gap, measured along this radius.
    const trim = SLICE_GAP / 2 / radius;
    return { d: arcPath(start + trim, end - trim, radius, false), width, k: index + 1 };
  });
}

const LINE_HEIGHT = 1.2;
// On hover a slice's title scales down toward the hub by this much, to leave
// the rest of the slice to the text (see .slice-wheel__title).
const TITLE_SCALE = 0.7;
const MAX_LINES = 3;
const MIN_FONT_SIZE = 4;

export async function SliceWheel({ slices = [], referenceLookup = {} }: SliceWheelProps) {
  const count = slices.length;
  if (count === 0) return null;

  const step = (2 * Math.PI) / count;
  // How far past the rim a hovered slice extends: more slices, narrower
  // wedges, so a deeper extension to keep the same room for text.
  const extension = count <= 5 ? 70 : count <= 8 ? 82 : 96;
  const extensionPath = (start: number, end: number, whole: boolean): string => {
    const outer = RADIUS + extension;
    // Starts inside the solid shape so the stripes' gaps fill in with it.
    const inner = SOLID_RADIUS - 1;
    if (whole) return `M ${outer} 0 A ${outer} ${outer} 0 1 1 ${-outer} 0 A ${outer} ${outer} 0 1 1 ${outer} 0 Z`;
    const half = SLICE_GAP / 2;
    const [ix0, iy0] = point(start + Math.asin(half / inner), inner);
    const [ix1, iy1] = point(end - Math.asin(half / inner), inner);
    const [ox0, oy0] = point(start + Math.asin(half / outer), outer);
    const [ox1, oy1] = point(end - Math.asin(half / outer), outer);
    const largeArc = (a: number, r: number) => (end - start - 2 * Math.asin(half / r) > Math.PI ? 1 : 0);
    return `M ${round(ix0)} ${round(iy0)} L ${round(ox0)} ${round(oy0)} A ${round(outer)} ${round(outer)} 0 ${largeArc(0, outer)} 1 ${round(ox1)} ${round(oy1)} L ${round(ix1)} ${round(iy1)} A ${round(inner)} ${round(inner)} 0 ${largeArc(0, inner)} 0 ${round(ix0)} ${round(iy0)} Z`;
  };
  // With one or two slices an arc would be a half circle or more and the
  // text would run sideways, so those keep straight, centred labels.
  const curved = count >= 3;
  const straightRadius = count === 1 ? 0 : SOLID_RADIUS * 0.55;
  // Curved labels hang from just inside the solid edge, under the stripes:
  // every label's outermost line sits on this same arc.
  const outerLineRadius = (fontSize: number) => SOLID_RADIUS - 4 - fontSize / 2;

  // How much text a line holds at this font size: the arc's length (less
  // some padding off the gaps between slices) when curved, a fixed width
  // when straight. A curved label's lines get shorter toward the hub, so a
  // label of `lineCount` lines is measured at its innermost one.
  const lineCapacity = (fontSize: number, lineCount: number) =>
    curved
      ? (outerLineRadius(fontSize) - (lineCount - 1) * LINE_HEIGHT * fontSize) * step * 0.8
      : SOLID_RADIUS * 1.3;

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

  const rendered: SliceWheelClientSlice[] = [];
  for (const [index, slice] of slices.entries()) {
    // Start at 12 o'clock and go clockwise, the way a clock (and most
    // readers) would count the slices.
    const start = -Math.PI / 2 + index * step;
    const middle = start + step / 2;
    const [nudgeX, nudgeY] = point(middle, count === 1 ? 0 : 4);
    // With a slice count of 4n + 1 the cycle would put the last slice next
    // to a same-coloured first one; give it Depths instead.
    const colorIndex = count > 1 && index === count - 1 && index % PALETTE.length === 0 ? 2 : index % PALETTE.length;
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
    // Hovering extends the slice outward past the rim; its text sits in
    // that extension. The text box is an upright rectangle centred in the
    // extension, sized to fit inside the wedge wherever it points.
    // The title shrinks toward the hub on hover (TITLE_SCALE), and the text
    // takes everything from just outside it to the end of the extension.
    // The box is an upright rectangle, sized by how the slice's depth and
    // breadth map onto the screen axes where it points.
    const textInner = (curved ? SOLID_RADIUS - 4 : straightRadius + (lines.length * lineGap) / 2) * TITLE_SCALE + 6;
    const textOuter = RADIUS + extension - 5;
    const textRadius = (textInner + textOuter) / 2;
    const [textX, textY] = point(middle, textRadius);
    const room = textOuter - textInner;
    const acrossRadius = textInner + room * 0.35;
    const across = 2 * acrossRadius * Math.sin(Math.min(step / 2, 1.2)) * 0.9;
    const textWidth = (room * Math.abs(Math.cos(middle)) + across * Math.abs(Math.sin(middle))) * 0.85;
    const textHeight = (room * Math.abs(Math.sin(middle)) + across * Math.abs(Math.cos(middle))) * 0.85;
    const [labelX, labelY] = point(middle, straightRadius);
    const Body = await compileMdxSnippet(slice.body ?? '', referenceLookup, 'slice-wheel__error', 'slice');
    rendered.push({
      id: `slice-${index}`,
      title: slice.title,
      path: count === 1 ? null : slicePath(start, start + step),
      hitPath: count === 1 ? null : hitPath(start, start + step),
      color: PALETTE[colorIndex],
      stripes: stripes(start, start + step, count === 1),
      label: { x: round(labelX), y: round(labelY), lines, arcs, fontSize },
      nudge: { x: round(nudgeX), y: round(nudgeY) },
      extension: {
        d: extensionPath(start, start + step, count === 1),
        text: {
          x: round(textX - textWidth / 2),
          y: round(textY - textHeight / 2),
          width: round(textWidth),
          height: round(textHeight),
        },
      },
      body: <Body />,
    });
  }

  return <SliceWheelClient radius={RADIUS} solidRadius={SOLID_RADIUS} slices={rendered} />;
}
