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
# Requires a GitLab deploy key (write access) registered on the GitLab repo.
# Defaults to ~/.ssh/igem_gitlab_deploy; override with GITLAB_DEPLOY_SSH_KEY.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

GITLAB_REMOTE_URL="git@gitlab.igem.org:2026/lund.git"
SSH_KEY="${GITLAB_DEPLOY_SSH_KEY:-$HOME/.ssh/igem_gitlab_deploy}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "error: deploy SSH key not found at $SSH_KEY" >&2
  echo "  Generate one and register its public half as a GitLab deploy key" >&2
  echo "  (write access) on gitlab.igem.org/2026/lund, or point" >&2
  echo "  GITLAB_DEPLOY_SSH_KEY at an existing key. See README.md, 'Pushing" >&2
  echo "  to production (iGEM GitLab)'." >&2
  exit 1
fi

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
GIT_SSH_COMMAND="ssh -i $SSH_KEY -o IdentitiesOnly=yes" git push --force gitlab main:main

echo
echo "Pushed. Check the pipeline at:"
echo "  https://gitlab.igem.org/2026/lund/-/pipelines"
