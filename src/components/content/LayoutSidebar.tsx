import type { ReactNode } from 'react';

type LayoutSidebarProps = {
  children?: ReactNode;
};

// Exactly two <LayoutColumn> children (enforced by the Keystatic schema).
// Whichever is authored first renders as the narrow column, see
// .layout-sidebar in globals.css, so reordering the columns in the editor
// flips which side is narrow, with no separate field to keep in sync.
export function LayoutSidebar({ children }: LayoutSidebarProps) {
  return <div className="layout-sidebar">{children}</div>;
}
