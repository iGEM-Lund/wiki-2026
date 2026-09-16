'use client';

import { useEffect, useState } from 'react';
import type { HeadingNode } from '@/lib/headings';

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
  // Measured so the pane can clear the (non-sticky) header without a
  // hardcoded height — the header's own height varies with nav wrapping.
  const [headerHeight, setHeaderHeight] = useState(0);

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

  if (headings.length === 0) return null;

  return (
    <nav className="toc" aria-label="Page outline" style={{ top: headerHeight + 24 }}>
      <p className="toc__title">On this page</p>
      <OutlineList nodes={headings} activeId={activeId} />
    </nav>
  );
}
