import type { Pillar } from '@/components/content/Pillars';

// fields.mdx() stores raw MDX source, so, as with citations (see
// references.ts), the page's Pillars block is found in the text rather than a
// tree. Keystatic writes the array attribute as a JSON-compatible expression,
// `pillars={[{"title":"...","heading":""}]}`, so the bracketed part is
// matched by balancing brackets (skipping over strings, which may contain
// them) and parsed as JSON. Only the first block on a page is used: its
// headings are the ones replaced by the pillar row.
export function extractPillars(source: string): Pillar[] {
  const tag = /<Pillars\b[^>]*?\bpillars\s*=\s*\{\s*\[/.exec(source);
  if (!tag) return [];
  const start = tag.index + tag[0].length - 1;

  let depth = 0;
  let inString = false;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (inString) {
      if (char === '\\') i++;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === '[') {
      depth++;
    } else if (char === ']' && --depth === 0) {
      try {
        const parsed: unknown = JSON.parse(source.slice(start, i + 1));
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
          (item): item is Pillar =>
            typeof item === 'object' && item !== null && typeof (item as Pillar).title === 'string',
        );
      } catch {
        return [];
      }
    }
  }
  return [];
}
