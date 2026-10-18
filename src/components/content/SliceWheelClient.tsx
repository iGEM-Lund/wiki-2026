'use client';

import { useId, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';

export type SliceWheelClientSlice = {
  id: string;
  title: string;
  // The slice as sewn on the patch.
  path: string;
  // Where the middle of the slice points, in degrees clockwise from the
  // wheel's 3 o'clock.
  middle: number;
  // A cycle's arrow round the inner ring, pointing at the next slice.
  arrow: { shaft: string; head: string } | null;
  // Curved labels have two sets of arcs, one path per line: one for when the
  // slice is on the wheel's top half and one for the bottom half, which
  // read the other way round to stay upright. Straight labels (one or two
  // slices) have no arcs and are centred on (x, y) instead.
  label: {
    x: number;
    y: number;
    lines: string[];
    arcs: { top: string[]; bottom: string[] } | null;
    fontSize: number;
  };
  body: ReactNode;
};

type SliceWheelClientProps = {
  radius: number;
  overlockWidth: number;
  stitchRadius: number;
  slices: SliceWheelClientSlice[];
};

// A label is upright on the top half of the wheel, and flipped to read the
// right way up on the bottom half (see arcPath in SliceWheel.tsx). It is
// judged by where the slice ends up after turning, so a slice that spins to
// the bottom gets its bottom-half arcs.
function Label({
  slice,
  arcIds,
  className,
  rotation,
}: {
  slice: SliceWheelClientSlice;
  arcIds: string[];
  className: string;
  rotation: number;
}) {
  const { label } = slice;
  if (label.arcs) {
    return (
      <>
        {label.lines.map((line, index) => (
          // The offset centres the line on its arc. It is a dy, not
          // dominant-baseline: Firefox and Safari disagree on that for text
          // on a path.
          <text key={index} className={className} fontSize={label.fontSize} dy="0.35em">
            <textPath href={`#${arcIds[index]}`} startOffset="50%">
              {line}
            </textPath>
          </text>
        ))}
      </>
    );
  }
  // Straight labels turn back against the wheel, so they never tip over.
  const upright: CSSProperties = {
    transformOrigin: `${label.x}px ${label.y}px`,
    transform: `rotate(${-rotation}deg)`,
  };
  return (
    <text
      className={`${className} slice-wheel__label--straight`}
      x={label.x}
      y={label.y}
      fontSize={label.fontSize}
      style={upright}
    >
      {label.lines.map((line, index) => (
        <tspan
          key={index}
          x={label.x}
          // Centre the whole block of lines on the label point.
          dy={index === 0 ? `${0.35 - (label.lines.length - 1) * 0.6}em` : '1.2em'}
        >
          {line}
        </tspan>
      ))}
    </text>
  );
}

// The patch and its slices are drawn as one disc. Choosing a slice (a click,
// a tap, Enter or Space) spins the slices round until it is at the bottom,
// highlights it, and drops a sign under the wheel with its title and text.
// The text lives in the page flow, not in the SVG, so it gets the full width
// of the column however small the wheel is drawn.
export function SliceWheelClient({ radius, overlockWidth, stitchRadius, slices }: SliceWheelClientProps) {
  // Prefixes the patterns' and the curved labels' arc ids, so two wheels on
  // one page don't point at each other's.
  const wheelId = useId();
  const twill = `${wheelId}-twill`;
  const overlock = `${wheelId}-overlock`;
  const arcIds = (slice: SliceWheelClientSlice, variant: 'top' | 'bottom') =>
    (slice.label.arcs?.[variant] ?? []).map((_, index) => `${wheelId}-${slice.id}-${variant}-${index}`);
  // Just a sliver of room under the wheel, so the sign's string reaches its rim.
  const viewBox = `${-radius - 10} ${-radius - 10} ${2 * radius + 20} ${2 * radius + 12}`;
  const clothRadius = radius - overlockWidth;

  const [selected, setSelected] = useState<number | null>(null);
  // Total degrees turned so far, which only ever moves by the shorter way
  // round to the next slice, so the CSS transition never spins the long way.
  const [rotation, setRotation] = useState(0);

  const choose = (index: number) => {
    setSelected(index);
    // A lone slice is the whole wheel: nothing to turn.
    if (slices.length === 1) return;
    // The slice's middle should end at the bottom, 90 degrees clockwise from
    // 3 o'clock.
    const target = 90 - slices[index].middle;
    const delta = ((((target - rotation) % 360) + 540) % 360) - 180;
    setRotation(rotation + delta);
  };

  const onKeyDown = (event: KeyboardEvent<SVGElement>, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(index);
    }
  };

  const isBottom = (slice: SliceWheelClientSlice) => Math.sin(((slice.middle + rotation) * Math.PI) / 180) > 1e-6;
  const active = selected === null ? null : slices[selected];
  const signId = `${wheelId}-sign`;

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
            (['top', 'bottom'] as const).flatMap((variant) =>
              (slice.label.arcs?.[variant] ?? []).map((arc, index) => (
                <path key={arcIds(slice, variant)[index]} id={arcIds(slice, variant)[index]} d={arc} />
              )),
            ),
          )}
        </defs>

        <g className="slice-wheel__patch">
          <g aria-hidden="true">
            <circle className="slice-wheel__cloth" r={clothRadius} />
            <circle r={clothRadius} fill={`url(#${twill})`} />
            <circle
              className="slice-wheel__overlock"
              r={radius - overlockWidth / 2}
              stroke={`url(#${overlock})`}
              strokeWidth={overlockWidth}
            />
            <circle className="slice-wheel__stitch" r={stitchRadius} />
          </g>
          {/* Everything sewn onto the cloth turns together, about the hub. */}
          <g className="slice-wheel__spin" style={{ transform: `rotate(${rotation}deg)` }}>
            <g aria-hidden="true">
              {slices.map((slice) => (
                <path key={slice.id} className="slice-wheel__piece" d={slice.path} />
              ))}
              {/* The chosen slice goes on top of the rest, so its outline
                  covers the seams it shares with its neighbours. */}
              {active ? <path className="slice-wheel__piece slice-wheel__piece--active" d={active.path} /> : null}
              {slices.map((slice) =>
                slice.arrow ? (
                  <g key={slice.id} className="slice-wheel__arrow">
                    <path className="slice-wheel__arrow-shaft" d={slice.arrow.shaft} />
                    <path className="slice-wheel__arrow-head" d={slice.arrow.head} />
                  </g>
                ) : null,
              )}
              {slices.map((slice, index) => (
                <Label
                  key={slice.id}
                  slice={slice}
                  arcIds={arcIds(slice, isBottom(slice) ? 'bottom' : 'top')}
                  className={`slice-wheel__label${selected === index ? ' slice-wheel__label--active' : ''}`}
                  rotation={rotation}
                />
              ))}
            </g>
            {/* The slices' buttons, over everything, drawn as invisible
                copies of the slices so they turn with them. */}
            {slices.map((slice, index) => (
              <path
                key={slice.id}
                className="slice-wheel__hit"
                d={slice.path}
                tabIndex={0}
                role="button"
                aria-label={slice.title}
                aria-pressed={selected === index}
                aria-controls={signId}
                onClick={() => choose(index)}
                onKeyDown={(event) => onKeyDown(event, index)}
              />
            ))}
          </g>
        </g>
        {slices.length > 1 ? <circle className="slice-wheel__hub" r={3.5} /> : null}
      </svg>

      {/* Every sign is laid out in the same grid cell, only the chosen one
          visible, so the cell is as tall as the tallest sign and the text
          under the wheel never moves as slices are chosen. */}
      <div id={signId} className="slice-wheel__sign-slot" aria-live="polite">
        <p className="slice-wheel__hint" data-shown={active === null}>
          Select a slice to read about it.
        </p>
        {slices.map((slice, index) => (
          <div
            key={slice.id}
            className="slice-wheel__sign"
            data-shown={selected === index}
            role="group"
            aria-label={slice.title}
            aria-hidden={selected !== index}
          >
            <p className="slice-wheel__sign-title">{slice.title}</p>
            <div className="slice-wheel__sign-body">{slice.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
