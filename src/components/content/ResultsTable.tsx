import type { ReactNode } from 'react';

type ResultsTableProps = {
  caption?: string;
  children?: ReactNode;
};

// Stub: styled wrapper around writer-authored Markdown table syntax, not a
// data-driven table (no CSV import, sorting, etc.).
export function ResultsTable({ caption, children }: ResultsTableProps) {
  return (
    <div className="results-table">
      {caption ? <p className="results-table__caption">{caption}</p> : null}
      {children}
    </div>
  );
}
