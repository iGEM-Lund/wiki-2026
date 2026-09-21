import { makeRouteHandler } from '@keystatic/next/route-handler';
import keystaticConfig, { showAdminUI } from '@keystatic-config';

const notFound = async () => new Response('Not found', { status: 404 });

const rawHandlers = showAdminUI ? makeRouteHandler({ config: keystaticConfig }) : { GET: notFound, POST: notFound };

// Under `next start` (staging, behind Caddy), Next builds request.url from
// its own bind address/port rather than the incoming Host header, a
// documented internal quirk (see next-server.js's initUrl construction),
// not something fixable via next.config. Keystatic derives its GitHub OAuth
// redirect_uri straight from request.url, so uncorrected it comes out as
// https://127.0.0.1:3000/... instead of the public staging domain, and
// GitHub rejects it as an unregistered callback URL. Rebuild the request
// with the real public origin, read directly from the headers Caddy
// forwards, before handing off to Keystatic.
function withPublicOrigin(handler: (req: Request) => Promise<Response>) {
  return async (request: Request) => {
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') ?? 'https';
    if (host) {
      const url = new URL(request.url);
      const corrected = new URL(`${proto}://${host}${url.pathname}${url.search}`);
      if (corrected.origin !== url.origin) {
        request = new Request(corrected, request);
      }
    }
    return handler(request);
  };
}

const handlers = {
  GET: withPublicOrigin(rawHandlers.GET),
  POST: withPublicOrigin(rawHandlers.POST),
};

// Defense-in-depth only; see keystatic-admin/layout.tsx. Named exports
// (rather than a conditional module.exports) keep Next's static route-handler
// analysis intact.
export const { GET, POST } = handlers;
