// Alt text is required on figures; ones nobody has described yet hold this
// placeholder, and wear a "MISSING ALT TEXT" banner across the image until
// someone writes the real thing (see .missing-alt in globals.css).
export const MISSING_ALT = 'MISSING';

// A figure's alt prop as stored: plain text, or { decorative: true, text }
// for a figure marked decorative (src/lib/keystatic/alt-text-field.tsx).
export type AltProp = string | { decorative?: boolean; text?: string } | null | undefined;

// The alt text to put on the image. A decorative figure gets empty alt text,
// so screen readers skip it, whatever its (switched off) alt text says.
export function readAlt(alt: AltProp): { alt: string; decorative: boolean } {
  if (alt && typeof alt === 'object') {
    return alt.decorative ? { alt: '', decorative: true } : { alt: alt.text ?? '', decorative: false };
  }
  return { alt: alt ?? '', decorative: false };
}

export function isMissingAlt(alt: AltProp): boolean {
  const { alt: text, decorative } = readAlt(alt);
  return !decorative && (!text.trim() || text.trim() === MISSING_ALT);
}

export function MissingAltBanner({ alt }: { alt: AltProp }) {
  if (!isMissingAlt(alt)) return null;
  return (
    <span className="missing-alt" aria-hidden="true">
      <span className="missing-alt__text">MISSING ALT TEXT</span>
    </span>
  );
}
