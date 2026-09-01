import { renderLatexToHtml } from '@/lib/katex';

type FormulaProps = {
  latex?: string;
};

// Inline math, e.g. "...where $x^2 + y^2 = z^2$ gives...". Rendered to
// static HTML with KaTeX at MDX-compile time (see src/lib/mdx/render.ts) —
// no client JS, no runtime DOM dependency, so this works the same in a
// server component and in the static export build.
export function Formula({ latex = '' }: FormulaProps) {
  const html = renderLatexToHtml(latex, false);
  return <span className="formula formula--inline" dangerouslySetInnerHTML={{ __html: html }} />;
}
