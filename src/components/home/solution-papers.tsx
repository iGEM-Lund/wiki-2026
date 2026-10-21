import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Tooltip } from '@/components/content/Tooltip';
import { Card } from '@/components/content/Card';
import { CardTitle } from '@/components/content/CardTitle';
import { threadWidth } from './thread-width';

// The end of the home scene, in one go (`shown`, 0 to 1): the papers on the
// team's table (see TeamRoom), plain white sheets, fly up off it and away
// off the screen as the screen darkens behind them, and a thread, like the
// one the women sat on, draws itself in over it in an S on its side. Then
// the site's own cards fly in together, with our solution on them, from
// the wiki design's Our Solution section, two by two, each column hung by
// the cards' tops from one of the S's outer strokes, each card swinging a
// little until it settles.

const SOLUTION = [
  {
    title: 'Act in the gut',
    text: (
      <>
        Androgens excreted into the gut can be reactivated there and reabsorbed into the blood (
        <Tooltip text="The loop in which substances are released into the gut, taken up again and carried back to the liver and blood.">
          enterohepatic circulation
        </Tooltip>
        ).
      </>
    ),
  },
  {
    title: 'Use an engineered probiotic strain',
    text: (
      <>
        <em>E. coli</em> carrying the gene for a steroid{' '}
        <Tooltip text="An enzyme that adds hydrogen to a steroid at the 5β position and changes its 3D shape.">
          5β-reductase
        </Tooltip>
        , an enzyme that acts on androgens.
      </>
    ),
  },
  {
    title: 'Control with gut-gated expression',
    text: (
      <>
        A hypoxia-responsive{' '}
        <Tooltip text="The DNA part that switches a gene on.">promoter</Tooltip> is designed to switch the enzyme on
        only under low oxygen, as in the gut.
      </>
    ),
  },
  {
    title: '5β-reduction of testosterone',
    text: (
      <>
        The enzyme converts testosterone into 5β-dihydrotestosterone, a steroid with far lower{' '}
        <Tooltip text="How strongly a hormone switches on the androgen receptor.">androgenic activity</Tooltip>.
      </>
    ),
  },
];

// Each paper: where it lies on the table, in the room's drawing units (see
// TeamRoom: 1200 wide, its bottom on the bottom of the screen), turned by
// `rest` degrees; when it lifts off (a share of the papers' time); where it
// goes, past the edge of the screen (% across, vh down); and how far it
// turns on the way.
export type Paper = { x: number; y: number; rest: number; lift: number; away: [number, number]; spin: number };
export const PAPERS: Paper[] = [
  { x: 310, y: 334, rest: -14, lift: 0.1, away: [-20, -25], spin: -110 },
  { x: 372, y: 342, rest: 9, lift: 0.3, away: [-25, 70], spin: 130 },
  { x: 438, y: 330, rest: -4, lift: 0, away: [20, -40], spin: -90 },
  { x: 500, y: 344, rest: 21, lift: 0.22, away: [5, 135], spin: 100 },
  { x: 566, y: 336, rest: -10, lift: 0.06, away: [42, -45], spin: -140 },
  { x: 640, y: 343, rest: 6, lift: 0.26, away: [62, 140], spin: 120 },
  { x: 706, y: 331, rest: -19, lift: 0.04, away: [80, -40], spin: -100 },
  { x: 770, y: 342, rest: 12, lift: 0.18, away: [125, 40], spin: 150 },
  { x: 836, y: 333, rest: -7, lift: 0.12, away: [120, 125], spin: -120 },
  { x: 892, y: 345, rest: 16, lift: 0.28, away: [118, -20], spin: 90 },
];
export const ROOM_WIDTH = 1200;
const ROOM_HEIGHT = 520;
// A paper's size on the table, in the room's units, and how flat it lies
// there: tipped back TABLE_TIP degrees, which squashes it to TABLE_SQUASH
// of its height as drawn.
export const PAPER_W = 24;
export const PAPER_H = 31;
const TABLE_TIP = 62;
export const TABLE_SQUASH = Math.cos((TABLE_TIP * Math.PI) / 180);

// The cards, two by two in the middle of the screen: each laid out
// `design` px wide and scaled to `width` (% of the screen's width), with
// `gap` (% of it) between them across, room for the thread between the
// columns, and ROW_GAP (vh) down; on a tall, narrow screen in narrower
// columns, wider for it. Smaller still if two rows of them that size
// wouldn't fit the screen's height (ROWS_FIT of it). Each flies in from
// `from` (% across, vh down), off the screen, turning `spin` degrees on
// the way.
const WIDE = { width: 27, gap: 12, design: 408 };
const NARROW = { width: 44, gap: 5, design: 280 };
const ROW_GAP = 6;
const ROWS_FIT = 86;
const CARD_FROM: { from: [number, number]; spin: number }[] = [
  { from: [-30, 20], spin: -40 },
  { from: [130, 20], spin: 40 },
  { from: [-30, 110], spin: 35 },
  { from: [130, 110], spin: -35 },
];
// Before its height is measured, a card's guess at it, in px as laid out.
const CARD_H = 300;
// The order the thread reaches the cards in: down the first column, then
// down the second.
const CLIP_ORDER = [0, 2, 1, 3];

