import type { ReactNode } from 'react';

type LayoutProps = {
  children?: ReactNode;
};

// Exactly two / three <LayoutColumn> children (enforced by the Keystatic
// schema). The column count is fixed in CSS (.layout--2 / .layout--3 in
// globals.css) rather than auto-fitted, so three columns can't silently wrap
// to two in the reading column.
export function Layout2({ children }: LayoutProps) {
  return <div className="layout layout--2">{children}</div>;
}

export function Layout3({ children }: LayoutProps) {
  return <div className="layout layout--3">{children}</div>;
}
