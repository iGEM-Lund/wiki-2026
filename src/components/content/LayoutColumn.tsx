import type { ReactNode } from 'react';

type LayoutColumnProps = {
  children?: ReactNode;
};

export function LayoutColumn({ children }: LayoutColumnProps) {
  return <div className="layout__column">{children}</div>;
}
