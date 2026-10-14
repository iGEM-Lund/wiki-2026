import { memo, type CSSProperties } from 'react';
import { LINE, type Layer, type Union as UnionData } from '@/lib/women-on-line';

// Draws the rig's output (src/lib/women-on-line.ts) as SVG: each union an
// ink pass and a top pass, then its detail lines. Shared by the home scene
// and its team room.

function Union({ union: { parts, fill } }: { union: UnionData }) {
  // The top pass: page colour for an outline, or the fill.
  const top = fill === 'solid' ? 'ink' : fill === 'tint' ? 'tint' : 'paper';
  return (
    <>
      {parts.map((part, i) =>
        part.kind === 'stroke' ? (
          <path
            key={`i${i}`}
            d={part.d}
            className="women-line__ink"
            strokeWidth={part.w + LINE * 2}
            strokeLinecap={part.flat ? 'butt' : undefined}
          />
        ) : (
          <path key={`i${i}`} d={part.d} className="women-line__ink-shape" strokeWidth={LINE * 2} />
        ),
      )}
      {parts.map((part, i) =>
        part.kind === 'stroke' ? (
          <path
            key={`p${i}`}
            d={part.d}
            className={`women-line__${top}`}
            strokeWidth={part.w}
            strokeLinecap={part.flat ? 'butt' : undefined}
          />
        ) : (
          <path key={`p${i}`} d={part.d} className={`women-line__${top}-shape`} />
        ),
      )}
    </>
  );
}

// Memoised: the others' drawings only change when the string under them
// moves, not on every frame of hers.
export const LayerArt = memo(function LayerArt({
  layer,
  transform,
  style,
}: {
  layer: Layer;
  transform: string;
  style?: CSSProperties;
}) {
  return (
    <g transform={transform} style={style}>
      {layer.unions.map((union, i) => (
        <Union key={i} union={union} />
      ))}
      {layer.details.map((detail, i) => (
        <path
          key={i}
          d={detail.d}
          className={detail.shine ? 'women-line__shine' : 'women-line__detail'}
          strokeWidth={detail.w ?? LINE}
        />
      ))}
    </g>
  );
});

