import type { ReactNode } from 'react';
import Link from 'next/link';
import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/poppins/200.css';
import '@fontsource/poppins/200-italic.css';
import '@fontsource/poppins/300.css';
import '@fontsource/poppins/300-italic.css';
import { getNav } from '@/lib/nav';
import { NavIcon } from '@/components/nav-icon';
import { NavDropdownLink } from '@/components/nav-dropdown-link';
import { ThemeToggle } from '@/components/theme-toggle';

// getNav() is called here, not in the root layout, so a nav-build failure
// can never break the /keystatic admin route tree. Fonts are imported here
// rather than globals.css for the same reason: they stay out of the
// Keystatic admin bundle.
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const nav = await getNav();

  return (
    <div className="site">
      <header className="site__header">
        <Link href="/" className="site__brand">
          <span className="site__brand-name">AnTigone</span>
          <span className="site__brand-team">iGEM Lund 2026</span>
        </Link>
        <nav className="site__nav">
          {nav.map((item) =>
            item.kind === 'link' ? (
              <Link key={item.name} href={item.target.href} className="site__nav-item">
                <NavIcon icon={item.icon} size={18} />
                {item.name}
              </Link>
            ) : (
              <div key={item.name} className="site__nav-dropdown">
                <span className="site__nav-item site__nav-item--trigger">
                  <NavIcon icon={item.icon} size={18} />
                  {item.name}
                </span>
                <div className="site__nav-dropdown-panel">
                  <ul className="site__nav-dropdown-menu">
                    {item.items.map((entry) => (
                      <li key={entry.target.href}>
                        <NavDropdownLink href={entry.target.href}>{entry.label}</NavDropdownLink>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ),
          )}
        </nav>
        <ThemeToggle />
      </header>
      <main className="site__main">{children}</main>
      <footer className="site__footer">AnTigone &middot; iGEM Lund 2026</footer>
    </div>
  );
}
