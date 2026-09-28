'use client';

import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { ZoomableImage } from './ZoomableImage';

export type ExpandableHeader = {
  name: ReactNode;
  image?: string;
  imageAlt?: string;
  subtitle?: string;
};

type ExpandableClientProps = {
  defaultOpen: boolean;
  title: ExpandableHeader | null;
  summary: ReactNode;
  children: ReactNode;
};

// The body opens by animating grid-template-rows from 0fr to 1fr (see
// .expandable__body in globals.css), which transitions to the content's real
// height without measuring it in JS. `inert` keeps the collapsed body out of
// the tab order and the accessibility tree while it's visually hidden.
export function ExpandableClient({ defaultOpen, title, summary, children }: ExpandableClientProps) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <section className="expandable" data-open={open}>
      {title ? (
        <header className="expandable__header">
          {title.image ? (
            <div className="expandable__figure">
              <ZoomableImage src={title.image} alt={title.imageAlt} />
            </div>
          ) : null}
          <div className="expandable__heading">
            <div className="expandable__title">
              {title.name}
            </div>
            {title.subtitle ? <p className="expandable__subtitle">{title.subtitle}</p> : null}
          </div>
        </header>
      ) : null}
      {summary ? <div className="expandable__summary">{summary}</div> : null}
      <div className="expandable__body" id={bodyId} inert={!open}>
        <div className="expandable__body-inner">{children}</div>
      </div>
      <button
        type="button"
        className="expandable__toggle"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{open ? 'Show less' : 'Read more'}</span>
        <ChevronDown className="expandable__icon" aria-hidden size={18} />
      </button>
    </section>
  );
}
