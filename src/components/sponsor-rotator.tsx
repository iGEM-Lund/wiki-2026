type Sponsor = { name: string; logoUrl: string; websiteUrl: string };

// Logos that fit side by side in the footer column; fewer sponsors than
// this sit in a static row, more scroll past in a single endless line.
const MAX_STATIC = 5;
const SECONDS_PER_LOGO = 3;

function Logos({ sponsors, hidden }: { sponsors: Sponsor[]; hidden?: boolean }) {
  return (
    <ul className="sponsor-rotator__list" aria-hidden={hidden || undefined}>
      {sponsors.map((sponsor) => (
        <li key={sponsor.websiteUrl + sponsor.logoUrl} className="sponsor-rotator__slide">
          <a
            href={sponsor.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={hidden ? -1 : undefined}
            aria-label={sponsor.name}
            title={sponsor.name}
          >
            <img src={sponsor.logoUrl} alt={hidden ? '' : sponsor.name} loading="lazy" />
          </a>
        </li>
      ))}
    </ul>
  );
}

// One line of logos. Pure CSS (no client JS): with many sponsors the line
// scrolls endlessly, pausing on hover or focus; under reduced motion (OS
// setting or the site's own toggle) the scrolling stops and the line
// becomes horizontally scrollable instead (see globals.css).
export function SponsorRotator({ sponsors }: { sponsors: Sponsor[] }) {
  if (sponsors.length <= MAX_STATIC) {
    return (
      <div className="sponsor-rotator">
        <Logos sponsors={sponsors} />
      </div>
    );
  }
  return (
    <div className="sponsor-rotator sponsor-rotator--scrolling">
      <div className="sponsor-rotator__track" style={{ animationDuration: `${sponsors.length * SECONDS_PER_LOGO}s` }}>
        <Logos sponsors={sponsors} />
        <Logos sponsors={sponsors} hidden />
      </div>
    </div>
  );
}
