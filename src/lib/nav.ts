import { reader } from '@/lib/keystatic/reader';

export type NavIconValue = { type: 'library'; name: string } | { type: 'custom'; url: string } | null;

export type NavTarget = { title: string; href: string };

export type NavItem = { name: string; icon: NavIconValue } & (
  | { kind: 'link'; target: NavTarget }
  | { kind: 'dropdown'; items: { label: string; target: NavTarget }[] }
);

type RawIcon = { discriminant: 'library'; value: string } | { discriminant: 'custom'; value: string };

function resolveIcon(icon: RawIcon): NavIconValue {
  return icon.discriminant === 'library' ? { type: 'library', name: icon.value } : { type: 'custom', url: icon.value };
}

async function resolveTarget(slug: string | null): Promise<NavTarget | null> {
  if (!slug) return null;
  const entry = await reader.collections.pages.read(slug);
  return entry ? { title: entry.title, href: `/${slug}` } : null;
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
        item.linkMode.value.map(async (entry: { label: string; target: string | null }) => ({
          label: entry.label,
          target: await resolveTarget(entry.target),
        })),
      )
    ).filter((entry): entry is { label: string; target: NavTarget } => entry.target !== null);

    if (dropdownItems.length > 0) items.push({ name: item.name, icon, kind: 'dropdown', items: dropdownItems });
  }

  return items;
}
