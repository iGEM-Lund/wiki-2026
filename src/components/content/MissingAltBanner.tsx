// Alt text is required on figures; ones nobody has described yet hold this
// placeholder, and wear a "MISSING ALT TEXT" banner across the image until
// someone writes the real thing (see .missing-alt in globals.css).
export const MISSING_ALT = 'MISSING';

export function isMissingAlt(alt: string | null | undefined): boolean {
  return !alt?.trim() || alt.trim() === MISSING_ALT;
}

export function MissingAltBanner({ alt }: { alt: string | null | undefined }) {
  if (!isMissingAlt(alt)) return null;
  return (
    <span className="missing-alt" aria-hidden="true">
      <span className="missing-alt__text">MISSING ALT TEXT</span>
    </span>
  );
}
