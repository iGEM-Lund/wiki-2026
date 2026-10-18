import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import type { NumberedKind } from '@/lib/caption-text';
import type { CardLookup, ObjectLookup } from '@/lib/cards';
import { KIND_LABELS } from '@/lib/caption-text';
import { CitationLink } from './CitationLink';

type RefProps = {
  target?: string | null;
  // Filled in by src/lib/numbering.ts from the object the code names; all
  // missing when it names nothing numbered on the page (a card, say).
  kind?: NumberedKind;
  label?: string;
  caption?: string;
  direction?: 'up' | 'down';
  // A card reference's own words, instead of the card's title.
  linkText?: string;
  // Bound in by src/lib/mdx/render.ts: every card on the site, and the
  // page being rendered.
  cards?: CardLookup;
  objects?: ObjectLookup;
  slug?: string;
};

const GO_TO: Record<NumberedKind, string> = {
  figure: 'Go to figure',
  table: 'Go to table',
  model: 'Go to model',
};

// A mention of a numbered figure, table or 3D model: its current label as a
// link, with the same hanging sign as a citation, here holding the
// object's caption and an arrow pointing the way it lies on the page. When
// the object is already on screen, a string is drawn to it instead.
//
// Or a mention of a card, on this page or any other: the card's title (or
// the words the writer chose) as a link, its sign a small preview of the
// card, with a way to go to it. That sign is always hung, and the dashed
// line (src/components/link-arrow.tsx) is drawn as well: to the card if it
// is on screen, else to its place in the outline, or, on another page, to
// that page in the nav.
export function Ref({ target, kind, label, caption, direction, linkText, cards, objects, slug }: RefProps) {
  const card = target && !kind ? cards?.[target] : undefined;
  if (card && target) {
    const samePage = card.slug === slug;
    const Arrow = samePage ? (direction === 'up' ? ArrowUp : ArrowDown) : ArrowRight;
    return (
      <CitationLink
        href={samePage ? `#${target}` : `/${card.slug}#${target}`}
        pointTo={target}
        alwaysSign
        crossPage={!samePage}
      >
        {linkText?.trim() || card.title}
        <span className="citation__sign citation__sign--card" aria-hidden="true" popover="manual">
          <span className="citation__sign-card">
            {card.image ? <img className="citation__sign-portrait" src={card.image} alt="" /> : null}
            <span className="citation__sign-card-text">
              <span className="citation__sign-title">{card.title}</span>
              {card.subtitle ? <span className="citation__sign-subtitle">{card.subtitle}</span> : null}
            </span>
          </span>
          {card.excerpt ? <span className="citation__sign-text">{card.excerpt}</span> : null}
          <span className="citation__sign-go">
            <Arrow size={14} />
            {samePage ? 'Go to section' : `Go to page: ${card.pageTitle}`}
          </span>
        </span>
      </CitationLink>
    );
  }
  // A numbered figure, table or model on another page: "Page › Figure 3",
  // its sign showing the object and the way to it.
  const object = target && !kind ? objects?.[target] : undefined;
  if (object && target && object.slug !== slug) {
    const noun = KIND_LABELS[object.kind].toLowerCase();
    const image = object.image && !/\.pdf(\?|$)/i.test(object.image) ? object.image : undefined;
    return (
      <CitationLink href={`/${object.slug}#${target}`} pointTo={target} alwaysSign crossPage>
        {object.pageTitle} › {KIND_LABELS[object.kind]} {object.number}
        <span className="citation__sign citation__sign--card" aria-hidden="true" popover="manual">
          {image ? <img className="citation__sign-figure" src={image} alt="" /> : null}
          {object.caption ? <span className="citation__sign-text">{object.caption}</span> : null}
          <span className="citation__sign-go">
            <ArrowRight size={14} />
            Go to {noun} in {object.pageTitle}
          </span>
        </span>
      </CitationLink>
    );
  }
  if (!target || !kind || !label) {
    console.warn(`[numbering] Reference to "${target}" matches no card or numbered object on any page.`);
    return <span className="citation citation--missing">[missing reference]</span>;
  }
  const Arrow = direction === 'up' ? ArrowUp : ArrowDown;
  return (
    <CitationLink href={`#${target}`} pointTo={target}>
      {label}
      <span className="citation__sign" aria-hidden="true" popover="manual">
        {caption ? <span className="citation__sign-text">{caption}</span> : null}
        <span className="citation__sign-go">
          <Arrow size={14} />
          {GO_TO[kind]}
        </span>
      </span>
    </CitationLink>
  );
}
