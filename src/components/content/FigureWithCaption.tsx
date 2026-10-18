import type { CSSProperties } from 'react';
import { ExternalLink, MessageCircle } from 'lucide-react';
import { ZoomableImage } from './ZoomableImage';
import { SmallFigureWatcher } from './SmallFigureWatcher';
import { MissingAltBanner, readAlt, type AltProp } from './MissingAltBanner';
import { tiltFor } from '@/lib/tilt';
import { KIND_LABELS, renderLabelledCaption } from '@/lib/caption-text';

type FigureWithCaptionProps = {
  src?: string;
  alt?: AltProp;
  caption?: string;
  // Optional external URL: makes the whole figure a link, hinted by a small
  // icon in the image's lower left corner.
  link?: string | null;
  // Speech bubbles laid over the image, each a link out (x and y are percent
  // of the image). Takes over the figure's own link and enlarge-on-click.
  bubbles?: { name: string; url: string; x: number; y: number }[] | null;
  // Percentage of the column width the figure may occupy (10 to 100).
  scale?: number | null;
  // No polaroid: the image and caption sit straight on the page, without
  // the white card, tape, tilt, shadow or hover lift.
  plain?: boolean | null;
  // No hover zoom and no click-to-enlarge lightbox.
  noZoom?: boolean | null;
  // Reference code (the anchor a Ref links to) and the automatic number,
  // set by src/lib/numbering.ts when `numbered` is ticked.
  refId?: string;
  number?: string;
};

// Plain <img>, not next/image: content images are always external
// static.igem.wiki URLs (uploaded via teams.igem.org/6160/deliverables/wiki/uploads), and Image
// Optimization is off anyway for the static export build (see next.config.ts).
// ZoomableImage adds the hover zoom and click-to-enlarge lightbox; with a
// link the whole figure (image and caption) is that link instead, and with
// noZoom the image is just an image.
export function FigureWithCaption({ src, alt, caption, link: figureLink, bubbles, scale, plain, noZoom, refId, number }: FigureWithCaptionProps) {
  const hasBubbles = !!bubbles?.length;
  const link = hasBubbles ? null : figureLink;
  // A Figure block inserted but never filled in: nothing to show.
  if (!src && !caption) return null;
  // The enlarged view's caption takes the number too, as plain caption text.
  const lightboxCaption = number ? `${KIND_LABELS.figure} ${number}.${caption ? ` ${caption}` : ''}` : caption;
  const pct = scale != null && scale > 0 && scale < 100 ? scale : null;
  const media = src ? (
    <div className="figure-with-caption__media">
      <ZoomableImage src={src} alt={readAlt(alt).alt} caption={lightboxCaption} enlargeable={!link && !noZoom && !hasBubbles} />
      <MissingAltBanner alt={alt} />
      {bubbles?.map((b, i) => (
        <a
          key={i}
          className="figure-with-caption__bubble"
          href={b.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ left: `${b.x}%`, top: `${b.y}%` }}
          aria-label={`Listen to ${b.name}'s episode on Spotify (opens in a new tab)`}
        >
          <MessageCircle aria-hidden size={20} />
          <span className="figure-with-caption__bubble-name" aria-hidden>
            {b.name}
          </span>
        </a>
      ))}
      {link ? <ExternalLink className="figure-with-caption__link-icon" aria-hidden size={18} /> : null}
    </div>
  ) : null;
  const captionElement =
    caption || number ? <figcaption>{renderLabelledCaption('figure', number, caption)}</figcaption> : null;
  return (
    // A polaroid taped to the page at a slight tilt (see .figure-with-caption
    // in globals.css), seeded by the image URL (or caption) so the angle is
    // stable across renders and neighbouring figures lean different ways.
    // A plain figure skips all of that (.figure-with-caption--plain).
    <figure
      id={refId || undefined}
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
