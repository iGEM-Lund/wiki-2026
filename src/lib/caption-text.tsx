import type { ReactNode } from 'react';

// Caption fields are plain text (fields.text, not fields.mdx: a wrapper or
// block's own fields can't hold rich text), so they get one piece of
// Markdown by hand: *single asterisks* for italics, which captions need for
// species names (*E. coli*). Like Markdown, a marker hugs its text, so
// "5 * 3 * 2" stays as typed, and doubled asterisks are left alone.
const ITALIC = /(?<!\*)\*(?![\s*])([^*\n]+?)(?<![\s*])\*(?!\*)/g;

export function renderCaption(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(ITALIC)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(<em key={match.index}>{match[1]}</em>);
    last = match.index + match[0].length;
  }
  if (last === 0) return text;
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// The caption as read aloud or searched: the italic markers dropped.
export function captionPlainText(text: string): string {
  return text.replace(ITALIC, '$1');
}
