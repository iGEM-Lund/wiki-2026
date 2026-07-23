import { config, collection, singleton, fields } from '@keystatic/core';
import { contentComponents } from './src/lib/keystatic/content-components';

// Defense-in-depth only — the primary exclusion mechanism for the production
// export build is that scripts/keystatic-routes.mjs physically removes the
// admin route files before `next build` runs. See keystatic-admin/layout.tsx
// and keystatic-admin/route.ts for where this flag is consumed.
export const showAdminUI = process.env.BUILD_TARGET !== 'production';

// Keep in sync with SECTION_ORDER in src/lib/nav.ts — Keystatic has no
// mechanism for sharing an enum between this config and app code.
const SECTION_OPTIONS = [
  { label: 'Team', value: 'team' },
  { label: 'Project', value: 'project' },
  { label: 'Protocols', value: 'protocols' },
  { label: 'Notebook', value: 'notebook' },
  { label: 'Safety', value: 'safety' },
  { label: 'Attributions', value: 'attributions' },
];

export default config({
  storage: {
    kind: 'github',
    repo: { owner: 'iGEM-Lund-2026', name: 'Wiki' },
  },
  collections: {
    pages: collection({
      label: 'Pages',
      slugField: 'title',
      path: 'content/pages/*/',
      format: { contentField: 'content' },
      entryLayout: 'content',
      columns: ['title', 'section', 'order'],
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        section: fields.select({
          label: 'Section',
          options: SECTION_OPTIONS,
          defaultValue: 'project',
        }),
        order: fields.number({ label: 'Order', defaultValue: 0 }),
        content: fields.mdx({
          label: 'Content',
          components: contentComponents,
        }),
      },
    }),
  },
  singletons: {
    // Singletons intentionally have no slug field — that absence is what
    // guarantees a fixed, non-writer-renameable path, since iGEM's Judging
    // Form links to these exact static URLs.
    projectDescription: singleton({
      label: 'Project Description',
      path: 'content/singletons/project-description',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Title', defaultValue: 'Project Description' }),
        content: fields.mdx({ label: 'Content', components: contentComponents }),
      },
    }),
    humanPractices: singleton({
      label: 'Human Practices',
      path: 'content/singletons/human-practices',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Title', defaultValue: 'Human Practices' }),
        content: fields.mdx({ label: 'Content', components: contentComponents }),
      },
    }),
  },
});
