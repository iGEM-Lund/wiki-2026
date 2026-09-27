import type { ComponentPropsWithoutRef } from 'react';

// Markdown tables written in the editor. Wrapped so a wide table scrolls
// sideways inside its own box instead of stretching the page on phones.
export function Table(props: ComponentPropsWithoutRef<'table'>) {
  return (
    <div className="table-scroll">
      <table {...props} />
    </div>
  );
}
