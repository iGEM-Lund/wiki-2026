import katex from 'katex';

// Shared by both the site-render components (src/components/content/Formula*)
// and the Keystatic editor previews (src/lib/keystatic/content-components.tsx)
// so the two stay visually in sync. `throwOnError: false` matters here: an
// author mid-edit will often have invalid/incomplete LaTeX, and KaTeX's
// default behavior for that is to render the offending part inline in red
// rather than throw — which is what we want in both the editor preview and a
// published page (never let one bad formula break the whole build/page).
export function renderLatexToHtml(latex: string, displayMode: boolean): string {
  return katex.renderToString(latex, {
    displayMode,
    throwOnError: false,
    // Default 'htmlAndMathml' output (rather than 'html' alone) also emits a
    // MathML tree, which is what gives screen readers something sensible to
    // read instead of the visually-laid-out HTML spans.
  });
}
