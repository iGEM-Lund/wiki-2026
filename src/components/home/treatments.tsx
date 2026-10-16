// The home scene's current-treatments beat: the three therapies given for
// PMOS, each a small cluster of drawings round her (the drug, and the
// organs it works on), coming in one cluster after another as she floats.
// Where a cluster reaches her she is coloured peacock, a sign that it gives
// some relief while she is still falling (see PeacockHer in
// women-on-line.tsx, which paints her from TREATMENT_SPOTS). Drawn inside
// the scene's SVG, in its units, so they stay round her.

// The drawings are uploaded to static.igem.wiki like every other image;
// NEXT_PUBLIC_TREATMENTS_BASE points at a local copy while developing.
const BASE = process.env.NEXT_PUBLIC_TREATMENTS_BASE ?? 'https://static.igem.wiki/teams/6160/wiki/home';

// Each drawing's shape (width over height), trimmed to its edges.
const ART = {
  coc: 2.51,
  uterus: 1.97,
  metformin: 1.52,
  insulin: 2.1,
  liver: 1.41,
  'anti-androgen': 1.42,
  receptor: 1,
} as const;
type ArtName = keyof typeof ART;

type Spot = { dx: number; dy: number; r: number };
type Item = {
  art: ArtName;
  // Where its middle is, from her middle, in the scene's units, and the
  // longer side of its drawing.
  dx: number;
  dy: number;
  size: number;
  label?: string[];
  // Reaches her where this spot is, by a line.
  reaches?: boolean;
};
type Cluster = { name: string; window: readonly [number, number]; items: Item[]; spot: Spot };

// Coming in one after another over the beat's time (0 to 1): each cluster
// first, then its line, then her taking its colour.
const CLUSTERS: Cluster[] = [
  {
    name: 'Combined oral contraceptives',
    window: [0.12, 0.36],
    items: [
      { art: 'coc', dx: -365, dy: -35, size: 190, label: ['Combined oral', 'contraceptives'] },
      { art: 'uterus', dx: -330, dy: 95, size: 150, reaches: true },
    ],
    spot: { dx: 0, dy: 30, r: 38 },
  },
  {
    name: 'Metformin',
    window: [0.4, 0.64],
    items: [
      { art: 'metformin', dx: 350, dy: -120, size: 120, label: ['Metformin'] },
      { art: 'insulin', dx: 360, dy: -10, size: 130, reaches: true },
      { art: 'liver', dx: 345, dy: 90, size: 110, reaches: true },
    ],
    spot: { dx: 0, dy: -38, r: 38 },
  },
  {
    name: 'Anti-androgens',
    window: [0.68, 0.92],
    items: [
      { art: 'anti-androgen', dx: -385, dy: -175, size: 120, label: ['Anti-androgens'] },
      { art: 'receptor', dx: -255, dy: -125, size: 90, reaches: true },
    ],
    spot: { dx: 0, dy: -112, r: 38 },
  },
];

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => t * t * (3 - 2 * t);
const phase = (p: number, [from, to]: readonly [number, number]) => clamp01((p - from) / (to - from));

// How much of the beat's time is left for the drawings, with the symptoms
// going before them.
export const SYMPTOMS_OUT: readonly [number, number] = [0, 0.1];

// Where she is coloured, from her middle (the same as the drawings'), and
// how far, 0 to 1, for each cluster at `shown`.
export const TREATMENT_SPOTS = CLUSTERS.map(({ spot, window: [from, to] }) => ({
  ...spot,
  reach: (shown: number) => smooth(phase(shown, [from + (to - from) * 0.55, to + 0.08])),
}));

const lineTo = (from: { x: number; y: number }, to: { x: number; y: number }, gap: number, end: number) => {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const [ux, uy] = [(to.x - from.x) / length, (to.y - from.y) / length];
  const start = { x: from.x + ux * gap, y: from.y + uy * gap };
  const tip = { x: to.x - ux * end, y: to.y - uy * end };
  // Bowed a little, so it reads as a thread rather than a ruler.
  const bow = { x: (start.x + tip.x) / 2 - uy * 18, y: (start.y + tip.y) / 2 + ux * 18 };
  return `M${start.x.toFixed(1)} ${start.y.toFixed(1)}Q${bow.x.toFixed(1)} ${bow.y.toFixed(1)} ${tip.x.toFixed(1)} ${tip.y.toFixed(1)}`;
};

export function Treatments({ cx, cy, shown }: { cx: number; cy: number; shown: number }) {
  if (!shown) return null;
  return (
    <g className="treatments" aria-hidden="true">
      {CLUSTERS.map(({ name, window, items, spot }) => {
        const arrive = smooth(phase(shown, [window[0], window[0] + (window[1] - window[0]) * 0.6]));
        if (!arrive) return null;
        const drawn = smooth(phase(shown, [window[0] + (window[1] - window[0]) * 0.4, window[1]]));
        const her = { x: cx + spot.dx, y: cy + spot.dy };
        return (
          <g key={name}>
            {items.map(({ art, dx, dy, size, label, reaches }) => {
              const [w, h] = ART[art] >= 1 ? [size, size / ART[art]] : [size * ART[art], size];
              // Each drifts in a little way from further out.
              const out = (1 - arrive) * 0.12;
              const x = cx + dx * (1 + out);
              const y = cy + dy * (1 + out);
              return (
                <g key={art} opacity={arrive}>
                  <image href={`${BASE}/${art}.avif`} x={x - w / 2} y={y - h / 2} width={w} height={h} />
                  {label && (
                    <text className="treatments__label" x={x} y={y + h / 2 + 22} textAnchor="middle">
                      {label.map((line, i) => (
                        <tspan key={line} x={x} dy={i ? 20 : 0}>
                          {line}
                        </tspan>
                      ))}
                    </text>
                  )}
                  {reaches && drawn > 0 && (
                    <path
                      className="treatments__line"
                      d={lineTo({ x, y }, her, Math.max(w, h) / 2 + 8, 30)}
                      pathLength={1}
                      strokeDasharray="1 1"
                      strokeDashoffset={1 - drawn}
                    />
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}
