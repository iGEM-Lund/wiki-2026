'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useClock, useScrollProgress, useTimedToggle, useTimedToggles, type Hold } from './scroll-play';
import { Tooltip } from '@/components/content/Tooltip';
import { SymptomRing } from './symptom-ring';
import { dimmed, SolutionPapers } from './solution-papers';
import { SkipToEnd } from './skip-to-end';
import { TeamRoom } from './team-room';
import { SYMPTOMS_OUT, TREATMENT_SPOTS, Treatments } from './treatments';
import { LayerArt } from './women-art';
import {
  blendPose,
  drawWoman,
  FIGURE_SCALE,
  POSES,
  type Figure,
  type Look,
  type Pose,
  type V3,
} from '@/lib/women-on-line';

// The home page's opening scene: the AnTigone title over nine women sitting
// along a string, seen from behind. A little way into the scroll, one of
// them (`HER`), arms folded, shuffles forward and rolls back over the
// string to hang by her knees, upside down and facing the viewer, turning
// crimson as the statistic comes in; then she straightens her legs off the
// string and drops, and the string springs back. The scene never stops the page: while
// it plays it keeps rising, slower than the scroll (see .women-line-scene
// in globals.css), then scrolls away as normal.

const WIDTH = 1200;
const HEIGHT = 440;
// The string: sagging between two points just off either side of the box,
// and on from them straight up and out, on past the screen's edges where
// the screen is wider than the drawing (see --scene-w in globals.css).
const STRING_Y = 120;
const SAG = 24;
const baseY = (x: number) => {
  const u = x / WIDTH;
  if (u < 0) return STRING_Y + SAG * 4 * u;
  if (u > 1) return STRING_Y + SAG * 4 * (1 - u);
  return STRING_Y + SAG * 4 * u * (1 - u);
};
// Her weight pulls the string down locally while she hangs from it.
const DIP_WIDTH = 150;
const stringY = (x: number, dip: number, at: number) => baseY(x) + dip * Math.exp(-(((x - at) / DIP_WIDTH) ** 2));

type Seat = { x: number; pose: Pose; look: Look };

// Who sits where: a few on their own, and two pairs, one with an arm round
// the other, one just leaning into each other. Nobody looks the same twice.
const SEATS: Seat[] = [
  { x: 130, pose: POSES.crossed, look: { hair: 'pixie', bottom: 'trousers', sleeve: 'long' } },
  { x: 280, pose: POSES.hugRight, look: { hair: 'bun', bottom: 'skirt', sleeve: 'short' } },
  { x: 346, pose: POSES.restingLeft, look: { hair: 'curly', bottom: 'shorts', sleeve: 'short' } },
  { x: 490, pose: POSES.swinging, look: { hair: 'ponytail', bottom: 'trousers', sleeve: 'short' } },
  { x: 615, pose: POSES.lap, look: { hair: 'scarf', bottom: 'skirt', sleeve: 'long' } },
  { x: 740, pose: POSES.folded, look: { hair: 'long', bottom: 'trousers', sleeve: 'short', hairLength: 42 } },
  { x: 870, pose: POSES.pointing, look: { hair: 'bob', bottom: 'trousers', sleeve: 'long' } },
  { x: 1000, pose: POSES.restingRight, look: { hair: 'braid', bottom: 'skirt', sleeve: 'long', hairLength: 44 } },
  { x: 1082, pose: POSES.restingLeft, look: { hair: 'buns', bottom: 'trousers', sleeve: 'short' } },
];
// The one who drops down.
const HER = 5;

// How much scroll the scene plays over (--play in globals.css, in vh), and
// a point `vh` into it as a share of that, which is how the timings below
// are given, so adding to the end doesn't move what comes before.
const PLAY_VH = 1180;
const at = (vh: number) => vh / PLAY_VH;

