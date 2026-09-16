import { FigureWithCaption } from './FigureWithCaption';
import { Expandable } from './Expandable';
import { ExpandableSummary } from './ExpandableSummary';
import { Citation } from './Citation';
import { Formula } from './Formula';
import { FormulaBlock } from './FormulaBlock';
import { ChemStructure } from './ChemStructure';
import { ChemReaction } from './ChemReaction';
import { MoleculeViewer } from './MoleculeViewer';

// Site-render map, used by src/lib/mdx/render.ts. Kept in sync by hand with
// the editor-side registration in src/lib/keystatic/content-components.tsx —
// both must expose identical keys so the MDX tags Keystatic writes resolve
// at both authoring and render time.
export const mdxComponents = {
  FigureWithCaption,
  Expandable,
  ExpandableSummary,
  Citation,
  Formula,
  FormulaBlock,
  ChemStructure,
  ChemReaction,
  MoleculeViewer,
};
