import { toString } from 'hast-util-to-string';
import { visitParents } from 'unist-util-visit-parents';
import type { Root, Element } from 'hast';

export type HeadingItem = { depth: number; text: string; id: string };
export type HeadingNode = HeadingItem & { children: HeadingNode[] };

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

// @mdx-js/mdx passes mdxJsxFlowElement/mdxJsxTextElement nodes through
// remark-rehype untouched, so an <Expandable> in MDX source survives into
// this hast tree as one of those node types rather than being flattened;
// hast's own Element type doesn't cover them, hence the structural check.
function isExpandableElement(node: unknown): boolean {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    ((node as { type: string }).type === 'mdxJsxFlowElement' ||
      (node as { type: string }).type === 'mdxJsxTextElement') &&
    (node as { name?: string }).name === 'Expandable'
  );
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
      if (ancestors.some(isExpandableElement)) return;
      const id = node.properties?.id;
      if (typeof id !== 'string') return;
      headings.push({ depth: Number(node.tagName[1]), text: toString(node), id });
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
