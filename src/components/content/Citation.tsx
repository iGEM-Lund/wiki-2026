type CitationProps = {
  reference?: string | null;
  lookup?: Record<string, { shortForm: string }>;
};

// `lookup` is injected per-page by src/lib/mdx/render.ts — see
// resolveCitedReferences in src/lib/references.ts for how it's built.
export function Citation({ reference, lookup }: CitationProps) {
  const shortForm = reference ? lookup?.[reference]?.shortForm : undefined;
  if (!reference || !shortForm) {
    return <span className="citation citation--missing">[missing reference]</span>;
  }
  return (
    <a className="citation" href={`#ref-${reference}`}>
      {shortForm}
    </a>
  );
}
