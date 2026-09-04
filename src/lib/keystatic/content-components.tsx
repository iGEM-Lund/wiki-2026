import { fields } from '@keystatic/core';
import { block, inline } from '@keystatic/core/content-components';
import { renderLatexToHtml } from '@/lib/katex';
import { renderSmilesToStructureSvg, renderReactionSmilesToHtml } from '@/lib/chemistry';

// Editor-side registration only: these govern what writers can insert in the
// MDX field's toolbar and how each component previews inside the Keystatic
// admin UI. The site's actual rendering uses a SEPARATE map — see
// src/components/content/index.ts. Both maps must share the same key names
// (FigureWithCaption, Citation) so the MDX tags written here resolve
// correctly when rendered on the live site.
export const contentComponents = {
  FigureWithCaption: block({
    label: 'Figure',
    schema: {
      src: fields.url({
        label: 'Image URL',
        description: 'Upload via tools.igem.org/uploads, then paste the static.igem.wiki URL here.',
      }),
      alt: fields.text({ label: 'Alt text' }),
      caption: fields.text({ label: 'Caption', multiline: true }),
    },
    ContentView: (props) => <div>[Figure: {props.value.caption ?? ''}]</div>,
  }),

  Citation: inline({
    label: 'Citation',
    schema: {
      reference: fields.relationship({
        label: 'Reference',
        collection: 'bibliography',
        validation: { isRequired: true },
      }),
    },
    // ContentView only receives the raw field value — for a relationship
    // field that's just the target's slug, not its resolved short form
    // (Keystatic doesn't expose resolved relationship labels to
    // ContentView) — but the slug is still derived from the short form and
    // reads well enough to identify the citation at a glance without
    // opening the editor. The picker itself (opened on click) searches and
    // lists references by short form, since that's the references
    // collection's slugField display name.
    //
    // Styled with the same `citation`/`citation--missing` classes the live
    // site's Citation component uses (src/components/content/Citation.tsx,
    // globals.css), so the in-editor preview looks like the real in-text
    // citation rather than a bracketed placeholder.
    ContentView: (props) => {
      const slug = props.value.reference;
      if (!slug) {
        return <span className="citation citation--missing">[missing reference]</span>;
      }
      return <span className="citation">{slug.replace(/-/g, ' ')}</span>;
    },
  }),

  Formula: inline({
    label: 'Formula (inline)',
    schema: {
      latex: fields.text({
        label: 'LaTeX',
        description: 'Inline math, e.g. x^2 + y^2 = z^2 — rendered with KaTeX.',
      }),
    },
    // Rendered with the same KaTeX helper the live site uses, so the
    // in-editor preview matches the published page rather than showing raw
    // LaTeX source.
    ContentView: (props) => (
      <span dangerouslySetInnerHTML={{ __html: renderLatexToHtml(props.value.latex ?? '', false) }} />
    ),
  }),

  FormulaBlock: block({
    label: 'Formula (block)',
    schema: {
      latex: fields.text({
        label: 'LaTeX',
        multiline: true,
        description: 'Display math on its own centered line — rendered with KaTeX.',
      }),
    },
    ContentView: (props) => (
      <div dangerouslySetInnerHTML={{ __html: renderLatexToHtml(props.value.latex ?? '', true) }} />
    ),
  }),

  ChemStructure: block({
    label: 'Chemical Structure',
    schema: {
      smiles: fields.text({
        label: 'SMILES',
        description:
          'A SMILES string, e.g. testosterone: C[C@]12CC[C@H]3[C@H]([C@@H]1CC[C@@H]2O)CCC4=CC(=O)CC[C@]34C — rendered as a 2D structure.',
      }),
      caption: fields.text({ label: 'Caption (optional)' }),
    },
    ContentView: (props) => (
      <div dangerouslySetInnerHTML={{ __html: renderSmilesToStructureSvg(props.value.smiles ?? '') }} />
    ),
  }),

  ChemReaction: block({
    label: 'Chemical Reaction',
    schema: {
      smiles: fields.text({
        label: 'Reaction SMILES',
        description:
          'Reactants and products separated by ">>", multiple components on a side separated by ".". e.g. ethanol + acetic acid -> ethyl acetate + water: CCO.CC(=O)O>>CCOC(=O)C.O',
      }),
      caption: fields.text({ label: 'Caption (optional)' }),
    },
    ContentView: (props) => (
      <div dangerouslySetInnerHTML={{ __html: renderReactionSmilesToHtml(props.value.smiles ?? '') }} />
    ),
  }),
};
