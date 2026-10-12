import { Children, isValidElement, type ReactNode } from 'react';
import { CardTitle, type CardTitleProps } from './CardTitle';
import { ZoomableImage } from './ZoomableImage';
import { SectionHeading } from '@/components/section-heading';

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

// A card title is its own thing, not a heading: writers sometimes type a
// Markdown heading inside CardTitle, which would otherwise render as a full
// h2 (ribbons and all) or h3 inside the header. Keep only its text.
function unwrapHeadings(node: ReactNode): ReactNode {
  return Children.map(node, (child) =>
    isValidElement<{ children?: ReactNode }>(child) &&
    (child.type === SectionHeading || (typeof child.type === 'string' && HEADING_TAGS.has(child.type)))
      ? child.props.children
      : child,
  );
}

// Everything inside a Card is visible. The optional title is authored as a
// <CardTitle> child rather than a flat prop, so it can hold rich inline MDX
// (emphasis, a <Citation>, ...); content that should stay hidden until the
// reader asks for it goes in an <Expandable> child, which brings its own
// "Read more" toggle.
export function Card({ children }: { children?: ReactNode }) {
  const items = Children.toArray(children);
  const isTitle = (child: ReactNode) => isValidElement(child) && child.type === CardTitle;
  const titleElement = items.find(isTitle);
  const title = isValidElement<CardTitleProps>(titleElement) ? titleElement.props : null;

  return (
    <section className="card" id={title?.anchor}>
      {title ? (
        <header className="card__header">
          {title.image ? (
            <div className="card__figure">
              <ZoomableImage src={title.image} alt={title.imageAlt} />
            </div>
          ) : null}
          <div className="card__heading">
            <div className="card__title">{unwrapHeadings(title.children)}</div>
            {title.subtitle ? <p className="card__subtitle">{title.subtitle}</p> : null}
          </div>
        </header>
      ) : null}
      {items.filter((child) => !isTitle(child))}
    </section>
  );
}
