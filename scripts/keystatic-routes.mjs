#!/usr/bin/env node
// Copies (link) or removes (unlink) Keystatic's admin/API route files under
// src/app/. This is the mechanism that keeps those routes out of the
// static-export production build: Next.js statically analyzes every route
// handler in src/app at build time, so a POST-exporting route handler
// existing anywhere in the tree makes `next build --output export` fail
// outright, regardless of any runtime feature flag inside it. The only fix
// is for the files to be physically absent before Next scans the tree.
//
// src/app/keystatic/ and src/app/api/keystatic/ are gitignored — they are
// generated artifacts, never the source of truth (that's keystatic-admin/).
import { existsSync, mkdirSync, copyFileSync, rmSync, readdirSync, rmdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const SOURCE_DIR = join(rootDir, 'keystatic-admin');

const TARGETS = [
  { from: 'keystatic.tsx', to: 'src/app/keystatic/keystatic.tsx' },
  { from: 'layout.tsx', to: 'src/app/keystatic/layout.tsx' },
  { from: 'page.tsx', to: 'src/app/keystatic/[[...params]]/page.tsx' },
  { from: 'route.ts', to: 'src/app/api/keystatic/[...params]/route.ts' },
];

function link() {
  for (const { from, to } of TARGETS) {
    const src = join(SOURCE_DIR, from);
    const dest = join(rootDir, to);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }
  console.log('[keystatic-routes] linked admin routes into src/app/');
}

function unlink() {
  rmSync(join(rootDir, 'src/app/keystatic'), { recursive: true, force: true });
  rmSync(join(rootDir, 'src/app/api/keystatic'), { recursive: true, force: true });

  const apiDir = join(rootDir, 'src/app/api');
  if (existsSync(apiDir) && readdirSync(apiDir).length === 0) {
    rmdirSync(apiDir);
  }
  console.log('[keystatic-routes] removed admin routes from src/app/');
}

const mode = process.argv[2];
if (mode === 'link') {
  link();
} else if (mode === 'unlink') {
  unlink();
} else {
  console.error('Usage: node scripts/keystatic-routes.mjs <link|unlink>');
  process.exit(1);
}