type P2 = [number, number];
// Where the thread leaves the bottom of the screen, % across.
export const THREAD_EXIT = 50;
// The points the thread passes through, in % across and vh down, over the
// cards in two columns centred at `a` and `b`, `half` wide each side of
// that, their rows' top edges at `tops`, `under` just below them. In from
// the top in the middle, down through the top left card's clip, round in a
// curl out to the left, then in one diagonal up through the bottom left
// card's clip and the top right one's, round in the same curl out to the
// right, and down through the bottom right card's clip and out of the
// bottom in the middle. The last three are where it leaves, which keeps
// to THREAD_EXIT across the whole screen (see `exit`).
function threadPoints([one, two]: [number, number], under: number, [a, b]: P2, half: number): P2[] {
  // The curl on the right, from the top right clip round to the bottom
  // right one; the one on the left is the same turned half round, from the
  // top left clip to the bottom left.
  const curl: P2[] = [
    [b + (b - a) * 0.25, Math.max(3, one - 8)],
    [b + half + 6, (one + two) / 2],
    [b + half * 0.6, two - 6],
  ];
  const turned = ([x, y]: P2): P2 => [100 - x, one + two - y];
  return [
    [50, -10],
    [(50 + a) / 2 + 2, one / 2],
    [a, one],
    ...curl.map(turned).reverse(),
    [a, two],
    [b, one],
    ...curl,
    [b, two],
    // Straight by 90vh at the latest, so it is in line with the thread the
    // next section picks up at the bottom edge even when the cards run low.
    [THREAD_EXIT, Math.min(under + 12, 90)],
    [THREAD_EXIT, 100],
    [THREAD_EXIT, 115],
  ];
}
// A smooth curve through `points` (px), as an SVG path: Catmull-Rom, so
// every join is smooth.
function through(points: P2[]): string {
  const at = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))];
  const f = (p: P2) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  let d = `M${f(points[0])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1: P2 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: P2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1)} ${f(c2)} ${f(p2)}`;
  }
  return d;
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
// Easing for something thrown: off quickly, slowing as it lands.
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t * t;

// Each part's share of the whole, so it all runs on without a pause: the
// papers away, the screen darkening behind them, while the thread draws
// itself in; then the cards flying in all together, each clipped on as it
// lands, in the order the thread reaches them, a moment (CLIP_STEP) apart.
const SCATTER = [0, 0.5] as const;
const DIM = [0, 0.45] as const;
const THREAD = [0.04, 0.46] as const;
const CARDS_IN = [0.42, 0.74] as const;
const CLIP_STEP = 0.035;
// A card's swing once clipped on: how far it starts out, degrees, and how
// quickly it dies away and swings to and fro (per whole of `shown`).
const SWING = { from: 5, damp: 16, rate: 40 };
const share = (t: number, [from, to]: readonly [number, number]) => clamp01((t - from) / (to - from));

// How dark the screen has gone behind the papers, thread and cards.
export const dimmed = (shown: number) => share(shown, DIM);
// How far paper `i` is on its way: 0 still on the table (where TeamRoom
// draws it, under the people in front of it), 1 gone.
export const paperFlight = (shown: number, i: number) => {
  const { lift } = PAPERS[i];
  return clamp01((share(shown, SCATTER) - lift) / (1 - 0.3));
};

