'use client';

import { useEffect, useState } from 'react';

type Sponsor = { name: string; logoUrl: string; websiteUrl: string };

const INTERVAL_MS = 4000;

// One logo at a time, cross-fading through the list; pauses while hovered
// or focused. With reduced motion (OS setting or the site's own toggle) it
// stops rotating and lays every logo out in a row instead. Without JS the
// first sponsor is shown.
export function SponsorRotator({ sponsors }: { sponsors: Sponsor[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const root = document.documentElement;
    const sync = () => setReduced(query.matches || root.dataset.motion === 'reduce');
    sync();
    query.addEventListener('change', sync);
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-motion'] });
    return () => {
      query.removeEventListener('change', sync);
      observer.disconnect();
    };
  }, []);

  const rotating = sponsors.length > 1 && !reduced;

  useEffect(() => {
    if (!rotating || paused) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % sponsors.length), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [rotating, paused, sponsors.length]);

  return (
    <ul
      className={`sponsor-rotator${rotating ? ' sponsor-rotator--rotating' : ''}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {sponsors.map((sponsor, i) => {
        const active = !rotating || i === index;
        return (
          <li key={sponsor.websiteUrl + sponsor.logoUrl} className="sponsor-rotator__slide" data-active={active}>
            <a
              href={sponsor.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={active ? undefined : -1}
              aria-hidden={active ? undefined : true}
              aria-label={sponsor.name}
              title={sponsor.name}
            >
              <img src={sponsor.logoUrl} alt={sponsor.name} loading="lazy" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
