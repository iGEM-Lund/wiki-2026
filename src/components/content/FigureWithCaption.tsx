type FigureWithCaptionProps = {
  src?: string;
  alt?: string;
  caption?: string;
};

// Plain <img>, not next/image: content images are always external
// static.igem.wiki URLs (uploaded via tools.igem.org/uploads), and Image
// Optimization is off anyway for the static export build (see next.config.ts).
export function FigureWithCaption({ src, alt = '', caption }: FigureWithCaptionProps) {
  return (
    <figure className="figure-with-caption">
      {src ? <img src={src} alt={alt} /> : null}
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
