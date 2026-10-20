'use client';

import { useState } from 'react';

// A patch like the quiz's (see .flipcard in globals.css) with a text on each
// side. Clicking it (or Enter / Space, since it is a real button) turns it
// over to show the other side. Both faces share one grid cell so the card is
// as tall as the longer text and never jumps; the hidden face is aria-hidden
// so screen readers read only the side that is showing. Plain state in the
// browser, so it works in the static export.
export function Flipcard({ front, back }: { front?: string | null; back?: string | null }) {
  const [flipped, setFlipped] = useState(false);
  if (!front && !back) return null;
  return (
    <button
      type="button"
      className="flipcard"
      data-flipped={flipped ? 'true' : 'false'}
      aria-label={flipped ? 'Showing the back, click to flip' : 'Showing the front, click to flip'}
      onClick={() => setFlipped((value) => !value)}
    >
      <span className="flipcard__inner">
        <span className="flipcard__face flipcard__face--front" aria-hidden={flipped}>
          {front}
        </span>
        <span className="flipcard__face flipcard__face--back" aria-hidden={!flipped}>
          {back}
        </span>
      </span>
    </button>
  );
}
