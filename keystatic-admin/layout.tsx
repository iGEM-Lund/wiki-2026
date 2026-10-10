import { notFound } from 'next/navigation';
import { showAdminUI } from '@keystatic-config';
import KeystaticApp from './keystatic';

// Defense-in-depth only: the production export build never has this file
// present at all (see scripts/keystatic-routes.mjs), so this check only
// matters if that removal step is ever bypassed.
//
// Per Keystatic's own Next.js integration pattern, this layout renders the
// admin SPA directly rather than `children`; the catch-all page.tsx
// alongside it is a no-op placeholder.
export default function KeystaticLayout() {
  if (!showAdminUI) {
    notFound();
  }
  return <KeystaticApp />;
}
