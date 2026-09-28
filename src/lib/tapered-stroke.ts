// Strokes whose width varies along their length, for the h2 ornaments
// (src/components/section-heading.tsx). SVG strokes can't vary in width, so
// each one is drawn as a filled outline: one side of the centerline traced
// forward, the other back, each offset by half the local width. Everything here runs at render time on the server
// and bakes plain path data into the HTML.

export type Point = [number, number];
export type Cubic = [Point, Point, Point, Point];

const STEPS_PER_CURVE = 32;

function at([p0, p1, p2, p3]: Cubic, t: number): { point: Point; tangent: Point } {
  const u = 1 - t;
  const point: Point = [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
  const tangent: Point = [
    3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]),
    3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]),
  ];
  return { point, tangent };
}

// Eases into (or out of) full weight, so a taper meets a constant-width
// stretch without a visible kink.
export const easeOut = (u: number) => u * (2 - u);

/**
 * Filled outline of a stroke along `curves`. `widthAt` gets `u`, the
 * position along the whole path from 0 to 1 (by curve index plus the
 * curve's own parameter), and the centerline point there.
 *
 * `vertical` measures the width straight up and down instead of across the
 * curve. Use it for a mostly-horizontal stroke in an SVG with
 * preserveAspectRatio="none": its box only stretches sideways, so a width
 * measured vertically can't be thinned out by the stretch.
 */
export function taperedPath(
  curves: Cubic[],
  widthAt: (u: number, point: Point) => number,
  { vertical = false }: { vertical?: boolean } = {},
): string {
  const samples = curves.flatMap((curve, i) =>
    Array.from({ length: STEPS_PER_CURVE + 1 }, (_, step) => {
      const t = step / STEPS_PER_CURVE;
      const { point, tangent } = at(curve, t);
      const length = Math.hypot(tangent[0], tangent[1]) || 1;
      const normal: Point = vertical ? [0, 1] : [-tangent[1] / length, tangent[0] / length];
      return { point, normal, width: widthAt((i + t) / curves.length, point) };
    }),
  );
  const side = (sign: number) =>
    samples.map(({ point, normal, width }) => {
      const x = point[0] + (sign * normal[0] * width) / 2;
      const y = point[1] + (sign * normal[1] * width) / 2;
      return `${x.toFixed(2)} ${y.toFixed(2)}`;
    });
  return `M${side(1).join(' L')} L${side(-1).reverse().join(' L')} Z`;
}
