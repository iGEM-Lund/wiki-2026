import { Children, isValidElement, type ReactNode } from 'react';
import { ExpandableSummary } from './ExpandableSummary';
import { ExpandableTitle, type ExpandableTitleProps } from './ExpandableTitle';
import { ExpandableClient } from './ExpandableClient';
import { SectionHeading } from '@/components/section-heading';

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

// A card title is its own thing, not a heading: writers sometimes type a
// Markdown heading inside ExpandableTitle, which would otherwise render as a
// full h2 (ribbons and all) or h3 inside the header. Keep only its text.
function unwrapHeadings(node: ReactNode): ReactNode {
  return Children.map(node, (child) =>
    isValidElement<{ children?: ReactNode }>(child) &&
    (child.type === SectionHeading || (typeof child.type === 'string' && HEADING_TAGS.has(child.type)))
      ? child.props.children
      : child,
  );
}

type ExpandableProps = {
  defaultOpen?: boolean;
  children?: ReactNode;
};

// The optional title and the always-visible teaser are authored as
// <ExpandableTitle> / <ExpandableSummary> children rather than flat props, so
// they can hold rich inline MDX (emphasis, a <Citation>, ...) instead of being
// limited to plain text. Everything else is the collapsible body.
export function Expandable({ defaultOpen = false, children }: ExpandableProps) {
  const items = Children.toArray(children);
  const isMarker = (child: ReactNode, type: unknown) => isValidElement(child) && child.type === type;
  const titleElement = items.find((child) => isMarker(child, ExpandableTitle));
  const title = isValidElement<ExpandableTitleProps>(titleElement)
    ? {
        name: unwrapHeadings(titleElement.props.children),
        image: titleElement.props.image,
        imageAlt: titleElement.props.imageAlt,
        subtitle: titleElement.props.subtitle,
      }
    : null;
  const summary = items.find((child) => isMarker(child, ExpandableSummary)) ?? null;
  const body = items.filter((child) => !isMarker(child, ExpandableTitle) && !isMarker(child, ExpandableSummary));

  return (
    <ExpandableClient
      defaultOpen={defaultOpen}
      title={title}
      summary={summary}
    >
      {body}
    </ExpandableClient>
  );
}
