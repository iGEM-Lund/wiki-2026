import { ArrowDown } from 'lucide-react';
import { narrativeForm, type ReferenceLookup } from '@/lib/references';
import { CitationLink } from './CitationLink';

type CitationProps = {
  reference?: string | null;
  narrative?: boolean;
  lookup?: ReferenceLookup;
};

// `lookup` is injected per-page by src/lib/mdx/render.ts; see
// resolveCitedReferences in src/lib/references.ts for how it's built.
export function Citation({ reference, narrative, lookup }: CitationProps) {
  const entry = reference ? lookup?.[reference] : undefined;
  if (!reference || !entry) {
    return <span className="citation citation--missing">[missing reference]</span>;
  }
  return (
    <CitationLink href={`#ref-${reference}`}>
      {narrative ? narrativeForm(entry.shortForm) : entry.shortForm}
      {/* Hover/focus sign with the full citation and where the link goes
          (see .citation__sign in globals.css, and CitationLink for how it's
          opened). Hidden from screen readers,
          who get the same text from the References list the link jumps to. */}
      <span className="citation__sign" aria-hidden="true" popover="manual">
        <span className="citation__sign-text">{entry.longForm}</span>
        <span className="citation__sign-go">
          <ArrowDown size={14} />
          Go to reference
        </span>
      </span>
    </CitationLink>
  );
}
