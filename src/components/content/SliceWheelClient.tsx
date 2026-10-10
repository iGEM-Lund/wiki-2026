import { useId, type CSSProperties, type ReactNode } from 'react';

export type SliceWheelClientSlice = {
  id: string;
  title: string;
  // null for a lone slice, which is drawn as a whole circle instead.
  path: string | null;
  // The slice's whole sector out past its fanned-out stripes, gaps
  // included: the fixed area that counts as hovering it. null for a lone
  // slice, which uses a circle.
  hitPath: string | null;
  color: { fill: string; ink: string };
  // `arcs` holds one path per line for curved labels; null for straight
  // ones, which are centred on (x, y) instead.
  label: { x: number; y: number; lines: string[]; arcs: string[] | null; fontSize: number };
  // The thinner and thinner bands the slice's outer edge breaks up into;
  // `k` counts outward, and sets how much further each spreads on hover.
  stripes: { d: string; width: number; k: number }[];
  // How far the slice slides out along its own bisector on hover.
  nudge: { x: number; y: number };
  // The outward extension the slice grows on hover, and the box inside it
  // that holds the slice's text.
  extension: {
    d: string;
    text: { x: number; y: number; width: number; height: number };
  };
  body: ReactNode;
};

type SliceWheelClientProps = {
  radius: number;
  solidRadius: number;
  slices: SliceWheelClientSlice[];
};

// Everything here is pure CSS (see .slice-wheel__slice in globals.css):
// hovering or focusing a slice extends it outward past the rim, with its text
// in the extension. Tapping a slice focuses it, which does the same on touch
// screens.
export function SliceWheelClient({ radius, solidRadius, slices }: SliceWheelClientProps) {
  // Prefixes the curved labels' arc ids, so two wheels on one page don't
  // point their text at each other's paths.
  const wheelId = useId();
  const extent = 2 * radius + 20;
  const viewBox = `${-radius - 10} ${-radius - 10} ${extent} ${extent}`;

  return (
    <div className="slice-wheel">
      <svg className="slice-wheel__disc" viewBox={viewBox} role="group" aria-label="Slices">
        {slices.map((slice) => (
          <g
            key={slice.id}
            className="slice-wheel__slice"
            style={{ '--slice-dx': `${slice.nudge.x}px`, '--slice-dy': `${slice.nudge.y}px` } as CSSProperties}
            tabIndex={0}
            role="group"
            aria-label={slice.title}
          >
            {/* Hover is tracked on this invisible sector, which never moves.
                The visible parts below slide out on hover; were they the
                hover target, a pointer over a stripe or near the rim would
                see them slide out from under it, end the hover, snap back
                and start it again, over and over. */}
            {slice.hitPath ? (
              <path className="slice-wheel__hit" d={slice.hitPath} />
            ) : (
              <circle className="slice-wheel__hit" r={radius + 10} />
            )}
            <g className="slice-wheel__visual">
              <g className="slice-wheel__extension">
                <path d={slice.extension.d} fill={slice.color.fill} />
              </g>
              {slice.path ? (
                <path className="slice-wheel__shape" d={slice.path} fill={slice.color.fill} />
              ) : (
                <circle className="slice-wheel__shape" r={solidRadius} fill={slice.color.fill} />
              )}
              {slice.stripes.map((stripe) => (
                <path
                  key={stripe.k}
                  className="slice-wheel__stripe"
                  d={stripe.d}
                  stroke={slice.color.fill}
                  strokeWidth={stripe.width}
                  style={{ '--stripe-k': stripe.k } as CSSProperties}
                />
              ))}
              <g className="slice-wheel__title">
                {slice.label.arcs ? (
                  slice.label.arcs.map((arc, index) => (
                    <g key={index} aria-hidden="true">
                      <path id={`${wheelId}-${slice.id}-${index}`} d={arc} fill="none" />
                      <text className="slice-wheel__label" fill={slice.color.ink} fontSize={slice.label.fontSize}>
                        <textPath href={`#${wheelId}-${slice.id}-${index}`} startOffset="50%">
                          {slice.label.lines[index]}
                        </textPath>
                      </text>
                    </g>
                  ))
                ) : (
                  <text
                    className="slice-wheel__label"
                    x={slice.label.x}
                    y={slice.label.y}
                    fill={slice.color.ink}
                    fontSize={slice.label.fontSize}
                    aria-hidden="true"
                  >
                    {slice.label.lines.map((line, index) => (
                      <tspan
                        key={index}
                        x={slice.label.x}
                        // Centre the whole block of lines on the label point.
                        dy={index === 0 ? `${-(slice.label.lines.length - 1) * 0.6}em` : "1.2em"}
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                )}
              </g>
              <foreignObject
                className="slice-wheel__extension-text"
                x={slice.extension.text.x}
                y={slice.extension.text.y}
                width={slice.extension.text.width}
                height={slice.extension.text.height}
              >
                <div className="slice-wheel__extension-content" style={{ color: slice.color.ink }}>
                  {slice.body}
                </div>
              </foreignObject>
            </g>
          </g>
        ))}
        {slices.length > 1 ? <circle className="slice-wheel__hub" r={radius * 0.09} /> : null}
      </svg>
    </div>
  );
}
