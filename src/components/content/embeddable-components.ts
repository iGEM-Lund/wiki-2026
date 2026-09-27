import { FigureWithCaption } from './FigureWithCaption';
import { FigureCarousel } from './FigureCarousel';
import { PdfEmbed } from './PdfEmbed';
import { ShortVideoFeed } from './ShortVideoFeed';
import { Expandable } from './Expandable';
import { ExpandableSummary } from './ExpandableSummary';
import { ExpandableTitle } from './ExpandableTitle';
import { Citation } from './Citation';
import { Quote } from './Quote';
import { Formula } from './Formula';
import { FormulaBlock } from './FormulaBlock';
import { ChemStructure } from './ChemStructure';
import { ChemReaction } from './ChemReaction';
import { MoleculeViewer } from './MoleculeViewer';
import { Layout } from './Layout';
import { LayoutSidebar } from './LayoutSidebar';
import { LayoutColumn } from './LayoutColumn';

// Every content component EXCEPT WorldMap. Split out of index.ts's
// mdxComponents for two reasons: (1) WorldMap.tsx needs this map to compile
// pin popup bodies (raw MDX text; see content-components.tsx's WorldMap
// schema comment for why), but index.ts's mdxComponents also imports
// WorldMap, so WorldMap.tsx importing mdxComponents back would be circular;
// (2) since WorldMap is never a member of this map, a <WorldMap> tag
// hand-typed inside a pin's own body is inert (unresolved/literal text)
// rather than recursive; no separate guard needed.
export const embeddableComponents = {
  FigureWithCaption,
  FigureCarousel,
  PdfEmbed,
  ShortVideoFeed,
  Expandable,
  ExpandableSummary,
  ExpandableTitle,
  Citation,
  Quote,
  Formula,
  FormulaBlock,
  ChemStructure,
  ChemReaction,
  MoleculeViewer,
  Layout,
  LayoutSidebar,
  LayoutColumn,
};
