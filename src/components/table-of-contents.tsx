'use client';

import { useEffect, useRef, useState } from 'react';
import { List } from 'lucide-react';
import type { HeadingNode } from '@/lib/headings';

// Mobile only (see the max-width media query in globals.css — desktop always
// renders the fixed sidebar and ignores this): the pane starts inline above
// the article, then auto-collapses into a floating toggle button so it
// doesn't permanently eat into the reading width on small screens.
type MobileState = 'inline' | 'collapsed' | 'expanded';
const AUTO_COLLAPSE_MS = 2500;

function flattenIds(nodes: HeadingNode[]): string[] {
  return nodes.flatMap((node) => [node.id, ...flattenIds(node.children)]);
}

function OutlineList({ nodes, activeId }: { nodes: HeadingNode[]; activeId: string | null }) {
  return (
    <ol>
      {nodes.map((node) => (
        <li key={node.id}>
          <a href={`#${node.id}`} aria-current={node.id === activeId ? 'location' : undefined}>
            {node.text}
          </a>
          {node.children.length > 0 ? (
            <OutlineList nodes={node.children} activeId={activeId} />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function TableOfContents({ headings }: { headings: HeadingNode[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  // Only used to size the intersection observer's top margin, so a heading
  // isn't marked "active" while it's still hidden under the fixed header.
  // The pane's own on-screen position comes from the --header-height custom
  // property (set by HeaderHeightSync) via CSS, not this state.
  const [headerHeight, setHeaderHeight] = useState(0);
  const [mobileState, setMobileState] = useState<MobileState>('inline');
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.site__header');
    if (!header) return;
    const update = () => setHeaderHeight(header.getBoundingClientRect().height);
    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(header);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const ids = flattenIds(headings);
    if (ids.length === 0) return;

    const visible = new Set<string>();
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
      { rootMargin: `-${headerHeight + 32}px 0px -70% 0px`, threshold: 0 },
    );

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings, headerHeight]);

  // Desktop ignores mobileState entirely (see globals.css), so this timer is
  // harmless there — it just never gets a chance to visually matter.
  useEffect(() => {
    if (headings.length === 0) return;
    const timer = setTimeout(() => setMobileState('collapsed'), AUTO_COLLAPSE_MS);
    return () => clearTimeout(timer);
  }, [headings]);

  useEffect(() => {
    if (mobileState !== 'expanded') return;
    function onPointerDown(event: PointerEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setMobileState('collapsed');
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileState('collapsed');
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileState]);

  if (headings.length === 0) return null;

  return (
    <nav className="toc" data-state={mobileState} aria-label="Page outline" ref={navRef}>
      <button
        type="button"
        className="toc__toggle"
        aria-expanded={mobileState === 'expanded'}
        aria-controls="toc-panel"
        aria-label="Page outline"
        onClick={() => setMobileState((state) => (state === 'expanded' ? 'collapsed' : 'expanded'))}
      >
        <List size={18} />
      </button>
      <div
        id="toc-panel"
        className="toc__panel"
        // Collapse back to the floating button once a link is followed, so
        // it doesn't sit open over the heading the reader just jumped to.
        onClick={(event) => {
          if ((event.target as HTMLElement).tagName === 'A') setMobileState('collapsed');
        }}
      >
        <p className="toc__title">On this page</p>
        <OutlineList nodes={headings} activeId={activeId} />
      </div>
    </nav>
  );
}
