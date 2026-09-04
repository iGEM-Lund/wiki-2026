import { renderSmilesToStructureSvg } from '@/lib/chemistry';

type ChemStructureProps = {
  smiles?: string;
  caption?: string;
};

// A 2D chemical structure diagram from a SMILES string, e.g. testosterone.
// Rendered server-side with openchemlib at MDX-compile time (see
// src/lib/chemistry.ts) — same reasoning as Formula.tsx: no client JS, no
// runtime DOM dependency, works the same in a server component and in the
// static export build.
export function ChemStructure({ smiles = '', caption }: ChemStructureProps) {
  const html = renderSmilesToStructureSvg(smiles);
  return (
    <figure className="chem-structure">
      <div className="chem-structure__diagram" dangerouslySetInnerHTML={{ __html: html }} />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
