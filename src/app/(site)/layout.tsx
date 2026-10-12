import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import '@fontsource/fredoka/300.css';
import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/poppins/200.css';
import '@fontsource/poppins/200-italic.css';
import '@fontsource/poppins/300.css';
import '@fontsource/poppins/300-italic.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/600-italic.css';
import '@fontsource/opendyslexic/400.css';
import '@fontsource/opendyslexic/700.css';
import { getNav } from '@/lib/nav';
import { AntigoneLogoMark } from '@/components/antigone-logo';
import { NavIcon } from '@/components/nav-icon';
import { NavLink } from '@/components/nav-link';
import { MobileNav } from '@/components/mobile-nav';
import { AccessibilityMenu } from '@/components/accessibility-menu';
import { SiteSearch } from '@/components/site-search';
import { HeaderHeightSync } from '@/components/header-height-sync';
import { BackToTop } from '@/components/back-to-top';
import { ScrollString } from '@/components/scroll-string';
import { SiteFooter } from '@/components/site-footer';

// Where each top-level nav entry hangs on the string sagging across the
// bar (see .site__nav in globals.css): --sag-at is how far down the sag it
// is, 0 at either end and 1 in the middle (the same parabola the string is
// drawn as, taking the entries as evenly spread along it), and --tilt
// leans neighbouring tags opposite ways.
function hangStyle(index: number, count: number): CSSProperties {
  const x = (index + 0.5) / count;
  return {
    '--sag-at': (4 * x * (1 - x)).toFixed(3),
    '--tilt': index % 2 === 0 ? '-2deg' : '1.5deg',
  } as CSSProperties;
}

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
            {/* The string the tags hang from: a parabola spanning the svg
                box, its ends at the top corners and its lowest point at the
                bottom middle, so the box's height is the sag. */}
            <svg className="site__nav-string" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M 0,0 Q 50,200 100,0" />
            </svg>
            {nav.map((item, index) =>
              item.kind === 'link' ? (
                <NavLink
                  key={item.name}
                  href={item.target.href}
                  className="site__nav-item"
                  style={hangStyle(index, nav.length)}
                >
                  <NavIcon icon={item.icon} size={18} />
                  {item.name}
                </NavLink>
              ) : (
                <div key={item.name} className="site__nav-group" style={hangStyle(index, nav.length)}>
                  <span className="site__nav-item site__nav-group-label" tabIndex={0}>
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
        <div className="site__tools">
          <SiteSearch />
          <AccessibilityMenu />
        </div>
      </header>
      <main className="site__main">{children}</main>
      <SiteFooter />
      <BackToTop />
      <ScrollString />
    </div>
  );
}
