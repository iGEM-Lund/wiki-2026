// A page's meta description: its first real prose paragraph, stripped of
// Markdown and MDX, cut to search-snippet length. Headings, components,
// lists, tables and placeholder text ("Description...") are skipped; a page
// with no paragraph long enough gets no description of its own and falls
// back to the site-wide one in src/app/layout.tsx.

const MIN_LENGTH = 60;
const MAX_LENGTH = 160;

function toPlainText(paragraph: string): string {
  return paragraph
    .replace(/<[^>]*>/g, '') // inline MDX tags; their children stay
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // links and images
    .replace(/&#x20;|&nbsp;/g, ' ')
    .replace(/[*_`~\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string): string {
  if (text.length <= MAX_LENGTH) return text;
  const cut = text.slice(0, MAX_LENGTH - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:.]+$/, '')}…`;
}

export function pageDescription(source: string): string | undefined {
  for (const block of source.split(/\n\s*\n/)) {
    const first = block.trimStart();
    if (/^(#|<|\||>|[-*+] |\d+\.\s|```|import |export )/.test(first)) continue;
    const text = toPlainText(block);
    if (text.length >= MIN_LENGTH) return truncate(text);
  }
  return undefined;
}
