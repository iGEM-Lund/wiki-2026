import { createProcessor } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { toString } from 'mdast-util-to-string';
import { visit } from 'unist-util-visit';

// Kept free of the `@/` alias and the reader so scripts/link-cards.mjs can
// load it directly.

export type ExtractedCard = {
  refId: string;
  title: string;
  subtitle?: string;
  image?: string;
  // The start of the card's first paragraph, for its hover preview.
  excerpt?: string;
};

type Attribute = { type: string; name?: string; value?: unknown };
type MdxJsxNode = {
  type: string;
  name?: string | null;
  attributes?: Attribute[];
  children?: MdxJsxNode[];
};

const EXCERPT_LENGTH = 140;

function stringAttr(node: MdxJsxNode, name: string): string | undefined {
  const value = node.attributes?.find((a) => a.type === 'mdxJsxAttribute' && a.name === name)?.value;
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function isJsx(node: MdxJsxNode): boolean {
  return node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement';
}

// The first paragraph of running text directly in the card (not in a
// nested component such as an Expandable or a CardTitle), cut at a word.
function excerptOf(card: MdxJsxNode): string | undefined {
  const paragraph = card.children?.find((child) => child.type === 'paragraph');
  if (!paragraph) return undefined;
  const text = toString(paragraph as never).replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  if (text.length <= EXCERPT_LENGTH) return text;
  return `${text.slice(0, EXCERPT_LENGTH).replace(/\s+\S*$/, '')}…`;
}

// Every <Card refId="…"> in a page's raw MDX. (fields.mdx() stores source
// text, not a tree, so it is parsed here, as src/lib/numbering.ts's input
// is.)
export function extractCards(source: string): ExtractedCard[] {
  const tree = createProcessor({ remarkPlugins: [remarkGfm] }).parse(source);
  const cards: ExtractedCard[] = [];
  visit(tree, (node) => {
    const jsx = node as unknown as MdxJsxNode;
    if (!isJsx(jsx) || jsx.name !== 'Card') return;
    const refId = stringAttr(jsx, 'refId');
    if (!refId) return;
    const titleNode = jsx.children?.find((child) => isJsx(child) && child.name === 'CardTitle');
    const title = titleNode ? toString(titleNode as never).replace(/\s+/g, ' ').trim() : '';
    // Without a title there is nothing to say a Reference is to (and Card
    // renders its anchor in the title's header).
    if (!title) return;
    cards.push({
      refId,
      title,
      subtitle: titleNode ? stringAttr(titleNode, 'subtitle') : undefined,
      image: titleNode ? stringAttr(titleNode, 'image') : undefined,
      excerpt: excerptOf(jsx),
    });
  });
  return cards;
}
