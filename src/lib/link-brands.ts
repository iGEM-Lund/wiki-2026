// Sites whose logo the external-link marker shows in place of the globe
// (src/components/link-arrow.tsx). The logos are uploaded to iGEM's static
// host like every other image on the wiki. All but iGEM's are single-colour
// black marks (`mono`), which the marker recolours to its thread colour.
const LOGOS = 'https://static.igem.wiki/teams/6160/wiki/logos';

export type LinkBrand = { src: string; mono: boolean };

const brand = (name: string, mono = true): LinkBrand => ({ src: `${LOGOS}/${name}.svg`, mono });

// Matched against the link's hostname and every parent domain of it, so
// "registry.igem.org" is found under "igem.org".
const BRANDS: Record<string, LinkBrand> = {
  'facebook.com': brand('facebook'),
  'fb.com': brand('facebook'),
  'instagram.com': brand('instagram'),
  'youtube.com': brand('youtube'),
  'youtu.be': brand('youtube'),
  'spotify.com': brand('spotify'),
  'linkedin.com': brand('linkedin'),
  'doi.org': brand('doi'),
  'github.com': brand('github'),
  'igem.org': brand('igem', false),
  'igem.wiki': brand('igem', false),
};

export const LINK_BRANDS = Object.values(BRANDS);

export function brandForHost(hostname: string): LinkBrand | null {
  const parts = hostname.toLowerCase().split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const found = BRANDS[parts.slice(i).join('.')];
    if (found) return found;
  }
  return null;
}
