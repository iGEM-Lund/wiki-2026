import { fields } from '@keystatic/core';
import { block, inline, mark, wrapper, repeating } from '@keystatic/core/content-components';
import { helpCircleIcon } from '@keystar/ui/icon/icons/helpCircleIcon';
import { renderLatexToHtml } from '@/lib/katex';
import { renderSmilesToStructureSvg, renderReactionSmilesToHtml } from '@/lib/chemistry';

// Editor-side registration only: these govern what writers can insert in the
// MDX field's toolbar and how each component previews inside the Keystatic
// admin UI. The site's actual rendering uses a SEPARATE map; see
// src/components/content/index.ts. Both maps must share the same key names
// (FigureWithCaption, Citation) so the MDX tags written here resolve
// correctly when rendered on the live site.
export const contentComponents = {
  FigureWithCaption: block({
    label: 'Figure',
    schema: {
      src: fields.url({
        label: 'Image URL',
        description: 'Upload via teams.igem.org/6160/deliverables/wiki/uploads, then paste the static.igem.wiki URL here.',
      }),
      alt: fields.text({ label: 'Alt text' }),
      caption: fields.text({ label: 'Caption', multiline: true }),
    },
    ContentView: (props) => <div>[Figure: {props.value.caption ?? ''}]</div>,
  }),

  FigureCarousel: block({
    label: 'Figure Carousel',
    schema: {
      images: fields.array(
        fields.object({
          src: fields.url({
            label: 'Image URL',
            description: 'Upload via teams.igem.org/6160/deliverables/wiki/uploads, then paste the static.igem.wiki URL here.',
          }),
          alt: fields.text({ label: 'Alt text' }),
        }),
        { label: 'Figures', itemLabel: (props) => props.fields.alt.value || props.fields.src.value || 'Figure' },
      ),
      speedSeconds: fields.number({
        label: 'Seconds to cross the string',
        description:
          'How long a single photo takes to travel from one end of the string to the other. All photos move continuously at this same slow, uniform pace; lower is faster.',
        defaultValue: 25,
        validation: { min: 1 },
      }),
    },
    ContentView: (props) => <div>[Figure Carousel: {(props.value.images ?? []).length} figure(s)]</div>,
  }),

  // A wrapper so the table itself stays an ordinary Markdown table, edited
  // with the editor's own table tools, rather than a grid of form fields.
  TableWithCaption: wrapper({
    label: 'Table with caption',
    description: 'Insert this, then put a table inside it. The caption is shown above the table.',
    schema: {
      caption: fields.text({ label: 'Caption', multiline: true }),
    },
    ContentView: ({ children, value }) => (
      <div>
        {value.caption ? <div style={{ fontSize: '0.85em', opacity: 0.7 }}>{value.caption}</div> : null}
        {children}
      </div>
    ),
  }),

  PdfEmbed: block({
    label: 'PDF Document',
    schema: {
      src: fields.url({
        label: 'PDF URL',
        description: 'Upload via teams.igem.org/6160/deliverables/wiki/uploads, then paste the static.igem.wiki URL here.',
      }),
      title: fields.text({
        label: 'Title',
        description: 'The embed\'s accessible label, and the text used in the "open in new tab" fallback link.',
        validation: { isRequired: true },
      }),
      caption: fields.text({ label: 'Caption (optional)', multiline: true }),
    },
    ContentView: (props) => <div>[PDF: {props.value.title ?? ''}]</div>,
  }),

  // Rendered as a live player only on the site (see
  // src/components/content/ShortVideoFeed.tsx, which also turns Video
  // Universe links into playable files); the editor preview stays a static
  // placeholder, same as MoleculeViewer below.
  ShortVideoFeed: block({
    label: 'Short Video Feed',
    description: 'Vertical short-form videos viewed one at a time, scrolled through like Instagram Reels.',
    schema: {
      videos: fields.array(
        fields.object({
          url: fields.url({
            label: 'Video URL',
            description:
              'Upload the video to the iGEM Video Universe (video.igem.org) and paste its link here, e.g. https://video.igem.org/w/abc123. Portrait (9:16) videos fit best. A direct .mp4 link also works.',
          }),
          title: fields.text({ label: 'Title (optional)' }),
          caption: fields.text({ label: 'Caption (optional)', multiline: true }),
        }),
        { label: 'Videos', itemLabel: (props) => props.fields.title.value || props.fields.url.value || 'Video' },
      ),
    },
    ContentView: (props) => <div>[Short Video Feed: {(props.value.videos ?? []).length} video(s)]</div>,
  }),

  // The only blocks that need nested rich content, so the only ones using
  // wrapper() instead of block()/inline(). Three components rather than one:
  // CardTitle marks which of Card's children is the optional header, and
  // Expandable wraps whatever part of a Card stays hidden until the reader
  // clicks "Read more"; this only relies on
  // wrapper()'s plain top-level `children`, not a named child-field region
  // nested inside another wrapper's schema, which Keystatic's docs don't
  // show as a supported combination and this repo has no running
  // GitHub-authenticated admin instance to verify against.
  Card: wrapper({
    label: 'Card',
    description: 'A boxed card whose content is always visible. Add a Card Title as its first item for a header, and an Expandable for content that should stay hidden behind a "Read more" button.',
    schema: {},
    ContentView: ({ children }) => <div>{children}</div>,
  }),

  CardTitle: wrapper({
    label: 'Card Title',
    description: 'Optional header for a Card; insert as the first item inside it. Plain text: it is styled as the card title, not as a heading.',
    schema: {
      image: fields.url({
        label: 'Portrait URL (optional)',
        description:
          'A small round photo shown next to the title, e.g. of an interviewee. Upload via teams.igem.org/6160/deliverables/wiki/uploads, then paste the static.igem.wiki URL here.',
      }),
      imageAlt: fields.text({ label: 'Portrait alt text (optional)' }),
      subtitle: fields.text({
        label: 'Subtitle (optional)',
        description: 'Shown under the title, e.g. role and affiliation. Each line is kept as its own line.',
        multiline: true,
      }),
    },
    ContentView: ({ children, value }) => (
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {value.image ? (
          <img src={value.image} alt={value.imageAlt ?? ''} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
        ) : null}
        <div>
          <strong style={{ fontSize: '1.2em' }}>{children}</strong>
          {value.subtitle ? <div style={{ whiteSpace: 'pre-line', opacity: 0.7 }}>{value.subtitle}</div> : null}
        </div>
      </div>
    ),
  }),

  Expandable: wrapper({
    label: 'Expandable',
    description: 'Content hidden behind a "Read more" button; usually the last item inside a Card.',
    schema: {
      defaultOpen: fields.checkbox({ label: 'Expanded by default', defaultValue: false }),
    },
    ContentView: ({ children }) => <div>{children}</div>,
  }),

  Quote: block({
    label: 'Quote',
    schema: {
      quote: fields.text({ label: 'Quote', multiline: true }),
      quotee: fields.text({ label: 'Quotee (optional)' }),
      figure: fields.url({
        label: 'Figure URL (optional)',
        description:
          'A small image shown to the left of the quote, e.g. a portrait of the quotee. Upload via teams.igem.org/6160/deliverables/wiki/uploads, then paste the static.igem.wiki URL here.',
      }),
      figureAlt: fields.text({ label: 'Figure alt text (optional)' }),
    },
    ContentView: (props) => (
      <blockquote style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {props.value.figure ? (
          <img src={props.value.figure} alt={props.value.figureAlt ?? ''} style={{ width: 64, borderRadius: 8 }} />
        ) : null}
        <div>
          {props.value.quote ?? ''}
          {props.value.quotee ? <div>- {props.value.quotee}</div> : null}
        </div>
      </blockquote>
    ),
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
    // ContentView only receives the raw field value; for a relationship
    // field that's just the target's slug, not its resolved short form
    // (Keystatic doesn't expose resolved relationship labels to
    // ContentView), but the slug is still derived from the short form and
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

  // A mark rather than an inline component, so the hoverable text stays
  // ordinary editable text in the document: select a term, pick "Tooltip"
  // from the toolbar's component menu, type the explanation. Serialized as
  // <Tooltip text="...">term</Tooltip>. Dotted underline matches the site's
  // `.term-tip` so the editor preview signals "hoverable" the same way.
  Tooltip: mark({
    label: 'Tooltip',
    icon: helpCircleIcon,
    tag: 'span',
    style: { textDecoration: 'underline dotted', textUnderlineOffset: '0.2em' },
    schema: {
      text: fields.text({
        label: 'Explanation',
        description: 'Shown when a reader hovers, taps or focuses the selected text. Keep it to a sentence or two; plain text only.',
        multiline: true,
        validation: { isRequired: true },
      }),
    },
  }),

  Formula: inline({
    label: 'Formula (inline)',
    schema: {
      latex: fields.text({
        label: 'LaTeX',
        description: 'Inline math, e.g. x^2 + y^2 = z^2, rendered with KaTeX.',
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
        description: 'Display math on its own centered line, rendered with KaTeX.',
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
          'A SMILES string, e.g. testosterone: C[C@]12CC[C@H]3[C@H]([C@@H]1CC[C@@H]2O)CCC4=CC(=O)CC[C@]34C, rendered as a 2D structure.',
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

  // Renders as a live WebGL viewer only on the published/staging site (see
  // src/components/content/MoleculeViewer.tsx); the editor preview below
  // stays a static placeholder rather than spinning up a real 3Dmol
  // instance per keystroke.
  MoleculeViewer: block({
    label: '3D Molecule Viewer',
    schema: {
      modelUrl: fields.url({
        label: 'Model file URL',
        description:
          'Upload via teams.igem.org/6160/deliverables/wiki/uploads, then paste the static.igem.wiki URL here. iGEM rejects plain-text files like .pdb, so export the structure from ChimeraX as GLB (File > Save, format glTF .glb). PDB, mmCIF, SDF, MOL2 and XYZ also work if hosted elsewhere.',
      }),
      format: fields.select({
        label: 'File format',
        options: [
          { label: 'PDB', value: 'pdb' },
          { label: 'mmCIF', value: 'cif' },
          { label: 'SDF', value: 'sdf' },
          { label: 'MOL2', value: 'mol2' },
          { label: 'XYZ', value: 'xyz' },
          { label: 'GLB (3D mesh, e.g. ChimeraX export)', value: 'glb' },
        ],
        defaultValue: 'pdb',
      }),
      style: fields.select({
        label: 'Rendering style',
        description: 'Ignored for GLB files, which keep the look they were exported with.',
        options: [
          { label: 'Cartoon', value: 'cartoon' },
          { label: 'Stick', value: 'stick' },
          { label: 'Sphere', value: 'sphere' },
          { label: 'Line', value: 'line' },
        ],
        defaultValue: 'cartoon',
      }),
      highlightLabel: fields.text({
        label: 'Highlight tooltip (optional, GLB only)',
        description:
          'Shown when hovering any region colored differently from the rest of the model (e.g. a mutated residue). When set, the text labels baked into the GLB are hidden, so this replaces them.',
      }),
      caption: fields.text({ label: 'Caption (optional)' }),
    },
    ContentView: (props) => (
      <div>
        [3D Model{props.value.caption ? `: ${props.value.caption}` : ''} ({props.value.format})]
      </div>
    ),
  }),

  // Pins are a repeating fields.array(fields.object(...)); proven elsewhere
  // in this codebase only at the top-level keystatic.config.ts schema (the
  // navigation singleton's dropdown items), not yet inside a
  // content-component's own schema, but the field types themselves are the
  // same ones already exercised there.
  //
  // `body` is deliberately fields.text (raw MDX source), NOT fields.mdx;
  // verified against the installed @keystatic/core@0.5.50 runtime
  // (node_modules/@keystatic/core/dist/index-a8452c26.js:20037-20038, and a
  // second call path at :18507) that any field with formKind 'content'
  // (what fields.mdx/fields.document both are) throws Error('Not
  // implemented') the moment it's nested inside fields.array/fields.object
  // and a writer reopens the page for editing. So a pin's popup body is
  // hand-typed raw MDX in a plain multiline textarea; writers can still
  // embed other content components (e.g. <Citation reference="slug" />),
  // they just don't get Keystatic's rich-text toolbar/component-picker for
  // this one field. See src/components/content/WorldMap.tsx, which compiles
  // this text at render time with the same @mdx-js/mdx primitive
  // src/lib/mdx/render.ts uses for page content.
  //
  // `lat`/`lng` are deliberately fields.text (not fields.number), for a
  // second, independently discovered Keystatic bug: this field's own values
  // round-trip through the page's raw MDX source as a JS expression
  // attribute, e.g. `pins={[{"lat": -33.9249, ...}]}`. Any NEGATIVE number
  // there parses as an ESTree UnaryExpression ("-" applied to a Literal),
  // not a Literal itself, and Keystatic's MDX deserializer
  // (node_modules/@keystatic/core/dist/index-a8452c26.js's
  // expressionToValue, ~line 26973) only handles Literal/ArrayExpression/
  // ObjectExpression; a bare negative number throws, surfacing as "Error:
  // mdxJsxFlowElement has unexpected attributes" the next time ANY writer
  // opens that page (reproduced 2026-09-19: welcome_example's Cape Town pin,
  // lat -33.9249, and Boston pin, lng -71.0589, both southern/western
  // hemisphere coordinates). A quoted string like "-33.9249" is a Literal
  // (its value just happens to be a string containing a minus sign), so it
  // deserializes fine; hence storing lat/lng as text and parseFloat-ing
  // them in src/components/content/WorldMap.tsx instead of trusting
  // fields.number's own round-trip.
  WorldMap: block({
    label: 'World Map',
    schema: {
      pins: fields.array(
        fields.object({
          title: fields.text({ label: 'Title', validation: { isRequired: true } }),
          lat: fields.text({
            label: 'Latitude',
            description: 'A number from -90 to 90, e.g. -33.9249 for Cape Town.',
          }),
          lng: fields.text({
            label: 'Longitude',
            description: 'A number from -180 to 180, e.g. -71.0589 for Boston.',
          }),
          body: fields.text({
            label: 'Popup body (MDX)',
            multiline: true,
            description:
              'Raw MDX: plain formatting, or hand-embed other components, e.g. <Citation reference="slug" />.',
          }),
        }),
        { label: 'Pins', itemLabel: (props) => props.fields.title.value || 'Pin' },
      ),
    },
    // Cheap static placeholder, same MoleculeViewer precedent above;
    // never a live interactive map inside the admin editor.
    ContentView: (props) => <div>[World Map: {(props.value.pins ?? []).length} pin(s)]</div>,
  }),

  // A pie of clickable slices, each opening a popup. Same schema shape as
  // WorldMap's pins above, for the same reasons: `body` is raw MDX in a
  // fields.text, since a fields.mdx can't be nested inside fields.array.
  SliceWheel: block({
    label: 'Slice Wheel',
    description: 'A circle divided into slices, each with a title. Clicking a slice opens a popup with its text.',
    schema: {
      slices: fields.array(
        fields.object({
          title: fields.text({
            label: 'Title',
            description: 'Shown on the slice and as the popup heading. Keep it to a few words.',
            validation: { isRequired: true },
          }),
          body: fields.text({
            label: 'Popup body (MDX)',
            multiline: true,
            description:
              'Raw MDX: plain formatting, or hand-embed other components, e.g. <Citation reference="slug" />.',
          }),
        }),
        { label: 'Slices', itemLabel: (props) => props.fields.title.value || 'Slice' },
      ),
    },
    ContentView: (props) => (
      <div>[Slice Wheel: {(props.value.slices ?? []).map((slice) => slice.title).join(' / ') || 'no slices'}]</div>
    ),
  }),

  // Plain data (title, optional heading text), so unlike WorldMap's
  // pins there is no nested MDX field here. The link target is computed on
  // the site from the heading text (see src/components/content/Pillars.tsx).
  Pillars: block({
    label: 'Pillars',
    description: 'A row of pillars; clicking one jumps to its heading further down the page.',
    schema: {
      pillars: fields.array(
        fields.object({
          title: fields.text({
            label: 'Title',
            description: 'Shown on the pillar. Also the heading it links to, unless "Heading to link to" is set.',
            validation: { isRequired: true },
          }),
          heading: fields.text({
            label: 'Heading to link to (optional)',
            description:
              'Only needed when the heading on the page is worded differently from the title. Type its text exactly as it appears.',
          }),
        }),
        { label: 'Pillars', itemLabel: (props) => props.fields.title.value || 'Pillar' },
      ),
    },
    ContentView: (props) => (
      <div>[Pillars: {(props.value.pillars ?? []).map((pillar) => pillar.title).join(' / ') || 'no pillars'}]</div>
    ),
  }),

  // Generalized responsive layout system: Layout/LayoutSidebar are the two
  // container shapes, LayoutColumn is the shared column marker. The count of
  // LayoutColumn children IS the column count (enforced by each container's
  // validation.children), rather than a separate `columns` field that could
  // disagree with what was actually authored; Keystatic has no cross-field
  // dynamic validation to keep such a field in sync. forSpecificLocations on
  // LayoutColumn keeps it out of the general insert menu; it only makes
  // sense as a child of Layout/LayoutSidebar. ContentViews use inline
  // styles, not class names, since the admin editor doesn't load the site's
  // globals.css.
  LayoutColumn: wrapper({
    label: 'Column',
    description: 'A single column of content; insert inside a Layout, not on its own.',
    forSpecificLocations: true,
    schema: {},
    ContentView: ({ children }) => (
      <div style={{ border: '1px dashed #999', borderRadius: 4, padding: '0.5rem', minWidth: 0, flex: 1 }}>
        {children}
      </div>
    ),
  }),

  Layout: repeating({
    label: 'Layout (equal columns)',
    description: 'Side-by-side columns of equal width (2-4). Stacks to one column on mobile.',
    schema: {},
    children: 'LayoutColumn',
    validation: { children: { min: 2, max: 4 } },
    ContentView: ({ children }) => (
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>{children}</div>
    ),
  }),

  // Which column is "narrow" is simply whichever LayoutColumn is authored
  // first; reorder the columns to flip it, rather than a separate
  // left/right field.
  LayoutSidebar: repeating({
    label: 'Layout (sidebar + main)',
    description:
      'Two columns: the first is narrow, the second is wide. Reorder the columns to flip which side is narrow. Stacks to one column on mobile.',
    schema: {},
    children: 'LayoutColumn',
    validation: { children: { min: 2, max: 2 } },
    ContentView: ({ children }) => (
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>{children}</div>
    ),
  }),
};
