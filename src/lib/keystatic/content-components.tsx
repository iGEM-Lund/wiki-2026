import { fields } from '@keystatic/core';
import { block, wrapper, inline } from '@keystatic/core/content-components';
import { renderLatexToHtml } from '@/lib/katex';

// Editor-side registration only: these govern what writers can insert in the
// MDX field's toolbar and how each component previews inside the Keystatic
// admin UI. The site's actual rendering uses a SEPARATE map — see
// src/components/content/index.ts. Both maps must share the same key names
// (Callout, ProtocolBox, FigureWithCaption, Citation, ResultsTable) so the
// MDX tags written here resolve correctly when rendered on the live site.
export const contentComponents = {
  Callout: block({
    label: 'Callout',
    schema: {
      tone: fields.select({
        label: 'Tone',
        options: [
          { label: 'Info', value: 'info' },
          { label: 'Warning', value: 'warning' },
          { label: 'Success', value: 'success' },
        ],
        defaultValue: 'info',
      }),
      text: fields.text({ label: 'Text', multiline: true }),
    },
    ContentView: (props) => (
      <div>
        [Callout: {props.value.tone}] {props.value.text}
      </div>
    ),
  }),

  ProtocolBox: wrapper({
    label: 'Protocol Box',
    schema: {
      title: fields.text({ label: 'Title' }),
    },
    ContentView: (props) => <div>{props.children}</div>,
  }),

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
    ContentView: (props) => <span>[Citation: {props.value.reference ?? '(none selected)'}]</span>,
  }),

  ResultsTable: wrapper({
    label: 'Results Table',
    schema: {
      caption: fields.text({ label: 'Caption' }),
    },
    ContentView: (props) => <div>{props.children}</div>,
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
};
