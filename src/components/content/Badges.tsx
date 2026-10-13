// The cloth colours a badge (a sewn-on patch) can take, all from the brand
// palette (see .badge--* in globals.css). Kept here so the Keystatic select and the
// automatic pick below share one list.
export const BADGE_COLORS = ['teal', 'crimson', 'rose', 'depths', 'kraft'] as const;
export type BadgeColor = (typeof BADGE_COLORS)[number];

// "Automatic" picks a colour from the badge text itself, so the same
// committee or pillar gets the same colour on every card and every page
// without anyone having to keep the choices in sync by hand.
function colorFor(text: string): BadgeColor {
  let hash = 0;
  for (const char of text.trim().toLowerCase()) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length];
}

export type Badge = { text?: string | null; color?: BadgeColor | 'auto' | null };

// A row of small coloured tags, e.g. the committees on a team member's card
// or the pillars an education event belongs to, optionally led by a bold
// label ("Pillar(s):") like the other fact lines on a card. A block rather
// than an inline component: MDX reads a line holding nothing but tags as
// separate blocks, so a row of inline badges would come apart into one
// paragraph each the next time Keystatic saved the page. It still renders
// as a paragraph, so on a card the row sits on the ruling like text.
export function Badges({ label, badges = [] }: { label?: string | null; badges?: Badge[] }) {
  const shown = badges.filter((badge) => badge.text);
  if (shown.length === 0) return null;
  return (
    <p className="badges">
      {label ? <strong className="badges__label">{label}</strong> : null}
      {shown.map((badge, index) => {
        const text = badge.text as string;
        const tone = badge.color && badge.color !== 'auto' ? badge.color : colorFor(text);
        return (
          <span key={index} className={`badge badge--${tone}`}>
            {text}
          </span>
        );
      })}
    </p>
  );
}
