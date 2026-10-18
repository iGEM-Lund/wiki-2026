import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { reader } from '@/lib/keystatic/reader';
import { renderMdx } from '@/lib/mdx/render';
import { resolveCitedReferences, toReferenceLookup } from '@/lib/references';
import { buildHeadingTree } from '@/lib/headings';
import { TableOfContents } from '@/components/table-of-contents';
import { SectionHeading } from '@/components/section-heading';
import { PageTitle } from '@/components/page-title';
import { ScrollReveal } from '@/components/scroll-reveal';
import { NextPageLink } from '@/components/next-page-link';
import { LinkifiedText } from '@/components/linkified-text';
import { getNextPage } from '@/lib/nav';
import { pageDescription } from '@/lib/page-description';

// Every page on the site, including the mandatory iGEM Standard URL Pages,
// is a `pages` collection entry, so one route serves all of them.

export async function generateStaticParams() {
  const pages = await reader.collections.pages.all();
  return pages.map(({ slug }) => ({ slug }));
}

// No routes beyond the ones enumerated by generateStaticParams; required
// for `output: 'export'`, which cannot serve routes on demand.
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = await reader.collections.pages.read(slug);
  if (!entry) return {};
  // Left out (not undefined) when the page has no usable paragraph, so the
  // site-wide description from the root layout applies instead.
  const description = pageDescription(await entry.content());
  return { title: entry.title.trim(), ...(description ? { description } : {}) };
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const entry = await reader.collections.pages.read(slug);
  if (!entry) notFound();

  const source = await entry.content();
  const citedReferences = await resolveCitedReferences(source);
  const { Content, headings } = await renderMdx(source, toReferenceLookup(citedReferences), slug);
  const outline = buildHeadingTree(headings);
  const nextPage = await getNextPage(slug);

  return (
    <div className="page-layout">
      <article>
        <PageTitle>{entry.title}</PageTitle>
        <Content />
        {nextPage ? <NextPageLink page={nextPage} /> : null}
        {citedReferences.length > 0 ? (
          <section className="references">
            <SectionHeading>References</SectionHeading>
            <ol>
              {citedReferences.map((ref) => (
                <li key={ref.slug} id={`ref-${ref.slug}`}>
                  <span className="references__text">
                    <LinkifiedText text={ref.longForm} />
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </article>
      <TableOfContents headings={outline} />
      {/* Here rather than in the layout, which stays mounted across
          client-side navigations: it has to pick up each page's content. */}
      <ScrollReveal />
    </div>
  );
}
