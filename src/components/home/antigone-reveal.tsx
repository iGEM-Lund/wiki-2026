'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { LogoKnot, STROKES } from '@/components/antigone-logo';
import { drawWoman, POSES, type Look, type Pose, type V3 } from '@/lib/women-on-line';
import { THREAD_EXIT } from './solution-papers';
import { LOGO_H, NAME_STEM, threadWidth } from './thread-width';
import { useScrollProgress, useTimedToggle, type Hold } from './scroll-play';
import { LayerArt } from './women-art';

// After the home scene (women-on-line.tsx): a blank page scrolls up under
// it, and the thread the solution cards hang from carries on down onto it,
// straight on from where it left the scene, and draws the AnTigone mark.
// Under the mark the words "Androgen Testosterone Gone" come in, with her
// (the woman who fell) standing between the last two; then the words fold
// up into the team's name, An-T-i-gone, her the i, her head its dot, and
// she takes on its colour. All in one go.

// How much scroll it plays over once pinned (--play in globals.css, in vh),
// and a point `vh` into that, as a share of it.
const PLAY_VH = 120;
const at = (vh: number) => vh / PLAY_VH;

// All of it plays as one, by itself, over PLAY_MS, once pinned (and back,
// if the reader scrolls back above it), each part over its own stretch, in
// ms, running on into the next: the mark drawing itself in, its strokes in
// turn as in the site's header (antigone-logo.tsx), then its knot popping
// in; the words and her coming in under it; the words folding up into the
// name; her taking on the name's colour; and the mark let go and settling.
const START_AT = at(4);
const STROKES_MS = STROKES.reduce((end, { delay, duration }) => Math.max(end, delay + duration), 0);
const KNOT_MS = 550;
const WORDS_IN: readonly [number, number] = [STROKES_MS + 250, STROKES_MS + 1550];
const NAME: readonly [number, number] = [WORDS_IN[1] + 300, WORDS_IN[1] + 2300];
const PEACOCK: readonly [number, number] = [NAME[1] - 500, NAME[1] + 400];
// Last, the thread lets go of the mark, drawing back up off the page, and
// the mark and the name settle in the middle of the page's space.
const DETACH: readonly [number, number] = [NAME[1] - 200, NAME[1] + 700];
const SETTLE: readonly [number, number] = [NAME[1] + 200, NAME[1] + 1300];
// Then the way in: "Start here", written up by the nav, pointing to the
// first page in it, whose sign drops down ready to click (see LinkArrow).
const START: readonly [number, number] = [SETTLE[1] - 300, SETTLE[1] + 300];
const PLAY_MS = START[1];
const START_HREF = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/background`;
// Where it is written, from that page's tag in the nav, in px: to its
// left, and below the sign that drops from it.
const START_FROM_TAG = { x: -260, y: 95 };
// Where the mark sits, in vh: its top (and how tall it is, LOGO_H).
const LOGO_TOP = 12;
// The mark's own box (antigone-logo.tsx's viewBox), and where its first
// stroke starts, which the thread runs into.
const MARK = { x: 49, y: 67, w: 112, h: 115 };
const PEN: [number, number] = [130, 86];
// How much bigger the name ends up than the words, so it sits under the
// mark in about the brand's proportions.
const NAME_GROWS = 1.7;
// Where the words' top sits, in vh (in step with .antigone-reveal__words),
// and how far under the mark the name ends up, in vh.
const WORDS_TOP = 58;
const NAME_GAP = 3;

const HOLDS: Hold[] = [{ at: START_AT, ms: PLAY_MS }];

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const phase = (t: number, [from, to]: readonly [number, number]) => clamp01((t - from) / (to - from));
// Overshooting a little and settling, for the knot popping in.
const easeOutBack = (t: number) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;

// Her, as in the scene: standing, her hair up and arms out, floating;
// landing as the i, arms down at her sides, hair down, legs straight.
const HER_LOOK: Look = { hair: 'long', bottom: 'trousers', sleeve: 'short', hairLength: 42 };
const ARMS_OUT: [V3, V3] = [
  [-38, 2, 0],
  [38, 2, 0],
];
const ARMS_DOWN: [V3, V3] = [
  [3, 42, 2],
  [-3, 42, 2],
];
const herPose = (landed: number): Pose => ({
  ...POSES.hanging,
  ankles: [
    [-4, -35, 2],
    [4, -35, 2],
  ],
  float: 1,
  floatLegs: 0.4 * (1 - landed),
  floatArms: [0, 1].map((side) => ARMS_OUT[side].map((v, k) => mix(v, ARMS_DOWN[side][k], landed))) as [V3, V3],
  hairUp: 0.7 * (1 - landed),
});
// The box round a drawing of her: from every point in its paths, padded
// for the width of the strokes.
function boxOf(paths: string[], padX: number) {
  const n = paths.join(' ').match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (let i = 0; i + 1 < n.length; i += 2) {
    x0 = Math.min(x0, n[i]);
    x1 = Math.max(x1, n[i]);
    y0 = Math.min(y0, n[i + 1]);
    y1 = Math.max(y1, n[i + 1]);
  }
  const pad = 13;
  return { x: x0 - padX, y: y0 - pad, w: x1 - x0 + 2 * padX, h: y1 - y0 + 2 * pad };
}

// How far the top of `ref` has come up the screen, from its bottom (0) to
// its top (1).
function useEntered(ref: RefObject<HTMLElement | null>) {
  const [entered, setEntered] = useState(0);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (el) setEntered(clamp01(1 - el.getBoundingClientRect().top / window.innerHeight));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [ref]);
  return entered;
}

// The words, piece by piece: the ones kept for the name, and the ones
// that fold away (`goes`).
const WORDS: { text: string; goes?: boolean; space?: boolean }[] = [
  { text: 'An' },
  { text: 'drogen', goes: true, space: true },
  { text: 'T' },
  { text: 'estosterone', goes: true, space: true },
];

export function AntigoneReveal() {
  const sectionRef = useRef<HTMLElement>(null);
  const p = useScrollProgress(sectionRef, HOLDS);
  const entered = useEntered(sectionRef);
  const penMs = useTimedToggle(p >= START_AT, PLAY_MS) * PLAY_MS;
  const words = phase(penMs, WORDS_IN);
  const name = smooth(phase(penMs, NAME));
  const peacock = smooth(phase(penMs, PEACOCK));
  const detach = smooth(phase(penMs, DETACH));
  const settle = smooth(phase(penMs, SETTLE));
  const start = smooth(phase(penMs, START));
  // Once it has all settled, the header loses its shadow, sitting flat on
  // the page with the mark (see :root[data-home-end] in globals.css), and
  // the way in points up to where it goes.
  const ended = settle > 0.5;
  useEffect(() => {
    const root = document.documentElement;
    if (ended) root.dataset.homeEnd = '';
    else delete root.dataset.homeEnd;
    return () => {
      delete root.dataset.homeEnd;
    };
  }, [ended]);
  const startRef = useRef<HTMLSpanElement>(null);
  const pointing = start === 1;
  useEffect(() => {
    const link = startRef.current;
    if (!pointing || !link) return;
    window.dispatchEvent(new CustomEvent('link-arrow:pin', { detail: link }));
    return () => {
      window.dispatchEvent(new CustomEvent('link-arrow:unpin', { detail: link }));
    };
  }, [pointing]);

  // The screen's size, and each folding piece's width at full size, in px.
  const stageRef = useRef<HTMLDivElement>(null);
  // The screen's size, how far down it the site's header comes, and the
  // words' size, in px.
  // And where the nav's tag for the first page is (its middle across, and
  // its bottom), for "Start here".
  const [size, setSize] = useState({ w: 1200, h: 800, header: 60, font: 60, tagX: 600, tagY: 40 });
  const [widths, setWidths] = useState<number[]>([]);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const next = [...stage.querySelectorAll<HTMLElement>('.antigone-reveal__measure')].map((el) => el.offsetWidth);
    if (next.some((w, i) => Math.abs(w - (widths[i] ?? -1)) > 0.5)) setWidths(next);
    const words = stage.querySelector('.antigone-reveal__words');
    const headerBox = document.querySelector('.site__header')?.getBoundingClientRect();
    const tag = document
      .querySelector(`.site__nav a[href="${START_HREF}"]`)
      ?.closest('.site__nav > *')
      ?.getBoundingClientRect();
    const next2 = {
      w: stage.clientWidth,
      h: window.innerHeight,
      header: Math.max(0, (headerBox?.bottom ?? 0) - Math.min(0, headerBox?.top ?? 0)),
      font: words ? parseFloat(getComputedStyle(words).fontSize) : size.font,
      tagX: tag ? tag.left + tag.width / 2 : size.tagX,
      // As it is with the header in place, which may still be sliding in.
      tagY: tag ? tag.bottom - Math.min(0, headerBox?.top ?? 0) : size.tagY,
    };
    if ((Object.keys(next2) as (keyof typeof next2)[]).some((k) => Math.abs(next2[k] - size[k]) > 0.5)) setSize(next2);
  });
  const { w, h, header, font, tagX, tagY } = size;

  // The mark, scaled to LOGO_H, centred; the thread as thick as the scene's.
  const scale = ((LOGO_H / 100) * h) / MARK.h;
  const left = w / 2 - (MARK.w / 2) * scale;
  const top = (LOGO_TOP / 100) * h;
  const line = threadWidth(w, h);
  const pen: [number, number] = [left + (PEN[0] - MARK.x) * scale, top + (PEN[1] - MARK.y) * scale];
  // In from the top of the page where the scene left it, straight down at
  // first, then curving into the mark's first stroke, the way it starts.
  const from: [number, number] = [(THREAD_EXIT / 100) * w, 0];
  const lead = `M${from[0]} ${from[1]}C${from[0]} ${pen[1] * 0.55} ${pen[0] - 50} ${pen[1] - 34} ${pen[0]} ${pen[1]}`;
  const knot = clamp01((penMs - STROKES_MS) / KNOT_MS);
  // The mark's line: the thread's, filling out as it lets go of it to the
  // weight of the name's letters.
  // The name grows to match the thread, as far as it fits across the screen.
  const nameGrows = Math.max(NAME_GROWS, line / (NAME_STEM * font));
  const markLine = mix(line, NAME_STEM * nameGrows * font, settle);
  // Settling: the name closing up under the mark to NAME_GAP below it, and
  // the two together, from the top of the mark to the foot of the name's
  // g, moved to the middle of the page between the header and the bottom
  // of the screen.
  const wordsTop = (WORDS_TOP / 100) * h;
  const closeUp = wordsTop - (top + (LOGO_H / 100) * h) - (NAME_GAP / 100) * h;
  const nameFoot = wordsTop - closeUp + nameGrows * font * 1.25;
  const drop = settle * ((header + h) / 2 - (top + nameFoot) / 2);
  const nameDrop = drop - settle * closeUp;
  // Where the settled name ends, for the one-line description under it.
  const nameEnd = nameFoot + (header + h) / 2 - (top + nameFoot) / 2;

  // Her colour, from corner to corner: crimson at first, then fading from
  // the name's peacock at her top left (come to round the hue wheel the
  // long way, as she turned crimson in the scene) to her crimson at her
  // bottom right.
  const herFade = [
    `color-mix(in oklch longer hue, var(--heading-minor) ${((1 - peacock) * 100).toFixed(1)}%, var(--color-peacock))`,
    'var(--heading-minor)',
  ];
  const inkId = `${useId().replace(/:/g, '')}-ink`;
  const tintId = `${inkId}-tint`;

  // Her, drawn for this frame, and the box she takes up.
  const her = drawWoman(herPose(name), HER_LOOK);
  const herBox = boxOf([her.behind, her.main].flatMap((l) => [...l.unions.flatMap((u) => u.parts.map((p) => p.d))]), mix(13, 7, name));
  // As tall as the words' capitals and then some, coming down to the
  // height of an i.
  const herEm = mix(1.35, 0.74, name);

  // Each piece of the words coming in, one after another.
  const pieceIn = (k: number) => smooth(phase(words, [k * 0.1, k * 0.1 + 0.6]));
  const pieceStyle = (k: number): CSSProperties => ({
    opacity: pieceIn(k),
    translate: `0 ${((1 - pieceIn(k)) * 0.4).toFixed(3)}em`,
  });
  // Folding: the words' endings fade first, then close up, bringing what
  // is left together.
  const fade = clamp01(name / 0.4);
  const close = smooth(phase(name, [0.25, 1]));
  const gap = `${(0.28 * (1 - close)).toFixed(3)}em`;
  // The folding pieces' widths, in the order they are measured: the two
  // words' endings, then G and g.
  const folding = (text: string, k: number, i: number) => {
    return (
      <span
        className="antigone-reveal__fold"
        style={{ ...pieceStyle(k), width: widths[i] === undefined ? undefined : `${(widths[i] * (1 - close)).toFixed(2)}px` }}
      >
        <span className="antigone-reveal__measure" style={{ opacity: 1 - fade }}>
          {text}
        </span>
      </span>
    );
  };
  // "Gone" to "gone": the capital giving way to the small letter.
  const gWidths = [widths[2], widths[3]];

  return (
    <section ref={sectionRef} className="antigone-reveal" aria-label="AnTigone">
      <div ref={stageRef} className="antigone-reveal__stage">
        <svg className="antigone-reveal__art" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
          {/* Gone altogether once drawn back, rather than left as the dot a
              round end of no length draws. */}
          {entered * (1 - detach) > 0.002 && (
            <path
              className="antigone-reveal__thread"
              d={lead}
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={1 - entered * (1 - detach)}
              strokeWidth={line}
            />
          )}
          <g transform={`translate(${left.toFixed(2)} ${(top + drop).toFixed(2)}) scale(${scale.toFixed(4)}) translate(${-MARK.x} ${-MARK.y})`}>
            {STROKES.map(({ d, delay, duration }, i) => {
              const drawn = clamp01((penMs - delay) / duration);
              return drawn > 0 ? (
                <path
                  key={i}
                  className="antigone-reveal__thread"
                  d={d}
                  pathLength={1}
                  strokeDasharray="1 1"
                  strokeDashoffset={1 - drawn}
                  strokeWidth={markLine / scale}
                />
              ) : null;
            })}
            {knot > 0 && (
              <LogoKnot
                className="antigone-reveal__knot"
                style={{ opacity: clamp01(knot * 3), transform: `scale(${easeOutBack(knot).toFixed(3)})` }}
              />
            )}
          </g>
        </svg>
        <p
          className="antigone-reveal__words"
          style={{
            scale: mix(1, nameGrows, name).toFixed(3),
            translate: `0 ${nameDrop.toFixed(2)}px`,
            visibility: words ? undefined : 'hidden',
          }}
        >
          {WORDS.map(({ text, goes, space }, k) => (
            <span key={text} style={{ display: 'contents' }}>
              {goes ? folding(text, Math.floor(k / 2), Math.floor(k / 2)) : <span style={pieceStyle(Math.floor(k / 2))}>{text}</span>}
              {space && <span style={{ width: gap }} className="antigone-reveal__gap" />}
            </span>
          ))}
          <svg
            className="women-line antigone-reveal__her"
            viewBox={`${herBox.x.toFixed(1)} ${herBox.y.toFixed(1)} ${herBox.w.toFixed(1)} ${herBox.h.toFixed(1)}`}
            style={{
              height: `${herEm}em`,
              width: `${((herEm * herBox.w) / herBox.h).toFixed(3)}em`,
              opacity: pieceIn(2),
              translate: `0 ${((1 - pieceIn(2)) * -0.8).toFixed(3)}em`,
              '--her-ink': `url(#${inkId})`,
              '--her-tint': `url(#${tintId})`,
            } as CSSProperties}
            role="img"
            aria-label="i"
          >
            {/* Her fade, corner to corner: her outline, and her clothes in
                the same, paler. */}
            <defs>
              {[
                { id: inkId, pale: false },
                { id: tintId, pale: true },
              ].map(({ id, pale }) => (
                <linearGradient
                  key={id}
                  id={id}
                  gradientUnits="userSpaceOnUse"
                  x1={herBox.x}
                  y1={herBox.y + herBox.h * 0.1}
                  x2={herBox.x + herBox.w}
                  y2={herBox.y + herBox.h * 0.9}
                >
                  {herFade.map((colour, i) => (
                    <stop
                      key={i}
                      offset={i}
                      style={{ stopColor: pale ? `color-mix(in srgb, ${colour} 22%, var(--bg))` : colour }}
                    />
                  ))}
                </linearGradient>
              ))}
            </defs>
            <LayerArt layer={her.behind} transform="" />
            <LayerArt layer={her.main} transform="" />
            <LayerArt layer={her.over} transform="" />
          </svg>
          <span style={{ width: gap }} className="antigone-reveal__gap" />
          <span className="antigone-reveal__g" style={{ ...pieceStyle(3), width: gWidths[0] === undefined ? undefined : `${mix(gWidths[0], gWidths[1], name).toFixed(2)}px` }}>
            <span className="antigone-reveal__measure" style={{ opacity: 1 - name }}>
              G
            </span>
            <span className="antigone-reveal__measure" style={{ opacity: name }}>
              g
            </span>
          </span>
          <span style={pieceStyle(3)}>one</span>
        </p>
        <p
          className="antigone-reveal__tagline"
          style={{
            top: `${(nameEnd + 0.03 * h).toFixed(1)}px`,
            opacity: start,
            visibility: start ? undefined : 'hidden',
          }}
        >
          A Living Biotherapeutic to Manage Hyperandrogenism in PMOS
        </p>
        <span
          ref={startRef}
          className="antigone-reveal__start"
          data-arrow-href={START_HREF}
          data-arrow-from="right"
          style={{
            left: `${(tagX + START_FROM_TAG.x).toFixed(1)}px`,
            top: `${(tagY + START_FROM_TAG.y).toFixed(1)}px`,
            opacity: start,
            visibility: start ? undefined : 'hidden',
          }}
        >
          Start here
        </span>
      </div>
    </section>
  );
}
