import type { ReactNode } from 'react';

type LayoutProps = {
  children?: ReactNode;
};

type Layout3Props = LayoutProps & {
  centerFilled?: boolean | null;
};

// Exactly two / three <LayoutColumn> children (enforced by the Keystatic
// schema). The column count is fixed in CSS (.layout--2 / .layout--3 in
// globals.css) rather than auto-fitted, so three columns can't silently wrap
// to two in the reading column.
export function Layout2({ children }: LayoutProps) {
  return <div className="layout layout--2">{children}</div>;
}

// centerFilled drops empty columns and centres the rest at their one-third
// width (.layout--center-filled), instead of leaving a gap where they were.
export function Layout3({ children, centerFilled }: Layout3Props) {
  return (
    <div className={centerFilled ? 'layout layout--3 layout--center-filled' : 'layout layout--3'}>{children}</div>
  );
}
