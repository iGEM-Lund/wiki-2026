import { config, collection, singleton, fields } from '@keystatic/core';
import { contentComponents } from './src/lib/keystatic/content-components';
import { ICON_NAMES } from './src/lib/icon-names';

// Defense-in-depth only; the primary exclusion mechanism for the production
// export build is that scripts/keystatic-routes.mjs physically removes the
// admin route files before `next build` runs. See keystatic-admin/layout.tsx
// and keystatic-admin/route.ts for where this flag is consumed.
export const showAdminUI = process.env.BUILD_TARGET !== 'production';

// Shared by the navigation singleton below: a nav item's (or dropdown
// entry's) icon is either picked from the bundled lucide-react library
// (rendered as inline SVG at build time, see src/components/nav-icon.tsx)
// or a custom image URL, uploaded via teams.igem.org/6160/deliverables/wiki/uploads like every
// other image reference in this project, never a Keystatic image-upload
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
      description: 'Upload via teams.igem.org/6160/deliverables/wiki/uploads, then paste the static.igem.wiki URL here.',
      validation: { isRequired: true },
    }),
  },
);

// Shared by the navigation singleton below: what a nav link (top-level or
// inside a dropdown) points at. Every required iGEM Standard URL Page
// (Project Description, Human Practices, ...) is just a `pages` entry with
// the exact slug iGEM's Judging Form expects; there's no separate
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
      // Each item shows its page's title, so the menu can't drift from it.
      dropdown: fields.array(linkTargetField, {
        label: 'Dropdown Items',
        itemLabel: (props) => props.value || 'Page',
      }),
    },
  ),
});

export default config({
  storage: {
    kind: 'github',
    repo: { owner: 'iGEM-Lund', name: 'wiki-2026' },
  },
  collections: {
    // Every page on the site, including the mandatory iGEM Standard URL
    // Pages, is an entry here. There's no separate singleton mechanism for
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
          // Keystatic's built-in inline image button uploads local files into the
          // repo, which iGEM's rules forbid (see FigureWithCaption in
          // content-components.tsx, which takes a hosted URL instead).
          // h1 is the page title and h4 the deepest level the site styles
          // (src/lib/headings.ts clamps any h5/h6 that slip through anyway).
          options: { image: false, heading: [2, 3, 4] },
        }),
      },
    }),
    // Bibliography entries, cited from page content via the Citation content
    // component (see src/lib/keystatic/content-components.tsx). No MDX field
    // here, just the two forms of a citation, so this is a flat, data-only
    // collection (one YAML file per entry), the same shape as the navigation
    // singleton below.
    bibliography: collection({
      label: 'Bibliography',
      slugField: 'shortForm',
      path: 'content/bibliography/*',
      format: { data: 'yaml' },
      columns: ['shortForm'],
      schema: {
        shortForm: fields.slug({
          name: {
            label: 'Short Form',
            description:
              'How this reference reads inside parentheses, in APA 7 form without the parentheses themselves: "Barker et al., 2022", "Chen & Penning, 2014", "World Health Organization, 2026", "United Nations, n.d.". Use "et al." only from three authors up. The Citation component turns it into "Barker et al. (2022)" when set to read as part of the sentence.',
            validation: { isRequired: true },
          },
        }),
        longForm: fields.text({
          label: 'Long Form',
          multiline: true,
          description: 'Full citation for the References section.',
          validation: { isRequired: true },
        }),
      },
    }),
  },
  singletons: {
    // Editorially-curated nav tree; see src/lib/nav.ts (resolves this into
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
    // Site footer; see src/lib/footer.ts (resolves this) and
    // src/components/site-footer.tsx (renders it). The layout is fixed in
    // code, only the concrete content below is editable. Logos are URL
    // references (uploaded via the iGEM uploads tool like every other
    // image), never committed binaries.
    footer: singleton({
      label: 'Footer',
      path: 'content/singletons/footer',
      format: { data: 'yaml' },
      schema: {
        sponsors: fields.array(
          fields.object({
            name: fields.text({ label: 'Name', validation: { isRequired: true } }),
            logoUrl: fields.url({
              label: 'Logo URL',
              description: 'Upload via teams.igem.org/6160/deliverables/wiki/uploads, then paste the static.igem.wiki URL here.',
              validation: { isRequired: true },
            }),
            websiteUrl: fields.url({
              label: 'Website',
              description: 'Where the logo leads when clicked.',
              validation: { isRequired: true },
            }),
          }),
          {
            label: 'Sponsors',
            description: 'Logos rotate in the footer in this order. Each one links to the sponsor website.',
            itemLabel: (props) => props.fields.name.value || 'Sponsor',
          },
        ),
        socials: fields.array(
          fields.object({
            label: fields.text({ label: 'Label', description: 'e.g. "Instagram"; used as the accessible name.', validation: { isRequired: true } }),
            icon: iconField,
            url: fields.url({ label: 'URL', validation: { isRequired: true } }),
          }),
          {
            label: 'Social Links',
            itemLabel: (props) => props.fields.label.value || 'Link',
          },
        ),
        contact: fields.object(
          {
            email: fields.text({ label: 'Email' }),
            address: fields.text({ label: 'Address', multiline: true }),
            note: fields.text({ label: 'Note', multiline: true, description: 'Optional extra line, e.g. who to contact for what.' }),
          },
          { label: 'Contact' },
        ),
        legal: fields.object(
          {
            showNotice: fields.checkbox({ label: 'Show copyright and license notice', defaultValue: true }),
            year: fields.text({ label: 'Copyright Year', defaultValue: '2026' }),
            licenseUrl: fields.url({
              label: 'License URL',
              defaultValue: 'https://creativecommons.org/licenses/by/4.0/',
            }),
            repositoryUrl: fields.url({
              label: 'Repository URL',
              defaultValue: 'https://gitlab.igem.org/2026/lund',
            }),
          },
          { label: 'Copyright and License Notice' },
        ),
      },
    }),
  },
});
