import { useEffect, useMemo, useRef, useState } from 'react';
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
const ASKER = 3;
const ASK = { cx: 935, gap: 30, foot: 11, lean: 22, line: 22 };
// The bubble's gap from the screen's edge and from the presenter's bubble.
const ASK_MARGIN = 14;
const ASK_CLEAR = 10;
// How it can be set out, in the order it is tried: the first is the one
// drawn on a wide screen (its oval chosen by hand); where that would run off
// the screen's edge or into the presenter's bubble or its tail, the same
// words in more, shorter lines, in a narrower and taller oval, whose size is
// worked out from the lines (a letter is about 10 units across at this size).
const ASK_LAYOUTS: { lines: string[]; rx?: number; ry?: number; ratio?: number }[] = [
  { lines: ['Can we target the gut', 'as a new way to address', 'androgen excess in PMOS?'], rx: 152, ry: 68 },
  { lines: ['Can we target', 'the gut as a new way', 'to address androgen', 'excess in PMOS?'], ratio: 1.6 },
  { lines: ['Can we target', 'the gut as a', 'new way to address', 'androgen excess', 'in PMOS?'], ratio: 1.4 },
  { lines: ['Can we', 'target the gut', 'as a new way', 'to address', 'androgen excess', 'in PMOS?'], ratio: 1.2 },
];
const LETTER = 9.8;
// What its text fills of its oval, across and down, squared and added.
const FILL = 0.85;
// Half the width of the presenter's tail, and how far the bubble keeps off it.
const TAIL_HALF = 16;

type Ellipse = { cx: number; cy: number; rx: number; ry: number };
// What the screen shows of the room (its right edge) and what the question
// has to keep clear of: the presenter's bubble, and its tail down to her.
type Seen = { right: number; presenter: Ellipse | null; tail: { x: number; top: number; bottom: number } | null };
type Setting = Ellipse & { lines: string[] };

// The question's bubble over `head`, as far right as it goes (where the
// tail leans from) but within what the screen shows, and clear of the
// presenter's bubble.
function setQuestion(head: { top: number }, seen: Seen): Setting {
  let setting!: Setting;
  for (const { lines, rx: fixedRx, ry: fixedRy, ratio } of ASK_LAYOUTS) {
    const w = Math.max(...lines.map((words) => words.length)) * LETTER;
    const h = ASK.line * (lines.length - 1) + 19;
    let rx = fixedRx ?? 0;
    let ry = fixedRy ?? 0;
    if (ratio) {
      rx = Math.sqrt(((w / 2) ** 2 + ratio ** 2 * (h / 2) ** 2) / FILL);
      ry = rx / ratio;
    }
    const cx = Math.min(ASK.cx, seen.right - ASK_MARGIN - rx);
    const cy = head.top - ASK.gap - ry;
    setting = { lines, cx, cy, rx, ry };
    const { presenter, tail } = seen;
    const clear = Array.from({ length: 90 }, (_, i) => (i / 90) * 2 * Math.PI).every((t) => {
      const x = cx + rx * Math.cos(t);
      const y = cy + ry * Math.sin(t);
      if (presenter && ((x - presenter.cx) / (presenter.rx + ASK_CLEAR)) ** 2 + ((y - presenter.cy) / (presenter.ry + ASK_CLEAR)) ** 2 <= 1) {
        return false;
      }
      return !(tail && Math.abs(x - tail.x) < TAIL_HALF + ASK_CLEAR && y > tail.top && y < tail.bottom);
    });
    if (clear) break;
  }
  return setting;
}

function Question({ head, shown, setting }: { head: { x: number; top: number }; shown: number; setting: Setting }) {
  const { foot, lean, gap, line } = ASK;
  const { lines, cx, cy, rx, ry } = setting;
  const onRound = (x: number) => cy + ry * Math.sqrt(1 - ((x - cx) / rx) ** 2);
  const reach = rx * 0.6;
  const mid = Math.min(cx + reach, Math.max(cx - reach, ASK.cx - lean));
  const [left, right] = [mid - foot, mid + foot];
  const f = (n: number) => n.toFixed(1);
  const d =
    `M${f(left)} ${f(onRound(left))}A${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 1 ${f(right)} ${f(onRound(right))}` +
    `Q${f(right - (right - head.x) * 0.3)} ${f(head.top - gap * 0.5)} ${f(head.x)} ${f(head.top - 6)}` +
    `Q${f(left - (left - head.x) * 0.3)} ${f(head.top - gap * 0.6)} ${f(left)} ${f(onRound(left))}Z`;
  return (
    <g className="team-room__question" style={{ opacity: shown }}>
      <path d={d} />
      <text x={cx} y={cy - ((lines.length - 1) * line) / 2} textAnchor="middle" dominantBaseline="central">
        {lines.map((words, i) => (
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
  // Her head, in the drawing's units, where the bubble's tail comes down to.
  const k = FIGURE_SCALE * PRESENTER.scale;
  const presenterHead = {
    x: PRESENTER.x + k * presenter.head[0],
    top: PRESENTER.y + k * (presenter.head[1] - presenter.headRadius - 9),
  };
  const svgRef = useRef<SVGSVGElement>(null);
  const [seen, setSeen] = useState<Seen>({ right: WIDTH, presenter: null, tail: null });
  // Measured as it first shows, as the question comes in, and once settled.
  const stages = [shown > 0, shown > 0.85, shown >= 1];
  // What the screen shows of the room, and where the presenter's bubble will
  // sit once the scene has settled round it (measured off a hidden copy of
  // its edge at its final size), both in the drawing's units.
  useEffect(() => {
    const svg = svgRef.current;
    const stage = svg?.parentElement;
    if (!svg || !stage) return;
    const measure = () => {
      const box = stage.getBoundingClientRect();
      const unit = WIDTH / stage.clientWidth;
      const probe = document.createElement('div');
      probe.className = 'women-line-scene__bubble-edge';
      probe.style.setProperty('--room', '1');
      probe.style.visibility = 'hidden';
      stage.appendChild(probe);
      const b = probe.getBoundingClientRect();
      probe.remove();
      const top = svg.getBoundingClientRect().top;
      setSeen({
        right: Math.min(WIDTH, (document.documentElement.clientWidth - box.left) * unit),
        presenter: {
          cx: ((b.left + b.right) / 2 - box.left) * unit,
          cy: ((b.top + b.bottom) / 2 - top) * unit,
          rx: (b.width / 2) * unit,
          ry: (b.height / 2) * unit,
        },
        tail: { x: presenterHead.x, top: (b.bottom - top) * unit - 10, bottom: presenterHead.top },
      });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, stages); // eslint-disable-line react-hooks/exhaustive-deps
  const asker = behind[ASKER];
  const askerHead = {
    x: asker.x + FIGURE_SCALE * asker.figure.head[0],
    top: asker.y + FIGURE_SCALE * (asker.figure.head[1] - asker.figure.headRadius),
  };
  const question = useMemo(() => setQuestion(askerHead, seen), [askerHead.top, seen]);
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
      ref={svgRef}
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
        <Question shown={Math.min(1, (shown - 0.85) / 0.15)} head={askerHead} setting={question} />
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
