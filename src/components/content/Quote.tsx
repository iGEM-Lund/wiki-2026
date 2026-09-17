type QuoteProps = {
  quote?: string;
  quotee?: string;
};

// Two curved swooshes standing in for a quotation mark, drawn the same way
// as the AnTigone logo mark (src/components/antigone-logo.tsx) — open
// currentColor strokes with round caps/joins so there isn't a single sharp
// corner in the glyph, unlike a typographic " character.
function QuoteMark() {
  return (
    <svg className="quote-block__mark" viewBox="0 0 40 22" aria-hidden="true">
      <path
        d="M 7 2 C 17 2 17 13 9 17.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 25 2 C 35 2 35 13 27 17.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Quote({ quote, quotee }: QuoteProps) {
  if (!quote) return null;
  return (
    <figure className="quote-block">
      <QuoteMark />
      <blockquote className="quote-block__text">{quote}</blockquote>
      {quotee ? <figcaption className="quote-block__quotee">{quotee}</figcaption> : null}
    </figure>
  );
}
