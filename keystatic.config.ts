import { config, collection, singleton, fields } from '@keystatic/core';
import { contentComponents } from './src/lib/keystatic/content-components';
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
// inside a dropdown) points at. Every required iGEM Standard URL Page
// (Project Description, Human Practices, ...) is just a `pages` entry with
// the exact slug iGEM's Judging Form expects — there's no separate
// singleton mechanism for them, so this only ever points at `pages`.
const linkTargetField = fields.relationship({ label: 'Page', collection: 'pages' });

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

export default config({
  storage: {
    kind: 'github',
    repo: { owner: 'iGEM-Lund', name: 'wiki-2026' },
  },
  collections: {
    // Every page on the site — including the mandatory iGEM Standard URL
    // Pages — is an entry here. There's no separate singleton mechanism for
    // "special" pages: whoever creates the Project Description / Human
    // Practices pages is responsible for giving them the exact slugs iGEM's
    // Judging Form links to (project-description, human-practices, ...) and
    // for not renaming or deleting them afterward.
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
  singletons: {
    // Editorially-curated nav tree — see src/lib/nav.ts (resolves this into
    // render-ready data) and src/app/(site)/layout.tsx (renders it). Not a
    // slug-derived structure: writers place items and, per item, choose a
    // direct link or a dropdown of links, each pointing at a `pages` entry.
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
  },
});
