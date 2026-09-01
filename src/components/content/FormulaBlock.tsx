import { renderLatexToHtml } from '@/lib/katex';

type FormulaBlockProps = {
  latex?: string;
};

// Display math on its own centered line, e.g. a derivation step. See
// Formula.tsx for the inline counterpart and why this is server-rendered.
export function FormulaBlock({ latex = '' }: FormulaBlockProps) {
  const html = renderLatexToHtml(latex, true);
  return <div className="formula formula--block" dangerouslySetInnerHTML={{ __html: html }} />;
}
