type FigureWithCaptionProps = {
  src?: string;
  alt?: string;
  caption?: string;
  align?: 'none' | 'left' | 'right';
};

// Plain <img>, not next/image: content images are always external
// static.igem.wiki URLs (uploaded via teams.igem.org/6160/deliverables/wiki/uploads), and Image
// Optimization is off anyway for the static export build (see next.config.ts).
export function FigureWithCaption({ src, alt = '', caption, align = 'none' }: FigureWithCaptionProps) {
  const className =
    align === 'none' ? 'figure-with-caption' : `figure-with-caption figure-with-caption--float-${align}`;
  return (
    <figure className={className}>
      {src ? <img src={src} alt={alt} /> : null}
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
