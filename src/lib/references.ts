import { reader } from '@/lib/keystatic/reader';

export type CitedReference = { slug: string; shortForm: string; longForm: string };

// fields.mdx() stores raw MDX source text, not a parsed AST, so cited
// references are found with a regex rather than a tree walk. Keystatic's
// serialization of a self-closing inline component with a relationship value
// (a plain slug string) is deterministic, so this is reliable. Match the
// whole tag first, then pull the attribute out of it, so it isn't broken by
// future attribute additions/reordering.
const CITATION_TAG = /<Citation\b[^>]*\/>/g;
const REFERENCE_ATTR = /reference\s*=\s*"([^"]*)"/;

function extractCitedSlugs(source: string): string[] {
  const slugs = new Set<string>();
  for (const [tag] of source.matchAll(CITATION_TAG)) {
    const match = REFERENCE_ATTR.exec(tag);
    if (match?.[1]) slugs.add(match[1]);
  }
  return [...slugs];
}

export async function resolveCitedReferences(source: string): Promise<CitedReference[]> {
  const slugs = extractCitedSlugs(source);
  const entries = await Promise.all(
    slugs.map(async (slug) => {
      const entry = await reader.collections.references.read(slug);
      return entry ? { slug, shortForm: entry.shortForm, longForm: entry.longForm } : null;
    }),
  );
  return entries
    .filter((e): e is CitedReference => e !== null)
    .sort((a, b) => a.shortForm.localeCompare(b.shortForm));
}

export function toReferenceLookup(refs: CitedReference[]): Record<string, { shortForm: string }> {
  return Object.fromEntries(refs.map((r) => [r.slug, { shortForm: r.shortForm }]));
}
