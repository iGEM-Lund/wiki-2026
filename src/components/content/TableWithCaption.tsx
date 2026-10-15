import type { ReactNode } from 'react';
import { renderLabelledCaption } from '@/lib/caption-text';

// A Markdown table (rendered by Table.tsx) wrapped with a caption. Tables
// take their caption above, figures below, the usual convention for each.
// <figure>/<figcaption> rather than a <caption> inside the <table>: the
// caption stays put instead of scrolling sideways with a wide table, and a
// figure is still labelled by its figcaption for screen readers.
// Every one is numbered ("Table 3."); `number` and the `refId` anchor a Ref
// links to come from src/lib/numbering.ts.
export function TableWithCaption({
  caption,
  refId,
  number,
  children,
}: {
  caption?: string;
  refId?: string;
  number?: string;
  children?: ReactNode;
}) {
  return (
    <figure className="table-with-caption" id={refId || undefined}>
      {caption || number ? <figcaption>{renderLabelledCaption('table', number, caption)}</figcaption> : null}
      {children}
    </figure>
  );
}
