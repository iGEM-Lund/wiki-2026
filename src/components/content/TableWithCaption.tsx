import type { ReactNode } from 'react';
import { renderCaption } from '@/lib/caption-text';

// A Markdown table (rendered by Table.tsx) wrapped with a caption. Tables
// take their caption above, figures below, the usual convention for each.
// <figure>/<figcaption> rather than a <caption> inside the <table>: the
// caption stays put instead of scrolling sideways with a wide table, and a
// figure is still labelled by its figcaption for screen readers.
export function TableWithCaption({ caption, children }: { caption?: string; children?: ReactNode }) {
  return (
    <figure className="table-with-caption">
      {caption ? <figcaption>{renderCaption(caption)}</figcaption> : null}
      {children}
    </figure>
  );
}
