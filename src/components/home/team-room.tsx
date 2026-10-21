import { useMemo } from 'react';
import { drawWoman, FIGURE_SCALE, POSES, type Look, type Pose, type V3 } from '@/lib/women-on-line';
import { PAPER_H, PAPER_W, PAPERS, paperFlight, TABLE_SQUASH } from './solution-papers';
import { LayerArt } from './women-art';

// The room the home scene pulls back into: the iGEM Lund team round a
// table, talking it through. Some sit behind it facing us, one at each end
// side on, two on stools in front with their backs to us (the way the
// women sat on the string), and one stands behind it telling the story the
// scene has shown, which by now is a speech bubble over her head (see
// .women-line-scene__bubble). Generic people, not anyone in particular.

const WIDTH = 1200;
const HEIGHT = 520;
// The table: its top's back and front edges, its ends, and the floor.
const TABLE = { back: 318, front: 352, left: 250, right: 950, slant: 30, thick: 12, floor: 505 };
const PRESENTER: { x: number; y: number; scale: number } = { x: 600, y: 285, scale: 0.92 };

// Standing straight, facing the viewer: the floating pose with her feet
// down and her arms where `arms` puts them.
const standing = (arms: [V3, V3]): Pose => ({
  ...POSES.hanging,
  ankles: [
    [-4, -35, 2],
    [4, -35, 2],
  ],
  float: 1,
  floatLegs: 0.3,
  floatArms: arms,
});

// Talking, one hand up towards what she's saying.
const PRESENTING = standing([
  [-7, 41, 2],
  [18, -30, -6],
]);

type Member = { x: number; y: number; pose: Pose; look: Look; chair: Facing };
// Hands resting on the table in front of her.
const ON_TABLE: Pose['arms'] = [
  { to: [-3, 21, 24], elbow: 'down' },
  { to: [3, 21, 24], elbow: 'down' },
];
// Sitting facing the table, turned by `turn`, hands on it.
const at = (turn: number, arms: Pose['arms'] = ON_TABLE): Pose => ({ ...POSES.sitting, turn, arms });
// One talking, a hand up.
const TALKING: Pose['arms'] = [ON_TABLE[0], { to: [12, -8, 18] }];

// Behind the table, facing us: drawn first, the table over their laps.
const BEHIND: Member[] = [
  { x: 340, y: 345, chair: 'front', pose: at(180), look: { hair: 'short', bottom: 'trousers', sleeve: 'long', broad: true, glasses: true } },
  { x: 460, y: 345, chair: 'front', pose: at(180, TALKING), look: { hair: 'long', bottom: 'trousers', sleeve: 'short', hairLength: 30 } },
  { x: 740, y: 345, chair: 'front', pose: at(180), look: { hair: 'curly', bottom: 'trousers', sleeve: 'short', broad: true, beard: true } },
  { x: 860, y: 345, chair: 'front', pose: at(180), look: { hair: 'ponytail', bottom: 'skirt', sleeve: 'long', glasses: true } },
];
// At the ends, side on, and in front with their backs to us: drawn after.
const ROUND: Member[] = [
  { x: 200, y: 400, chair: 'right', pose: at(90), look: { hair: 'short', bottom: 'trousers', sleeve: 'short', broad: true } },
  { x: 1000, y: 400, chair: 'left', pose: at(-90), look: { hair: 'bun', bottom: 'trousers', sleeve: 'long' } },
  { x: 430, y: 445, chair: 'back', pose: POSES.sitting, look: { hair: 'pixie', bottom: 'trousers', sleeve: 'long', broad: true } },
  { x: 770, y: 445, chair: 'back', pose: POSES.restingLeft, look: { hair: 'braid', bottom: 'skirt', sleeve: 'short', hairLength: 40 } },
];

