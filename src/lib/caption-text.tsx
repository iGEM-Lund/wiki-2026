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

// The automatically numbered kinds (see src/lib/numbering.ts), and how each
// reads in a caption or a reference.
export type NumberedKind = 'figure' | 'table' | 'model';

export const KIND_LABELS: Record<NumberedKind, string> = {
  figure: 'Figure',
  table: 'Table',
  model: 'Model',
};

// A caption with its automatic "Figure 3." in front, when the object was
// numbered. A numbered object with no caption still shows its number.
export function renderLabelledCaption(
  kind: NumberedKind,
  number: string | number | null | undefined,
  caption: string | undefined,
): ReactNode {
  if (!number) return caption ? renderCaption(caption) : null;
  return (
    <>
      <span className="caption-label">
        {KIND_LABELS[kind]} {number}.
      </span>
      {caption ? <> {renderCaption(caption)}</> : null}
    </>
  );
}

// The same, as plain text (an aria-label, an image's lightbox label).
export function labelledCaptionPlainText(
  kind: NumberedKind,
  number: string | number | null | undefined,
  caption: string | undefined,
): string {
  const text = caption ? captionPlainText(caption) : '';
  return number ? `${KIND_LABELS[kind]} ${number}.${text ? ` ${text}` : ''}` : text;
}
