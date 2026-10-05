import { ZoomableImage } from './ZoomableImage';

type FigureWithCaptionProps = {
  src?: string;
  alt?: string;
  caption?: string;
};

// Plain <img>, not next/image: content images are always external
// static.igem.wiki URLs (uploaded via teams.igem.org/6160/deliverables/wiki/uploads), and Image
// Optimization is off anyway for the static export build (see next.config.ts).
// ZoomableImage adds the hover zoom and click-to-enlarge lightbox.
export function FigureWithCaption({ src, alt = '', caption }: FigureWithCaptionProps) {
  // A Figure block inserted but never filled in: nothing to show.
  if (!src && !caption) return null;
  return (
    <figure className="figure-with-caption">
      {src ? <ZoomableImage src={src} alt={alt} caption={caption} /> : null}
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
