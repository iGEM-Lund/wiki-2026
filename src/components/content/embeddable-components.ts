import { FigureWithCaption } from './FigureWithCaption';
import { FigureCarousel } from './FigureCarousel';
import { LogoStrip } from './LogoStrip';
import { TableWithCaption } from './TableWithCaption';
import { PdfEmbed } from './PdfEmbed';
import { ShortVideoFeed } from './ShortVideoFeed';
import { Card } from './Card';
import { CardTitle } from './CardTitle';
import { Expandable } from './Expandable';
import { Citation } from './Citation';
import { Ref } from './Ref';
import { Tooltip } from './Tooltip';
import { InlineIcon } from './InlineIcon';
import { Badge, Badges } from './Badges';
import { Quote } from './Quote';
import { Formula } from './Formula';
import { FormulaBlock } from './FormulaBlock';
import { ChemStructure } from './ChemStructure';
import { ChemReaction } from './ChemReaction';
import { MoleculeViewer } from './MoleculeViewer';
import { Pillars } from './Pillars';
import { Quiz } from './Quiz';
import { Flipcard } from './Flipcard';
import { Layout2, Layout3 } from './Layout';
import { LayoutSidebar } from './LayoutSidebar';
import { LayoutColumn } from './LayoutColumn';

// Every content component EXCEPT WorldMap and SliceWheel. Split out of index.ts's
// mdxComponents for two reasons: (1) WorldMap.tsx needs this map to compile
// pin popup bodies (raw MDX text; see content-components.tsx's WorldMap
// schema comment for why), but index.ts's mdxComponents also imports
// WorldMap, so WorldMap.tsx importing mdxComponents back would be circular;
// (2) since WorldMap is never a member of this map, a <WorldMap> tag
// hand-typed inside a pin's own body is inert (unresolved/literal text)
// rather than recursive; no separate guard needed. SliceWheel compiles its
// slice bodies the same way (src/components/content/compile-mdx-snippet.tsx),
// so it stays out of this map for the same two reasons.
export const embeddableComponents = {
  FigureWithCaption,
  FigureCarousel,
  LogoStrip,
  TableWithCaption,
  PdfEmbed,
  ShortVideoFeed,
  Card,
  CardTitle,
  Expandable,
  Citation,
  Ref,
  Tooltip,
  InlineIcon,
  Badges,
  Badge,
  Quote,
  Pillars,
  Quiz,
  Flipcard,
  Formula,
  FormulaBlock,
  ChemStructure,
  ChemReaction,
  MoleculeViewer,
  Layout2,
  Layout3,
  LayoutSidebar,
  LayoutColumn,
};
