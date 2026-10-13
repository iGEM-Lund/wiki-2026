import { Fragment, useId, type ReactNode } from 'react';

export type SliceWheelClientSlice = {
  id: string;
  title: string;
  // The slice as sewn on the patch.
  path: string;
  // The slice's whole sector out past the patch's edge: the fixed area that
  // counts as hovering it.
  hitPath: string;
  // The slice lifted off the patch on hover, stretched out past its edge to
  // hold the text.
  liftedPath: string;
  // `arcs` holds one path per line for curved labels; null for straight
  // ones, which are centred on (x, y) instead.
  label: { x: number; y: number; lines: string[]; arcs: string[] | null; fontSize: number };
  // The box inside the lifted slice that holds its text, and how much of
  // each `row`-high strip of it, from either side, is outside the slice.
  text: {
    x: number;
    y: number;
    width: number;
    height: number;
    row: number;
    rows: { left: number; right: number }[];
  };
  body: ReactNode;
};

type SliceWheelClientProps = {
  radius: number;
  overlockWidth: number;
  stitchRadius: number;
  slices: SliceWheelClientSlice[];
};

function Label({ slice, arcIds, className }: { slice: SliceWheelClientSlice; arcIds: string[]; className: string }) {
  const { label } = slice;
  if (label.arcs) {
    return (
      <>
        {label.lines.map((line, index) => (
          <text key={index} className={className} fontSize={label.fontSize} aria-hidden="true">
            <textPath href={`#${arcIds[index]}`} startOffset="50%">
              {line}
            </textPath>
          </text>
        ))}
      </>
    );
  }
  return (
    <text className={className} x={label.x} y={label.y} fontSize={label.fontSize} aria-hidden="true">
      {label.lines.map((line, index) => (
        <tspan
          key={index}
          x={label.x}
          // Centre the whole block of lines on the label point.
          dy={index === 0 ? `${-(label.lines.length - 1) * 0.6}em` : '1.2em'}
        >
          {line}
        </tspan>
      ))}
    </text>
  );
}

// Everything here is pure CSS (see .slice-wheel in globals.css). The patch
// and its slices are drawn first, then every slice again, lifted, on top of
// all of them: SVG has no z-index, so this is how a hovered slice gets to
// cover its neighbours' seams. Hovering or focusing a slice shows its lifted
// copy, with its text. Tapping a slice focuses it, which does the same on
// touch screens.
export function SliceWheelClient({ radius, overlockWidth, stitchRadius, slices }: SliceWheelClientProps) {
  // Prefixes the patterns' and the curved labels' arc ids, so two wheels on
  // one page don't point at each other's.
  const wheelId = useId();
  const twill = `${wheelId}-twill`;
  const overlock = `${wheelId}-overlock`;
  const arcIds = (slice: SliceWheelClientSlice) =>
    (slice.label.arcs ?? []).map((_, index) => `${wheelId}-${slice.id}-${index}`);
  const extent = 2 * radius + 20;
  const viewBox = `${-radius - 10} ${-radius - 10} ${extent} ${extent}`;
  const clothRadius = radius - overlockWidth;

  return (
    <div className="slice-wheel">
      <svg className="slice-wheel__disc" viewBox={viewBox} role="group" aria-label="Slices">
        <defs>
          {/* The pillars' twill: two fine diagonal weaves over the cloth. */}
          <pattern id={twill} width="1.7" height="1.7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect className="slice-wheel__weave-light" width="0.4" height="1.7" />
            <rect className="slice-wheel__weave-dark" width="1.7" height="0.4" />
          </pattern>
          {/* The pillars' overlocked edge: a dense run of slanted stitches. */}
          <pattern id={overlock} width="1.25" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(60)">
            <rect className="slice-wheel__overlock-stitch" width="0.85" height="10" />
            <rect className="slice-wheel__overlock-shade" x="0.85" width="0.4" height="10" />
          </pattern>
          {slices.flatMap((slice) =>
            (slice.label.arcs ?? []).map((arc, index) => <path key={arcIds(slice)[index]} id={arcIds(slice)[index]} d={arc} />),
          )}
        </defs>

        <g className="slice-wheel__patch" aria-hidden="true">
          <circle className="slice-wheel__cloth" r={clothRadius} />
          <circle r={clothRadius} fill={`url(#${twill})`} />
          <circle
            className="slice-wheel__overlock"
            r={radius - overlockWidth / 2}
            stroke={`url(#${overlock})`}
            strokeWidth={overlockWidth}
          />
          <circle className="slice-wheel__stitch" r={stitchRadius} />
          {slices.map((slice) => (
            <path key={slice.id} className="slice-wheel__piece" d={slice.path} />
          ))}
          {slices.map((slice) => (
            <Label key={slice.id} slice={slice} arcIds={arcIds(slice)} className="slice-wheel__label" />
          ))}
        </g>

        {slices.map((slice) => (
          <g key={slice.id} className="slice-wheel__slice" tabIndex={0} role="group" aria-label={slice.title}>
            {/* Hover is tracked on this invisible sector, which never moves.
                Were the lifted slice the hover target, a pointer near its
                edge would see it grow out from under it, end the hover,
                snap back and start it again, over and over. */}
            <path className="slice-wheel__hit" d={slice.hitPath} />
            <g className="slice-wheel__lifted">
              <path className="slice-wheel__lifted-piece" d={slice.liftedPath} />
              <path d={slice.liftedPath} fill={`url(#${twill})`} />
              <g className="slice-wheel__lifted-title">
                <Label slice={slice} arcIds={arcIds(slice)} className="slice-wheel__label slice-wheel__label--lifted" />
              </g>
              <foreignObject
                className="slice-wheel__text"
                x={slice.text.x}
                y={slice.text.y}
                width={slice.text.width}
                height={slice.text.height}
              >
                <div className="slice-wheel__text-content">
                  {/* The staircase the text wraps to the slice's shape: one
                      pair of floats per row, each clearing the one above it
                      on its side (see textRegion in SliceWheel.tsx). */}
                  {slice.text.rows.map((row, index) => (
                    <Fragment key={index}>
                      <span
                        className="slice-wheel__text-edge slice-wheel__text-edge--left"
                        style={{ width: row.left, height: slice.text.row }}
                      />
                      <span
                        className="slice-wheel__text-edge slice-wheel__text-edge--right"
                        style={{ width: row.right, height: slice.text.row }}
                      />
                    </Fragment>
                  ))}
                  {slice.body}
                </div>
              </foreignObject>
            </g>
          </g>
        ))}
        {slices.length > 1 ? <circle className="slice-wheel__hub" r={3.5} /> : null}
      </svg>
    </div>
  );
}
