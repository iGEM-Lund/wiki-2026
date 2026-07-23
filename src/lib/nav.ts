import { reader } from '@/lib/keystatic/reader';
import { STANDARD_URL_PAGES } from '@/lib/standard-pages';

export type NavLink = { title: string; href: string; order: number };
export type NavSection = { section: string; label: string; links: NavLink[] };

// Keep in sync with SECTION_OPTIONS in keystatic.config.ts — Keystatic has
// no mechanism for sharing an enum between config and app code.
const SECTION_ORDER: { value: string; label: string }[] = [
  { value: 'team', label: 'Team' },
  { value: 'project', label: 'Project' },
  { value: 'protocols', label: 'Protocols' },
  { value: 'notebook', label: 'Notebook' },
  { value: 'safety', label: 'Safety' },
  { value: 'attributions', label: 'Attributions' },
];

export async function getNav(): Promise<NavSection[]> {
  const entries = await reader.collections.pages.all();

  const bySection = new Map<string, NavLink[]>();
  for (const { slug, entry } of entries) {
    const links = bySection.get(entry.section) ?? [];
    links.push({ title: entry.title, href: `/${entry.section}/${slug}`, order: entry.order ?? 0 });
    bySection.set(entry.section, links);
  }

  const knownSections = new Set(SECTION_ORDER.map((s) => s.value));
  const orderedSectionKeys = [...SECTION_ORDER.map((s) => s.value), ...[...bySection.keys()].filter((s) => !knownSections.has(s))];

  const sections: NavSection[] = orderedSectionKeys
    .filter((value) => bySection.has(value))
    .map((value) => {
      const label = SECTION_ORDER.find((s) => s.value === value)?.label ?? value;
      const links = (bySection.get(value) ?? []).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
      return { section: value, label, links };
    });

  const judgingLinks: NavLink[] = [];
  for (const { key, href } of STANDARD_URL_PAGES) {
    const singleton = await reader.singletons[key].read();
    if (singleton) {
      judgingLinks.push({ title: singleton.title, href, order: 0 });
    }
  }
  if (judgingLinks.length > 0) {
    sections.push({ section: 'judging', label: 'Judging Pages', links: judgingLinks });
  }

  return sections;
}
