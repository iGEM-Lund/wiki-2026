import { renderReactionSmilesToHtml } from '@/lib/chemistry';
import { renderCaption } from '@/lib/caption-text';

type ChemReactionProps = {
  smiles?: string;
  caption?: string;
};

// A reaction scheme (reactant structures -> product structures) from a
// reaction SMILES, e.g. "CCO.CC(=O)O>>CCOC(=O)C.O". See ChemStructure.tsx for
// the single-molecule counterpart and why this is server-rendered.
export function ChemReaction({ smiles = '', caption }: ChemReactionProps) {
  const html = renderReactionSmilesToHtml(smiles);
  return (
    <figure className="chem-reaction">
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {caption ? <figcaption>{renderCaption(caption)}</figcaption> : null}
    </figure>
  );
}
