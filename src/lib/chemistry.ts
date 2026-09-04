import * as OCL from 'openchemlib';

// Shared by both the site-render components (src/components/content/Chem*)
// and the Keystatic editor previews (src/lib/keystatic/content-components.tsx)
// so the two stay visually in sync — same pattern as src/lib/katex.ts.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function moleculeSvg(smiles: string, width: number, height: number): string {
  const molecule = OCL.Molecule.fromSmiles(smiles);
  const svg = molecule.toSVG(width, height, undefined, { autoCrop: true, autoCropMargin: 8 });
  // OCL hardcodes bond lines as opaque black (stroke="rgb(0,0,0)") with no
  // option to configure it. Swap it for currentColor so bonds inherit the
  // page's text color and stay visible against a transparent/dark
  // background, the same way KaTeX's output already does. Heteroatom colors
  // (e.g. red oxygen) are left as-is — they're saturated enough to read on
  // both light and dark backgrounds.
  return svg.replaceAll('rgb(0,0,0)', 'currentColor');
}

// A single molecule's 2D structure. Invalid SMILES renders inline as a red
// error rather than throwing, so one bad structure never breaks the build —
// the same rule katex.ts follows with throwOnError: false.
export function renderSmilesToStructureSvg(smiles: string): string {
  try {
    return moleculeSvg(smiles, 300, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `<span class="chem-structure__error">Invalid SMILES: ${escapeHtml(message)}</span>`;
  }
}

// A full reaction scheme from a reaction SMILES, e.g.
// "CCO.CC(=O)O>>CCOC(=O)C.O" (ethanol + acetic acid -> ethyl acetate +
// water). We deliberately don't use OCL's Reaction class here: it merges
// dot-separated components on each side into one multi-fragment Molecule
// rather than giving separate reactant/product slots, and its layout has no
// notion of an explicit "+" between them. Splitting the string ourselves and
// rendering each component independently gives full control over the
// "+"/"->" glyphs between structures.
export function renderReactionSmilesToHtml(smiles: string): string {
  try {
    const sides = smiles.split('>>');
    if (sides.length !== 2) {
      throw new Error('expected exactly one ">>" separating reactants from products');
    }
    const [reactants, products] = sides;
    const side = (part: string) =>
      part
        .split('.')
        .map((s) => `<div class="chem-reaction__mol">${moleculeSvg(s, 150, 110)}</div>`)
        .join('<span class="chem-reaction__plus">+</span>');

    return `<div class="chem-reaction__row">${side(reactants)}<span class="chem-reaction__arrow">&rarr;</span>${side(products)}</div>`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `<span class="chem-structure__error">Invalid reaction SMILES: ${escapeHtml(message)}</span>`;
  }
}
