import type { HeadingNode } from '@/lib/headings';

function OutlineList({ nodes }: { nodes: HeadingNode[] }) {
  return (
    <ol>
      {nodes.map((node) => (
        <li key={node.id}>
          <a href={`#${node.id}`}>{node.text}</a>
          {node.children.length > 0 ? <OutlineList nodes={node.children} /> : null}
        </li>
      ))}
    </ol>
  );
}

export function TableOfContents({ headings }: { headings: HeadingNode[] }) {
  if (headings.length === 0) return null;

  return (
    <nav className="toc" aria-label="Page outline">
      <p className="toc__title">On this page</p>
      <OutlineList nodes={headings} />
    </nav>
  );
}
