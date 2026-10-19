// How thick the thread is, from the solution scene's cards down to the mark
// the logo scene draws with it (solution-papers.tsx, antigone-reveal.tsx):
// one function so the two always match.

// The thread's width, as it is drawn on a screen `w` wide, in px, per 1200 of
// them.
const THREAD_PER_1200 = 3.4;
// Where the mark sits: how tall it is, in vh (the logo scene's LOGO_H).
export const LOGO_H = 34;
// The thinnest the thread gets, as a share of the mark's height, which keeps
// it from going spindly on narrow screens, where the width it is drawn at
// would make it so (a big screen is at about it).
const MIN_SHARE = 0.026;
// The name under the mark: the width of its strokes as a share of its size
// (Fredoka at weight 400, see .site__brand-name), its width in ems, and the
// room kept at each side of it, in px. What it grows to match the thread
// must fit within these.
export const NAME_STEM = 0.08;
export const NAME_WIDTH_EM = 4.7;
export const NAME_MARGIN = 20;

// The thread's width on a screen `w` by `h` px.
export function threadWidth(w: number, h: number) {
  const minimum = Math.min(
    (MIN_SHARE * LOGO_H * h) / 100,
    (NAME_STEM * (w - 2 * NAME_MARGIN)) / NAME_WIDTH_EM,
  );
  return Math.max((THREAD_PER_1200 * w) / 1200, minimum);
}
