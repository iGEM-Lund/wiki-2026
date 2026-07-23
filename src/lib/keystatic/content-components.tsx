import { fields } from '@keystatic/core';
import { block, wrapper, inline } from '@keystatic/core/content-components';

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
      id: fields.text({ label: 'Reference ID' }),
    },
  }),

  ResultsTable: wrapper({
    label: 'Results Table',
    schema: {
      caption: fields.text({ label: 'Caption' }),
    },
    ContentView: (props) => <div>{props.children}</div>,
  }),
};
