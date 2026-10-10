import type { ReactNode } from 'react';

type TooltipProps = {
  text?: string | null;
  children?: ReactNode;
};

// Hover/focus explanation attached to a term. Pure CSS (see `.term-tip` in
// globals.css): focusable so keyboard and touch users get it too, and the
// explanation is real text in the DOM (role="tooltip") rather than a CSS
// `content` string, so screen readers and search can see it.
export function Tooltip({ text, children }: TooltipProps) {
  if (!text) return <>{children}</>;
  return (
    <span className="term-tip" tabIndex={0}>
      {children}
      <span className="term-tip__bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}
