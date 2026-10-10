import GithubSlugger from 'github-slugger';

type Pillar = { title: string; description?: string; heading?: string };
type PillarsProps = { pillars?: Pillar[] };

// Each pillar is drawn as a plain column in line art: a flat slab on top, a
// flat slab as the base, both inline SVG, with the shaft between them drawn
// by the two side borders of the text block (see .pillars__shaft in
// globals.css). vector-effect keeps the strokes a constant width however wide
// the column gets. The shaft sits inset 12% from each side.
function Capital() {
  return (
    <svg className="pillars__capital" viewBox="0 0 100 12" aria-hidden="true">
      <rect x="2" y="2" width="96" height="10" />
    </svg>
  );
}

function Base() {
  return (
    <svg className="pillars__base" viewBox="0 0 100 12" aria-hidden="true">
      <rect x="2" y="0" width="96" height="10" />
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
