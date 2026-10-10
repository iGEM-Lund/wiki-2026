import { reader } from '@/lib/keystatic/reader';
import { resolveIcon, type NavIconValue } from '@/lib/nav';

export type FooterData = {
  sponsors: { name: string; logoUrl: string; websiteUrl: string }[];
  socials: { label: string; icon: NavIconValue; url: string }[];
  contact: { email: string; address: string; note: string };
  legal: { year: string; licenseUrl: string; repositoryUrl: string } | null;
};

// Used when the singleton hasn't been saved yet, so the licence notice
// iGEM expects is always present.
const DEFAULT_LEGAL = {
  year: '2026',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  repositoryUrl: 'https://gitlab.igem.org/2026/lund',
};

export async function getFooter(): Promise<FooterData> {
  const footer = await reader.singletons.footer.read();
  if (!footer) {
    return { sponsors: [], socials: [], contact: { email: '', address: '', note: '' }, legal: DEFAULT_LEGAL };
  }

  const legal = footer.legal.showNotice
    ? {
        year: footer.legal.year || DEFAULT_LEGAL.year,
        licenseUrl: footer.legal.licenseUrl || DEFAULT_LEGAL.licenseUrl,
        repositoryUrl: footer.legal.repositoryUrl || DEFAULT_LEGAL.repositoryUrl,
      }
    : null;

  return {
    sponsors: footer.sponsors
      .filter((s) => s.logoUrl && s.websiteUrl)
      .map((s) => ({ name: s.name, logoUrl: s.logoUrl as string, websiteUrl: s.websiteUrl as string })),
    socials: footer.socials
      .filter((s) => s.url)
      .map((s) => ({ label: s.label, icon: resolveIcon(s.icon), url: s.url as string })),
    contact: {
      email: footer.contact.email ?? '',
      address: footer.contact.address ?? '',
      note: footer.contact.note ?? '',
    },
    legal,
  };
}