export function SolutionPapers({ shown }: { shown: number }) {
  // The stage's width, the screen's size, in px, and the tallest card's
  // height as laid out, to lay the thread and the rows out by.
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1200, vw: 1200, h: 800, card: CARD_H });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tallest = Math.max(...[...el.querySelectorAll<HTMLElement>('.solution-papers__card')].map((c) => c.offsetHeight));
    const next = { w: el.clientWidth, vw: document.documentElement.clientWidth, h: window.innerHeight, card: tallest };
    if (
      Math.abs(next.w - size.w) > 0.5 ||
      Math.abs(next.vw - size.vw) > 0.5 ||
      Math.abs(next.h - size.h) > 0.5 ||
      Math.abs(next.card - size.card) > 0.5
    )
      setSize(next);
  });
  const { w, vw, h } = size;
  // Laid out across the part of the stage on the screen (`seen` px wide,
  // in its middle): `across` (% of it) to px on the stage.
  const seen = Math.min(w, vw);
  const across = (x: number) => w / 2 + ((x - 50) / 100) * seen;
  const layout = seen < h ? NARROW : WIDE;
  const scale = Math.min(((layout.width / 100) * seen) / layout.design, (((ROWS_FIT - ROW_GAP) / 200) * h) / size.card);
  const cardW = (layout.design * scale * 100) / seen;
  const card = ((size.card * scale) / h) * 100;
  // Card `i`'s centre across, % of what's seen.
  const cardX = (i: number) => 50 + ((i % 2 ? 1 : -1) * (cardW + layout.gap)) / 2;
  // The cards' two rows, in the middle of the screen.
  const tops: [number, number] = [50 - card - ROW_GAP / 2, 50 + ROW_GAP / 2];
  // Out of the bottom at THREAD_EXIT of the whole screen's width, where
  // the section below, as wide as the screen, picks it up.
  const exit = w / 2 + ((THREAD_EXIT - 50) / 100) * vw;
  const points = threadPoints(tops, 50 + card + ROW_GAP / 2 + 4, [cardX(0), cardX(1)], cardW / 2);
  const d = through(
    points.map(([x, y], i): P2 => [i >= points.length - 3 ? exit : across(x), (y / 100) * h]),
  );
  const drawn = share(shown, THREAD);
  return (
    <div ref={ref} className="solution-papers">
      {PAPERS.map((paper, i) => {
        const s = paperFlight(shown, i);
        if (s <= 0 || s >= 1) return null;
        // Thrown up off the table and away past the edge of the screen,
        // swaying from side to side as paper does, and coming at the viewer:
        // it grows as it goes, to several times its size.
        const go = easeIn(s);
        const sway = Math.sin(s * Math.PI * 2.4 + i) * 7 * Math.sin(s * Math.PI);
        const left = mix(paper.x / (ROOM_WIDTH / 100), paper.away[0], go) + sway;
        const up = (ROOM_HEIGHT - paper.y) / (ROOM_WIDTH / 100);
        // Tumbling: tipped up off the table, then rocking over and back
        // about both axes, more as it picks up speed.
        const tipX = TABLE_TIP * (1 - smooth(clamp01(s * 4))) + 60 * Math.sin(s * 8 + i) * Math.min(1, s * 3);
        const tipY = 55 * Math.sin(s * 6 + i * 1.7) * Math.min(1, s * 3);
        const style = {
          left: `${left.toFixed(3)}%`,
          top: `calc(var(--lift, 0vh) + ${mix(100, paper.away[1], go).toFixed(3)}vh - ${(up * (1 - go)).toFixed(3)}cqw)`,
          width: `${(PAPER_W / (ROOM_WIDTH / 100)).toFixed(3)}cqw`,
          height: `${(PAPER_H / (ROOM_WIDTH / 100)).toFixed(3)}cqw`,
          transform: `translate(-50%, -50%) perspective(500px) rotateX(${tipX.toFixed(2)}deg) rotateY(${tipY.toFixed(2)}deg) rotate(${(paper.rest + paper.spin * s).toFixed(2)}deg) scale(${(1 + 8 * s ** 2.2).toFixed(3)})`,
        } as CSSProperties;
        return <div key={i} className="solution-papers__paper" style={style} />;
      })}
      {drawn > 0 && (
        <svg className="solution-papers__thread" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
          {/* As thick as the string the women sat on, and as the section below
              carries it on (see threadWidth). */}
          <path
            d={d}
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={1 - drawn}
            strokeWidth={threadWidth(vw, h)}
          />
        </svg>
      )}
      {SOLUTION.map(({ title, text }, i) => {
        // Setting off with the others, landing as the thread reaches its
        // clip, then swinging from it until it settles.
        const lands = CARDS_IN[1] + CLIP_ORDER.indexOf(i) * CLIP_STEP;
        const t = clamp01((shown - CARDS_IN[0]) / (lands - CARDS_IN[0]));
        const e = easeOut(t);
        const after = Math.max(0, shown - lands);
        const sway = (i % 2 ? -1 : 1) * SWING.from * Math.exp(-SWING.damp * after) * Math.cos(SWING.rate * after);
        const { from, spin } = CARD_FROM[i];
        const x = cardX(i);
        const y = tops[i < 2 ? 0 : 1];
        const turn = spin * (1 - e) + (t < 1 ? SWING.from * (i % 2 ? -1 : 1) * e : sway);
        const style = {
          left: `${across(mix(from[0], x, e)).toFixed(2)}px`,
          top: `calc(var(--lift, 0vh) + ${mix(from[1], y, e).toFixed(3)}vh)`,
          width: `${layout.design}px`,
          // Turning about the clip it hangs from, and scaled from it.
          transformOrigin: '50% 0',
          transform: `translateX(-50%) rotate(${turn.toFixed(2)}deg) scale(${scale.toFixed(4)})`,
          visibility: t > 0 ? undefined : 'hidden',
        } as CSSProperties;
        // The clip snaps on as it lands, and swings with it.
        const clipped = clamp01(after / 0.03);
        return (
          <div key={title}>
            <div className="solution-papers__card" style={style}>
              <Card>
                <CardTitle>{title}</CardTitle>
                <p>{text}</p>
              </Card>
            </div>
            {clipped > 0 && (
              <span
                className="solution-papers__clip"
                style={{
                  left: `${across(x).toFixed(2)}px`,
                  top: `calc(var(--lift, 0vh) + ${y}vh)`,
                  opacity: clipped,
                  transform: `translate(-50%, -35%) rotate(${sway.toFixed(2)}deg) scale(${(1.5 - 0.5 * clipped).toFixed(3)})`,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
