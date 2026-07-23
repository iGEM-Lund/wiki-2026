import { reader } from '@/lib/keystatic/reader';
import { STANDARD_PAGES } from '@/lib/standard-pages';

export type NavIconValue = { type: 'library'; name: string } | { type: 'custom'; url: string } | null;

export type NavTarget = { title: string; href: string };

export type NavItem = { name: string; icon: NavIconValue } & (
  | { kind: 'link'; target: NavTarget }
  | { kind: 'dropdown'; items: { label: string; target: NavTarget }[] }
);

type RawIcon = { discriminant: 'library'; value: string } | { discriminant: 'custom'; value: string };
type RawTarget = { discriminant: 'page'; value: string | null } | { discriminant: 'standard'; value: string };

function resolveIcon(icon: RawIcon): NavIconValue {
  return icon.discriminant === 'library' ? { type: 'library', name: icon.value } : { type: 'custom', url: icon.value };
}

async function resolveTarget(target: RawTarget): Promise<NavTarget | null> {
  if (target.discriminant === 'page') {
    if (!target.value) return null;
    const entry = await reader.collections.pages.read(target.value);
    return entry ? { title: entry.title, href: `/${target.value}` } : null;
  }

  const def = STANDARD_PAGES.find((p) => p.key === target.value);
  if (!def) return null;
  const entry = await reader.singletons[def.key].read();
  return entry ? { title: entry.title, href: `/${def.slug}` } : null;
}

export async function getNav(): Promise<NavItem[]> {
  const nav = await reader.singletons.navigation.read();
  if (!nav) return [];

  const items: NavItem[] = [];
  for (const item of nav.items) {
    const icon = resolveIcon(item.icon);

    if (item.linkMode.discriminant === 'link') {
      const target = await resolveTarget(item.linkMode.value);
      if (target) items.push({ name: item.name, icon, kind: 'link', target });
      continue;
    }

    const dropdownItems = (
      await Promise.all(
        item.linkMode.value.map(async (entry: { label: string; target: RawTarget }) => ({
          label: entry.label,
          target: await resolveTarget(entry.target),
        })),
      )
    ).filter((entry): entry is { label: string; target: NavTarget } => entry.target !== null);

    if (dropdownItems.length > 0) items.push({ name: item.name, icon, kind: 'dropdown', items: dropdownItems });
  }

  return items;
}