// Her swing down to hang plays by itself, over HANG_MS, once the scroll
// passes HANG_AT (and back the other way if the reader scrolls back above
// it). Each part of it runs over its own share of that time.
const HANG_AT = at(36);
const HANG_MS = 1200;
const H = {
  shuffle: [0, 0.2],
  roll: [0.05, 0.7],
  letGo: [0.6, 0.85],
  // Her ink turning from the others' teal to crimson.
  colour: [0.45, 0.8],
  stat: [0.8, 1],
} as const;
// After a long hang with the statistic, her drop plays by itself too, over
// DROP_MS, once the scroll passes DROP_AT: her legs straighten up off the
// string, she falls, and the view follows her down, leaving the string and
// the others off the top of the screen, until it all freezes with her in
// mid air.
const DROP_AT = at(180);
const DROP_MS = 1600;
const D = {
  straighten: [0, 0.3],
  fall: [0.25, 1],
  // Her hair flying up, and her turning onto her back to sink.
  hairUp: [0.25, 0.5],
  sink: [0.3, 0.95],
  // The view sets off after her a moment late, and catches up as she stops.
  follow: [0.1, 1],
} as const;
// From there on the scroll takes over again: she keeps sinking, slowly,
// the view after her a little slower still, while the story goes on beside
// her, a beat at a time, each fading in and out over its own stretch, in
// the words of the wiki design's Problem section. `phrase` beats lead with
// words instead of a number, set smaller.
type Beat = { big: string; small: ReactNode; from: number; to: number; phrase?: boolean; top?: boolean; words?: string[] };
const TREAT_AT = at(740);
const TREAT_MS = 5200;
const BEATS: Beat[] = [
  // The first beat comes in while she is still falling, so she is never
  // alone on the screen waiting for more scroll.
  { big: 'Up to 70%', small: 'of them remain undiagnosed', from: DROP_AT, to: at(320) },
  {
    big: 'PMOS',
    // Set one word to a line, their first letters picked out to spell it.
    words: ['Polyendocrine', 'Metabolic', 'Ovarian', 'Syndrome'],
    small: (
      <>
        A condition that affects hormone, metabolism and ovarian function.
        <br />
        A common feature? <strong>Hyperandrogenism</strong>.
      </>
    ),
    from: at(320),
    to: at(460),
    phrase: true,
  },
  {
    big: 'Hyperandrogenism',
    small: 'A condition caused by too much androgen hormones, such as testosterone, in the body.',
    from: at(460),
    to: at(600),
    phrase: true,
  },
  // Over her and the symptoms round her, which stay up as the scene
  // scrolls away.
  {
    big: 'Androgen excess',
    small: (
      <>
        Androgens, including testosterone, are a normal part of our biology. Excess levels, through{' '}
        <Tooltip text="The protein in cells that androgens bind to in order to have their effect. When it is switched on, it changes which genes the cell uses.">
          androgen receptor
        </Tooltip>{' '}
        activation, contribute to:
      </>
    ),
    from: at(600),
    to: at(740),
    phrase: true,
    top: true,
  },
  // Then the treatments come in round her, and, a beat later, why they are
  // not the end of it.
  {
    big: 'Current treatments?',
    small: 'Not therapeutically precise.',
    from: TREAT_AT,
    to: at(870),
    phrase: true,
    top: true,
  },
  {
    big: 'Symptoms, not the source',
    small: 'Current treatments help manage androgen-related symptoms but no single approach addresses every aspect of PMOS.',
    from: at(870),
    to: Infinity,
    phrase: true,
    top: true,
  },
];
// Like her hang and drop, every change from here plays out in full once
// the scroll reaches where it starts (and back, if the reader scrolls back
// above it), over its own time in ms. A beat's text takes BEAT_MS to come
// in or go; leaving, it is gone in the first half of that, and the next
// only shows in the second half, so the two never overlap.
const BEAT_MS = 1000;
const beatOpacity = (t: number) => smooth(phase(t, [0.5, 1]));
// The women round her come in with the first beat, and go with it.
const SINKERS_MS = 1400;
// Then she turns upright where she is, and floats there, beside the words.
const FLOAT_MS = 1800;
// Last, she drifts to the middle (over the first part of RING_MS), and the
// symptoms come in round her, one by one (see SymptomRing).
const CENTRE_X = WIDTH / 2;
const TO_CENTRE: [number, number] = [0, 0.35];
const RING_MS = 2600;
// Then the whole scene pulls back into a speech bubble over one of the
// team, in a room full of them (see TeamRoom).
const ROOM_AT = at(990);
// The bubble's tail: from its bottom edge, where it leans towards the
// teammate telling it, to a point TAIL_GAP (px) over her head, all in the
// bubble's own box (0 to 100 each way, see the bubble's edge below), as
// seen stretched to the screen's shape. Till her head is found on the
// screen, a guess at it.
const TAIL_GAP = 12;
const TAIL_GUESS = { x: 46, y: 142 };
function bubbleTail(tip: { x: number; y: number }) {
  // Its foot, 7 wide, on the bottom of the round, leaning her way.
  const foot = 50 + Math.max(-15, Math.min(15, (tip.x - 50) * 0.35));
  const onRound = (x: number) => 50 + 50 * Math.sqrt(1 - ((x - 50) / 50) ** 2);
  const [left, right] = [foot - 3.5, foot + 3.5];
  const f = (n: number) => n.toFixed(2);
  const bend = (x: number, y: number, k: number) => `${f(x + (tip.x - x) * k)} ${f(y + (tip.y - y) * 0.45)}`;
  return {
    from: `${f(left)} ${f(onRound(left))}`,
    to: `${f(right)} ${f(onRound(right))}`,
    // From the foot's right, to the point, and back to its left.
    tail: `Q${bend(right, onRound(right), 0.4)} ${f(tip.x)} ${f(tip.y)}Q${bend(left, onRound(left), 0.5)} ${f(left)} ${f(onRound(left))}`,
  };
}
const ROOM_MS = 2200;
// The papers on their table fly away, and cards with our solution on fly
// in, all in one go, clipped onto a thread as it draws in (see
// SolutionPapers).
const SOLUTION_AT = at(1060);
const SOLUTION_MS = 3800;

