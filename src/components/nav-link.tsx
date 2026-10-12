'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';

// Strips the trailing slash the production export adds (trailingSlash is
// on there only), so "/team" and "/team/" count as the same page.
function normalize(path: string) {
  return path.length > 1 ? path.replace(/\/$/, '') : path;
}

// A nav link that marks itself as the current page, which the
// nav highlights.
export function NavLink({
  href,
  className,
  style,
  children,
}: {
  href: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const current = normalize(pathname) === normalize(href);

  return (
    <Link href={href} className={className} style={style} aria-current={current ? 'page' : undefined}>
      {children}
    </Link>
  );
}
