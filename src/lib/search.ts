import type { SearchPage } from '@/lib/search-index';

// Client-side matching over the build-time index (src/lib/search-index.ts).
// The whole site is a few hundred sections of text, small enough to scan in
// full on every keystroke, so there's no tokenizer or inverted index: just
// accent- and case-insensitive substring matching with a simple ranking.

export type SearchRecord = {
  path: string;
  sectionId: string | null;
  pageTitle: string;
  heading: string | null;
  text: string;
  folded: { pageTitle: string; heading: string; text: string };
};

export type Segment = { text: string; mark: boolean };

// Where a result leads: the first match of `term` in the section's text,
// which reveal-search-hit.ts finds again in the rendered page.
export type SearchTarget = { path: string; sectionId: string | null; term: string };

export type SearchResult = {
  // The section's anchor: for opening in a new tab, where the exact-match
  // jump can't follow.
  href: string;
  target: SearchTarget;
  pageTitle: Segment[];
  heading: Segment[] | null;
  snippet: Segment[];
};

const MAX_RESULTS = 25;
// Past this many hits on one page its weaker sections stop showing, so a
// long page that mentions the query everywhere can't crowd out the rest.
const MAX_PER_PAGE = 4;
const SNIPPET_LENGTH = 180;
const SNIPPET_LEAD = 50;

// Lowercases and strips diacritics without changing the string's length,
// so an index found in the folded text is valid in the original too and
// highlights land on the right characters.
export function fold(text: string): string {
  let out = '';
  for (const ch of text) {
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    out += base.length === ch.length ? base : ch;
  }
  return out;
}

export function toRecords(pages: SearchPage[]): SearchRecord[] {
  return pages.flatMap((page) =>
    page.sections.map((section) => ({
      path: `/${page.slug}`,
      sectionId: section.id,
      pageTitle: page.title,
      heading: section.heading,
      text: section.text,
      folded: { pageTitle: fold(page.title), heading: fold(section.heading ?? ''), text: fold(section.text) },
    })),
  );
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + needle.length)) count++;
  return count;
}

function score(record: SearchRecord, terms: string[], phrase: string): number {
  const { pageTitle, heading, text } = record.folded;
  let total = 0;
  for (const term of terms) {
    const inTitle = pageTitle.includes(term);
    const inHeading = heading.includes(term);
    const hits = countOccurrences(text, term);
    // Every term has to appear somewhere in the section or its page title.
    if (!inTitle && !inHeading && hits === 0) return 0;
    total += (inTitle ? 8 : 0) + (inHeading ? 6 : 0) + Math.min(hits, 5);
  }
  if (terms.length > 1 && (heading.includes(phrase) || text.includes(phrase))) total += 6;
  return total;
}

// Splits `text` into plain and highlighted runs for every term occurrence
// in the [start, end) window.
function highlight(text: string, terms: string[], start = 0, end = text.length): Segment[] {
  const folded = fold(text);
  const ranges: [number, number][] = [];
  for (const term of terms) {
    for (let i = folded.indexOf(term, start); i !== -1 && i < end; i = folded.indexOf(term, i + term.length)) {
      ranges.push([i, Math.min(i + term.length, end)]);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);

  const segments: Segment[] = [];
  let cursor = start;
  for (const [from, to] of ranges) {
    if (to <= cursor) continue;
    if (from > cursor) segments.push({ text: text.slice(cursor, from), mark: false });
    segments.push({ text: text.slice(Math.max(from, cursor), to), mark: true });
    cursor = to;
  }
  if (cursor < end) segments.push({ text: text.slice(cursor, end), mark: false });
  return segments;
}

// The earliest match of any term in the section text, which is both where
// the snippet is cut from and where picking the result jumps to.
function firstHit(record: SearchRecord, terms: string[]): { term: string; at: number } | null {
  let hit: { term: string; at: number } | null = null;
  for (const term of terms) {
    const at = record.folded.text.indexOf(term);
    if (at !== -1 && (!hit || at < hit.at)) hit = { term, at };
  }
  return hit;
}

// A window of the section text around its first hit, cut at word
// boundaries, with ellipses where it was cut.
function snippet(record: SearchRecord, terms: string[], first: number): Segment[] {
  const { text } = record;

  let start = Math.max(0, first - SNIPPET_LEAD);
  if (start > 0) {
    const space = text.indexOf(' ', start);
    start = space !== -1 && space < first ? space + 1 : start;
  }
  let end = Math.min(text.length, start + SNIPPET_LENGTH);
  if (end < text.length) {
    const space = text.lastIndexOf(' ', end);
    end = space > first ? space : end;
  }

  const segments = highlight(text, terms, start, end);
  if (start > 0) segments.unshift({ text: '… ', mark: false });
  if (end < text.length) segments.push({ text: ' …', mark: false });
  return segments;
}

export function search(records: SearchRecord[], query: string): SearchResult[] {
  const phrase = fold(query).trim().replace(/\s+/g, ' ');
  const terms = [...new Set(phrase.split(' ').filter(Boolean))];
  if (terms.length === 0) return [];

  const ranked = records
    .map((record) => ({ record, score: score(record, terms, phrase) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const perPage = new Map<string, number>();
  const results: SearchResult[] = [];
  for (const { record } of ranked) {
    const seen = perPage.get(record.pageTitle) ?? 0;
    if (seen >= MAX_PER_PAGE) continue;
    perPage.set(record.pageTitle, seen + 1);
    // No hit in the text means only the title or heading matched; the jump
    // then just goes to the section, whose heading shows the match.
    const hit = firstHit(record, terms);
    results.push({
      href: record.sectionId ? `${record.path}#${record.sectionId}` : record.path,
      target: { path: record.path, sectionId: record.sectionId, term: hit?.term ?? '' },
      pageTitle: highlight(record.pageTitle, terms),
      heading: record.heading ? highlight(record.heading, terms) : null,
      snippet: snippet(record, terms, hit?.at ?? 0),
    });
    if (results.length === MAX_RESULTS) break;
  }
  return results;
}
