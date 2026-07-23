import { notFound } from 'next/navigation';
import { reader } from '@/lib/keystatic/reader';
import { renderMdx } from '@/lib/mdx/render';

// Standard URL Page required by iGEM's Judging Form — this path is fixed,
// see src/lib/standard-pages.ts.
export default async function ProjectDescriptionPage() {
  const entry = await reader.singletons.projectDescription.read();
  if (!entry) {
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
