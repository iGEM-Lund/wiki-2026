import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import type { ComponentType } from 'react';
import { mdxComponents } from '@/components/content';
import { Citation } from '@/components/content/Citation';
import { Table } from '@/components/content/Table';
import { WorldMap } from '@/components/content/WorldMap';
import { rehypeCollectHeadings, type HeadingItem } from '@/lib/headings';

// fields.mdx() stores raw MDX source text; unlike the older fields.document,
// there's no pre-parsed document tree to walk, so rendering requires actually
// compiling the MDX via @mdx-js/mdx at request/build time.
export async function renderMdx(
  source: string,
  referenceLookup: Record<string, { shortForm: string }> = {},
): Promise<{ Content: ComponentType; headings: HeadingItem[] }> {
  const headings: HeadingItem[] = [];
  const { default: MDXContent } = await evaluate(source, {
    ...runtime,
    baseUrl: import.meta.url,
    // Keystatic's editor writes GFM (pipe tables, strikethrough); plain MDX
    // doesn't parse those, so without this tables render as literal pipes.
    remarkPlugins: [remarkGfm],
    // rehype-slug gives every heading a stable `id` (so the outline's links
    // and the References section's anchors both resolve); the collector
    // runs after it to read those ids back out for the page outline.
    rehypePlugins: [rehypeSlug, [rehypeCollectHeadings, headings]],
  });

  // Override Citation with the page's resolved reference lookup bound in;
  // the MDX-authored `reference` prop is just a slug, and only render.ts's
  // caller (the page) knows the resolved short forms for this render.
  const components = {
    ...mdxComponents,
    table: Table,
    Citation: (props: { reference?: string | null }) => Citation({ ...props, lookup: referenceLookup }),
    // Pin popup bodies are raw MDX that may embed <Citation>; forward the
    // same resolved lookup so those resolve too, not just top-level ones.
    WorldMap: (props: Parameters<typeof WorldMap>[0]) => WorldMap({ ...props, referenceLookup }),
  };

  return {
    Content: () => MDXContent({ components }),
    headings,
  };
}
