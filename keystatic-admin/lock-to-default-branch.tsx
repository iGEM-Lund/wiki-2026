'use client';

import { useEffect } from 'react';

// Writers should only ever save straight to the default branch. Keystatic has
// no config option to disable its branch UI, so this does two things:
//   1. bounces any /keystatic/branch/<other> URL back to the default branch
//      (stale bookmarks, old branches, the branch picker itself);
//   2. hides the branch picker and the "New branch" button once they render.
// Saving on the default branch commits directly, which is what we want.
const DEFAULT_BRANCH = 'main';

const BRANCH_URL = /^\/keystatic\/branch\/([^/]+)/;

function redirectIfOffDefaultBranch() {
  const match = BRANCH_URL.exec(window.location.pathname);
  if (match && decodeURIComponent(match[1]) !== DEFAULT_BRANCH) {
    const rest = window.location.pathname.slice(match[0].length);
    window.location.replace(`/keystatic/branch/${DEFAULT_BRANCH}${rest}${window.location.search}`);
  }
}

// Hide an element plus any ancestors that exist only to wrap it.
function hideWithWrappers(el: HTMLElement) {
  let target: HTMLElement = el;
  for (let i = 0; i < 4; i++) {
    const parent = target.parentElement;
    if (!parent || parent.childElementCount !== 1) break;
    target = parent;
  }
  target.style.display = 'none';
}

function hideBranchControls() {
  document
    .querySelectorAll<HTMLElement>('input[aria-label="Current branch"]')
    .forEach(hideWithWrappers);
  document.querySelectorAll<HTMLElement>('button').forEach((button) => {
    if (button.textContent?.trim().startsWith('New branch')) hideWithWrappers(button);
  });
}

export default function LockToDefaultBranch() {
  useEffect(() => {
    const run = () => {
      redirectIfOffDefaultBranch();
      hideBranchControls();
    };
    run();
    // Keystatic is a client-routed SPA: re-run whenever its DOM changes.
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
