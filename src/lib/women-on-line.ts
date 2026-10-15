// Line-art women sitting on a string, seen from behind, for the home page's
// "1 in 9" scene (src/components/home/women-on-line.tsx).
//
// Each woman is a small pose rig rather than a fixed drawing. The rig is 3D
// (x right, y down, z away from the viewer, the string running along x at
// y = z = 0) and drawn flat by dropping z, so the one move that matters, her
// rolling backwards off the string to hang by her knees, is two rotations
// about axes parallel to the string: the whole of her about her knees, then
// her upper body about her hips. Rolling backwards turns her round, so the
// woman who drops ends up upside down and facing the viewer, the only face
// in the scene. Everything here is plain geometry with no DOM, so the same
// code can render on the server and run per frame in the browser.
//
// The drawing style is a single contour line, like the brand illustrations:
// every body part is a thick round-capped stroke (or a closed shape), and a
// group of parts is drawn twice, once wide in ink and once slightly narrower
// in the page colour on top. Where parts overlap the paper pass covers the
// ink joins, leaving only the outline of the group's union. Separate groups
// (arms, hair) keep their own outline over the body.

export type V3 = [number, number, number];
type V2 = [number, number];

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const lerp = (a: V3, b: V3, t: number): V3 => add(a, mul(sub(b, a), t));
const dotV = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (a: V3) => Math.hypot(...a);
const unit = (a: V3): V3 => mul(a, 1 / (length(a) || 1));
const rad = (deg: number) => (deg * Math.PI) / 180;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// Turn `p` by `deg` about the line through `about` parallel to the string.
// Positive turns the top of a figure towards the viewer: her rolling back.
function rollX(p: V3, about: V3, deg: number): V3 {
  const [, y, z] = sub(p, about);
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return [p[0], about[1] + y * c - z * s, about[2] + y * s + z * c];
}

const fmt = (n: number) => (Math.round(n * 100) / 100).toString();
const pt = (p: V3 | V2) => `${fmt(p[0])} ${fmt(p[1])}`;

// Turn `p` by `deg` in the plane of the screen about `about`. Positive is
// clockwise on screen (y runs down).
// Turn `p` by `deg` about the upright line through `about`: 180 turns a
// figure seen from behind round to face the viewer.
function rollY(p: V3, about: V3, deg: number): V3 {
  const [x, , z] = sub(p, about);
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return [about[0] + x * c + z * s, p[1], about[2] - x * s + z * c];
}

function rollZ(p: V3, about: V3, deg: number): V3 {
  const [x, y] = sub(p, about);
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return [about[0] + x * c - y * s, about[1] + x * s + y * c, p[2]];
}

// Thickness of the drawn contour line, in the figure's own units. The scene
// draws figures at FIGURE_SCALE, which brings this to about the string's
// 3.4, so the women and the string read as drawn with the same pen.
export const LINE = 2.5;
export const FIGURE_SCALE = 1.35;

const ARM = { upper: 24, fore: 21 };
const HEAD = 10.5;

export type Hair = 'long' | 'bun' | 'buns' | 'ponytail' | 'braid' | 'bob' | 'curly' | 'pixie' | 'short' | 'scarf';
export type Bottom = 'skirt' | 'trousers' | 'shorts';
export type Sleeve = 'short' | 'long';

/**
 * Where a hand goes, relative to her shoulder. `body` targets move with her
 * as she rolls (a hand on the string stays on the string); `world` ones are
 * fixed to the scene (arms dangling straight down whichever way up she is).
 */
export type Arm = { to: V3; frame?: 'body' | 'world'; elbow?: 'out' | 'down' | 'folded' };

export interface Pose {
  // Sideways lean of her body and tilt of her head, degrees, + to the right.
  lean: number;
  headTilt: number;
  // Where each ankle hangs, relative to its knee: straight down by default,
  // swung away (+z) or in (-z), or crossed (x).
  ankles: [V3, V3];
  // Screen-left and screen-right arm. From behind, her right is screen right.
  arms: [Arm, Arm];
  // 0 sitting where she is; 1 shuffled forward until her knees hook over the
  // string.
  shuffle: number;
  // 0 sitting up, 1 hanging upside down. The first half swings her (thighs
  // and all) back about her knees; the second straightens her at the hips.
  roll: number;
  // 0 hands where `arms` puts them (on the string, which she holds on to
  // as she rolls over), 1 let go and folded in front of her.
  letGo: number;
  // 0 none; 1 her hair streaming straight up, as she falls.
  hairUp?: number;
  // 0 as the roll leaves her; 1 sinking through the air on her back, seen
  // side on: turned flat with her back to the ground, bent at the hips so
  // her head and legs trail up behind her, arms trailing up too.
  sink?: number;
  // 0 none; 1 turned upright and facing the viewer, weightless: legs
  // loose, arms floating out to her sides. Taken on from sinking (which
  // goes back to 0 as this comes in).
  float?: number;
  // 0 none; 1 risen from sinking (`sink` 1) to float upright facing the
  // viewer, the same as `float` but got to by swinging her head up from
  // where it lies and turning her to face the viewer, rather than turning
  // her over: her bend, her legs and her trailing arms relax as she goes.
  rise?: number;
  // Turned about the upright through her seat, after everything else,
  // degrees: 180 sitting facing the viewer, 90 side on facing right, -90
  // facing left.
  turn?: number;
  // Floating or standing (`float`), where her hands go from her shoulders,
  // screen left then right, instead of floating out to her sides; and how
  // loose her legs are (1 floating, 0 standing straight).
  floatArms?: [V3, V3];
  floatLegs?: number;
  // Floating hair swaying to one side (+ right), as a share of its length.
  hairDrift?: number;
}

