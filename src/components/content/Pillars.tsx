import GithubSlugger from 'github-slugger';

type Pillar = { title: string; description?: string; heading?: string };
type PillarsProps = { pillars?: Pillar[] };

// Each pillar is drawn as a Greek column in line art: an Ionic capital (a
// flat abacus over a volute on either side) and a stepped base, both inline
// SVG, with the shaft between them drawn by the two side borders of the text
// block (see .pillars__shaft in globals.css). vector-effect keeps the strokes
// a constant 2px however wide the column gets. The shaft edges sit at 16% and
// 84% of the width, which is where both SVGs' paths meet them.
function Capital() {
  return (
    <svg className="pillars__capital" viewBox="0 0 100 22" aria-hidden="true">
      <rect x="2" y="1" width="96" height="5" />
      <circle cx="9" cy="13" r="4.5" />
      <circle cx="9" cy="13" r="1.4" />
      <circle cx="91" cy="13" r="4.5" />
      <circle cx="91" cy="13" r="1.4" />
      <path d="M 9 17.5 Q 9 21 16 21 L 16 22 M 91 17.5 Q 91 21 84 21 L 84 22 M 16 21 L 84 21 M 13.5 13 L 13.5 6 M 86.5 13 L 86.5 6" />
    </svg>
  );
}

function Base() {
  return (
    <svg className="pillars__base" viewBox="0 0 100 18" aria-hidden="true">
      <path d="M 16 0 L 16 2 M 84 0 L 84 2" />
      <rect x="10" y="2" width="80" height="4" />
      <rect x="5" y="6" width="90" height="4" />
      <rect x="1" y="10" width="98" height="6" />
    </svg>
  );
}

// A row of pillars, each a plain anchor link to a heading further down the
// page. The target is the id rehype-slug gives that heading (see
// src/lib/mdx/render.ts), computed with the same github-slugger so the two
// can't drift: the pillar's `heading` text if set, else its title. No client
// JS; the browser's own anchor scroll does the work (see scroll-padding-top
// in globals.css for the fixed header).
export function Pillars({ pillars = [] }: PillarsProps) {
  if (pillars.length === 0) return null;

  return (
    <nav className="pillars" aria-label="Pillars">
      <ul className="pillars__list">
        {pillars.map((pillar, index) => {
          // A fresh slugger per link: each target is the first heading of
          // that text, which is the id rehype-slug gives it.
          const id = new GithubSlugger().slug(pillar.heading || pillar.title || '');
          return (
            <li key={index} className="pillars__item">
              <a className="pillars__link" href={`#${id}`}>
                <Capital />
                <span className="pillars__shaft">
                  <span className="pillars__title">{pillar.title}</span>
                  {pillar.description ? <span className="pillars__description">{pillar.description}</span> : null}
                </span>
                <Base />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
