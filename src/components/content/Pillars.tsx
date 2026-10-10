import GithubSlugger from 'github-slugger';

type Pillar = { title: string; description?: string; heading?: string };
type PillarsProps = { pillars?: Pillar[] };

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
                <span className="pillars__number" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="pillars__title">{pillar.title}</span>
                {pillar.description ? <span className="pillars__description">{pillar.description}</span> : null}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
