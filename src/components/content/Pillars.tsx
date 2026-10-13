import type { CSSProperties, ReactNode } from 'react';
import GithubSlugger from 'github-slugger';

// Each pillar is drawn as an Ionic column, outlined and filled: a rounded top slab, a
// tapering echinus, and a scroll band with a curled volute at either end, then
// a base that flares out into a plinth, all inline SVG; the shaft between
// them is drawn by the two side borders of the text block (see
// .pillars__shaft in globals.css). vector-effect keeps the strokes a constant
// width however wide the column gets. The shaft sits inset 12% from each
// side, which is where the capital's and base's bottom and top lines end.
function Capital() {
  return (
    <svg className="pillars__capital" viewBox="0 0 100 38" aria-hidden="true">
      <rect x="2" y="2" width="96" height="7" rx="2" />
      <path d="M 7 9 L 13 18 L 87 18 L 93 9 Z" />
      <path d="M 12 18 L 88 18 A 10 10 0 0 1 88 38 L 12 38 A 10 10 0 0 1 12 18 Z" />
      <path fill="none" d="M 17 28 A 5 5 0 1 0 12 33" />
      <path fill="none" d="M 83 28 A 5 5 0 1 1 88 33" />
    </svg>
  );
}

function Base() {
  return (
    <svg className="pillars__base" viewBox="0 0 100 16" aria-hidden="true">
      <path d="M 12 0 L 88 0 L 95 9 L 5 9 Z" />
      <rect x="2" y="9" width="96" height="7" rx="2" />
    </svg>
  );
}

export type Pillar = { title: string; heading?: string };

// The id rehype-slug gives the heading a pillar points at (see
// src/lib/mdx/render.ts), computed with the same github-slugger so the two
// can't drift: the pillar's `heading` text if set, else its title.
export function pillarTarget(pillar: Pillar): string {
  return new GithubSlugger().slug(pillar.heading || pillar.title || '');
}

// The longest single word across the row's titles, in letters: the titles
// shrink until a word that long fits the shaft (see .pillars__title in
// globals.css), the same size across the row so the pillars stay matched.
function longestWord(pillars: Pillar[]): number {
  return Math.max(1, ...pillars.flatMap((pillar) => pillar.title.split(/[\s-]+/).map((word) => word.length)));
}

// A row of pillars, each a plain anchor link to a heading further down the
// page. No client JS; the browser's own anchor scroll does the work (see
// scroll-padding-top in globals.css for the fixed header). With
// `activeIndex` set the row is the one that replaces that pillar's heading
// (see PillarsSectionHeading): that pillar is enlarged and accented, and no
// longer a link, since it is where the reader already is.
export function PillarRow({ pillars, activeIndex }: { pillars: Pillar[]; activeIndex?: number }) {
  if (pillars.length === 0) return null;

  return (
    <nav className="pillars" aria-label="Pillars">
      <ul className="pillars__list" style={{ '--pillar-word': longestWord(pillars) } as CSSProperties}>
        {pillars.map((pillar, index) => {
          const active = index === activeIndex;
          // Which side of the active pillar this one is on, so CSS can move
          // it away from the active one (see .pillars-section in globals.css).
          const itemClass = active
            ? 'pillars__item pillars__item--active'
            : activeIndex === undefined
              ? 'pillars__item'
              : index < activeIndex
                ? 'pillars__item pillars__item--before'
                : 'pillars__item pillars__item--after';
          const body = (
            <>
              <Capital />
              <span className="pillars__shaft">
                <span className="pillars__title">{pillar.title}</span>
              </span>
              <Base />
            </>
          );
          return (
            <li
              key={index}
              className={itemClass}
              // How far from the active pillar, so CSS can stagger the rise.
              style={
                activeIndex === undefined
                  ? undefined
                  : ({ '--pillar-distance': Math.abs(index - activeIndex) } as CSSProperties)
              }
            >
              {active ? (
                <span className="pillars__link" aria-current="true">
                  {body}
                </span>
              ) : (
                <a className="pillars__link" href={`#${pillarTarget(pillar)}`}>
                  {body}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Pillars({ pillars = [] }: { pillars?: Pillar[] }) {
  return <PillarRow pillars={pillars} />;
}

// Stands in for the h2 of a pillar's section (src/lib/mdx/render.ts swaps it
// in). The anchor id moves to the wrapper, so the pillar links and the page
// outline still land here; the real h2 stays in the document, visually
// hidden, so the heading structure and screen readers keep it.
export function PillarsSectionHeading({
  id,
  pillars,
  activeIndex,
  children,
}: {
  id?: string;
  pillars: Pillar[];
  activeIndex: number;
  children?: ReactNode;
}) {
  return (
    <div id={id} className="pillars-section">
      <h2 className="pillars__sr-only">{children}</h2>
      <PillarRow pillars={pillars} activeIndex={activeIndex} />
    </div>
  );
}
