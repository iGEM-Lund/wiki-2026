// One-off migration: gives every <Card> a reference code (refId), and turns
// the Markdown links that lead to a card's title into <Ref> mentions of it.
// Run with --write to change files; otherwise it only reports.
//   node --experimental-strip-types scripts/link-cards.mjs [--write]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createProcessor } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import GithubSlugger from 'github-slugger';
import { toString } from 'mdast-util-to-string';
import { visit } from 'unist-util-visit';
import { extractCards } from '../src/lib/card-extract.ts';

const write = process.argv.includes('--write');
const dir = 'content/pages';
const slugs = readdirSync(dir);
const file = (slug) => `${dir}/${slug}/index.mdx`;
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const newId = () =>
  `card-${Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => ALPHABET[b % 36]).join('')}`;
const parse = (src) => createProcessor({ remarkPlugins: [remarkGfm] }).parse(src);
const norm = (t) => t.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();

// 1. A code on every <Card> that lacks one (inserted after `<Card`).
const sources = {};
for (const slug of slugs) {
  let src = readFileSync(file(slug), 'utf8');
  const tree = parse(src);
  const at = [];
  visit(tree, (n) => {
    if (n.type === 'mdxJsxFlowElement' && n.name === 'Card' && !n.attributes.some((a) => a.name === 'refId'))
      at.push(n.position.start.offset + '<Card'.length);
  });
  for (const o of at.reverse()) src = `${src.slice(0, o)} refId="${newId()}"${src.slice(o)}`;
  sources[slug] = src;
}

// 2. The cards, with the ids their pages give them.
const cards = {};
for (const slug of slugs) {
  const slugger = new GithubSlugger();
  const tree = parse(sources[slug]);
  const refs = extractCards(sources[slug]);
  let i = 0;
  // Heading ids are deduped page-wide, so every heading is slugged in order.
  const anchors = new Map();
  visit(tree, (n) => {
    if (n.type === 'heading') {
      const id = slugger.slug(toString(n));
      const t = n;
      anchors.set(t.position.start.offset, id);
    }
  });
  visit(tree, (n) => {
    if (n.type !== 'mdxJsxFlowElement' || n.name !== 'Card') return;
    const refId = n.attributes.find((a) => a.name === 'refId')?.value;
    const card = refs.find((c) => c.refId === refId);
    if (!card) return;
    const titleNode = n.children.find((c) => c.name === 'CardTitle');
    let headingId;
    visit(titleNode, (h) => {
      if (h.type === 'heading') headingId = anchors.get(h.position.start.offset);
    });
    const ids = [headingId, new GithubSlugger().slug(card.title)].filter(Boolean);
    cards[refId] = { ...card, slug, ids };
    i++;
  });
}
const all = Object.values(cards);
const pageCards = (slug) => all.filter((c) => c.slug === slug);

// 3. Links.
const report = { converted: [], unmatched: [] };
for (const slug of slugs) {
  const src = sources[slug];
  const tree = parse(src);
  const edits = [];
  visit(tree, (n) => {
    const url = n.type === 'link' ? n.url.replace(/^https:\/\/wiki\.igemlund\.org/, '') : '';
    if (!url.includes('#')) return;
    const [path, rawHash] = url.split('#');
    if (/^[a-z]+:/i.test(path)) return;
    const target = path === '' ? slug : path.replace(/^\//, '').replace(/\/$/, '');
    if (!slugs.includes(target)) return;
    const hash = rawHash;
    let match;
    const textFrag = hash.split(':~:text=')[1];
    const id = hash.split(':~:')[0];
    if (id) match = pageCards(target).find((c) => c.ids.includes(decodeURIComponent(id)));
    if (!match && textFrag) {
      // text=[prefix-,]start[,end][,-suffix]: the start names the card's text.
      const parts = textFrag.split(',').map((p) => decodeURIComponent(p));
      const start = parts.find((p) => !p.endsWith('-') && !p.startsWith('-'));
      const wanted = start && norm(start);
      const hits = wanted ? pageCards(target).filter((c) => norm(c.title).includes(wanted)) : [];
      const exact = hits.filter((c) => norm(c.title) === wanted);
      match = exact.length === 1 ? exact[0] : hits.length === 1 ? hits[0] : undefined;
    }
    const text = toString(n);
    if (!match) {
      report.unmatched.push(`${slug}: [${text}](${url})`);
      return;
    }
    const attrs = [`target="${match.refId}"`];
    if (norm(text) !== norm(match.title)) attrs.push(`linkText="${text.replace(/"/g, '&quot;')}"`);
    edits.push({ from: n.position.start.offset, to: n.position.end.offset, to_: `<Ref ${attrs.join(' ')} />` });
    report.converted.push(`${slug}: [${text}](${n.url}) -> ${match.refId} (${match.slug}: ${match.title})`);
  });
  let out = src;
  for (const e of edits.sort((a, b) => b.from - a.from)) out = out.slice(0, e.from) + e.to_ + out.slice(e.to);
  sources[slug] = out;
}

console.log(report.converted.join('\n'));
console.log(`\nConverted ${report.converted.length}. Not matched to a card (left as links):`);
console.log(report.unmatched.join('\n'));
if (write) for (const slug of slugs) writeFileSync(file(slug), sources[slug]);
