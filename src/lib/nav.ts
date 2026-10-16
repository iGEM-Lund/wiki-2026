import { reader } from '@/lib/keystatic/reader';

export type NavIconValue = { type: 'library'; name: string } | { type: 'custom'; url: string } | null;

export type NavTarget = { title: string; href: string };

export type NavItem = { name: string; icon: NavIconValue } & (
  | { kind: 'link'; target: NavTarget }
  | { kind: 'dropdown'; items: NavTarget[] }
);

export type RawIcon = { discriminant: 'library'; value: string } | { discriminant: 'custom'; value: string };

export function resolveIcon(icon: RawIcon): NavIconValue {
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

    const dropdownItems = (await Promise.all(item.linkMode.value.map(resolveTarget))).filter(
      (target): target is NavTarget => target !== null,
    );

    if (dropdownItems.length > 0) items.push({ name: item.name, icon, kind: 'dropdown', items: dropdownItems });
  }

  return items;
}

export type NextPage = { label: string; section: string; href: string };

// The page after `slug` in the nav's reading order: every link left to
// right, dropdowns read top to bottom. Null on the last page and on pages
// the nav doesn't link to.
export async function getNextPage(slug: string): Promise<NextPage | null> {
  const order = (await getNav()).flatMap((item) =>
    item.kind === 'link'
      ? [{ label: item.name, section: item.name, href: item.target.href }]
      : item.items.map((target) => ({ label: target.title.trim(), section: item.name, href: target.href })),
  );
  const index = order.findIndex((page) => page.href === `/${slug}`);
  return index === -1 ? null : (order[index + 1] ?? null);
}
