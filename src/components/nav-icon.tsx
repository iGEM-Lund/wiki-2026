// Deep subpath (not the `lucide-react/dynamic` client component) so this
// resolves the icon during the server render / static build — the SVG ends
// up baked into the prerendered HTML, no client-side fetch or hydration
// flash, which matters for the `output: 'export'` production build.
import dynamicIconImports from 'lucide-react/dynamicIconImports.mjs';
import type { NavIconValue } from '@/lib/nav';

type IconProps = { className?: string; size?: number };

async function LibraryIcon({ name, ...props }: { name: string } & IconProps) {
  const importIcon = dynamicIconImports[name as keyof typeof dynamicIconImports];
  if (!importIcon) return null;
  const { default: Icon } = await importIcon();
  return <Icon {...props} />;
}

export async function NavIcon({ icon, ...props }: { icon: NavIconValue } & IconProps) {
  if (!icon) return null;
  if (icon.type === 'library') {
    return <LibraryIcon name={icon.name} {...props} />;
  }
  return <img src={icon.url} alt="" width={props.size} height={props.size} className={props.className} />;
}
