#!/usr/bin/env bash
# Mirrors this repo's `main` to iGEM's GitLab repo (gitlab.igem.org/2026/lund),
# which iGEM's own .gitlab-ci.yml then builds and publishes via GitLab Pages.
# That repo is a frozen mirror of this codebase's source — iGEM does not
# accept pre-built HTML — so a force-push here is expected, not a mistake.
#
# Manual and deliberate by design: a push here immediately triggers a rebuild
# of the live, judged wiki, so this is never wired into CI. Run it yourself
# when you actually mean to publish (see README.md, "Pushing to production
# (iGEM GitLab)").
#
# Pushes over HTTPS, not SSH: iGEM's GitLab serves its web/git-http traffic
# through CloudFront, which doesn't proxy raw SSH — port 22 just hangs,
# regardless of local network. Auth comes from a GitLab access token
# (write_repository scope) stored in ~/.netrc, which git's http backend
# reads automatically — no env var to export on every run. See README.md,
# "Pushing to production (iGEM GitLab)" for how to set that up.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

GITLAB_REMOTE_URL="https://gitlab.igem.org/2026/lund.git"

current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$current_branch" != "main" ]]; then
  echo "error: must be on 'main' to deploy to production (currently on '$current_branch')" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "error: working tree is not clean — commit or stash changes first" >&2
  exit 1
fi

git fetch origin main
local_sha="$(git rev-parse main)"
origin_sha="$(git rev-parse origin/main)"
if [[ "$local_sha" != "$origin_sha" ]]; then
  echo "error: local 'main' does not match 'origin/main' — pull/push to GitHub first" >&2
  exit 1
fi

echo "==> Installing dependencies (npm ci)"
npm ci

echo "==> Running local production build (pre-flight check; iGEM's CI rebuilds this itself)"
BUILD_TARGET=production npm run build
node scripts/verify-export.mjs

echo
echo "This will force-push 'main' to iGEM's GitLab repo, which immediately"
echo "rebuilds and republishes the live, judged wiki at gitlab.igem.org/2026/lund."
read -r -p "Continue? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 1
fi

if git remote get-url gitlab >/dev/null 2>&1; then
  git remote set-url gitlab "$GITLAB_REMOTE_URL"
else
  git remote add gitlab "$GITLAB_REMOTE_URL"
fi

echo "==> Pushing main -> gitlab/main (force)"
git push --force gitlab main:main

echo
echo "Pushed. Check the pipeline at:"
echo "  https://gitlab.igem.org/2026/lund/-/pipelines"
