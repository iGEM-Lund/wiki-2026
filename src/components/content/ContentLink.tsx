import Link from 'next/link';
import type { ComponentPropsWithoutRef } from 'react';

// Every link in page content. Links to another wiki page ("/parts") go
// through next/link, which adds the production export's /lund basePath and
// trailing slash (next.config.ts); a plain <a> would 404 there. Everything
// else (in-page "#…" anchors, external URLs) stays a plain <a>.
export function ContentLink({ href, ...props }: ComponentPropsWithoutRef<'a'>) {
  if (href?.startsWith('/') && !href.startsWith('//')) return <Link href={href} {...props} />;
  return <a href={href} {...props} />;
}
