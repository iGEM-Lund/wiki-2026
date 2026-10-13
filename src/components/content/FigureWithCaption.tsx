import type { CSSProperties } from 'react';
import { ExternalLink } from 'lucide-react';
import { ZoomableImage } from './ZoomableImage';
import { SmallFigureWatcher } from './SmallFigureWatcher';
import { tiltFor } from '@/lib/tilt';
import { renderCaption } from '@/lib/caption-text';

type FigureWithCaptionProps = {
  src?: string;
  alt?: string;
  caption?: string;
  // Optional external URL: makes the whole figure a link, hinted by a small
  // icon in the image's lower left corner.
  link?: string | null;
  // Percentage of the column width the figure may occupy (10 to 100).
  scale?: number | null;
  // No polaroid: the image and caption sit straight on the page, without
  // the white card, tape, tilt, shadow or hover lift.
  plain?: boolean | null;
  // No hover zoom and no click-to-enlarge lightbox.
  noZoom?: boolean | null;
};

// Plain <img>, not next/image: content images are always external
// static.igem.wiki URLs (uploaded via teams.igem.org/6160/deliverables/wiki/uploads), and Image
// Optimization is off anyway for the static export build (see next.config.ts).
// ZoomableImage adds the hover zoom and click-to-enlarge lightbox; with a
// link the whole figure (image and caption) is that link instead, and with
// noZoom the image is just an image.
export function FigureWithCaption({ src, alt = '', caption, link, scale, plain, noZoom }: FigureWithCaptionProps) {
  // A Figure block inserted but never filled in: nothing to show.
  if (!src && !caption) return null;
  const pct = scale != null && scale > 0 && scale < 100 ? scale : null;
  const media = src ? (
    <div className="figure-with-caption__media">
      <ZoomableImage src={src} alt={alt} caption={caption} enlargeable={!link && !noZoom} />
      {link ? <ExternalLink className="figure-with-caption__link-icon" aria-hidden size={18} /> : null}
    </div>
  ) : null;
  const captionElement = caption ? <figcaption>{renderCaption(caption)}</figcaption> : null;
  return (
    // A polaroid taped to the page at a slight tilt (see .figure-with-caption
    // in globals.css), seeded by the image URL (or caption) so the angle is
    // stable across renders and neighbouring figures lean different ways.
    // A plain figure skips all of that (.figure-with-caption--plain).
    <figure
      className={plain ? 'figure-with-caption figure-with-caption--plain' : 'figure-with-caption'}
      style={{
        ...(plain ? {} : { '--tilt': tiltFor(src || caption || '') }),
        ...(pct ? { maxWidth: `${pct}%` } : {}),
      } as CSSProperties}
    >
      {plain ? null : <SmallFigureWatcher />}
      {link ? (
        <a className="figure-with-caption__anchor" href={link} target="_blank" rel="noopener noreferrer">
          {media}
          {captionElement}
          <span className="figure-with-caption__sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        <>
          {media}
          {captionElement}
        </>
      )}
    </figure>
  );
}
