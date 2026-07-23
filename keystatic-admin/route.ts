import { makeRouteHandler } from '@keystatic/next/route-handler';
import keystaticConfig, { showAdminUI } from '@keystatic-config';

const notFound = async () => new Response('Not found', { status: 404 });

const handlers = showAdminUI ? makeRouteHandler({ config: keystaticConfig }) : { GET: notFound, POST: notFound };

// Defense-in-depth only — see keystatic-admin/layout.tsx. Named exports
// (rather than a conditional module.exports) keep Next's static route-handler
// analysis intact.
export const { GET, POST } = handlers;
