import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '@keystatic-config';

// Shared reader instance — used by the nav utility and every page that
// renders a `pages` entry or singleton. Reads the filesystem directly
// (content/), so it works identically in dev, staging, and the production
// export build; no live backend calls happen at request time.
export const reader = createReader(process.cwd(), keystaticConfig);
