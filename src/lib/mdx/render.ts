import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import type { ComponentType } from 'react';
import { mdxComponents } from '@/components/content';
import { Citation } from '@/components/content/Citation';

// fields.mdx() stores raw MDX source text — unlike the older fields.document,
// there's no pre-parsed document tree to walk, so rendering requires actually
// compiling the MDX via @mdx-js/mdx at request/build time.
export async function renderMdx(
  source: string,
  referenceLookup: Record<string, { shortForm: string }> = {},
): Promise<{ Content: ComponentType }> {
  const { default: MDXContent } = await evaluate(source, {
    ...runtime,
    baseUrl: import.meta.url,
  });

  // Override Citation with the page's resolved reference lookup bound in —
  // the MDX-authored `reference` prop is just a slug, and only render.ts's
  // caller (the page) knows the resolved short forms for this render.
  const components = {
    ...mdxComponents,
    Citation: (props: { reference?: string | null }) => Citation({ ...props, lookup: referenceLookup }),
  };

  return {
    Content: () => MDXContent({ components }),
  };
}