// Sinking: how far she bends at the hips, and how much of that is her legs
// rising (the rest is her upper body, barely, so her back stays lowest).
// Then her legs part, one raised further with its knee bent, the other
// lower and straighter, and her head lifts forward off her shoulders.
const SINK_BEND = 50;
const SINK_LEGS_UP = 42;
const SINK_LEGS: [{ spread: number; knee: number }, { spread: number; knee: number }] = [
  { spread: 26, knee: 70 },
  { spread: -16, knee: 25 },
];
const SINK_HEAD = 55;
const SINK_TOWARDS = 18;
// Floating upright: her legs a little apart, one knee soft.
const FLOAT_LEGS: [{ spread: number; knee: number }, { spread: number; knee: number }] = [
  { spread: 8, knee: 28 },
  { spread: -6, knee: 10 },
];

export interface Look {
  hair: Hair;
  bottom: Bottom;
  sleeve: Sleeve;
  // Long hair's length, for 'long' and 'braid'.
  hairLength?: number;
  // A man's build: broader shoulders and chest, narrower hips.
  broad?: boolean;
  // Drawn only on a face turned to the viewer.
  beard?: boolean;
  glasses?: boolean;
}

// A part of a union: a stroke of width `w` along a polyline (one point is a
// round dot), or a closed shape.
// `flat` ends a stroke square instead of round (a trouser hem).
type Part = { kind: 'stroke'; d: string; w: number; flat?: boolean } | { kind: 'shape'; d: string };
// A line drawn on top in the contour weight (or `w`): folds, hems. `shine`
// lines are in the page colour instead, for strands across solid hair.
type Detail = { d: string; w?: number; shine?: boolean };

// Parts drawn as one outline. Hair is `solid` (filled with ink, which is
// what makes the back of a head read as one from behind); clothes in
// colour (a headscarf, trousers, shorts, skirts) are `tint`.
export interface Union {
  parts: Part[];
  fill?: 'solid' | 'tint';
}

export interface Layer {
  unions: Union[];
  details: Detail[];
}

/**
 * One woman, in her own frame (the string point she sits on at 0,0). Drawn
 * in three passes so the scene can interleave them: `behind` everyone's
 * (their shins, which hang on the far side of the string), then the string
 * itself, then `main` per woman left to right, then `over` (an arm round a
 * neighbour, which has to land on top of her).
 */
export interface Figure {
  behind: Layer;
  main: Layer;
  over: Layer;
  // Where the middle of her head is, on the screen, and its radius: for
  // pointing things at her (a speech bubble's tail).
  head: [number, number];
  headRadius: number;
}

const stroke = (w: number, ...points: (V3 | V2)[]): Part => ({
  kind: 'stroke',
  w,
  d: points.length === 1 ? `M${pt(points[0])}h0.01` : `M${points.map(pt).join('L')}`,
});
const dot = (w: number, at: V3) => stroke(w, at);
// A stroke ending square, for a hem: a trouser leg or a sleeve.
const hemmed = (w: number, a: V3, b: V3): Part => ({ kind: 'stroke', w, d: `M${pt(a)}L${pt(b)}`, flat: true });
const shape = (...points: V3[]): Part => ({ kind: 'shape', d: `M${points.map(pt).join('L')}Z` });
const line = (a: V3, b: V3, w?: number): Detail => ({ d: `M${pt(a)}L${pt(b)}`, w });
const curve = (a: V3, c: V3, b: V3, w?: number): Detail => ({ d: `M${pt(a)}Q${pt(c)} ${pt(b)}`, w });
// Two-bone reach, in 3D: the elbow for an arm from `from` reaching `to`,
// bending towards `bendTowards` (out to the side, or down). In 3D rather
// than on screen so that an arm pointing at the viewer (hers, mid-roll,
// still holding the string) reads as foreshortened instead of splaying out
// sideways to use up its length.
function elbowFor(from: V3, to: V3, bendTowards: V3): V3 {
  const a = ARM.upper;
  const b = ARM.fore;
  const delta = sub(to, from);
  const dist = Math.hypot(...delta) || 1;
  const axis = mul(delta, 1 / dist);
  const c = Math.min(dist, a + b - 0.01);
  const along = (a * a - b * b + c * c) / (2 * c);
  const height = Math.sqrt(Math.max(0, a * a - along * along));
  // The bend direction, square to the arm. Pointing nearly along the arm
  // it gives no direction of its own, so the elbow leans towards the
  // viewer as well, rather than flicking round with every small change.
  let side = sub(bendTowards, mul(axis, dotV(bendTowards, axis)));
  if (Math.hypot(...side) < 0.3) {
    const toViewer: V3 = [0, 0, -1];
    side = add(side, mul(sub(toViewer, mul(axis, axis[2] * -1)), 0.3));
  }
  const sideLen = Math.hypot(...side) || 1;
  return add(add(from, mul(axis, along)), mul(side, height / sideLen));
}

