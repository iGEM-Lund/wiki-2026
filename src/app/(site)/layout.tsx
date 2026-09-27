import type { ReactNode } from 'react';
import Link from 'next/link';
import '@fontsource/fredoka/300.css';
import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/poppins/200.css';
import '@fontsource/poppins/200-italic.css';
import '@fontsource/poppins/300.css';
import '@fontsource/poppins/300-italic.css';
import '@fontsource/opendyslexic/400.css';
import '@fontsource/opendyslexic/700.css';
import { getNav } from '@/lib/nav';
import { AntigoneLogoMark } from '@/components/antigone-logo';
import { NavIcon } from '@/components/nav-icon';
import { NavLink } from '@/components/nav-link';
import { MobileNav } from '@/components/mobile-nav';
import { AccessibilityMenu } from '@/components/accessibility-menu';
import { HeaderHeightSync } from '@/components/header-height-sync';
import { BackToTop } from '@/components/back-to-top';

// getNav() is called here, not in the root layout, so a nav-build failure
// can never break the /keystatic admin route tree. Fonts are imported here
// rather than globals.css for the same reason: they stay out of the
// Keystatic admin bundle.
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const nav = await getNav();

  return (
    <div className="site">
      <HeaderHeightSync />
      <header className="site__header">
        <Link href="/" className="site__brand">
          <AntigoneLogoMark className="site__brand-mark" />
          <span className="site__brand-name">AnTigone</span>
        </Link>
        <MobileNav>
          <nav className="site__nav" id="site-nav">
            {nav.map((item) =>
              item.kind === 'link' ? (
                <NavLink key={item.name} href={item.target.href} className="site__nav-item">
                  <NavIcon icon={item.icon} size={18} />
                  {item.name}
                </NavLink>
              ) : (
                <div key={item.name} className="site__nav-group">
                  <span className="site__nav-item site__nav-group-label">
                    <NavIcon icon={item.icon} size={18} />
                    {item.name}
                  </span>
                  <ul className="site__nav-group-links">
                    {item.items.map((entry) => (
                      <li key={entry.target.href}>
                        <NavLink href={entry.target.href}>{entry.label}</NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )}
          </nav>
        </MobileNav>
        <AccessibilityMenu />
      </header>
      <main className="site__main">{children}</main>
      <footer className="site__footer">AnTigone &middot; iGEM Lund 2026</footer>
      <BackToTop />
    </div>
  );
}
