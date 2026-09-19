type PdfEmbedProps = {
  src?: string;
  title?: string;
  caption?: string;
};

// Plain <iframe>, not a PDF.js/library viewer: content PDFs are always
// external static.igem.wiki URLs (uploaded via
// teams.igem.org/6160/deliverables/wiki/uploads), and every evergreen
// browser renders a PDF natively inside an iframe — same reasoning as
// FigureWithCaption's plain <img>. The "open in new tab" link is a fallback
// for browsers/settings that force-download instead of rendering inline.
export function PdfEmbed({ src, title = 'PDF document', caption }: PdfEmbedProps) {
  return (
    <figure className="pdf-embed">
      {src ? (
        <>
          <iframe className="pdf-embed__frame" src={src} title={title} />
          <a className="pdf-embed__open-link" href={src} target="_blank" rel="noopener noreferrer">
            Open &ldquo;{title}&rdquo; in a new tab ↗
          </a>
        </>
      ) : null}
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
