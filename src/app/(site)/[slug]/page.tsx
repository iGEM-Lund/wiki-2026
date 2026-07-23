import { notFound } from 'next/navigation';
import { reader } from '@/lib/keystatic/reader';
import { renderMdx } from '@/lib/mdx/render';
import { STANDARD_PAGES } from '@/lib/standard-pages';

// Serves both the `pages` collection (flat /[slug] URLs) and every required
// iGEM Standard URL Page (see STANDARD_PAGES) from one route. Standard page
// slugs take priority on collision, since their paths are mandated by
// iGEM's Judging Form and can't be writer-renamed.

export async function generateStaticParams() {
  const standardSlugs = new Set(STANDARD_PAGES.map((p) => p.slug));
  const pages = await reader.collections.pages.all();
  return [
    ...STANDARD_PAGES.map(({ slug }) => ({ slug })),
    ...pages.filter(({ slug }) => !standardSlugs.has(slug)).map(({ slug }) => ({ slug })),
  ];
}

// No routes beyond the ones enumerated by generateStaticParams — required
// for `output: 'export'`, which cannot serve routes on demand.
export const dynamicParams = false;

async function renderArticle(title: string, source: string) {
  const { Content } = await renderMdx(source);
  return (
    <article>
      <h1>{title}</h1>
      <Content />
    </article>
  );
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const standardDef = STANDARD_PAGES.find((p) => p.slug === slug);
  if (standardDef) {
    const entry = await reader.singletons[standardDef.key].read();
    if (!entry) notFound();
    return renderArticle(entry.title, await entry.content());
  }

  const entry = await reader.collections.pages.read(slug);
  if (!entry) notFound();
  return renderArticle(entry.title, await entry.content());
}
