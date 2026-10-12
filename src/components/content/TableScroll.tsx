'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';

// Justify only pays off on a cell with a few lines of text in a column wide
// enough to fit a fair number of words per line. A two-line cell, or a narrow
// column, gets stretched lines with wide gaps between words instead.
const MIN_LINES = 3;
// Average glyph width as a share of the font size, to turn a cell's width
// into characters per line.
const CHAR_WIDTH_EM = 0.5;
const MIN_CHARS_PER_LINE = 32;
// A word longer than this (a DNA sequence, say) may break anywhere rather
// than set its column's width; shorter ones are kept whole.
const MAX_UNBROKEN_CHARS = 30;

function shouldJustify(cell: HTMLTableCellElement) {
  const style = getComputedStyle(cell);
  const fontSize = parseFloat(style.fontSize);
  const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.2;
  const width = cell.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  if (width / (fontSize * CHAR_WIDTH_EM) < MIN_CHARS_PER_LINE) return false;
  // The cell itself stretches to the row's tallest cell, so measure its
  // contents instead.
  const range = document.createRange();
  range.selectNodeContents(cell);
  const lines = Math.round(range.getBoundingClientRect().height / lineHeight);
  return lines >= MIN_LINES;
}

// The sideways-scrolling box a Markdown table sits in (see Table.tsx). Cells
// with a very long unbroken string are marked to break it anywhere. Body
// cells are left-aligned unless they have enough text, in a wide enough
// column, to read well justified; re-checked whenever the table resizes
// (window width, a collapsed table showing its rest). Justify doesn't move
// line breaks, so setting it never changes the measurements.
export function TableScroll({ children }: { children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const table = ref.current?.querySelector('table');
    if (!table) return;
    // Depends only on the text, so it's set once, before the first layout
    // measurement below.
    for (const cell of table.querySelectorAll<HTMLTableCellElement>('td, th')) {
      const longest = Math.max(0, ...(cell.textContent ?? '').split(/\s+/).map((word) => word.length));
      cell.toggleAttribute('data-break-anywhere', longest > MAX_UNBROKEN_CHARS);
    }
    const update = () => {
      for (const cell of table.querySelectorAll<HTMLTableCellElement>('tbody td, tbody th')) {
        cell.toggleAttribute('data-justify', shouldJustify(cell));
      }
    };
    const observer = new ResizeObserver(update);
    observer.observe(table);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="table-scroll" ref={ref}>
      {children}
    </div>
  );
}
