import { notFound } from 'next/navigation';
import { reader } from '@/lib/keystatic/reader';
import { renderMdx } from '@/lib/mdx/render';

// Every page on the site — including the mandatory iGEM Standard URL Pages —
// is a `pages` collection entry, so one route serves all of them.

export async function generateStaticParams() {
  const pages = await reader.collections.pages.all();
  return pages.map(({ slug }) => ({ slug }));
}

// No routes beyond the ones enumerated by generateStaticParams — required
// for `output: 'export'`, which cannot serve routes on demand.
export const dynamicParams = false;

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const entry = await reader.collections.pages.read(slug);
  if (!entry) notFound();

  const source = await entry.content();
  const { Content } = await renderMdx(source);

  return (
    <article>
      <h1>{entry.title}</h1>
      <Content />
    </article>
  );
}
