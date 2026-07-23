import type { ReactNode } from 'react';
import Link from 'next/link';
import { getNav } from '@/lib/nav';

// getNav() is called here, not in the root layout, so a nav-build failure
// can never break the /keystatic admin route tree.
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const nav = await getNav();

  return (
    <div className="site">
      <header className="site__header">
        <Link href="/">iGEM Lund 2026</Link>
        <nav>
          {nav.map((section) => (
            <div key={section.section} className="site__nav-section">
              <div className="site__nav-label">{section.label}</div>
              <ul>
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </header>
      <main className="site__main">{children}</main>
      <footer className="site__footer">iGEM Lund 2026</footer>
    </div>
  );
}
