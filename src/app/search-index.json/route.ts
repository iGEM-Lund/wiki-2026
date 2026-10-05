import { buildSearchIndex } from '@/lib/search-index';

// Generated once at build time and written out as a plain file, so the
// production export serves it like any other static asset. A GET-only
// handler is fine under `output: 'export'` (only handlers exporting
// POST and friends break it, which is why Keystatic's are stripped).
export const dynamic = 'force-static';

export async function GET() {
  return Response.json(await buildSearchIndex());
}
