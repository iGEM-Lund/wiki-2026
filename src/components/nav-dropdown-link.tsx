'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

// The dropdown opens via :focus-within. Next.js Link navigations don't reset
// focus, so without blurring on click the menu stays open ("sticks") on the
// destination page even though the pointer already left the trigger.
export function NavDropdownLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} onClick={(event) => event.currentTarget.blur()}>
      {children}
    </Link>
  );
}
