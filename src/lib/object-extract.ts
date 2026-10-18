import { createProcessor } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { captionPlainText, type NumberedKind } from '@/lib/caption-text';
import { kindOf, stringAttr, type MdxJsxNode } from '@/lib/numbering';

export type ExtractedObject = {
  refId: string;
  kind: NumberedKind;
  number: number;
  caption: string;
  // A figure's image, for the hover preview of a Ref from another page.
  image?: string;
};

// Every numbered figure, table and 3D model with a reference code in a
// page's raw MDX, numbered the way src/lib/numbering.ts numbers them (each
// kind counting separately, in document order).
export function extractObjects(source: string): ExtractedObject[] {
  const tree = createProcessor({ remarkPlugins: [remarkGfm] }).parse(source);
  const counts: Record<NumberedKind, number> = { figure: 0, table: 0, model: 0 };
  const objects: ExtractedObject[] = [];
  visit(tree, (node) => {
    if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') return;
    const jsx = node as unknown as MdxJsxNode;
    const kind = kindOf(jsx);
    if (!kind) return;
    counts[kind] += 1;
    const refId = stringAttr(jsx, 'refId');
    if (!refId) return;
    objects.push({
      refId,
      kind,
      number: counts[kind],
      caption: captionPlainText(stringAttr(jsx, 'caption') ?? ''),
      image: kind === 'figure' ? stringAttr(jsx, 'src') : undefined,
    });
  });
  return objects;
}