// Swing a hand from `a` round to `b` (both from the shoulder) by `t`,
// on an arc that keeps its reach, rather than straight across, which
// folds the arm up as the hand passes the shoulder. Where the two point
// nearly opposite ways it goes round by `via`.
function swing(a: V3, b: V3, t: number, via: V3): V3 {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const la = length(a) || 1;
  const lb = length(b) || 1;
  const ua = mul(a, 1 / la);
  const ub = mul(b, 1 / lb);
  const opposite = (1 - dotV(ua, ub)) / 2;
  const d = add(lerp(ua, ub, t), mul(via, 2 * opposite * Math.sin(Math.PI * t)));
  return mul(d, (la + (lb - la) * t) / (length(d) || 1));
}

// The part of a ball of hair (centre `c`, radius `r`) the viewer sees
// over a head (centre `head`) turned away from the viewer, looking
// `front`: all of it from straight behind, less as she turns, and none
// of her head by side on, only the ball behind it. Across her head it
// ends at her hairline, a circle round it square to `front`,
// foreshortened as she turns.
function capOf(c: V3, r: number, head: V3, front: V3): Part {
  const s = Math.hypot(front[0], front[1]);
  if (s < 1e-3) return dot(r * 2, c);
  const u: V3 = [front[0] / s, front[1] / s, 0];
  const v: V3 = [-u[1], u[0], 0];
  // Where her hairline crosses the middle of her head, from the back (-1)
  // to the front (1).
  const edge = Math.max(-1, Math.min(1, 2 * front[2] - 1));
  const points: V3[] = [];
  const N = 14;
  // Round the back of her hair, then back across her head along her
  // hairline.
  for (let i = 0; i <= N; i++) {
    const a = (Math.PI * i) / N;
    points.push(add(c, add(mul(v, r * Math.cos(a)), mul(u, -r * Math.sin(a)))));
  }
  for (let i = 0; i <= N; i++) {
    const a = (Math.PI * i) / N;
    points.push(add(head, add(mul(v, -HEAD * Math.cos(a)), mul(u, HEAD * edge * Math.sin(a)))));
  }
  return shape(...points);
}

