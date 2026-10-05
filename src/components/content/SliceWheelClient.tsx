'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { X } from 'lucide-react';

export type SliceWheelClientSlice = {
  id: string;
  title: string;
  // null for a lone slice, which is drawn as a whole circle instead.
  path: string | null;
  color: { fill: string; ink: string };
  // `arcs` holds one path per line for curved labels; null for straight
  // ones, which are centred on (x, y) instead.
  label: { x: number; y: number; lines: string[]; arcs: string[] | null; fontSize: number };
  // The thinner and thinner bands the slice's outer edge breaks up into;
  // `k` counts outward, and sets how much further each spreads on hover.
  stripes: { d: string; width: number; k: number }[];
  // How far the slice slides out along its own bisector on hover.
  nudge: { x: number; y: number };
  body: ReactNode;
};

type SliceWheelClientProps = {
  radius: number;
  solidRadius: number;
  slices: SliceWheelClientSlice[];
};

// Hovering a slice is pure CSS (see .slice-wheel__slice in globals.css);
// this component only owns which slice's popup is open.
export function SliceWheelClient({ radius, solidRadius, slices }: SliceWheelClientProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = slices.find((slice) => slice.id === openId) ?? null;
  // Prefixes the curved labels' arc ids, so two wheels on one page don't
  // point their text at each other's paths.
  const wheelId = useId();
  const viewBox = `${-radius - 10} ${-radius - 10} ${2 * radius + 20} ${2 * radius + 20}`;

  return (
    <div className="slice-wheel">
      <svg className="slice-wheel__disc" viewBox={viewBox} role="group" aria-label="Slices">
        {slices.map((slice) => (
          <g
            key={slice.id}
            className="slice-wheel__slice"
            style={{ '--slice-dx': `${slice.nudge.x}px`, '--slice-dy': `${slice.nudge.y}px` } as CSSProperties}
            tabIndex={0}
            role="button"
            aria-label={slice.title}
            aria-haspopup="dialog"
            onClick={() => setOpenId(slice.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setOpenId(slice.id);
              }
            }}
          >
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
        ))}
        {slices.length > 1 ? <circle className="slice-wheel__hub" r={radius * 0.09} /> : null}
      </svg>
      {open ? <SliceDialog slice={open} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}

// Same native-<dialog> approach as Lightbox.tsx: showModal() puts it in the
// top layer with focus trapping, Esc to close and focus handed back to the
// slice afterwards. Mounted only while open.
function SliceDialog({ slice, onClose }: { slice: SliceWheelClientSlice; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // No cleanup calling close(); see the matching comment in Lightbox.tsx.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="slice-wheel__dialog"
      aria-labelledby={titleId}
      style={{ '--slice-fill': slice.color.fill, '--slice-ink': slice.color.ink } as CSSProperties}
      onClose={onClose}
      // The dialog has no padding of its own, so a click that lands on the
      // <dialog> element itself is a click on the backdrop around it.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header className="slice-wheel__dialog-header">
        <div className="slice-wheel__dialog-title" id={titleId}>
          {slice.title}
        </div>
        <button type="button" className="slice-wheel__dialog-close" aria-label="Close" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      <div className="slice-wheel__dialog-body">{slice.body}</div>
    </dialog>
  );
}
