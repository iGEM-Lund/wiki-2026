import { fold, type SearchTarget } from '@/lib/search';

// Finds a search result's exact match on the rendered page, opens any
// collapsed <Expandable> around it, scrolls it into view and highlights it.
// The match is the first one of `term` in the target's section, the same
// one the result's snippet is cut around (see src/lib/search.ts).

const HIGHLIGHT = 'search-hit';
// Matches the .expandable__body grid-template-rows transition in
// globals.css, plus a little slack: the hit's position is only final once
// the body has finished opening.
const EXPANDABLE_OPEN_MS = 450;

// Text that's on the page but not in the search index, so a match in it
// isn't the one the result showed.
const SKIP = 'script, style, svg, .page-title, .citation, .katex';
const HEADINGS = 'h1, h2, h3, h4, h5, h6';

// Outline headings delimit sections in the index; headings inside an
// Expandable don't (see splitSections in src/lib/search-index.ts), and
// neither does the page's own title, which isn't part of its MDX.
function isSectionHeading(el: Element): boolean {
  return el.matches(HEADINGS) && !el.closest('.expandable, .page-title');
}

function follows(a: Node, b: Node): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function contains(a: Node, b: Node): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_CONTAINED_BY);
}

function findHit(article: Element, target: SearchTarget): Range | null {
  const start = target.sectionId ? document.getElementById(target.sectionId) : null;
  if (target.sectionId && !start) return null;
  const end =
    [...article.querySelectorAll(HEADINGS)].find(
      (el) => isSectionHeading(el) && (!start || (el !== start && follows(start, el))),
    ) ?? null;

  // The section's text nodes, folded and joined, with where each one starts.
  const nodes: Text[] = [];
  const offsets: number[] = [];
  let text = '';
  const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    if (start && (contains(start, node) || !follows(start, node))) continue;
    if (end && (contains(end, node) || follows(end, node))) break;
    if (node.parentElement?.closest(SKIP)) continue;
    nodes.push(node);
    offsets.push(text.length);
    text += fold(node.data);
  }

  const at = text.indexOf(target.term);
  if (at === -1) return null;

  const locate = (index: number) => {
    let i = offsets.length - 1;
    while (i > 0 && offsets[i] > index) i--;
    return { node: nodes[i], offset: index - offsets[i] };
  };
  const from = locate(at);
  const to = locate(at + target.term.length - 1);
  const range = document.createRange();
  range.setStart(from.node, from.offset);
  range.setEnd(to.node, to.offset + 1);
  return range;
}

// Opens every collapsed Expandable around `node`, outermost first, through
// its own toggle button so its state stays in React. Returns whether any
// had to open.
function openExpandables(node: Node): boolean {
  const closed: Element[] = [];
  for (let el = node.parentElement?.closest('.expandable'); el; el = el.parentElement?.closest('.expandable')) {
    if (el.getAttribute('data-open') === 'false') closed.unshift(el);
  }
  for (const el of closed) el.querySelector<HTMLButtonElement>(':scope > .expandable__toggle')?.click();
  return closed.length > 0;
}

function highlight(range: Range) {
  if ('highlights' in CSS) {
    CSS.highlights.set(HIGHLIGHT, new Highlight(range));
  } else {
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
  }
  // Stays until the reader does something else on the page.
  const clear = () => {
    if ('highlights' in CSS) CSS.highlights.delete(HIGHLIGHT);
    document.removeEventListener('pointerdown', clear);
    document.removeEventListener('keydown', clear);
  };
  document.addEventListener('pointerdown', clear);
  document.addEventListener('keydown', clear);
}

export function revealSearchHit(target: SearchTarget) {
  const article = document.querySelector('.site__main article');
  const range = article && target.term ? findHit(article, target) : null;
  if (!range) {
    // No exact match to show (only the title/heading matched, or the page
    // differs from the index): the section itself is the next best thing.
    if (target.sectionId) document.getElementById(target.sectionId)?.scrollIntoView();
    else window.scrollTo({ top: 0 });
    return;
  }

  const reveal = () => {
    // A third of the way down rather than at the very top, clear of the
    // sticky page title and with some context above the match.
    const top = window.scrollY + range.getBoundingClientRect().top - window.innerHeight / 3;
    window.scrollTo({ top: Math.max(0, top) });
    highlight(range);
  };
  if (openExpandables(range.startContainer)) window.setTimeout(reveal, EXPANDABLE_OPEN_MS);
  else reveal();
}
