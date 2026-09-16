import type { ReactNode } from 'react';

// Marker component only: Expandable (see Expandable.tsx) pulls this out of
// its children by element type to render inside <summary>, rather than
// rendering it as a standalone element itself.
export function ExpandableSummary({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
