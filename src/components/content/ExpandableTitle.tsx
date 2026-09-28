import type { ReactNode } from 'react';

export type ExpandableTitleProps = {
  image?: string;
  imageAlt?: string;
  subtitle?: string;
  children?: ReactNode;
};

// Marker component only, like ExpandableSummary: Expandable (see
// Expandable.tsx) pulls this out of its children by element type and renders
// it as the card's header, above the summary. The optional image and
// subtitle turn that header into a profile (portrait, name, role), which is
// what interview cards need, without writers hand-building a layout.
export function ExpandableTitle({ children }: ExpandableTitleProps) {
  return <>{children}</>;
}
