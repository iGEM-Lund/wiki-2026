import { SponsorRotator } from '@/components/sponsor-rotator';

type LogoStripLogo = { src: string; alt?: string; link?: string };

// The footer's sponsor line, placed in page content: a row of small logo
// tiles that scrolls endlessly once there are more than fit at once.
export function LogoStrip({ logos = [] }: { logos?: LogoStripLogo[] }) {
  const items = logos
    .filter((logo) => logo.src)
    .map((logo) => ({ name: logo.alt ?? '', logoUrl: logo.src, websiteUrl: logo.link || undefined }));
  if (items.length === 0) return null;
  return (
    <div className="logo-strip">
      <SponsorRotator sponsors={items} />
    </div>
  );
}
