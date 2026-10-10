'use client';

import { useEffect, useRef, useState } from 'react';
import { List, X } from 'lucide-react';
import type { HeadingNode } from '@/lib/headings';

function flattenIds(nodes: HeadingNode[]): string[] {
  return nodes.flatMap((node) => [node.id, ...flattenIds(node.children)]);
}

function containsId(node: HeadingNode, id: string | null): boolean {
  return id !== null && (node.id === id || node.children.some((child) => containsId(child, id)));
}

function OutlineList({
  nodes,
  activeId,
  nested = false,
}: {
  nodes: HeadingNode[];
  activeId: string | null;
  nested?: boolean;
}) {
  // `data-open` marks the sub-lists in the branch being read: the floating
  // outline (wide screens) unfolds only those; the drawer shows them all.
  const open = nested && nodes.some((node) => containsId(node, activeId));
  return (
    <ol data-open={nested ? open : undefined}>
      {nodes.map((node) => (
        <li key={node.id}>
          <a href={`#${node.id}`} aria-current={node.id === activeId ? 'location' : undefined}>
            {node.text}
          </a>
          {node.children.length > 0 ? (
            <OutlineList nodes={node.children} activeId={activeId} nested />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function TableOfContents({ headings }: { headings: HeadingNode[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  // Only used to size the intersection observer's top margin, so a heading
  // isn't marked "active" while it's still hidden under whatever covers the
  // top of the viewport: the top bar, the collapsed page title. The
  // root's scroll-padding-top already clears both (plus 1rem), so it's read
  // from there. The pane's own on-screen position comes from CSS, not this
  // state.
  const [coveredTop, setCoveredTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  // Below 75rem only (see the max-width media query in globals.css; wider
  // screens always render the floating outline in the right gutter and
  // ignore this): the pane stays a floating toggle button until tapped,
  // then slides in from the right as an overlay instead of eating into the
  // reading width.
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.site__header');
    if (!header) return;
    const update = () =>
      setCoveredTop(parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0);
    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(header);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const update = () => setViewportHeight(window.innerHeight);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const ids = flattenIds(headings);
    if (ids.length === 0) return;

    const visible = new Set<string>();
    // The "active" band runs from just below the fixed header down to 70% of
    // the viewport, but on a short viewport with a tall header (e.g. mobile,
    // where the nav wraps to multiple rows), that 70% cutoff can land above
    // the header itself, inverting the band so nothing ever intersects it.
    // Clamping the bottom margin keeps the band at least 120px tall.
    const top = coveredTop + 16;
    const bottom = Math.max(0, viewportHeight - top - 120);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.add(entry.target.id);
          } else {
            visible.delete(entry.target.id);
          }
        }
        const topmostVisible = ids.find((id) => visible.has(id));
        if (topmostVisible) setActiveId(topmostVisible);
      },
      { rootMargin: `-${top}px 0px -${bottom}px 0px`, threshold: 0 },
    );

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings, coveredTop, viewportHeight]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (headings.length === 0) return null;

  return (
    <nav className="toc" data-open={open} aria-label="Page outline" ref={navRef}>
      <button
        type="button"
        className="toc__toggle"
        aria-expanded={open}
        aria-controls="toc-panel"
        aria-label={open ? 'Close page outline' : 'Open page outline'}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={18} /> : <List size={18} />}
      </button>
      <div
        id="toc-panel"
        className="toc__panel"
        // Close the drawer once a link is followed, so it doesn't stay open
        // over the heading the reader just jumped to.
        onClick={(event) => {
          if ((event.target as HTMLElement).tagName === 'A') setOpen(false);
        }}
      >
        <p className="toc__title">On this page</p>
        <OutlineList nodes={headings} activeId={activeId} />
      </div>
    </nav>
  );
}
