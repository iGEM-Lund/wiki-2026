import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { NextPage } from '@/lib/nav';

// The link at the end of a page on to the next one in the nav's order.
export function NextPageLink({ page }: { page: NextPage }) {
  return (
    <nav className="next-page" aria-label="Next page">
      <Link href={page.href} className="next-page__link">
        <span className="next-page__kicker">Next in {page.section}</span>
        <span className="next-page__title">
          {page.label}
          <ArrowRight className="next-page__icon" size={20} aria-hidden="true" />
        </span>
      </Link>
    </nav>
  );
}
