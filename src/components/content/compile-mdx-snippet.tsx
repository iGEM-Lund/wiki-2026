import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import type { ComponentType } from 'react';
import { embeddableComponents } from './embeddable-components';
import { Citation } from './Citation';

// Compiles a short piece of raw MDX source text (a WorldMap pin body, a
// SliceWheel slice body: fields.text, not fields.mdx; see the WorldMap
// schema comment in src/lib/keystatic/content-components.tsx for why) with
// the same @mdx-js/mdx primitive src/lib/mdx/render.ts uses for page
// content, so a popup can embed the same content components (Citation,
// FigureWithCaption, Formula, ...) a page can. A bad snippet never breaks the
// whole page: a compile error renders as an inline message instead of
// throwing, the same never-break-the-build rule src/lib/chemistry.ts follows
// for bad SMILES.
export async function compileMdxSnippet(
  body: string,
  referenceLookup: Record<string, { shortForm: string }>,
  errorClassName: string,
  errorLabel: string,
): Promise<ComponentType> {
  try {
    const { default: MDXContent } = await evaluate(body, {
      ...runtime,
      baseUrl: import.meta.url,
    });
    const components = {
      ...embeddableComponents,
      Citation: (props: { reference?: string | null }) => Citation({ ...props, lookup: referenceLookup }),
    };
    return () => MDXContent({ components });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return () => (
      <p className={errorClassName}>
        Couldn&apos;t render this {errorLabel}: {message}
      </p>
    );
  }
}
