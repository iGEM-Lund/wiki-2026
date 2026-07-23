import { Callout } from './Callout';
import { ProtocolBox } from './ProtocolBox';
import { FigureWithCaption } from './FigureWithCaption';
import { Citation } from './Citation';
import { ResultsTable } from './ResultsTable';

// Site-render map, used by src/lib/mdx/render.ts. Kept in sync by hand with
// the editor-side registration in src/lib/keystatic/content-components.tsx —
// both must expose identical keys so the MDX tags Keystatic writes resolve
// at both authoring and render time.
export const mdxComponents = {
  Callout,
  ProtocolBox,
  FigureWithCaption,
  Citation,
  ResultsTable,
};
