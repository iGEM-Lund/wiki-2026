#!/usr/bin/env bash
# Mirrors this repo's `main` to iGEM's GitLab repo (gitlab.igem.org/2026/lund),
# which iGEM's own .gitlab-ci.yml then builds and publishes via GitLab Pages.
# iGEM does not accept pre-built HTML.
#
# `main` on GitLab is protected against force pushes (and teams don't get
# Settings access to change that), so this doesn't force-push. Instead it
# builds a merge commit, tree content exactly this repo's `main`, but with
# GitLab's current main tip as first parent, so publishing is always a
# fast-forward from GitLab's point of view. That also leaves a real commit
# history of every publish on GitLab's side, instead of erasing it each time.
#
# Manual and deliberate by design: a push here immediately triggers a rebuild
# of the live, judged wiki, so this is never wired into CI. Run it yourself
# when you actually mean to publish (see README.md, "Pushing to production
# (iGEM GitLab)").
#
# Pushes over HTTPS, not SSH: iGEM's GitLab serves its web/git-http traffic
# through CloudFront, which doesn't proxy raw SSH (port 22 just hangs),
# regardless of local network. Auth comes from a GitLab access token
# (write_repository scope) stored in ~/.netrc, which git's http backend
# reads automatically; no env var to export on every run. See README.md,
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
  echo "error: working tree is not clean; commit or stash changes first" >&2
  exit 1
fi

git fetch origin main
local_sha="$(git rev-parse main)"
origin_sha="$(git rev-parse origin/main)"
if [[ "$local_sha" != "$origin_sha" ]]; then
  echo "error: local 'main' does not match 'origin/main'; pull/push to GitHub first" >&2
  exit 1
fi

echo "==> Installing dependencies (npm ci)"
npm ci

echo "==> Running local production build (pre-flight check; iGEM's CI rebuilds this itself)"
BUILD_TARGET=production npm run build
node scripts/verify-export.mjs

echo
echo "This will publish 'main' to iGEM's GitLab repo, which immediately"
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

echo "==> Fetching GitLab's current main"
git fetch gitlab main
gitlab_main_sha="$(git rev-parse FETCH_HEAD)"
local_tree="$(git rev-parse "$local_sha^{tree}")"

echo "==> Building publish commit (fast-forward from GitLab's current main, no force-push needed)"
merge_commit="$(git commit-tree "$local_tree" -p "$gitlab_main_sha" -p "$local_sha" -m "Publish $(git rev-parse --short "$local_sha") to iGEM GitLab")"

echo "==> Pushing to gitlab/main"
git push gitlab "$merge_commit:refs/heads/main"

echo
echo "Pushed. Check the pipeline at:"
echo "  https://gitlab.igem.org/2026/lund/-/pipelines"
