# iGEM Lund 2026 Wiki

## What this is

A Next.js App Router site, authored via [Keystatic](https://keystatic.com) in GitHub mode
so the whole team — not just the infra committee — can write MDX content without
touching code. One codebase, two deployment targets:

- **Staging**: this Next app runs as a live Node process on our Hetzner VPS behind
  Caddy, with the Keystatic admin UI at `/edit` reachable for the team.
- **Production**: the same app, built with `output: 'export'` (static HTML, no
  server, no Keystatic admin code compiled in), pushed to iGEM's own GitLab repo,
  where their CI (`npm ci && npm run build`) builds and publishes it to our
  `*.igem.wiki` subdomain.

## The two-repo workflow

- **This repo** (`iGEM-Lund/wiki-2026` on GitHub) is where writing and staging
  happen. Keystatic's GitHub-mode storage reads/writes content here directly.
- **iGEM's GitLab repo** is a separate, frozen mirror. It only ever receives the
  production build's *source* (this codebase, mirrored) — iGEM's own
  `.gitlab-ci.yml`-driven pipeline runs `npm ci && npm run build` itself and
  publishes the static output via GitLab Pages. iGEM does not accept pre-built HTML.
- `content/**/*.mdx` is committed to git. Images, PDFs, and other documents are
  **not** — see "Images, PDFs, videos" below.

## Getting started (local dev)

```bash
npm install
cp .env.example .env
npm run dev
```

Visit `http://localhost:3000/edit`. On first run it walks you through
creating a GitHub App scoped to `iGEM-Lund/wiki-2026`; the resulting
`KEYSTATIC_GITHUB_CLIENT_ID` / `KEYSTATIC_GITHUB_CLIENT_SECRET` / `KEYSTATIC_SECRET`
/ `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` values go in `.env`.

## Build targets explained

| Command | `BUILD_TARGET` | Keystatic admin | Output |
|---|---|---|---|
| `npm run dev` | unset | active | Next dev server |
| `npm run build:staging` + `npm run start:staging` | `staging` | active | live Node server (VPS) |
| `npm run build` | `production` | **stripped** | static export (`out/`) for iGEM's GitLab Pages |

`npm run build` is what iGEM's CI runs verbatim, so it **must** be the
production/export path. `scripts/keystatic-routes.mjs` physically copies
Keystatic's admin route files from `keystatic-admin/` into `src/app/` before
dev/staging builds (`link`), and removes them before the production build
(`unlink`) — see the comment at the top of that script for why runtime
feature-flagging alone can't work here (Next statically analyzes route
handlers at build time, and a `POST`-exporting route anywhere in the tree
breaks `output: 'export'` regardless of any `if` check inside it).

`BUILD_TARGET`, not `NODE_ENV`, is the flag used throughout — `next start`
always sets its own internal `NODE_ENV=production`, so `NODE_ENV` can't
distinguish staging from the production export build.

## Content model

- **`pages` collection** (`content/pages/<slug>/index.mdx`): `title` and MDX
  `content`. Every page on the site is one of these — including the
  mandatory iGEM Standard URL judging pages (Project Description, Human
  Practices, ...). There's no separate singleton mechanism for them; whoever
  creates those pages is responsible for giving them the exact slugs iGEM's
  Judging Form links to (`project-description`, `human-practices`, ...) and
  for not renaming or deleting them afterward. Routing is a flat
  `/[slug]` (`src/app/(site)/[slug]/page.tsx`).
- **`navigation` singleton** drives the entire top nav — it's editorially
  curated, not derived from collection fields. Each item has a name, an icon
  (a searchable `lucide-react` picker or a custom image URL), and either a
  direct link or a dropdown of links, each pointing at a `pages` entry via a
  `relationship` field. See `src/lib/nav.ts` (resolves the raw data),
  `src/components/nav-icon.tsx` (renders the icon server-side at build
  time), and `src/app/(site)/layout.tsx` (renders the tree). Regenerate the
  icon list with `npm run generate:icons` after bumping `lucide-react`.

## Adding a new content component

1. Add the display component under `src/components/content/` and export it
   from `src/components/content/index.ts`'s `mdxComponents` map.
2. Register it for the editor in `src/lib/keystatic/content-components.tsx`
   using `block()` / `wrapper()` / `inline()` / `mark()` from
   `@keystatic/core/content-components`, using the **same key name**.
3. Restart `npm run dev` — it should now appear in the Keystatic MDX editor
   toolbar.

The two maps are separate on purpose: `content-components.tsx` only governs
the editor's insertion UI and preview; `components/content/index.ts` governs
what actually renders on the live site.

## Images, PDFs, videos

Never commit binaries to this repo. Upload images/PDFs via
`tools.igem.org/uploads`, which hosts them at `static.igem.wiki`, then paste
the resulting URL into a `fields.url()` field (see `FigureWithCaption` in
`keystatic.config.ts`). Videos go through the iGEM Video Universe and get
embedded by URL, not uploaded.

## Deploying to staging

Reference configs in `deploy/`: `Caddyfile` (reverse proxy + automatic HTTPS)
and `igem-wiki.service` (systemd unit). Install both, adjusting the placeholder
domain, then:

```bash
git pull && npm ci && npm run build:staging && sudo systemctl restart igem-wiki
```

## Pushing to production (iGEM GitLab)

Push/mirror this codebase to the iGEM-provided GitLab repo. `.gitlab-ci.yml`
runs three stages: `build` (`npm ci && npm run build`), `verify`
(`scripts/verify-export.mjs`, which fails the pipeline if `out/edit` or
`out/api` ever exist), and `pages` (publishes `out/` as GitLab Pages).

## End-to-end test checklist

Run this early, before content volume ramps up:

- [ ] `BUILD_TARGET=production npm run build` succeeds locally
- [ ] `node scripts/verify-export.mjs` passes locally
- [ ] Push a trivial content change to the GitLab mirror; confirm `build` →
      `verify` → `pages` all go green
- [ ] Confirm the live `*.igem.wiki` URL serves the updated content
- [ ] Confirm both Standard URL pages resolve at their exact fixed paths
- [ ] Confirm no browser network request goes to any non-bundled origin except
      `static.igem.wiki` images and the iGEM Video Universe embed

Two things this checklist should specifically surface, since they haven't been
verified against iGEM's actual hosting yet: whether GitLab Pages' URL/trailing-
slash behavior matches `next.config.ts`'s `trailingSlash: true` assumption, and
whether iGEM's GitLab pre-seeds repos with a required starter
`.gitlab-ci.yml` that needs reconciling with this one.

## Troubleshooting

- **A stray `src/app/edit` or `src/app/api/keystatic` got committed by
  accident**: these are gitignored generated artifacts (see
  `scripts/keystatic-routes.mjs`) — delete them, they'll be regenerated by
  `predev`/`prebuild:staging` as needed.
- **Keystatic GitHub App auth issues**: recheck the four `KEYSTATIC_GITHUB_*`
  env vars and that the GitHub App has been granted access to
  `iGEM-Lund/wiki-2026`.
