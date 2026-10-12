import { toString } from 'hast-util-to-string';
import { SKIP, visitParents } from 'unist-util-visit-parents';
import type { Root, Element } from 'hast';

export type HeadingItem = { depth: number; text: string; id: string };
export type HeadingNode = HeadingItem & { children: HeadingNode[] };

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

// The page outline lists h2s and h3s only. h4s are small labels within a
// section (e.g. a "What they sponsored?" under every sponsor) and would
// crowd the side pane; they still get anchor ids, so direct links and
// search results reach them.
const OUTLINE_MAX_DEPTH = 3;

// @mdx-js/mdx passes mdxJsxFlowElement/mdxJsxTextElement nodes through
// remark-rehype untouched, so an <Expandable> or <CardTitle> in MDX source
// survives into this hast tree as one of those node types rather than being
// flattened; hast's own Element type doesn't cover them, hence the
// structural check. Headings inside an Expandable never show on the page as
// headings: its body may be collapsed. One inside a CardTitle is the card's
// name, so it is in the outline, linking to the card (see
// rehypeCardTitleAnchors).
export const NON_OUTLINE_COMPONENTS = new Set(['Expandable']);

type MdxJsxNode = {
  type: 'mdxJsxFlowElement' | 'mdxJsxTextElement';
  name?: string | null;
  attributes: { type: string; name?: string; value?: unknown }[];
};

function isMdxJsx(node: unknown, names: Set<string>): node is MdxJsxNode {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    ((node as { type: string }).type === 'mdxJsxFlowElement' ||
      (node as { type: string }).type === 'mdxJsxTextElement') &&
    names.has((node as { name?: string }).name ?? '')
  );
}

const isNonOutlineElement = (node: unknown) => isMdxJsx(node, NON_OUTLINE_COMPONENTS);
const CARD_TITLE = new Set(['CardTitle']);

// A unified/rehype plugin: the site has no h5 or h6 (Keystatic's editor only
// offers h2-h4), so any that still reach the page, hand-typed or from an old
// branch, become h4s. Runs first, so slugs and the outline see the h4.
export function rehypeClampHeadings() {
  return (tree: Root) => {
    visitParents(tree, 'element', (node: Element) => {
      if (node.tagName === 'h5' || node.tagName === 'h6') node.tagName = 'h4';
    });
  };
}

// A unified/rehype plugin: collects every heading's depth/text/id into the
// `headings` array (passed by the caller, populated by reference) as it
// walks the tree. Must run after rehype-slug in the pipeline so `id` is
// already set on each heading element.
export function rehypeCollectHeadings(headings: HeadingItem[]) {
  return (tree: Root) => {
    visitParents(tree, 'element', (node: Element, ancestors) => {
      if (!HEADING_TAGS.has(node.tagName)) return;
      // A heading inside an <Expandable> body still gets an anchor id (for
      // direct links) but shouldn't appear in the page outline; the
      // outline assumes every target is visible on scroll, and a heading
      // hidden inside a collapsed Expandable body is not reachable.
      if (ancestors.some(isNonOutlineElement)) return;
      const depth = Number(node.tagName[1]);
      if (depth > OUTLINE_MAX_DEPTH) return;
      const id = node.properties?.id;
      if (typeof id !== 'string' || id === '') return;
      // A stray empty `###` in the content would otherwise be a blank,
      // unclickable entry (a link to "#") in every outline.
      const text = toString(node).trim();
      if (text === '') return;
      headings.push({ depth, text, id });
    });
  };
}

// A unified/rehype plugin: a card's title is its own thing, not a heading
// (a writer's `###` inside CardTitle would otherwise render as a full h3,
// or an h2 with its ribbons, inside the card's header), so the heading is
// replaced by its text, and its id moves to the card (CardTitle's `anchor`
// prop, see Card.tsx), which is where the outline's link lands. Runs after
// rehypeCollectHeadings, which has to see the heading.
export function rehypeCardTitleAnchors() {
  return (tree: Root) => {
    visitParents(tree, 'element', (node: Element, ancestors) => {
      if (!HEADING_TAGS.has(node.tagName)) return;
      const titleIndex = ancestors.findLastIndex((a) => isMdxJsx(a, CARD_TITLE));
      if (titleIndex === -1) return;
      const title = ancestors[titleIndex] as unknown as MdxJsxNode;
      const id = node.properties?.id;
      if (typeof id === 'string' && id !== '' && !title.attributes.some((a) => a.name === 'anchor')) {
        title.attributes.push({ type: 'mdxJsxAttribute', name: 'anchor', value: id });
      }
      const parent = ancestors[ancestors.length - 1];
      const index = parent.children.indexOf(node);
      parent.children.splice(index, 1, ...node.children);
      return [SKIP, index];
    });
  };
}

// Nests a flat, depth-ordered heading list into a tree for rendering as a
// hierarchical outline (each heading becomes a child of the nearest
// preceding heading with a shallower depth).
export function buildHeadingTree(headings: HeadingItem[]): HeadingNode[] {
  const root: HeadingNode[] = [];
  const stack: HeadingNode[] = [];

  for (const heading of headings) {
    const node: HeadingNode = { ...heading, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].depth >= node.depth) {
      stack.pop();
    }
    (stack.length === 0 ? root : stack[stack.length - 1].children).push(node);
    stack.push(node);
  }

  return root;
}
