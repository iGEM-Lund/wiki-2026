import { ZoomableImage } from './ZoomableImage';

type FigureWithCaptionProps = {
  src?: string;
  alt?: string;
  caption?: string;
  // Percentage of the column width the figure may occupy (10 to 100).
  scale?: number | null;
};

// Plain <img>, not next/image: content images are always external
// static.igem.wiki URLs (uploaded via teams.igem.org/6160/deliverables/wiki/uploads), and Image
// Optimization is off anyway for the static export build (see next.config.ts).
// ZoomableImage adds the hover zoom and click-to-enlarge lightbox.
export function FigureWithCaption({ src, alt = '', caption, scale }: FigureWithCaptionProps) {
  // A Figure block inserted but never filled in: nothing to show.
  if (!src && !caption) return null;
  const pct = scale != null && scale > 0 && scale < 100 ? scale : null;
  return (
    <figure className="figure-with-caption" style={pct ? { maxWidth: `${pct}%` } : undefined}>
      {src ? <ZoomableImage src={src} alt={alt} caption={caption} /> : null}
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
