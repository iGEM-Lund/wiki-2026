import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import type { ComponentType } from 'react';
import { mdxComponents } from '@/components/content';

// fields.mdx() stores raw MDX source text — unlike the older fields.document,
// there's no pre-parsed document tree to walk, so rendering requires actually
// compiling the MDX via @mdx-js/mdx at request/build time.
export async function renderMdx(source: string): Promise<{ Content: ComponentType }> {
  const { default: MDXContent } = await evaluate(source, {
    ...runtime,
    baseUrl: import.meta.url,
  });

  return {
    Content: () => MDXContent({ components: mdxComponents }),
  };
}
