import { Children, isValidElement, type ReactNode } from 'react';
import { ExpandableSummary } from './ExpandableSummary';
import { ExpandableTitle, type ExpandableTitleProps } from './ExpandableTitle';
import { ExpandableClient } from './ExpandableClient';

type ExpandableProps = {
  defaultOpen?: boolean;
  children?: ReactNode;
};

// The optional heading and the always-visible teaser are authored as
// <ExpandableTitle> / <ExpandableSummary> children rather than flat props, so
// they can hold rich inline MDX (emphasis, a <Citation>, ...) instead of being
// limited to plain text. Everything else is the collapsible body.
export function Expandable({ defaultOpen = false, children }: ExpandableProps) {
  const items = Children.toArray(children);
  const isMarker = (child: ReactNode, type: unknown) => isValidElement(child) && child.type === type;
  const titleElement = items.find((child) => isMarker(child, ExpandableTitle));
  const title = isValidElement<ExpandableTitleProps>(titleElement)
    ? {
        name: titleElement.props.children,
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
