// One-off migration: Markdown links that point at a heading by its text
// (`/page#:~:text=Heading`, which depends on the browser's text search and
// draws no line to the outline) become links to the heading's own anchor
// (`/page#heading-id`). Run with --write to change files; otherwise it only
// reports.   node scripts/link-headings.mjs [--write]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createProcessor } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import GithubSlugger from 'github-slugger';
import { toString } from 'mdast-util-to-string';
import { visit } from 'unist-util-visit';

const write = process.argv.includes('--write');
const dir = 'content/pages';
const slugs = readdirSync(dir);
const file = (slug) => `${dir}/${slug}/index.mdx`;
const parse = (src) => createProcessor({ remarkPlugins: [remarkGfm] }).parse(src);
const norm = (t) => t.normalize('NFC').toLowerCase().replace(/[\s ]+/g, ' ').trim();
const ORIGIN = /^https:\/\/wiki\.igemlund\.org/;

const sources = Object.fromEntries(slugs.map((s) => [s, readFileSync(file(s), 'utf8')]));

// Headings by page, with the ids rehype-slug gives them (deduped page-wide,
// in document order; h5/h6 are h4s by then, which changes nothing here).
const headings = {};
for (const slug of slugs) {
  const slugger = new GithubSlugger();
  headings[slug] = [];
  visit(parse(sources[slug]), 'heading', (h) => {
    const text = toString(h).trim();
    headings[slug].push({ text, id: slugger.slug(text), depth: h.depth });
  });
}

const converted = [];
const unmatched = [];
for (const slug of slugs) {
  const src = sources[slug];
  const edits = [];
  visit(parse(src), 'link', (n) => {
    const url = n.url.replace(ORIGIN, '');
    const [path, hash = ''] = url.split('#');
    const frag = hash.split(':~:text=')[1];
    if (frag === undefined || /^[a-z]+:/i.test(path)) return;
    const target = path === '' ? slug : path.replace(/^\//, '').replace(/\/$/, '');
    if (!slugs.includes(target)) return;
    // text=[prefix-,]start[,end][,-suffix]
    const parts = frag.split(',').map((p) => decodeURIComponent(p));
    const start = parts.find((p) => !p.endsWith('-') && !p.startsWith('-'));
    const wanted = start && norm(start);
    const own = headings[target];
    const exact = own.filter((h) => norm(h.text) === wanted);
    const loose = own.filter((h) => wanted && norm(h.text).includes(wanted));
    const match = exact.length === 1 ? exact[0] : exact.length === 0 && loose.length === 1 ? loose[0] : undefined;
    if (!match) {
      unmatched.push(`${slug}: [${toString(n)}](${n.url})`);
      return;
    }
    // Written as the link was, apart from the fragment (and the site's own
    // origin, which would otherwise make it an external link).
    const href = `${path}#${match.id}`;
    const at = n.position.start.offset + src.slice(n.position.start.offset, n.position.end.offset).lastIndexOf(n.url);
    edits.push({ from: at, to: at + n.url.length, text: href });
    converted.push(`${slug}: ${n.url}\n    -> ${href}   (${match.text})`);
  });
  let out = src;
  for (const e of edits.sort((a, b) => b.from - a.from)) out = out.slice(0, e.from) + e.text + out.slice(e.to);
  sources[slug] = out;
}
console.log(converted.join('\n'));
console.log(`\nConverted ${converted.length}. Text links not matching a heading:\n${unmatched.join('\n')}`);
if (write) for (const slug of slugs) writeFileSync(file(slug), sources[slug]);
