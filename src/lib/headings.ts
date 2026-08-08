import { toString } from 'hast-util-to-string';
import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';

export type HeadingItem = { depth: number; text: string; id: string };
export type HeadingNode = HeadingItem & { children: HeadingNode[] };

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

// A unified/rehype plugin: collects every heading's depth/text/id into the
// `headings` array (passed by the caller, populated by reference) as it
// walks the tree. Must run after rehype-slug in the pipeline so `id` is
// already set on each heading element.
export function rehypeCollectHeadings(headings: HeadingItem[]) {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (!HEADING_TAGS.has(node.tagName)) return;
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