/** The parts of one woman in `pose`, in her own frame. */
export function drawWoman(pose: Pose, look: Look): Figure {
  // Sitting, from behind: seat on the string, thighs going away from the
  // viewer to knees beyond it, shins hanging down from there.
  const seat: V3 = [0, -10, 0];
  const kneeL: V3 = [-6, -8, 34];
  const kneeR: V3 = [6, -8, 34];
  const lean = rad(pose.lean);
  const up: V3 = [Math.sin(lean), -Math.cos(lean), 0];
  const right: V3 = [Math.cos(lean), Math.sin(lean), 0];
  const tilt = rad(pose.lean + pose.headTilt);
  const headUp: V3 = [Math.sin(tilt), -Math.cos(tilt), 0];

  const hipL = add(seat, mul(right, look.broad ? -3.5 : -4.5));
  const hipR = add(seat, mul(right, look.broad ? 3.5 : 4.5));
  const waist = add(seat, mul(up, 16));
  const chest = add(seat, mul(up, 30));
  const neck = add(seat, mul(up, 41));
  const shoulderHalf = look.broad ? 15 : 13;
  const chestW = look.broad ? 23 : 21;
  const shoulderL = add(add(neck, mul(right, -shoulderHalf)), mul(up, -4));
  const shoulderR = add(add(neck, mul(right, shoulderHalf)), mul(up, -4));
  const sink = clamp01(pose.sink ?? 0);
  const rise = clamp01(pose.rise ?? 0);
  // How bent she is from sinking: all of it lying on her back, none once
  // she has risen.
  const sinkBend = sink * (1 - rise);
  // Her head, lifted forward as she sinks: about the top of her chest,
  // where her collar is, so it swings clear of it rather than tucking her
  // chin in under it.
  const collar = add(neck, mul(up, -5));
  const nod = (p: V3) => (sinkBend ? rollX(p, collar, -SINK_HEAD * sinkBend) : p);
  // A direction on her head, nodding with it.
  const nodded = (d: V3) => sub(nod(add(neck, d)), nod(neck));
  const head = nod(add(neck, mul(headUp, 6 + HEAD)));

  // The roll. Upper body first about the hips, then everything above the
  // knees about the knees (both after shuffling forward, which only moves
  // her away from the viewer, so on screen it is a small drop).
  const forward: V3 = mul([0, 0, -34], clamp01(pose.shuffle));
  const knee = add(lerp(kneeL, kneeR, 0.5), forward);
  const hipAngle = 90 * clamp01(pose.roll * 2 - 1) - SINK_BEND * sinkBend;
  const kneeAngle = 90 * clamp01(pose.roll * 2);
  const seatMoved = add(seat, forward);
  // Sinking, after the roll: on screen, a quarter turn (head to the left),
  // a quarter turn about her length, front to the sky, then tipped back on
  // screen, so her legs rise and her back is lowest.
  const pivot = rollX(add(waist, forward), knee, kneeAngle);
  // Floating, she turns on round (head up again, still facing the viewer).
  const float = clamp01(pose.float ?? 0);
  // Floating either way, risen or turned.
  const floats = Math.max(float, rise);
  const turn = pose.turn ?? 0;
  const sunk = (p: V3) => {
    let q = sink ? rollZ(rollX(rollZ(p, pivot, 90 * sink), pivot, -90 * sink), pivot, -SINK_LEGS_UP * sinkBend) : p;
    // Lying on her back, rolled a little towards the viewer, so her face
    // shows rather than sitting exactly side on, on the edge of turning
    // away under her hair.
    if (sinkBend) q = rollX(q, pivot, SINK_TOWARDS * sinkBend);
    // Rising: lying on her back, head to the left, she swings head up a
    // quarter turn (now side on, facing right), and turns a quarter turn
    // more to face the viewer.
    if (rise) q = rollY(rollZ(q, pivot, 90 * rise), pivot, 90 * rise);
    if (float) q = rollZ(q, pivot, 180 * float);
    return turn ? rollY(q, seat, turn) : q;
  };
  const upper = (p: V3) => sunk(rollX(rollX(add(p, forward), seatMoved, hipAngle), knee, kneeAngle));
  const lower = (p: V3) => sunk(rollX(add(p, forward), knee, kneeAngle));
  // A leg's knee and ankle, sinking: parted at the hip from the other,
  // and bent at the knee.
  const hipRolled = rollX(add(seat, forward), knee, kneeAngle);
  const sinkLeg = (side: 0 | 1, kneeAt: V3): [V3, V3] => {
    const k0 = rollX(add(kneeAt, forward), knee, kneeAngle);
    const a0 = add(add(kneeAt, forward), pose.ankles[side]);
    if (!sink && !float) return [sunk(k0), sunk(a0)];
    const loose = floats * (pose.floatLegs ?? 1);
    const spread = SINK_LEGS[side].spread * sinkBend + FLOAT_LEGS[side].spread * loose;
    const bend = SINK_LEGS[side].knee * sinkBend + FLOAT_LEGS[side].knee * loose;
    const k1 = rollX(k0, hipRolled, spread);
    const a1 = rollX(rollX(a0, hipRolled, spread), k1, -bend);
    return [sunk(k1), sunk(a1)];
  };
  const [kneeLNow, ankleLNow] = sinkLeg(0, kneeL);
  const [kneeRNow, ankleRNow] = sinkLeg(1, kneeR);
  // Her front: away from the viewer sitting, towards them once rolled over.
  // How much her front faces away from the viewer (1) or towards them
  // (-1), from where her front actually points once she is all turned.
  const facing = sub(upper(add(chest, [0, 0, 1])), upper(chest))[2];
  // What is drawn flat on her front (glasses, a beard, her neckline) only
  // is once she is well round towards the viewer: just past side-on it
  // would land on top of her head.
  const showsFront = facing < -0.6;

  const P = {
    hipL: lower(hipL),
    hipR: lower(hipR),
    seat: lower(seat),
    kneeL: kneeLNow,
    kneeR: kneeRNow,
    waist: upper(waist),
    chest: upper(chest),
    neck: upper(neck),
    shoulderL: upper(shoulderL),
    shoulderR: upper(shoulderR),
    head: upper(head),
  };
  // Directions after the roll, for placing things on the head and body.
  const headUpNow = sub(upper(add(head, nodded(headUp))), P.head);
  const rightNow = sub(upper(add(head, right)), P.head);
  const upNow = sub(upper(add(waist, up)), P.waist);
  const at = (from: V3, ...steps: [V3, number][]) => steps.reduce((p, [d, k]) => add(p, mul(d, k)), from);
  const onHead = (x: number, y: number) => at(P.head, [rightNow, x], [headUpNow, y]);
  // The way her face looks (away from the viewer, sitting), nodding with
  // her head.
  const frontNow = sub(upper(add(head, nodded([0, 0, 1]))), P.head);

  // Behind the string: shins and heels.
  const behind: Layer = { unions: [], details: [] };
  for (const [k, a] of [
    [P.kneeL, ankleLNow],
    [P.kneeR, ankleRNow],
  ] as const) {
    const calf = lerp(k, a, 0.45);
    behind.unions.push({ parts: [stroke(10.5, k, calf), stroke(8.5, calf, a), stroke(9, a, add(a, [0, 3, 0]))] });
    // Trouser legs over the shin, down to a square hem above the ankle.
    if (look.bottom === 'trousers') {
      behind.unions.push({
        parts: [stroke(10.5, k, calf), hemmed(8.5, calf, lerp(k, a, 0.86))],
        fill: 'tint',
      });
    }
  }

  // The body, in two outlines: thighs and hips up to the waist, then back,
  // neck and head.
  // Two so they can swap order as she rolls (see `unions` below); her shirt
  // and trousers draw their own edge at the waist where the two meet.
  const legs: Part[] = [
    stroke(14, P.hipL, P.kneeL),
    stroke(14, P.hipR, P.kneeR),
    stroke(19, P.hipL, P.hipR),
    stroke(16, P.seat, P.waist),
  ];
  const body: Part[] = [
    stroke(16, P.waist, lerp(P.waist, P.chest, 0.3)),
    stroke(19, lerp(P.waist, P.chest, 0.3), P.chest),
    stroke(chestW, P.chest, add(P.neck, mul(upNow, -5))),
    stroke(9, P.shoulderL, P.shoulderR),
  ];
  // Up into her head, whichever way it nods.
  const neckPart = stroke(8, P.neck, P.head);
  const headPart = dot(HEAD * 2, P.head);
  // What she wears below the waist, tinted, its own outline over her body:
  // a skirt over her seat, its hem flaring just past the string; or the
  // same hips and thighs as her body (trousers carry on down her shins,
  // behind the string).
  const bottom: Part[] =
    look.bottom === 'skirt'
      ? [
          shape(
            at(P.waist, [rightNow, -9]),
            at(P.waist, [rightNow, 9]),
            at(P.seat, [rightNow, 14.5], [upNow, -9]),
            at(P.seat, [rightNow, -14.5], [upNow, -9]),
          ),
        ]
      : [
          stroke(14, P.hipL, P.kneeL),
          stroke(14, P.hipR, P.kneeR),
          stroke(19, P.hipL, P.hipR),
          // Square at the waistband, so it reads as a straight edge across
          // her back rather than a dome.
          hemmed(17, P.seat, P.waist),
        ];

  // Her shirt, tinted like her bottom half: her back from the waist up and
  // across her shoulders, leaving her neck bare.
  const shirt: Part[] = [
    stroke(16.5, P.waist, lerp(P.waist, P.chest, 0.3)),
    stroke(19, lerp(P.waist, P.chest, 0.3), P.chest),
    stroke(chestW, P.chest, add(P.neck, mul(upNow, -5))),
    stroke(9, P.shoulderL, P.shoulderR),
  ];

  // Arms, each with its sleeve, tinted, over it: to halfway down the upper
  // arm, or to the wrist. A hand reaching away beyond her back is hidden
  // behind her body; one round a neighbour lands on top of them.
  const armParts = (shoulder: V3, elbow: V3, wrist: V3): Union[] => {
    const sleeve =
      look.sleeve === 'short'
        ? [hemmed(7.5, shoulder, lerp(shoulder, elbow, 0.55))]
        : [stroke(7.5, shoulder, elbow), hemmed(6.5, elbow, lerp(elbow, wrist, 0.82))];
    return [{ parts: [stroke(7.5, shoulder, elbow), stroke(6.5, elbow, wrist)] }, { parts: sleeve, fill: 'tint' }];
  };
  // A direction given as seen once she floats facing the viewer (x
  // across the screen, y down, z away), turned with her, so it moves
  // with her as she turns to face the viewer rather than switching sides.
  const asFloating = ([x, y, z]: V3): V3 => add(add(mul(rightNow, -x), mul(upNow, -y)), mul(frontNow, -z));
  const armsBack: Union[] = [];
  const armsFront: Union[] = [];
  const armsOver: Union[] = [];
  for (const [shoulder, rest, spec, isLeft] of [
    [P.shoulderL, shoulderL, pose.arms[0], true],
    [P.shoulderR, shoulderR, pose.arms[1], false],
  ] as const) {
    // Out from her body on this side, whichever way round she is.
    const out = unit(sub(shoulder, P.chest));
    // Each hand from her shoulder. Body-frame hands are relative to the
    // shoulder before the roll.
    const held = sub(spec.frame === 'world' ? add(shoulder, spec.to) : upper(add(spec.to, rest)), shoulder);
    // Let go, arms folded in front of her, moving with her as she rolls.
    const folded = sub(upper(add(FOLDED[isLeft ? 0 : 1].to, rest)), shoulder);
    // Sinking on her back, head to the left: floating up off her, nearly
    // straight, leaning towards her feet, the nearer more so, clear of
    // her face.
    const trailing: V3 = isLeft ? [6, -42, 0] : [19, -39, 0];
    // Floating, out to her sides (her right on the screen's left once she
    // faces the viewer), or where `floatArms` puts them.
    const floating = asFloating(pose.floatArms ? pose.floatArms[isLeft ? 1 : 0] : [isLeft ? 40 : -40, 4, 0]);
    // Swinging from one to the next out to her side, and a little towards
    // the viewer, rather than flung straight out sideways.
    const via = unit(add(out, [0, 0, -0.7]));
    const hand = swing(
      swing(swing(held, folded, clamp01(pose.letGo), via), trailing, sinkBend, via),
      floating,
      floats,
      via,
    );
    const wrist = add(shoulder, hand);
    // Which way the elbow gives: standing or hanging, out and down;
    // trailing up while sinking, towards her feet; floating, up above her
    // hands, or out, posed. Blended, so it never flips.
    const standBend = add(out, [0, 0.3, 0]);
    const floatBend: V3 = pose.floatArms ? add(out, [0, 0.6, 0]) : [0, -1, 0];
    // Folded, down her side towards her waist and a little in front of
    // her, whichever way up she is.
    const bendTowards =
      spec.elbow === 'down'
        ? ([0, 1, 0] as V3)
        : spec.elbow === 'folded'
          ? add(add(mul(out, 0.5), mul(upNow, -1)), mul(frontNow, 0.25))
          : add(add(mul(standBend, (1 - sinkBend) * (1 - floats)), mul([1, 0, 0], sinkBend * (1 - floats))), mul(floatBend, floats));
    const elbow = elbowFor(shoulder, wrist, bendTowards);
    const parts = armParts(shoulder, elbow, wrist);
    // An arm going on round behind her back, from how far it is behind
    // her chest, all along it.
    const behindHer = (shoulder[2] + elbow[2] + wrist[2]) / 3 > P.chest[2] + 5;
    if (Math.abs(spec.to[0]) > 24) armsOver.push(...parts);
    else if (behindHer) armsBack.push(...parts);
    else armsFront.push(...parts);
  }

  // Hair, solid. `crown` is the top of her head; long hair falls straight
  // down from it whichever way up she is, over her back from behind, past
  // her head when she hangs. Its strands are thin page-colour lines, and
  // only ever on hair clear of her head and body: drawn on the back of a
  // round head, any line reads as a face.
  //
  // The hair on her head is a ball a little bigger than it (`scalp`),
  // set back from her face. From behind it goes over her head, and her
  // body, the less of her head the further she turns (see `capOf`); with
  // her face to the viewer it goes behind her, framing her face from the
  // front and showing behind her head side on. The rest of her hair
  // (`extras`: its length, a bun, curls) goes with it.
  const extras: Part[] = [];
  let scalp = { at: P.head, r: 11.5 };
  const hairDetails: Detail[] = [];
  const strand = (a: V3, c: V3, b: V3): Detail => ({ ...curve(a, c, b, 1.3), shine: true });
  let hairFill: Union['fill'] = 'solid';
  // Back from her face on the screen, by `k` side on, none from the front
  // or behind.
  const backBy = (k: number) =>
    mul([frontNow[0], frontNow[1], 0], (-k * (1 - Math.abs(frontNow[2]))) / (Math.hypot(frontNow[0], frontNow[1]) || 1));
  // The roots of her hair's length sit back from her face, side on right
  // at the back of her head, so it goes over her body from behind without
  // covering her face as she turns.
  const hc = add(P.head, backBy(12));
  const onHair = (x: number, y: number) => at(hc, [rightNow, x], [headUpNow, y]);
  const crown = at(hc, [headUpNow, 6]);
  // Which way hair falls: down, or streaming up as she falls.
  const hairUp = clamp01(pose.hairUp ?? 0);
  const drift = pose.hairDrift ?? 0;
  const fall = (k: number, x = 0): V3 => [x + drift * k, k * (1 - 2 * hairUp), 0];
  switch (look.hair) {
    case 'long': {
      const length = look.hairLength ?? 38;
      const mid = add(crown, fall(length * 0.5));
      const end = add(crown, fall(length));
      scalp = { at: P.head, r: 12 };
      extras.push(stroke(23, crown, mid), stroke(19.5, mid, end));
      hairDetails.push(
        strand(add(crown, fall(16, -4)), add(crown, fall(length * 0.65, -6)), add(end, fall(3, -4))),
        strand(add(crown, fall(20, 4)), add(crown, fall(length * 0.7, 5)), add(end, fall(4, 3))),
      );
      break;
    }
    case 'braid': {
      // A single plait down the middle of her back.
      const length = look.hairLength ?? 38;
      const nape = onHair(0, -9);
      const end = add(nape, fall(length));
      extras.push(stroke(10, nape, end), dot(8, add(end, fall(4))));
      for (let i = 1; i < 6; i++) {
        const p = lerp(nape, end, i / 6);
        hairDetails.push(strand(add(p, [-4, -2.5, 0]), add(p, [0, 1.5, 0]), add(p, [4, -2.5, 0])));
      }
      break;
    }
    case 'ponytail': {
      const tie = onHair(0, 1);
      const sweep = add(tie, fall(14, 1.5));
      const end = add(tie, fall(30, 2.5));
      extras.push(stroke(10, tie, sweep), stroke(7.5, sweep, end));
      hairDetails.push(strand(add(tie, [0, 14, 0]), add(tie, [2.5, 20, 0]), add(end, [0, -4, 0])));
      break;
    }
    case 'bun':
      extras.push(dot(15, onHair(0, 9)));
      break;
    case 'buns':
      extras.push(dot(12, onHair(-8, 7.5)), dot(12, onHair(8, 7.5)));
      break;
    case 'bob':
      scalp = { at: P.head, r: 12.5 };
      extras.push(stroke(26, onHair(0, 2), onHair(0, -7)));
      break;
    case 'curly':
      // A cloud of curls all round her head.
      scalp = { at: P.head, r: 13 };
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        extras.push(dot(12, onHair(Math.cos(a) * 13, Math.sin(a) * 13 + 1)));
      }
      break;
    case 'short':
      // Cropped close all over, standing a little proud of the crown.
      scalp = { at: onHead(0, 3), r: 11.5 };
      break;
    case 'pixie':
      // Cropped: a little fuller than her head, stopping short of her nape.
      scalp = { at: onHead(0, 2), r: 11.5 };
      break;
    case 'scarf':
      // A headscarf, draped over her shoulders, in a pale tint, with one
      // fold across the drape (kept off the head itself).
      hairFill = 'tint';
      scalp = { at: P.head, r: 12.25 };
      extras.push(
        shape(
          onHair(-11.5, 0),
          onHair(11.5, 0),
          at(P.neck, [rightNow, 16], [upNow, -8]),
          at(P.neck, [rightNow, 3], [upNow, -17]),
          at(P.neck, [rightNow, -16], [upNow, -8]),
        ),
      );
      hairDetails.push(curve(at(P.neck, [rightNow, -11], [upNow, -6]), at(P.neck, [rightNow, -4], [upNow, -9]), at(P.neck, [rightNow, 1], [upNow, -15])));
      break;
  }

  // The ball of hair on her head, set back so it is flush with her face,
  // and side on further, so it shows behind her head.
  const scalpAt = add(add(scalp.at, mul(frontNow, HEAD - scalp.r)), backBy(3));
  // Hair lies over her back from behind, behind her head from the front.
  const hairFaces = frontNow[2] < 0;
  const unions: Union[] = [...armsBack];
  if (hairFaces) unions.push({ parts: [dot(scalp.r * 2, scalpAt), ...extras], fill: hairFill });
  // Whichever half of her is farther from the viewer goes first. Sitting,
  // her thighs reach away beyond her back; halfway through the roll her
  // upper body points straight at the viewer, and has to cover her legs.
  const lowerHalf: Union[] = [{ parts: legs }, { parts: bottom, fill: 'tint' }];
  // Her head is one outline with her body, under her shirt, except while
  // it swings round in front of her chest, mid-roll, when it has to go
  // over her shirt instead.
  const upperHalf: Union[] =
    P.head[2] < P.chest[2] - 8
      ? [{ parts: [...body, neckPart] }, { parts: shirt, fill: 'tint' }, { parts: [headPart] }]
      : [{ parts: [...body, neckPart, headPart] }, { parts: shirt, fill: 'tint' }];
  const upperDepth = (P.chest[2] + P.head[2]) / 2;
  const lowerDepth = (P.seat[2] + P.kneeL[2] + P.kneeR[2]) / 3;
  // Level, as standing facing the viewer, her shirt goes over the top of
  // her trousers or skirt.
  unions.push(...(upperDepth > lowerDepth + 4 ? [...upperHalf, ...lowerHalf] : [...lowerHalf, ...upperHalf]));
  unions.push(...armsFront);
  if (!hairFaces) unions.push({ parts: [capOf(scalpAt, scalp.r, P.head, frontNow), ...extras], fill: hairFill });
  // A beard, solid like hair, round his jaw from ear to ear.
  if (showsFront && look.beard) {
    unions.push({
      parts: [
        shape(
          onHead(-10.5, 0),
          onHead(-8, -8),
          onHead(0, -13),
          onHead(8, -8),
          onHead(10.5, 0),
          onHead(5.5, -5),
          onHead(0, -6.5),
          onHead(-5.5, -5),
        ),
      ],
      fill: 'solid',
    });
  }

  const details: Detail[] = [];
  // Her face: just her eyes, open towards the viewer, each on the front of
  // her head where the viewer can see it: both from the front, the nearer
  // one side on. No mouth (no feelings shown) and no fringe, which upside
  // down reads as one.
  // Each grows in from nothing as it comes round into view.
  for (const x of [-4, 4]) {
    const eye = at(P.head, [rightNow, x], [headUpNow, 1], [frontNow, 7]);
    const open = clamp01((P.head[2] - eye[2] - 1) / 2.5);
    if (open) details.push({ d: `M${pt(eye)}h0.01`, w: 4 * open });
  }
  const upsideDown = upNow[1] > 0.5;
  if (showsFront) {
    if (look.glasses) {
      for (const x of [-4.5, 4.5]) {
        const c = onHead(x, 1);
        details.push({ d: `M${pt(add(c, mul(rightNow, -3.6)))}A3.6 3.6 0 1 0 ${pt(add(c, mul(rightNow, 3.6)))}A3.6 3.6 0 1 0 ${pt(add(c, mul(rightNow, -3.6)))}`, w: 1.4 });
      }
      details.push(line(onHead(-0.9, 1.4), onHead(0.9, 1.4), 1.4));
    }
    // Her neckline, and between her legs, which from the front are one
    // outline: upside down only. The right way up, the neckline sits under
    // her chin like a smile, and her legs are under a table.
    // Drawn finer the less she faces the viewer, from nothing at side on.
    if (upsideDown) {
      const w = LINE * clamp01((-facing - 0.6) / 0.25);
      details.push(
        curve(at(P.neck, [rightNow, -6], [upNow, -3]), at(P.neck, [upNow, -8]), at(P.neck, [rightNow, 6], [upNow, -3]), w),
        line(P.seat, lerp(P.seat, lerp(P.kneeL, P.kneeR, 0.5), 0.8), w),
      );
    }
  }
  // Strands: on hair over her from behind, or from the front only on long
  // hair reaching away from her, clear of her body (hanging below her
  // head upside down, or floating up over it): going behind her, they would
  // be drawn across her.
  // Each fades to nothing as it goes, finer and finer.
  const strands = hairFaces
    ? look.hair === 'long'
      ? clamp01(((1 - 2 * hairUp) * upNow[1] - 0.3) / 0.3)
      : 0
    : clamp01(frontNow[2] / 0.25);
  if (strands) details.push(...hairDetails.map((d) => ({ ...d, w: (d.w ?? LINE) * strands })));

  return {
    behind,
    main: { unions, details },
    over: { unions: armsOver, details: [] },
    head: [P.head[0], P.head[1]],
    headRadius: HEAD,
  };
}

