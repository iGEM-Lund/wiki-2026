import { compile } from '@mdx-js/mdx';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import type { Root } from 'hast';
import { reader } from '@/lib/keystatic/reader';
import { NON_OUTLINE_COMPONENTS, rehypeClampHeadings } from '@/lib/headings';
import { captionPlainText } from '@/lib/caption-text';
import { REFERENCES_ID, extractCitedSlugs, narrativeForm } from '@/lib/references';

// One stretch of a page between two outline headings. `id` is the heading's
// anchor (null for the text before a page's first heading), so a result can
// link straight to the section it matched in.
export type SearchSection = { id: string | null; heading: string | null; text: string };
export type SearchPage = { slug: string; title: string; sections: SearchSection[] };

// JSX props whose values are prose a reader would see on the page and
// expect to find. Everything else (image/src URLs, LaTeX, SMILES, citation
// slugs) is left out so it can't produce nonsense matches.
const TEXT_PROPS = new Set(['title', 'subtitle', 'caption', 'quote', 'quotee', 'text', 'label', 'highlightLabel']);

// The same, for the repeating items inside array props (a World Map's pins,
// a Slice Wheel's slices, a Quiz's questions, ...), which are JS
// expressions rather than strings. `body` holds raw MDX.
const ITEM_TEXT_KEYS = new Set([
  'title', 'heading', 'body', 'text', 'caption', 'question', 'explanation', 'alt', 'label',
]);

// Short forms of the bibliography, by slug, so an in-text <Citation> reads
// as the label the page shows. Set per build by buildSearchIndex.
let shortForms: Record<string, string> = {};

// Raw MDX in a pin or slice body: drop the tags and Markdown markers,
// keeping the words (and a <Citation>'s short form).
function mdxSourceText(source: string): string {
  return source
    .replace(/<Citation\b[^>]*reference\s*=\s*"([^"]*)"[^>]*\/>/g, (_, slug: string) => shortForms[slug] ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_`#>]+/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
}

type EstreeNode = { type: string; key?: { name?: string; value?: unknown }; value?: unknown; [k: string]: unknown };

function estreeStrings(node: unknown, out: string[]) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) estreeStrings(item, out);
    return;
  }
  const n = node as EstreeNode;
  if (n.type === 'Property') {
    const key = n.key?.name ?? (typeof n.key?.value === 'string' ? n.key.value : '');
    const value = n.value as EstreeNode | undefined;
    if (value?.type === 'Literal' && typeof value.value === 'string' && ITEM_TEXT_KEYS.has(key)) {
      out.push(key === 'body' ? mdxSourceText(value.value) : value.value);
      return;
    }
  }
  for (const child of Object.values(n)) if (child && typeof child === 'object') estreeStrings(child, out);
}

// Tags (and JSX flow elements) that start a new line of text, so words on
// either side of them don't run together in the extracted text.
const BLOCK_TAGS = new Set([
  'p', 'li', 'ul', 'ol', 'blockquote', 'div', 'br', 'hr',
  'table', 'tr', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
]);
const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

type AnyNode = {
  type: string;
  tagName?: string;
  name?: string | null;
  value?: string;
  properties?: { id?: unknown };
  attributes?: { type: string; name?: string; value?: unknown }[];
  children?: AnyNode[];
};

function propText(node: AnyNode): string[] {
  return (node.attributes ?? []).flatMap((attr) => {
    if (attr.type !== 'mdxJsxAttribute' || !attr.name) return [];
    if (TEXT_PROPS.has(attr.name) && typeof attr.value === 'string') {
      return [attr.name === 'caption' ? captionPlainText(attr.value) : attr.value];
    }
    const estree = (attr.value as { data?: { estree?: unknown } } | null)?.data?.estree;
    if (estree && typeof attr.value === 'object') {
      const out: string[] = [];
      estreeStrings(estree, out);
      return out;
    }
    return [];
  });
}

function citationText(node: AnyNode): string | null {
  if (node.name !== 'Citation') return null;
  const get = (name: string) => node.attributes?.find((a) => a.name === name)?.value;
  const form = shortForms[String(get('reference') ?? '')];
  if (!form) return '';
  return get('narrative') !== undefined && get('narrative') !== null ? narrativeForm(form) : form;
}

