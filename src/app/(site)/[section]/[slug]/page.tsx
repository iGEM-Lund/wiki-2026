import { notFound } from 'next/navigation';
import { reader } from '@/lib/keystatic/reader';
import { renderMdx } from '@/lib/mdx/render';

export async function generateStaticParams() {
  const entries = await reader.collections.pages.all();
  return entries.map(({ slug, entry }) => ({ section: entry.section, slug }));
}

// No routes beyond the ones enumerated by generateStaticParams — required
// for `output: 'export'`, which cannot serve routes on demand.
export const dynamicParams = false;

export default async function ContentPage({
  params,
}: {
  params: Promise<{ section: string; slug: string }>;
}) {
  const { section, slug } = await params;
  const entry = await reader.collections.pages.read(slug);
  if (!entry || entry.section !== section) {
    notFound();
  }

  const source = await entry.content();
  const { Content } = await renderMdx(source);

  return (
    <article>
      <h1>{entry.title}</h1>
      <Content />
    </article>
  );
}
