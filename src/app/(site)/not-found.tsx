import Link from 'next/link';
import { PageTitle } from '@/components/page-title';

export default function NotFound() {
  return (
    <div className="page-layout">
      <article>
        <PageTitle>Page not found</PageTitle>
        <p>
          We couldn&apos;t find that page. Try the navigation above, or go back to the{' '}
          <Link href="/">home page</Link>.
        </p>
      </article>
    </div>
  );
}
