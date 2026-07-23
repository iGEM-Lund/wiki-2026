import type { ReactNode } from 'react';
import Link from 'next/link';
import { getNav } from '@/lib/nav';
import { NavIcon } from '@/components/nav-icon';

// getNav() is called here, not in the root layout, so a nav-build failure
// can never break the /keystatic admin route tree.
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const nav = await getNav();

  return (
    <div className="site">
      <header className="site__header">
        <Link href="/" className="site__brand">
          iGEM Lund 2026
        </Link>
        <nav className="site__nav">
          {nav.map((item) =>
            item.kind === 'link' ? (
              <Link key={item.name} href={item.target.href} className="site__nav-item">
                <NavIcon icon={item.icon} size={18} />
                {item.name}
              </Link>
            ) : (
              <details key={item.name} className="site__nav-dropdown">
                <summary className="site__nav-item">
                  <NavIcon icon={item.icon} size={18} />
                  {item.name}
                </summary>
                <ul className="site__nav-dropdown-menu">
                  {item.items.map((entry) => (
                    <li key={entry.target.href}>
                      <Link href={entry.target.href}>{entry.label}</Link>
                    </li>
                  ))}
                </ul>
              </details>
            ),
          )}
        </nav>
      </header>
      <main className="site__main">{children}</main>
      <footer className="site__footer">iGEM Lund 2026</footer>
    </div>
  );
}
