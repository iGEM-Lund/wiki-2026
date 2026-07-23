#!/usr/bin/env node
// CI safety net: fails loudly if the production export build ever contains
// Keystatic's admin/API output, e.g. because scripts/keystatic-routes.mjs's
// unlink step silently no-ops in some future refactor. Run this immediately
// after `next build` in .gitlab-ci.yml.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(rootDir, 'out');

const forbidden = [join(outDir, 'keystatic'), join(outDir, 'api')];

const found = forbidden.filter((p) => existsSync(p));

if (!existsSync(outDir)) {
  console.error(`[verify-export] expected build output directory not found: ${outDir}`);
  process.exit(1);
}

if (found.length > 0) {
  console.error('[verify-export] FAILED: production export contains Keystatic admin/API output:');
  for (const p of found) console.error(`  - ${p}`);
  console.error('This must never ship to iGEM\'s GitLab Pages. Check scripts/keystatic-routes.mjs.');
  process.exit(1);
}

console.log('[verify-export] OK: no Keystatic admin/API output in the export build.');
