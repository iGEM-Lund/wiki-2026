import { NavIcon } from '@/components/nav-icon';

type InlineIconProps = {
  iconType?: 'library' | 'custom' | null;
  libraryIcon?: string | null;
  customUrl?: string | null;
  label?: string | null;
  href?: string | null;
};

// A small icon that sits in the flow of a sentence, optionally a link (e.g.
// a team member's GitHub or LinkedIn on their card). The icon itself is
// resolved the same way as nav icons (see src/components/nav-icon.tsx), so a
// library icon is baked into the HTML as inline SVG at build time.
export function InlineIcon({ iconType, libraryIcon, customUrl, label, href }: InlineIconProps) {
  const icon =
    iconType === 'custom'
      ? customUrl
        ? ({ type: 'custom', url: customUrl } as const)
        : null
      : { type: 'library', name: libraryIcon || 'circle' } as const;
  if (!icon) return null;

  const glyph = <NavIcon icon={icon} size={18} />;
  if (!href) {
    return (
      <span className="inline-icon" role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true}>
        {glyph}
      </span>
    );
  }
  const external = /^https?:\/\//.test(href);
  return (
    <a
      className="inline-icon inline-icon--link"
      href={href}
      aria-label={label || undefined}
      title={label || undefined}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {glyph}
    </a>
  );
}
