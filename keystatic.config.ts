import { config, collection, singleton, fields, type ComponentSchema, type Singleton } from '@keystatic/core';
import { contentComponents } from './src/lib/keystatic/content-components';
import { STANDARD_PAGES } from './src/lib/standard-pages';
import { ICON_NAMES } from './src/lib/icon-names';

// Defense-in-depth only — the primary exclusion mechanism for the production
// export build is that scripts/keystatic-routes.mjs physically removes the
// admin route files before `next build` runs. See keystatic-admin/layout.tsx
// and keystatic-admin/route.ts for where this flag is consumed.
export const showAdminUI = process.env.BUILD_TARGET !== 'production';

// Shared by the navigation singleton below: a nav item's (or dropdown
// entry's) icon is either picked from the bundled lucide-react library
// (rendered as inline SVG at build time, see src/components/nav-icon.tsx)
// or a custom image URL, uploaded via tools.igem.org/uploads like every
// other image reference in this project — never a Keystatic image-upload
// field, which would commit the binary into the repo.
const iconField = fields.conditional(
  fields.select({
    label: 'Icon Type',
    options: [
      { label: 'Library icon', value: 'library' },
      { label: 'Custom icon (image URL)', value: 'custom' },
    ],
    defaultValue: 'library',
  }),
  {
    library: fields.select({
      label: 'Icon',
      options: ICON_NAMES.map((name) => ({ label: name, value: name })),
      defaultValue: 'circle',
    }),
    custom: fields.url({
      label: 'Icon URL',
      description: 'Upload via tools.igem.org/uploads, then paste the static.igem.wiki URL here.',
      validation: { isRequired: true },
    }),
  },
);

// Shared by the navigation singleton below: what a nav link (top-level or
// inside a dropdown) points at. Deliberately not an arbitrary URL field —
// every link resolves to a page this app actually renders, so nav entries
// can't go stale or point off-site.
const linkTargetField = fields.conditional(
  fields.select({
    label: 'Link Target Type',
    options: [
      { label: 'Page', value: 'page' },
      { label: 'Standard Page', value: 'standard' },
    ],
    defaultValue: 'page',
  }),
  {
    page: fields.relationship({ label: 'Page', collection: 'pages' }),
    standard: fields.select({
      label: 'Standard Page',
      options: STANDARD_PAGES.map(({ key, defaultTitle }) => ({ label: defaultTitle, value: key })),
      defaultValue: STANDARD_PAGES[0].key,
    }),
  },
);

const navItemSchema = fields.object({
  name: fields.text({ label: 'Name' }),
  icon: iconField,
  linkMode: fields.conditional(
    fields.select({
      label: 'Type',
      options: [
        { label: 'Direct link', value: 'link' },
        { label: 'Dropdown', value: 'dropdown' },
      ],
      defaultValue: 'link',
    }),
    {
      link: linkTargetField,
      dropdown: fields.array(
        fields.object({
          label: fields.text({ label: 'Label' }),
          target: linkTargetField,
        }),
        {
          label: 'Dropdown Items',
          itemLabel: (props) => props.fields.label.value || 'Item',
        },
      ),
    },
  ),
});

// The navigation singleton's schema and the STANDARD_PAGES singletons'
// schema are structurally different (nav items vs title/content), so
// letting TypeScript infer the combined `singletons` object's type — via
// either a spread-into-object-literal or a single Object.fromEntries over
// mixed tuple shapes — collapses field types to `unknown` at read time.
// Declaring this intermediate with an explicit `Record<string, Singleton<
// Record<string, ComponentSchema>>>` annotation keeps the index signature
// that src/lib/nav.ts and src/app/(site)/[slug]/page.tsx rely on for
// `reader.singletons[dynamicKey]`, while `reader.singletons.navigation` and
// `reader.singletons.<standardPageKey>` (accessed by literal property name)
// still narrow to their real schemas via Keystatic's own generics.
const singletons: Record<string, Singleton<Record<string, ComponentSchema>>> = {
  // Editorially-curated nav tree — see src/lib/nav.ts (resolves this into
  // render-ready data) and src/app/(site)/layout.tsx (renders it). Not a
  // slug-derived structure: writers place items and, per item, choose a
  // direct link or a dropdown of links, each pointing at a `pages` entry
  // or one of the STANDARD_PAGES singletons.
  navigation: singleton({
    label: 'Navigation',
    path: 'content/singletons/navigation',
    format: { data: 'yaml' },
    schema: {
      items: fields.array(navItemSchema, {
        label: 'Navigation Items',
        itemLabel: (props) => props.fields.name.value || 'Item',
      }),
    },
  }),
  // Singletons intentionally have no slug field — that absence is what
  // guarantees a fixed, non-writer-renameable path, since iGEM's Judging
  // Form links to these exact static URLs. One singleton is generated per
  // entry in STANDARD_PAGES, so adding a new required page is a one-line
  // change there rather than a new block here.
  ...Object.fromEntries(
    STANDARD_PAGES.map(({ key, slug, defaultTitle }) => [
      key,
      singleton({
        label: defaultTitle,
        path: `content/singletons/${slug}`,
        format: { contentField: 'content' },
        schema: {
          title: fields.text({ label: 'Title', defaultValue: defaultTitle }),
          content: fields.mdx({ label: 'Content', components: contentComponents }),
        },
      }),
    ]),
  ),
};

export default config({
  storage: {
    kind: 'github',
    repo: { owner: 'iGEM-Lund', name: 'wiki-2026' },
  },
  collections: {
    pages: collection({
      label: 'Pages',
      slugField: 'title',
      path: 'content/pages/*/',
      format: { contentField: 'content' },
      entryLayout: 'content',
      columns: ['title'],
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        content: fields.mdx({
          label: 'Content',
          components: contentComponents,
        }),
      },
    }),
  },
  singletons,
});
