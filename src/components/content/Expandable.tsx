import { Children, isValidElement, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { ExpandableSummary } from './ExpandableSummary';

type ExpandableProps = {
  defaultOpen?: boolean;
  children?: ReactNode;
};

// The always-visible teaser is authored as the first <ExpandableSummary>
// child rather than a flat prop, so it can hold rich inline MDX (emphasis,
// a <Citation>, ...) instead of being limited to plain text.
export function Expandable({ defaultOpen = false, children }: ExpandableProps) {
  const items = Children.toArray(children);
  const summaryIndex = items.findIndex((child) => isValidElement(child) && child.type === ExpandableSummary);
  const summary = summaryIndex === -1 ? null : items[summaryIndex];
  const body = summaryIndex === -1 ? items : items.filter((_, index) => index !== summaryIndex);

  return (
    <details className="expandable" open={defaultOpen}>
      <summary className="expandable__summary">
        <span>{summary}</span>
        <ChevronDown className="expandable__icon" aria-hidden size={16} />
      </summary>
      <div className="expandable__body">{body}</div>
    </details>
  );
}
