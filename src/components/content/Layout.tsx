import type { ReactNode } from 'react';

type LayoutProps = {
  children?: ReactNode;
};

// Column count isn't tracked here: the grid (see .layout in globals.css)
// self-sizes to however many <LayoutColumn> children are actually present.
export function Layout({ children }: LayoutProps) {
  return <div className="layout">{children}</div>;
}
