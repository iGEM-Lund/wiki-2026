import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { createElement, type ComponentPropsWithoutRef, type ComponentType } from 'react';
import { mdxComponents } from '@/components/content';
import { Citation } from '@/components/content/Citation';
import { Ref } from '@/components/content/Ref';
import { Table } from '@/components/content/Table';
import { ContentLink } from '@/components/content/ContentLink';
import { WorldMap } from '@/components/content/WorldMap';
import { SliceWheel } from '@/components/content/SliceWheel';
import { PillarsSectionHeading, pillarTarget } from '@/components/content/Pillars';
import { SectionHeading } from '@/components/section-heading';
import { extractPillars } from '@/lib/pillars';
import {
  rehypeCardTitleAnchors,
  rehypeClampHeadings,
  rehypeCollectHeadings,
  type HeadingItem,
} from '@/lib/headings';
import type { ReferenceLookup } from '@/lib/references';
import { remarkNumberObjects } from '@/lib/numbering';
import { getCardLookup } from '@/lib/cards';

// fields.mdx() stores raw MDX source text; unlike the older fields.document,
// there's no pre-parsed document tree to walk, so rendering requires actually
// compiling the MDX via @mdx-js/mdx at request/build time.
export async function renderMdx(
  source: string,
  referenceLookup: ReferenceLookup = {},
  slug?: string,
): Promise<{ Content: ComponentType; headings: HeadingItem[] }> {
  const headings: HeadingItem[] = [];
  const { default: MDXContent } = await evaluate(source, {
    ...runtime,
    baseUrl: import.meta.url,
    // Keystatic's editor writes GFM (pipe tables, strikethrough); plain MDX
    // doesn't parse those, so without this tables render as literal pipes.
    // remarkNumberObjects then numbers figures, tables and 3D models and
    // resolves each <Ref> to its object (see src/lib/numbering.ts).
    remarkPlugins: [remarkGfm, remarkNumberObjects],
    // h5/h6 become h4 first (the site stops at h4); rehype-slug then gives
    // every heading a stable `id` (so the outline's links and the
    // References section's anchors both resolve); the collector runs after
    // it to read those ids back out for the page outline.
    rehypePlugins: [rehypeClampHeadings, rehypeSlug, [rehypeCollectHeadings, headings], rehypeCardTitleAnchors],
  });

  // Override Citation with the page's resolved reference lookup bound in;
  // the MDX-authored `reference` prop is just a slug, and only render.ts's
  // caller (the page) knows the resolved short forms for this render.
  // A page's Pillars block turns each pillar's section heading into the same
  // pillar row, that pillar enlarged (see PillarsSectionHeading). Matched by
  // the heading's id, which is exactly what the pillar links to.
  const pillars = extractPillars(source);
  const pillarIds = pillars.map(pillarTarget);
  const Heading2 = (props: ComponentPropsWithoutRef<'h2'>) => {
    const index = props.id ? pillarIds.indexOf(props.id) : -1;
    return index === -1
      ? createElement(SectionHeading, props)
      : createElement(PillarsSectionHeading, {
          id: props.id,
          pillars,
          activeIndex: index,
          children: props.children,
        });
  };

  const cards = await getCardLookup();
  const components = {
    ...mdxComponents,
    // A Ref to a card needs every page's cards, and which page this is.
    Ref: (props: Parameters<typeof Ref>[0]) => Ref({ ...props, cards, slug }),
    table: Table,
    a: ContentLink,
    h2: Heading2,
    Citation: (props: { reference?: string | null }) => Citation({ ...props, lookup: referenceLookup }),
    // Pin popup bodies are raw MDX that may embed <Citation>; forward the
    // same resolved lookup so those resolve too, not just top-level ones.
    WorldMap: (props: Parameters<typeof WorldMap>[0]) => WorldMap({ ...props, referenceLookup }),
    SliceWheel: (props: Parameters<typeof SliceWheel>[0]) => SliceWheel({ ...props, referenceLookup }),
  };

  return {
    Content: () => MDXContent({ components }),
    headings,
  };
}
