import type { BasicFormField } from '@keystatic/core';
import { BubblesInput } from './bubbles-input';
import { parseBubbles, type Bubble } from './bubbles-value';

// A figure's speech bubbles, placed by clicking on the photo. A list of
// fields.object could not show the image, hence one custom field holding
// the whole list.
export function bubblesField(): BasicFormField<Bubble[]> {
  return {
    kind: 'form',
    label: 'Speech bubbles',
    Input: (props) => <BubblesInput {...props} />,
    defaultValue: () => [],
    parse: (value) => parseBubbles(value),
    serialize: (value) => ({ value: value.length ? value : undefined }),
    validate: (value) => {
      const bad = value.findIndex((b) => !b.name.trim() || !/^https?:\/\//.test(b.url));
      if (bad !== -1) throw new Error(`Bubble ${bad + 1} needs a name and a link starting with https://`);
      return value;
    },
    reader: { parse: (value) => parseBubbles(value) },
  };
}