// A teammate's question, in a speech bubble of her own over her head: the
// words, one line each, in an oval with a tail leaning towards her.
const QUESTION = ['Can we target the gut', 'as a new way to address', 'androgen excess in PMOS?'];
const ASKER = 3;
const ASK = { cx: 935, rx: 152, ry: 68, gap: 30, foot: 11, lean: 22 };
function Question({ head, shown }: { head: { x: number; top: number }; shown: number }) {
  const { cx, rx, ry, gap, foot, lean } = ASK;
  const cy = head.top - gap - ry;
  const onRound = (x: number) => cy + ry * Math.sqrt(1 - ((x - cx) / rx) ** 2);
  const mid = cx - lean;
  const [left, right] = [mid - foot, mid + foot];
  const f = (n: number) => n.toFixed(1);
  const d =
    `M${f(left)} ${f(onRound(left))}A${rx} ${ry} 0 1 1 ${f(right)} ${f(onRound(right))}` +
    `Q${f(right - (right - head.x) * 0.3)} ${f(head.top - gap * 0.5)} ${f(head.x)} ${f(head.top - 6)}` +
    `Q${f(left - (left - head.x) * 0.3)} ${f(head.top - gap * 0.6)} ${f(left)} ${f(onRound(left))}Z`;
  const line = 22;
  return (
    <g className="team-room__question" style={{ opacity: shown }}>
      <path d={d} />
      <text x={cx} y={cy - ((QUESTION.length - 1) * line) / 2} textAnchor="middle" dominantBaseline="central">
        {QUESTION.map((words, i) => (
          <tspan key={words} x={cx} dy={i ? line : 0}>
            {words}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function Table() {
  const { back, front, left, right, slant, thick, floor } = TABLE;
  const top = `M${left + slant} ${back}H${right - slant}L${right} ${front}H${left}Z`;
  const edge = `M${left} ${front}V${front + thick}H${right}V${front}`;
  return (
    <g className="team-room__table">
      {[left + 25, right - 25].map((x) => (
        <path key={x} d={`M${x} ${front + thick}V${floor}`} />
      ))}
      <path d={edge} />
      <path d={top} />
    </g>
  );
}

// Chairs, by which way the person on them faces: `front` faces us (the
// chair's back behind them, showing either side), `back` faces away (its
// back over theirs), `right` and `left` side on. Each in two parts, `under`
// (drawn before the person) and `over` (after), as paths from the seat
// point `x`, `y` down to the floor.
type Facing = 'front' | 'back' | 'right' | 'left';
function chair(facing: Facing, x: number, y: number): { under: string; over: string } {
  const floor = TABLE.floor;
  const seatY = y + 3;
  if (facing === 'front' || facing === 'back') {
    const legs = `M${x - 21} ${seatY}L${x - 24} ${floor}M${x + 21} ${seatY}L${x + 24} ${floor}`;
    const seat = `M${x - 25} ${seatY}H${x + 25}`;
    // Wider than her back, so from the front it shows either side of her.
    const w = facing === 'front' ? 31 : 21;
    const top = facing === 'front' ? y - 76 : y - 58;
    const back = `M${x - w} ${seatY}V${top + 6}Q${x - w} ${top} ${x - w + 6} ${top}H${x + w - 6}Q${x + w} ${top} ${x + w} ${top + 6}V${seatY}M${x - w} ${y - 40}H${x + w}`;
    return facing === 'front'
      ? { under: `${back}${legs}${seat}`, over: '' }
      : { under: `${legs}${seat}`, over: back };
  }
  const d = facing === 'right' ? 1 : -1;
  // From the side: the back upright behind them, seat under their thighs.
  return {
    under: `M${x - 14 * d} ${seatY}V${y - 58}M${x - 16 * d} ${seatY}H${x + 26 * d}M${x - 14 * d} ${seatY}L${x - 16 * d} ${floor}M${x + 22 * d} ${seatY}L${x + 24 * d} ${floor}`,
    over: '',
  };
}

// `papers` is how far the papers have gone (see SolutionPapers): until
// each lifts off it lies on the table here, under the people in front.
export function TeamRoom({ shown, papers }: { shown: number; papers: number }) {
  const presenter = useMemo(() => drawWoman(PRESENTING, { hair: 'bun', bottom: 'skirt', sleeve: 'short' }), []);
  const behind = useMemo(() => BEHIND.map((m) => ({ ...m, figure: drawWoman(m.pose, m.look) })), []);
  const round = useMemo(() => ROUND.map((m) => ({ ...m, figure: drawWoman(m.pose, m.look) })), []);
  if (!shown) return null;
  const place = (x: number, y: number, scale = 1) => `translate(${x} ${y}) scale(${FIGURE_SCALE * scale})`;
  const draw = ({ x, y, figure, chair: facing }: Member & { figure: ReturnType<typeof drawWoman> }) => {
    const { under, over } = chair(facing, x, y);
    return (
      <g key={`${x} ${y}`}>
        <path className="team-room__chair" d={under} />
        <LayerArt layer={figure.behind} transform={place(x, y)} />
        <LayerArt layer={figure.main} transform={place(x, y)} />
        <LayerArt layer={figure.over} transform={place(x, y)} />
        {over && <path className="team-room__chair" d={over} />}
      </g>
    );
  };
  const presenterAt = place(PRESENTER.x, PRESENTER.y, PRESENTER.scale);
  return (
    <svg
      className="women-line team-room"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="The iGEM Lund team round a table, talking, while one of them tells this story."
      style={{ opacity: shown }}
    >
      <LayerArt layer={presenter.behind} transform={presenterAt} />
      <LayerArt layer={presenter.main} transform={presenterAt} />
      <LayerArt layer={presenter.over} transform={presenterAt} />
      {/* Her head, unseen, for the speech bubble's tail to point at: with
          her hair (a bun on top) and her outline round it. */}
      <g transform={presenterAt}>
        <circle
          className="team-room__speaker"
          cx={presenter.head[0]}
          cy={presenter.head[1]}
          r={presenter.headRadius + 9}
          fill="none"
        />
      </g>
      {behind.map(draw)}
      <Table />
      {shown > 0.85 && (
        <Question
          shown={Math.min(1, (shown - 0.85) / 0.15)}
          head={{
            x: behind[ASKER].x + FIGURE_SCALE * behind[ASKER].figure.head[0],
            top: behind[ASKER].y + FIGURE_SCALE * (behind[ASKER].figure.head[1] - behind[ASKER].figure.headRadius),
          }}
        />
      )}
      {PAPERS.map(({ x, y, rest }, i) =>
        paperFlight(papers, i) > 0 ? null : (
          <rect
            key={`p${i}`}
            className="team-room__paper"
            x={-PAPER_W / 2}
            y={-PAPER_H / 2}
            width={PAPER_W}
            height={PAPER_H}
            transform={`translate(${x} ${y}) scale(1 ${TABLE_SQUASH.toFixed(4)}) rotate(${rest})`}
          />
        ),
      )}
      {round.map(draw)}
    </svg>
  );
}