// How far the scene rises (in vh) at scroll progress `p`: quickly at first, carrying the
// string up from low on the screen to where there is room under it for her
// to hang, then slowly while she hangs, so it keeps moving with the page.
// Once she drops the view follows her instead (see `camera`).
const lift = (p: number) => {
  const fast = Math.min(p, HANG_AT) * PLAY_VH * 0.55;
  const slow = Math.max(0, Math.min(p, DROP_AT) - HANG_AT) * PLAY_VH * 0.12;
  return fast + slow;
};
// Her ankles, legs straight, pointing up past the string from her knees.
const STRAIGHT: [V3, V3] = [
  [-4, -35, 2],
  [4, -35, 2],
];
// How far the string dips under her at full weight. How far (in drawing
// units) she falls in her drop and the view follows her, and then how much
// further each goes with the rest of the scroll.
const DIP = 16;
// Her middle, below where she hung from, in drawing units: what she turns
// about as she floats, and what the symptoms ring.
const HER_MIDDLE = 60;
// The screen height (px) that the drawings round her are laid out for; on a
// shorter one the ring of symptoms is shallower, and she is let lower while
// text at the top is up.
const DEPTH_PX = 900;
// How far (in drawing units) she is let lower, at the least depth, while a
// beat of text at the top of the screen is up, to leave room for it.
const LOWER = 200;
const FALL = 600;
const FOLLOW = 660;
const SINK = 380;
const SINK_FOLLOW = 340;
// She sinks on, with the scroll, till where the scene used to end.
const SINK_END = at(960);

