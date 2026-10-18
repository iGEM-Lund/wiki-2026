import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';
import { captionPlainText, KIND_LABELS, type NumberedKind } from '@/lib/caption-text';

// Automatic numbering of a page's figures, tables and 3D models, and the
// cross-references to them.
//
// Each numbered object carries a random reference code (its `refId`, see
// src/lib/keystatic/ref-id-field.tsx), and a <Ref target="…" /> in the text
// names that code rather than a number. Numbers are only worked out here,
// at compile time, in document order: every TableWithCaption is a Table,
// every MoleculeViewer a Model, and a FigureWithCaption a Figure only when
// its `numbered` box is ticked, so an unnumbered figure doesn't advance the
// count. Each kind counts on its own.
//
// The results are written straight onto the MDX nodes as extra string
// attributes (`number` on the object; `label`, `caption`, `kind` and
// `direction` on each Ref), so the components render them as plain props
// and need no per-page lookup bound in (unlike Citation).

type Attribute = { type: string; name?: string; value?: unknown };
export type MdxJsxNode = {
  type: 'mdxJsxFlowElement' | 'mdxJsxTextElement';
  name: string | null;
  attributes: Attribute[];
};

function attr(node: MdxJsxNode, name: string): Attribute | undefined {
  return node.attributes.find((a) => a.type === 'mdxJsxAttribute' && a.name === name);
}

export function stringAttr(node: MdxJsxNode, name: string): string | undefined {
  const value = attr(node, name)?.value;
  return typeof value === 'string' ? value : undefined;
}

// Keystatic writes a ticked checkbox as `numbered={true}`; a bare
// `numbered` (value null) means true in JSX too.
function isTrue(node: MdxJsxNode, name: string): boolean {
  const a = attr(node, name);
  if (!a) return false;
  if (a.value === null || a.value === undefined) return true;
  const value = a.value as { type?: string; value?: string };
  return value.type === 'mdxJsxAttributeValueExpression' && value.value?.trim() === 'true';
}

function setAttr(node: MdxJsxNode, name: string, value: string) {
  node.attributes = node.attributes.filter((a) => a.name !== name);
  node.attributes.push({ type: 'mdxJsxAttribute', name, value });
}

export function kindOf(node: MdxJsxNode): NumberedKind | null {
  switch (node.name) {
    case 'TableWithCaption':
      return 'table';
    case 'MoleculeViewer':
      return 'model';
    case 'FigureWithCaption':
      return isTrue(node, 'numbered') ? 'figure' : null;
    default:
      return null;
  }
}

type Target = { kind: NumberedKind; number: number; caption: string; order: number };

export function remarkNumberObjects() {
  return (tree: Root) => {
    const targets = new Map<string, Target>();
    const refs: { node: MdxJsxNode; order: number }[] = [];
    // Cards on the page by code: only where they sit, for a Ref to one to
    // point up or down. The rest of a card reference is resolved by
    // src/lib/cards.ts, since a card may be on any page.
    const cardOrders = new Map<string, number>();
    const counts: Record<NumberedKind, number> = { figure: 0, table: 0, model: 0 };
    let order = 0;

    visit(tree, (node) => {
      if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') return;
      const jsx = node as unknown as MdxJsxNode;
      order += 1;
      if (jsx.name === 'Ref') {
        refs.push({ node: jsx, order });
        return;
      }
      if (jsx.name === 'Card') {
        const cardId = stringAttr(jsx, 'refId');
        if (cardId && !cardOrders.has(cardId)) cardOrders.set(cardId, order);
        return;
      }
      const kind = kindOf(jsx);
      if (!kind) return;
      counts[kind] += 1;
      setAttr(jsx, 'number', String(counts[kind]));
      const refId = stringAttr(jsx, 'refId');
      if (!refId) return;
      if (targets.has(refId)) {
        console.warn(
          `[numbering] Reference code "${refId}" is used by more than one object on a page; references go to the first. Press "New code" on the copy in the editor.`,
        );
        return;
      }
      targets.set(refId, {
        kind,
        number: counts[kind],
        caption: captionPlainText(stringAttr(jsx, 'caption') ?? ''),
        order,
      });
    });

    for (const { node, order: refOrder } of refs) {
      const code = stringAttr(node, 'target')?.trim() ?? '';
      const target = targets.get(code);
      if (!target) {
        const cardOrder = cardOrders.get(code);
        if (cardOrder !== undefined) {
          setAttr(node, 'direction', cardOrder < refOrder ? 'up' : 'down');
          continue;
        }
        // A card or numbered object on another page: resolved at render,
        // which also warns when it matches nothing anywhere (see Ref.tsx).
        continue;
      }
      setAttr(node, 'kind', target.kind);
      setAttr(node, 'label', `${KIND_LABELS[target.kind]} ${target.number}`);
      setAttr(node, 'caption', target.caption);
      setAttr(node, 'direction', target.order < refOrder ? 'up' : 'down');
    }
  };
}
