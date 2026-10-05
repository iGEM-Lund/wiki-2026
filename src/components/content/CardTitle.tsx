import type { ReactNode } from 'react';

export type CardTitleProps = {
  image?: string;
  imageAlt?: string;
  subtitle?: string;
  children?: ReactNode;
};

// Marker component only: Card (see Card.tsx) pulls this out of its children
// by element type and renders it as the card's header, above everything
// else. The optional image and subtitle turn that header into a profile
// (portrait, name, role), which is what interview cards need, without
// writers hand-building a layout.
export function CardTitle({ children }: CardTitleProps) {
  return <>{children}</>;
}
