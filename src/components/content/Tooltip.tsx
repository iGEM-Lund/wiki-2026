'use client';

import type { ReactNode } from 'react';
import { useHangingPopover } from '@/lib/use-hanging-popover';

type TooltipProps = {
  text?: string | null;
  children?: ReactNode;
};

// Hover/focus explanation attached to a term (see `.term-tip` in
// globals.css): focusable so keyboard and touch users get it too, and the
// explanation is real text in the DOM (role="tooltip") rather than a CSS
// `content` string, so screen readers and search can see it. Hung as a
// popover (useHangingPopover) so a card or table around the term can't
// clip it.
export function Tooltip({ text, children }: TooltipProps) {
  const hanging = useHangingPopover('.term-tip__bubble', ':hover, :focus, :focus-visible');
  if (!text) return <>{children}</>;
  return (
    <span className="term-tip" tabIndex={0} {...hanging}>
      {children}
      <span className="term-tip__bubble" role="tooltip" popover="manual">
        {text}
      </span>
    </span>
  );
}
