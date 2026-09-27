import type { ReactNode } from 'react';

// Marker component only, like ExpandableSummary: Expandable (see
// Expandable.tsx) pulls this out of its children by element type and renders
// it as the card's heading, above the summary.
export function ExpandableTitle({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
