import { ArrowDown, ArrowUp } from 'lucide-react';
import type { NumberedKind } from '@/lib/caption-text';
import { CitationLink } from './CitationLink';

type RefProps = {
  target?: string | null;
  // Filled in by src/lib/numbering.ts from the object the code names; all
  // missing when it names nothing numbered on the page.
  kind?: NumberedKind;
  label?: string;
  caption?: string;
  direction?: 'up' | 'down';
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
export function Ref({ target, kind, label, caption, direction }: RefProps) {
  if (!target || !kind || !label) {
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
