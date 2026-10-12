import { Children, cloneElement, isValidElement, type ComponentPropsWithoutRef, type ReactElement, type ReactNode } from 'react';
import { CollapsibleTable } from './CollapsibleTable';
import { TableScroll } from './TableScroll';

// Tables with more body rows than this start collapsed to their first
// VISIBLE_ROWS, with a button to show the rest.
const COLLAPSE_ABOVE = 12;
const VISIBLE_ROWS = 8;

type WithChildren = ReactElement<{ children?: ReactNode }>;

function elements(node: ReactNode): WithChildren[] {
  return Children.toArray(node).filter(isValidElement) as WithChildren[];
}

// Each cell of a row past VISIBLE_ROWS gets its content wrapped, so
// CollapsibleTable can hide it with hidden="until-found" (the browser's
// find-in-page still searches it) rather than display: none (it doesn't).
function hideRow(row: WithChildren) {
  return cloneElement(
    row as ReactElement<{ className?: string; children?: ReactNode }>,
    { className: 'table-row--extra' },
    elements(row.props.children).map((cell) =>
      cloneElement(cell, {}, <div className="table-cell__extra">{cell.props.children}</div>),
    ),
  );
}

// Markdown tables written in the editor. Wrapped so a wide table scrolls
// sideways inside its own box instead of stretching the page on phones, and
// that box in a frame that carries the pins holding it to the page: pinned
// to the scroll box itself they would scroll away with a wide table.
export function Table({ children, ...props }: ComponentPropsWithoutRef<'table'>) {
  const parts = elements(children);
  const body = parts.find((part) => part.type === 'tbody');
  const rows = body ? elements(body.props.children) : [];

  if (!body || rows.length <= COLLAPSE_ABOVE) {
    return (
      <div className="table-frame">
        <TableScroll>
          <table {...props}>{children}</table>
        </TableScroll>
      </div>
    );
  }

  const collapsedBody = cloneElement(
    body,
    {},
    rows.map((row, i) => (i < VISIBLE_ROWS ? row : hideRow(row))),
  );
  return (
    <CollapsibleTable rowCount={rows.length}>
      <div className="table-frame">
        <TableScroll>
          <table {...props}>{parts.map((part) => (part === body ? collapsedBody : part))}</table>
        </TableScroll>
      </div>
    </CollapsibleTable>
  );
}
