type Logo = { name: string; logoUrl: string; websiteUrl?: string };

// Logos that fit side by side in the footer column (and on a phone-width
// page); fewer than this sit in a static row, more scroll past in a single
// endless line.
const MAX_STATIC = 5;
const SECONDS_PER_LOGO = 3;

function Logos({ logos, hidden }: { logos: Logo[]; hidden?: boolean }) {
  return (
    <ul className="sponsor-rotator__list" aria-hidden={hidden || undefined}>
      {logos.map((logo, index) => {
        const img = <img src={logo.logoUrl} alt={hidden ? '' : logo.name} loading="lazy" />;
        return (
          <li key={index} className="sponsor-rotator__slide">
            {logo.websiteUrl ? (
              <a
                className="sponsor-rotator__tile"
                href={logo.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={hidden ? -1 : undefined}
                aria-label={logo.name}
                title={logo.name}
              >
                {img}
              </a>
            ) : (
              <span className="sponsor-rotator__tile" title={logo.name}>
                {img}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// One line of logos. Pure CSS (no client JS): with many logos the line
// scrolls endlessly, pausing on hover or focus; under reduced motion (OS
// setting or the site's own toggle) the scrolling stops and the line
// becomes horizontally scrollable instead (see globals.css). Used by the
// footer's sponsors and by the LogoStrip content component.
export function SponsorRotator({ sponsors }: { sponsors: Logo[] }) {
  if (sponsors.length <= MAX_STATIC) {
    return (
      <div className="sponsor-rotator">
        <Logos logos={sponsors} />
      </div>
    );
  }
  return (
    <div className="sponsor-rotator sponsor-rotator--scrolling">
      <div className="sponsor-rotator__track" style={{ animationDuration: `${sponsors.length * SECONDS_PER_LOGO}s` }}>
        <Logos logos={sponsors} />
        <Logos logos={sponsors} hidden />
      </div>
    </div>
  );
}