function plainText(node: AnyNode): string {
  if (node.type === 'text') return node.value ?? '';
  const cited = citationText(node);
  if (cited !== null) return cited;
  const parts = propText(node);
  for (const child of node.children ?? []) parts.push(plainText(child));
  const block = node.type === 'mdxJsxFlowElement' || (node.tagName !== undefined && BLOCK_TAGS.has(node.tagName));
  return block ? ` ${parts.join(' ')} ` : parts.join('');
}

// Splits a page's hast tree into sections at its outline headings. Matches
// the outline's rule (see rehypeCollectHeadings in src/lib/headings.ts):
// headings inside an <Expandable> may be hidden in a collapsed body, so
// they don't start a section; their text stays in the enclosing one. One
// inside a <CardTitle> does, under the id the card itself carries.
function splitSections(tree: Root): SearchSection[] {
  const sections: SearchSection[] = [];
  let current: SearchSection = { id: null, heading: null, text: '' };

  function walk(node: AnyNode) {
    if (node.tagName !== undefined && HEADING_TAGS.has(node.tagName)) {
      const id = node.properties?.id;
      if (typeof id === 'string') {
        sections.push(current);
        current = { id, heading: collapse(plainText(node)), text: '' };
        return;
      }
    }
    const isNonOutline =
      (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
      NON_OUTLINE_COMPONENTS.has(node.name ?? '');
    if (isNonOutline || !node.children) {
      current.text += ` ${plainText(node)} `;
      return;
    }
    const cited = citationText(node);
    if (cited !== null) {
      current.text += ` ${cited} `;
      return;
    }
    // A component's own text props (a <Quote>'s quote, a figure's caption)
    // come before its children, as they do on the page.
    current.text += ` ${propText(node).join(' ')} `;
    for (const child of node.children) walk(child);
  }

  walk(tree as AnyNode);
  sections.push(current);
  return sections
    .map((section) => ({ ...section, text: collapse(section.text) }))
    .filter((section) => section.heading || section.text);
}

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

// Captures the final hast tree out of the MDX pipeline (the compile's own
// output, JavaScript, isn't needed). Runs after rehype-slug, so section
// ids are exactly the anchors the rendered page has.
function rehypeCapture(sink: { tree?: Root }) {
  return (tree: Root) => {
    sink.tree = structuredClone(tree);
  };
}

// Built at build time and served as a static JSON file (see
// src/app/search-index.json/route.ts), so search needs no backend.
// The pipeline mirrors renderMdx in src/lib/mdx/render.ts; keep the
// remark/rehype plugins before rehypeCapture in step with it, or section
// links stop matching the page's heading ids.
export async function buildSearchIndex(): Promise<SearchPage[]> {
  const entries = await reader.collections.pages.all();
  const bibliography = await reader.collections.bibliography.all();
  shortForms = Object.fromEntries(bibliography.map(({ slug, entry }) => [slug, entry.shortForm]));
  const longForms = Object.fromEntries(bibliography.map(({ slug, entry }) => [slug, entry.longForm]));
  const pages = await Promise.all(
    entries.map(async ({ slug, entry }) => {
      const sink: { tree?: Root } = {};
      const source = await entry.content();
      await compile(source, {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypeClampHeadings, rehypeSlug, [rehypeCapture, sink]],
      });
      const sections = sink.tree ? splitSections(sink.tree) : [];
      // The page's References list, as the page renders it (see [slug]/page.tsx).
      const cited = extractCitedSlugs(source)
        .filter((ref) => longForms[ref])
        .map((ref) => longForms[ref])
        .sort((a, b) => a.localeCompare(b));
      if (cited.length > 0) {
        sections.push({ id: REFERENCES_ID, heading: 'References', text: collapse(cited.join(' ')) });
      }
      return { slug, title: entry.title, sections };
    }),
  );
  return pages.sort((a, b) => a.title.localeCompare(b.title));
}