// Once she has stopped, nine more, smaller and farther off, sinking round
// her, all in her crimson. Seven of the ten (`faint`) are see-through: the
// up to 70% who are never diagnosed. Placed relative
// to her (in drawing units), each with its own size, tilt and which way it
// faces, and coming in one after another with the first beat. Kept
// within a short laptop screen of her, and off the line of text.
// Each moves a little differently: how far round onto her back she is
// (`sink`), how fast she sinks with the scroll, against the view's own
// pace (those above her a touch faster, those below a touch slower, so
// they stay on screen), and how far she turns as she does (`speed`,
// `spin`, degrees), and her own slow drift while she hangs
// there (`sway`, drawing units, every `period` seconds, from `offset`).
type Sinker = {
  dx: number;
  dy: number;
  scale: number;
  tilt: number;
  flip?: boolean;
  faint?: boolean;
  sink: number;
  speed: number;
  spin: number;
  sway: number;
  period: number;
  offset: number;
  look: Look;
};
const SINKERS: Sinker[] = [
  { dx: -420, dy: -150, scale: 0.55, tilt: -8, faint: true, sink: 0.9, speed: 0.8, spin: -10, sway: 8, period: 5.2, offset: 0, look: { hair: 'ponytail', bottom: 'trousers', sleeve: 'short' } },
  { dx: -170, dy: -140, scale: 0.5, tilt: 10, flip: true, faint: true, sink: 1, speed: 1.1, spin: 14, sway: 5, period: 6.1, offset: 1.7, look: { hair: 'bob', bottom: 'skirt', sleeve: 'long' } },
  { dx: 250, dy: -110, scale: 0.65, tilt: -4, sink: 0.8, speed: 0.7, spin: 0, sway: 10, period: 4.6, offset: 3.1, look: { hair: 'curly', bottom: 'shorts', sleeve: 'short' } },
  { dx: -200, dy: 150, scale: 0.6, tilt: 6, flip: true, faint: true, sink: 1, speed: 1, spin: -18, sway: 6, period: 5.7, offset: 0.9, look: { hair: 'braid', bottom: 'trousers', sleeve: 'long', hairLength: 40 } },
  { dx: 180, dy: 170, scale: 0.45, tilt: -12, faint: true, sink: 0.85, speed: 1.25, spin: 8, sway: 9, period: 4.9, offset: 2.4, look: { hair: 'bun', bottom: 'trousers', sleeve: 'short' } },
  { dx: 330, dy: 50, scale: 0.55, tilt: 8, flip: true, sink: 0.95, speed: 0.9, spin: 22, sway: 4, period: 6.6, offset: 4.2, look: { hair: 'scarf', bottom: 'skirt', sleeve: 'long' } },
  { dx: -560, dy: 170, scale: 0.4, tilt: 14, faint: true, sink: 0.75, speed: 1.15, spin: -6, sway: 11, period: 4.3, offset: 5.0, look: { hair: 'pixie', bottom: 'trousers', sleeve: 'long' } },
  { dx: -420, dy: 230, scale: 0.45, tilt: -6, flip: true, faint: true, sink: 1, speed: 0.85, spin: 12, sway: 7, period: 5.9, offset: 2.0, look: { hair: 'long', bottom: 'shorts', sleeve: 'short', hairLength: 36 } },
  { dx: 40, dy: 250, scale: 0.5, tilt: -10, faint: true, sink: 0.9, speed: 1.05, spin: -14, sway: 6, period: 5.4, offset: 3.6, look: { hair: 'buns', bottom: 'skirt', sleeve: 'short' } },
];

// Where the scroll is held for each of those (see useScrollProgress).
const HOLDS: Hold[] = [
  { at: HANG_AT, ms: HANG_MS },
  { at: DROP_AT, ms: DROP_MS },
  { at: BEATS[1].from, ms: FLOAT_MS },
  { at: BEATS[2].from, ms: BEAT_MS },
  { at: BEATS[3].from, ms: RING_MS },
  { at: BEATS[4].from, ms: TREAT_MS },
  { at: BEATS[5].from, ms: BEAT_MS },
  { at: ROOM_AT, ms: ROOM_MS },
  { at: SOLUTION_AT, ms: SOLUTION_MS },
];

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => t * t * (3 - 2 * t);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (2 - 2 * t) ** 3 / 2);
const phase = (p: number, [from, to]: readonly [number, number]) => clamp01((p - from) / (to - from));


// How see-through the faint ones are.
const FAINT = 0.35;

// The pose they all sink in: like hers once she has stopped.
const SINKING: Pose = { ...POSES.hanging, ankles: STRAIGHT, hairUp: 1, sink: 1 };