// Poses. Arms are given as where the hand goes relative to the shoulder.
const DOWN = 36;
const STILL: [V3, V3] = [
  [0, DOWN, 4],
  [0, DOWN, 4],
];
// Hands resting on the string either side of her seat.
// Nearly straight, a little out from her sides, as when sitting on a wall.
const HANDS_ON_STRING: [Arm, Arm] = [{ to: [-3, 44, 4] }, { to: [3, 44, 4] }];
// Arms folded: upper arms down her sides, elbows at her waist bent square,
// forearms across her front, crossing over her belly. One a little lower
// so they lie over each other rather than meeting.
const FOLDED: [Arm, Arm] = [
  { to: [19, 16, 15], elbow: 'folded' },
  { to: [-19, 25, 13], elbow: 'folded' },
];

const sitting = (overrides: Partial<Pose> = {}): Pose => ({
  lean: 0,
  headTilt: 0,
  ankles: STILL,
  arms: HANDS_ON_STRING,
  shuffle: 0,
  roll: 0,
  letGo: 0,
  ...overrides,
});

// A shin swung away from the viewer by `deg`.
const swung = (deg: number, x = 0): V3 => [x, DOWN * Math.cos(rad(deg)), 4 + DOWN * Math.sin(rad(deg))];

export const POSES = {
  sitting: sitting(),
  // Swinging one leg.
  swinging: sitting({ ankles: [swung(-35), [0, DOWN, 4]], headTilt: -6 }),
  // Ankles crossed.
  crossed: sitting({ ankles: [[9, DOWN - 1, 4], [-9, DOWN - 1, 6]], lean: 2 }),
  // Hands in her lap (out of sight in front of her), looking down.
  lap: sitting({ arms: [{ to: [8, 32, 18] }, { to: [-8, 32, 18] }], headTilt: 4 }),
  // Propped on her hands behind her, feet swung out.
  propped: sitting({ arms: [{ to: [-7, 42, -12] }, { to: [7, 42, -12] }], ankles: [swung(28), swung(36)] }),
  // Arms folded (out of sight in front of her), looking down.
  folded: sitting({ arms: FOLDED, headTilt: 4 }),
  // Pointing at something far off.
  pointing: sitting({ arms: [HANDS_ON_STRING[0], { to: [26, -30, 10] }], lean: -3, headTilt: 8 }),
  // An arm round the neighbour on her right (screen right): elbow low across
  // their back, hand up on their shoulder; her head tipped towards them.
  hugRight: sitting({ arms: [HANDS_ON_STRING[0], { to: [27, -2, -2], elbow: 'down' }], lean: 6, headTilt: 6 }),
  // The same, round the neighbour on her left.
  hugLeft: sitting({ arms: [{ to: [-27, -2, -2], elbow: 'down' }, HANDS_ON_STRING[1]], lean: -6, headTilt: -6 }),
  // Leaning her head on the neighbour to her left, or right.
  restingLeft: sitting({ lean: -9, headTilt: -14 }),
  restingRight: sitting({ lean: 9, headTilt: 14 }),
  // Upside down, hanging from the string by her knees, arms folded,
  // deliberately. Her knees are bent over the top of the string, her
  // shins folded back down behind it and splayed a little, so from the front
  // they show either side of her thighs with the string crossing in front
  // of them: the leg wraps round the string instead of just touching it.
  hanging: sitting({
    shuffle: 1,
    roll: 1,
    letGo: 1,
    ankles: [
      [-11, 26, 14],
      [11, 26, 14],
    ],
  }),
} satisfies Record<string, Pose>;

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Part way from pose `a` to pose `b`. Each of `t`'s fields is how far along
 * that part of the movement is (0 at `a`, 1 at `b`), so the shuffle, the
 * roll and letting go can each run on their own stretch of the scroll.
 * Her arms keep `a`'s holds; `letGo` takes them from there to folded.
 */
export function blendPose(a: Pose, b: Pose, t: { shuffle: number; roll: number; letGo: number }): Pose {
  return {
    ...a,
    lean: mix(a.lean, b.lean, t.roll),
    headTilt: mix(a.headTilt, b.headTilt, t.roll),
    ankles: [lerp(a.ankles[0], b.ankles[0], t.roll), lerp(a.ankles[1], b.ankles[1], t.roll)],
    shuffle: mix(a.shuffle, b.shuffle, t.shuffle),
    roll: mix(a.roll, b.roll, t.roll),
    letGo: mix(a.letGo, b.letGo, t.letGo),
  };
}
