// iGEM's Judging Form links to exact static URLs for these pages, so this
// list is the single source of truth for their paths — never derived from
// any writer-editable field. `key` names the Keystatic singleton (see
// keystatic.config.ts, which generates one singleton per entry here) and
// `slug` is the fixed URL segment served by src/app/(site)/[standardSlug]/.
//
// To add another required Standard URL page, add one entry here — no new
// singleton block and no new route file needed.
export type StandardPageDef = {
  key: string;
  slug: string;
  defaultTitle: string;
};

export const STANDARD_PAGES: readonly StandardPageDef[] = [
  { key: 'projectDescription', slug: 'project-description', defaultTitle: 'Project Description' },
  { key: 'humanPractices', slug: 'human-practices', defaultTitle: 'Human Practices' },
] as const;
