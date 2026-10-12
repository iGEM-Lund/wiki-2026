import type { CSSProperties } from 'react';
import { ZoomableImage } from './ZoomableImage';
import { tiltFor } from '@/lib/tilt';

type QuoteProps = {
  quote?: string;
  quotee?: string;
  figure?: string;
  figureAlt?: string;
};

// The optional figure sits in a narrow column left of the text (see
// .quote-block--with-figure in globals.css) and still opens the Lightbox on
// click, like a FigureWithCaption. The quote is a sticky note pinned to the
// page at a slight tilt, seeded by its own text so it's stable across
// renders and neighbouring quotes lean different ways.
export function Quote({ quote, quotee, figure, figureAlt = '' }: QuoteProps) {
  if (!quote) return null;
  return (
    <figure
      className={figure ? 'quote-block quote-block--with-figure' : 'quote-block'}
      style={{ '--tilt': tiltFor(quote) } as CSSProperties}
    >
      {figure ? (
        <div className="quote-block__figure">
          <ZoomableImage src={figure} alt={figureAlt} caption={quotee} />
        </div>
      ) : null}
      <blockquote className="quote-block__text">{quote}</blockquote>
      {quotee ? <figcaption className="quote-block__quotee">{quotee}</figcaption> : null}
    </figure>
  );
}