export function WomenOnLine() {
  const sectionRef = useRef<HTMLElement>(null);
  const p = useScrollProgress(sectionRef, HOLDS);
  // How much of the drawing's width is on the screen, in its units: all of
  // it, unless the stage is wider than the screen (on a tall, narrow one,
  // see --scene-w in globals.css), cropped either side.
  const [span, setSpan] = useState(WIDTH);
  // How much of a full-height screen's depth there is (see DEPTH_PX).
  const [depth, setDepth] = useState(1);
  useEffect(() => {
    const measure = () => {
      const stage = sectionRef.current?.querySelector<HTMLElement>('.women-line-scene__stage');
      if (!stage?.clientWidth) return;
      setSpan(Math.min(WIDTH, (document.documentElement.clientWidth / stage.clientWidth) * WIDTH));
      setDepth(Math.min(1, Math.max(0.6, window.innerHeight / DEPTH_PX)));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // The drop waits for the hang to finish, and the hang only reverses once
  // the drop has, so a fast scroll still plays them one after the other.
  const [hangDone, setHangDone] = useState(false);
  const [dropUndone, setDropUndone] = useState(true);
  const hang = useTimedToggle(p >= HANG_AT || !dropUndone, HANG_MS);
  const dropped = useTimedToggle(p >= DROP_AT && hangDone, DROP_MS);
  if (hangDone !== (hang === 1)) setHangDone(hang === 1);
  if (dropUndone !== (dropped === 0)) setDropUndone(dropped === 0);
  const shuffle = smooth(phase(hang, H.shuffle));
  const roll = smooth(phase(hang, H.roll));
  const letGo = smooth(phase(hang, H.letGo));
  const colour = smooth(phase(hang, H.colour));
  const straighten = smooth(phase(dropped, D.straighten));
  // The statistic, in as she hangs, out as she lets go of the string (where
  // the screen is tall enough that the fall wouldn't take it off the top).
  const stat = smooth(phase(hang, H.stat)) * (1 - straighten);
  const drop = phase(dropped, D.fall);
  const sink = phase(p, [DROP_AT, SINK_END]) * dropped;
  const fall = FALL * easeInOut(drop) + SINK * sink;
  const camera = FOLLOW * easeInOut(phase(dropped, D.follow)) + SINK_FOLLOW * sink;
  const landed = dropped === 1;
  // The first beat and the women round her come in together, as she nears the end of her fall.
  const nearlyLanded = dropped > 0.7;
  const beats = useTimedToggles(
    BEATS.map(({ from, to }, i) => (i === 0 ? nearlyLanded : landed) && p >= from && p < to),
    BEAT_MS,
  );
  const sinkersIn = useTimedToggle(nearlyLanded && p >= BEATS[0].from && p < BEATS[0].to, SINKERS_MS);
  const float = smooth(useTimedToggle(landed && p >= BEATS[1].from, FLOAT_MS));
  const ring = useTimedToggle(landed && p >= BEATS[3].from, RING_MS);
  const centred = smooth(phase(ring, TO_CENTRE));
  const symptoms = phase(ring, [TO_CENTRE[1] - 0.05, 1]);
  // The treatments come in over the symptoms, which go as they do.
  const treat = useTimedToggle(landed && p >= TREAT_AT, TREAT_MS);
  const symptomsOut = 1 - smooth(phase(treat, SYMPTOMS_OUT));
  const room = smooth(useTimedToggle(landed && p >= ROOM_AT, ROOM_MS));
  // Where the tail points: her head, found on the screen, in the
  // bubble's box, as the room settles round the bubble.
  const edgeRef = useRef<SVGSVGElement>(null);
  const [tip, setTip] = useState(TAIL_GUESS);
  useLayoutEffect(() => {
    const edge = edgeRef.current?.getBoundingClientRect();
    const head = document.querySelector('.team-room__speaker')?.getBoundingClientRect();
    if (!edge || !head || !edge.width || !edge.height) return;
    const next = {
      x: ((head.left + head.width / 2 - edge.left) / edge.width) * 100,
      y: ((head.top - TAIL_GAP - edge.top) / edge.height) * 100,
    };
    if (Math.abs(next.x - tip.x) > 0.2 || Math.abs(next.y - tip.y) > 0.2) setTip(next);
  });
  const tail = bubbleTail(tip);
  // As the scene pulls back into the bubble, its words and symbols go, and
  // the women round her come back, all solid, crimson like her.
  const solution = useTimedToggle(landed && p >= SOLUTION_AT, SOLUTION_MS);
  // The rest of the screen darkens as the papers fly away, behind them,
  // the thread and the cards.
  const dark = smooth(dimmed(solution));
  const wordsOut = 1 - smooth(phase(room, [0, 0.35]));
  const crowd = smooth(phase(room, [0.15, 0.7]));
  // Her own slow drift while she floats, and theirs round her.
  const time = useClock(sinkersIn > 0 || float > 0);

  // The string's dip: in with her weight as she rolls under it, then, once
  // she lets go of it, springing back up past level and settling. Rounded
  // to a tenth of a unit so the others are only redrawn when it moves.
  const herX = SEATS[HER].x;
  const rawDip = drop > 0 ? DIP * Math.exp(-4 * drop) * Math.cos(drop * Math.PI * 3.5) : DIP * roll;
  const dip = Math.round(rawDip * 10) / 10;

  const others = useMemo(
    () =>
      SEATS.map((seat) => ({
        figure: drawWoman(seat.pose, seat.look),
        transform: `translate(${seat.x} ${stringY(seat.x, dip, herX).toFixed(2)}) scale(${FIGURE_SCALE})`,
      })),
    [dip, herX],
  );

  // Her: part way from sitting to hanging, falling (accelerating straight
  // down) once she drops, her ink mixed towards crimson.
  const herPose = blendPose(SEATS[HER].pose, POSES.hanging, { shuffle, roll, letGo });
  // Floating, her hair streams up less steeply, and sways.
  herPose.hairUp = smooth(phase(dropped, D.hairUp)) * (1 - 0.3 * float);
  herPose.sink = smooth(phase(dropped, D.sink));
  herPose.rise = float;
  herPose.hairDrift = (0.15 + 0.3 * Math.sin(time * 0.9)) * float;
  if (straighten > 0) {
    herPose.ankles = herPose.ankles.map((ankle, side) =>
      ankle.map((v, axis) => v + (STRAIGHT[side][axis] - v) * straighten),
    ) as [V3, V3];
  }
  const herFigure = drawWoman(herPose, SEATS[HER].look);
  // Once her legs are mostly up off the string, all of her is drawn in
  // front of it, so it doesn't cut across her knees as she goes.
  const herInFront = straighten > 0.5;
  const herNowX = herX + (CENTRE_X - herX) * centred;
  // Cropped, the drawing slides across to keep her in the middle of the
  // screen, as far as it can without showing past its ends: none once she
  // has drifted to the middle herself.
  const panRoom = (WIDTH - span) / 2;
  const pan = Math.max(-panRoom, Math.min(panRoom, CENTRE_X - herNowX));
  // The symptoms ring where she is without her bob, so they stay still.
  const lowered = Math.max(0, ...BEATS.map(({ top }, i) => (top ? beats[i] : 0)));
  const herRingY = stringY(herX, dip, herX) + fall + LOWER * (1 - depth) * smooth(lowered);
  const herY = herRingY + 5 * Math.sin(time * 1.3) * float;
  const herTurn = 3 * Math.sin(time * 0.7) * float;
  const women = others.map((other, i) =>
    i === HER
      ? {
          figure: herFigure,
          transform: `translate(${herNowX.toFixed(2)} ${herY.toFixed(2)}) rotate(${herTurn.toFixed(2)} 0 ${HER_MIDDLE}) scale(${FIGURE_SCALE})`,
          style: {
            // Round the hue wheel the long way, through blue and purple:
            // straight across, teal to crimson passes through a muddy brown.
            '--women-ink': `color-mix(in oklch longer hue, var(--heading-minor) ${(colour * 100).toFixed(1)}%, var(--heading))`,
          } as CSSProperties,
        }
      : { ...other, style: undefined },
  );

  const sinkers = useMemo(
    () => SINKERS.map((sinker) => ({ ...sinker, figure: drawWoman({ ...SINKING, sink: sinker.sink }, sinker.look) })),
    [],
  );
  // Where she stops, and how far they have come in.
  const herRestY = stringY(herX, 0, herX) + FALL;

  // The string, sampled so its dip under her shows.
  const stringPath = useMemo(() => {
    const points: string[] = [];
    for (let x = -WIDTH; x <= 2 * WIDTH; x += 10) points.push(`${x} ${stringY(x, dip, herX).toFixed(2)}`);
    return `M${points.join('L')}`;
  }, [dip, herX]);

  // Where each of the women round her is now: each at her own pace,
  // dropping in from her own height, drifting on her own clock.
  const placed = sinkers.map(({ dx, dy, tilt, speed, spin, sway, period, offset, ...sinker }, i) => {
    const arrived = smooth(clamp01(Math.max(sinkersIn, crowd) * 1.8 - i * 0.09));
    const wave = ((time / period) * 2 + offset) * Math.PI;
    return {
      ...sinker,
      arrived,
      x: herNowX + dx + sway * Math.sin(wave),
      y: herRestY + dy + SINK_FOLLOW * sink * speed + (1 - arrived) * (30 + 40 * speed) + sway * 0.5 * Math.sin(wave * 1.3),
      turn: tilt + spin * sink + 3 * Math.sin(wave * 0.7),
    };
  });

  return (
    <section ref={sectionRef} className="women-line-scene">
      <div
        className="women-line-scene__stage"
        style={{ '--lift': `${lift(p).toFixed(3)}vh`, '--room': room.toFixed(4) } as CSSProperties}
      >
        <TeamRoom shown={room} papers={solution} />
        {/* Everything so far, which pulls back into a speech bubble. */}
        {/* Clipped to its oval only once it starts to shrink into it, so the
            string runs on past the stage's sides where the screen is wider. */}
        <div className="women-line-scene__bubble" style={room > 0 ? undefined : { overflow: 'visible' }}>
        <div className="women-line-scene__world">
        {/* The view following her fall, in drawing units (1200 to the
            stage's width). */}
        <div
          className="women-line-scene__camera"
          style={{ translate: `0 ${(-camera / 12).toFixed(3)}cqw` }}
        >
        <div className="women-line-scene__title">
          <hgroup>
            <h1>AnTigone</h1>
            <p>A gut-based approach to address androgen excess in PMOS</p>
          </hgroup>
          <SkipToEnd />
        </div>
        <div className="women-line-scene__art" style={pan ? { translate: `${(pan / 12).toFixed(3)}cqw 0` } : undefined}>
          <svg
            className="women-line"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label="Nine women sitting on a string, seen from behind. As the page scrolls, one of them swings back to hang from it by her knees, then drops, and sinks through the air among nine more, most of them faint."
          >
            {/* Shins hang on the far side of the string, so they go first. */}
            {women.map(({ figure, transform, style }, i) =>
              i === HER && herInFront ? null : (
                <LayerArt key={i} layer={figure.behind} transform={transform} style={style} />
              ),
            )}
            <path className="women-line__string" d={stringPath} />
            {herInFront && (
              <LayerArt layer={women[HER].figure.behind} transform={women[HER].transform} style={women[HER].style} />
            )}
            {women.map(({ figure, transform, style }, i) => (
              <LayerArt key={i} layer={figure.main} transform={transform} style={style} />
            ))}
            {women.map(({ figure, transform, style }, i) => (
              <LayerArt key={i} layer={figure.over} transform={transform} style={style} />
            ))}
            {(sinkersIn > 0 || crowd > 0) &&
              placed.map(({ x, y, turn, scale, flip, faint, figure, arrived }, i) => {
                const shown = arrived * (faint ? FAINT + (1 - FAINT) * crowd : 1);
                if (!shown) return null;
                const s = FIGURE_SCALE * scale;
                return (
                  <g
                    key={i}
                    opacity={shown}
                    transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${turn.toFixed(2)}) scale(${flip ? -s : s} ${s})`}
                    style={{ '--women-ink': 'var(--heading-minor)' } as CSSProperties}
                  >
                    <LayerArt layer={figure.behind} transform="" />
                    <LayerArt layer={figure.main} transform="" />
                    <LayerArt layer={figure.over} transform="" />
                  </g>
                );
              })}
            <g opacity={wordsOut * symptomsOut}>
              <SymptomRing cx={herNowX} cy={herRingY + HER_MIDDLE} span={span} depth={depth} shown={wordsOut * symptomsOut ? symptoms : 0} />
            </g>
            <g opacity={wordsOut}>
              <Treatments cx={herNowX} cy={herRingY + HER_MIDDLE} span={span} shown={treat} />
            </g>
            {treat > 0 && (
              <PeacockHer
                figure={herFigure}
                transform={women[HER].transform}
                x={herNowX}
                y={herRingY + HER_MIDDLE}
                shown={treat}
                opacity={wordsOut}
              />
            )}
          </svg>
          <p className="women-line-scene__stat" style={{ opacity: stat, translate: `0 ${((1 - stat) * 1).toFixed(3)}rem` }}>
            <strong>10–13%</strong>
            <span>of women of reproductive age are affected by PMOS</span>
          </p>
        </div>
        </div>
        {BEATS.map((beat, i) => {
          const shown = beatOpacity(beats[i]) * wordsOut;
          return (
            <p
              key={beat.big}
              className={`women-line-scene__next${beat.phrase ? ' women-line-scene__next--phrase' : ''}${beat.top ? ' women-line-scene__next--top' : ''}`}
              style={{ opacity: shown, translate: `0 ${(1 - shown).toFixed(3)}rem`, visibility: shown ? undefined : 'hidden' }}
            >
              {beat.words ? (
                <strong className="women-line-scene__acronym" aria-label={beat.words.join(' ')}>
                  {beat.words.map((word) => (
                    <span key={word} aria-hidden="true">
                      <b>{word[0]}</b>
                      {word.slice(1)}
                    </span>
                  ))}
                </strong>
              ) : (
                <strong>{beat.big}</strong>
              )}
              <span>{beat.small}</span>
            </p>
          );
        })}
        </div>
        </div>
        {/* The bubble's edge and its tail down to the teammate telling it,
            one line, drawn once it has shrunk to size: in a box the
            bubble's size (0 to 100 each way, stretched to fit), the tail
            hanging below it. */}
        {room > 0.8 && (
          <svg
            ref={edgeRef}
            className="women-line-scene__bubble-edge"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{ opacity: smooth(phase(room, [0.8, 1])) }}
          >
            <path className="women-line-scene__tail" d={`M${tail.to}${tail.tail}Z`} />
            {/* Closed: it ends where it started, at the tail's left foot,
                so the two ends join there rather than meeting as a notch. */}
            <path d={`M${tail.from}A50 50 0 1 1 ${tail.to}${tail.tail}Z`} />
          </svg>
        )}
        {room > 0.8 && (
          <p className="women-line-scene__ask" style={{ opacity: smooth(phase(room, [0.85, 1])) }}>
            Our Solution?
          </p>
        )}
        {dark > 0 && <div className="women-line-scene__dark" style={{ opacity: dark }} />}
        {room > 0 && (
          <div style={{ opacity: room }}>
            <SolutionPapers shown={solution} />
          </div>
        )}
      </div>
    </section>
  );
}

// Her, over her own drawing, in peacock, but only where the treatments
// reach her (TREATMENT_SPOTS), each growing from its spot as it comes in,
// soft at its edge: the part of her they give some relief to.
function PeacockHer({
  figure,
  transform,
  x,
  y,
  shown,
  opacity,
}: {
  figure: Figure;
  transform: string;
  x: number;
  y: number;
  shown: number;
  opacity: number;
}) {
  const id = useId().replace(/:/g, '');
  return (
    <g opacity={opacity}>
      <defs>
        <radialGradient id={`${id}-fade`}>
          <stop offset="0.7" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x={-2400} y={-2400} width={6000} height={6000}>
          {TREATMENT_SPOTS.map(({ dx, dy, r, reach }, i) => {
            const grown = reach(shown);
            return grown ? (
              <circle key={i} cx={x + dx} cy={y + dy} r={r * grown} fill={`url(#${id}-fade)`} />
            ) : null;
          })}
        </mask>
      </defs>
      <g mask={`url(#${id}-mask)`} style={{ '--women-ink': 'var(--color-peacock)' } as CSSProperties}>
        <LayerArt layer={figure.behind} transform={transform} />
        <LayerArt layer={figure.main} transform={transform} />
        <LayerArt layer={figure.over} transform={transform} />
      </g>
    </g>
  );
}
