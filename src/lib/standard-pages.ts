// iGEM's Judging Form links to exact static URLs for these pages, so their
// paths are hardcoded here and never derived from any writer-editable field.
// The corresponding singletons (see keystatic.config.ts) intentionally have
// no slug field — this constant is the single source of truth for the path,
// while the singleton's `title` field still lets writers edit the label.
export const STANDARD_URL_PAGES = [
  { key: 'projectDescription', href: '/project-description' },
  { key: 'humanPractices', href: '/human-practices' },
] as const;
