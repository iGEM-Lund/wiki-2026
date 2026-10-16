import Link from 'next/link';
import type { ComponentPropsWithoutRef } from 'react';

// Every link in page content. Links to another wiki page ("/parts") go
// through next/link, which adds the production export's /lund basePath and
// trailing slash (next.config.ts); a plain <a> would 404 there. Everything
// else (in-page "#…" anchors, external URLs) stays a plain <a>.
//
// A "#:~:text=…" link (scroll to and highlight some text) is the exception:
// the browser only acts on it in a real page load, and next/link's
// client-side navigation drops it, so the reader lands at the top of the
// page. Those get a plain <a> with the basePath and trailing slash added by
// hand.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function ContentLink({ href, ...props }: ComponentPropsWithoutRef<'a'>) {
  if (href?.startsWith('/') && !href.startsWith('//')) {
    if (href.includes('#:~:text=')) {
      const [path, fragment] = href.split('#:~:');
      const dir = BASE_PATH ? `${path.replace(/\/$/, '')}/` : path;
      return <a href={`${BASE_PATH}${dir}#:~:${fragment}`} {...props} />;
    }
    return <Link href={href} {...props} />;
  }
  return <a href={href} {...props} />;
}
