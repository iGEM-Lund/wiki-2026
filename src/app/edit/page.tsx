import { notFound, redirect } from 'next/navigation';
import { showAdminUI } from '@keystatic-config';

// Keystatic's bundled admin UI hardcodes `/keystatic` as its client-side
// router base path (see @keystatic/core's RouterProvider) — the admin
// itself can't be relocated. This just gives editors a shorter, more
// intuitive URL to remember. In the production export, `/keystatic` is
// physically absent (see scripts/keystatic-routes.mjs), so redirecting
// there would just be a dead link — 404 instead.
export default function EditRedirect() {
  if (!showAdminUI) {
    notFound();
  }
  redirect('/keystatic');
}
