// Whether enough of a figure, table or 3D model is on screen to point at it
// rather than describe it: all of it, or at least 120px of a tall one, below
// the fixed site header. A Ref then hangs no sign (CitationLink) and the
// content links' dashed line is drawn to the object instead (LinkArrow).
export function isOnScreen(target: Element): boolean {
  const box = target.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return false;
  const header = document.querySelector('.site__header')?.getBoundingClientRect().bottom ?? 0;
  const top = Math.max(box.top, header);
  const bottom = Math.min(box.bottom, window.innerHeight);
  const left = Math.max(box.left, 0);
  const right = Math.min(box.right, window.innerWidth);
  return right - left > 40 && bottom - top >= Math.min(box.height, 120);
}

// What a Ref can point at (src/lib/numbering.ts).
export const NUMBERED_OBJECT = '.figure-with-caption, .table-with-caption, .molecule-viewer';
